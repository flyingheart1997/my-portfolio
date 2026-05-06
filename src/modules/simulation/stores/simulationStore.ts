import { OrbitPropagator } from '../services/OrbitPropagator';
import { KeplerPropagator } from '../services/KeplerPropagator';
import {
    DEFAULT_GROUND_STATIONS,
    DashboardType,
    GroundStation,
    KeplerParams,
    PredictedPass,
    SimulatedSatellite,
    SimulationState,
    TleData,
    WorkspaceInteractionMode
} from '../types';
import { calculateElevation } from '../utils/coordUtils';

class SimulationStore {
    private state: SimulationState = {
        satellites: new Map(),
        groundStations: DEFAULT_GROUND_STATIONS.map(gs => ({ ...gs, history: [], isSelected: false, isHovered: false })),
        workspaceMode: 'inspect',
        simulationTime: new Date(),
        speed: 1,
        isPlaying: true,
        selectedSatelliteId: null,
        hoveredSatelliteId: null,
        selectedGroundStationId: null,
        hoveredGroundStationId: null,
        tooltipPos: null,
        gsTooltipPos: null,
        visibilityFilters: {
            starlink: true,
            gps: true,
            weather: true,
            comm: true
        },
        isLoading: false,
        loadingProgress: 0,
        loadingContext: 'init',
        showVisibilityCones: true,
        showGSNCoverage: true,
        showCommLinks: true,
        dashboardType: 'simulation'
    };

    private propagators: Map<string, OrbitPropagator | KeplerPropagator> = new Map();
    private isManualMode = false;
    private listeners: Set<(state: SimulationState) => void> = new Set();
    private lastExternalTimeUpdate = 0;
    private lastNotifyTime = 0;
    private readonly notifyThrottleMs = 32;

    getState() {
        return this.state;
    }

    getPropagators() {
        return this.propagators;
    }

    subscribe(listener: (state: SimulationState) => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(force = false) {
        const now = Date.now();
        if (!force && now - this.lastNotifyTime < this.notifyThrottleMs) return;
        this.lastNotifyTime = now;
        this.listeners.forEach(listener => listener({ ...this.state }));
    }

    async init(force = false) {
        if (this.isManualMode) return;
        if (this.state.satellites.size > 0 && !force) return;

        this.state.isLoading = true;
        this.state.loadingProgress = 10;
        this.notify(true);

        this.seedTles(this.generateMockTles());

        this.state.loadingProgress = 100;
        this.state.isLoading = false;
        this.notify(true);
    }

    public seedManualData(satellites: KeplerParams[], groundStations: GroundStation[] | any[]) {
        this.isManualMode = true;
        this.state.satellites.clear();
        this.propagators.clear();

        this.state.groundStations = groundStations.map(gs => ({
            id: gs.id || `gs-${Math.random().toString(36).slice(2, 9)}`,
            name: gs.name || 'Ground Station',
            lat: gs.lat ?? gs.latitude ?? 0,
            lon: gs.lon ?? gs.longitude ?? 0,
            country: gs.country || '',
            countryCode: gs.countryCode || '',
            agency: gs.agency || '',
            type: gs.type || 'civilian',
            status: gs.status || 'active',
            established: gs.established,
            elevation: gs.elevation,
            minElevation: gs.minElevation ?? 10,
            antennas: gs.antennas,
            isSelected: false,
            isHovered: false,
            history: [],
            predictedPasses: []
        }));

        satellites.forEach((sat, index) => {
            const id = sat.id || `sat-${index}`;
            const propagator = new KeplerPropagator(sat);
            const initialPos = propagator.propagate(this.state.simulationTime);
            if (!initialPos) return;

            this.propagators.set(id, propagator);
            this.state.satellites.set(id, {
                id,
                noradId: sat.noradId || '00000',
                name: sat.name,
                category: sat.category || 'operational',
                line1: '',
                line2: '',
                position: initialPos,
                history: [initialPos],
                orbitStartTime: sat.startTime,
                orbitEndTime: sat.endTime,
                isSelected: false,
                isHovered: false
            });
        });

        this.clearSelections();
        this.notify(true);
    }

    private seedTles(tles: TleData[]) {
        this.state.satellites.clear();
        this.propagators.clear();

        tles.forEach((tle, index) => {
            const noradId = tle.line1.substring(2, 7).trim();
            const id = `${tle.category}-${noradId || index}`;
            const propagator = new OrbitPropagator(tle.line1, tle.line2);
            const initialPos = propagator.propagate(this.state.simulationTime);
            if (!initialPos) return;

            this.propagators.set(id, propagator);
            this.state.satellites.set(id, {
                id,
                noradId: noradId || 'N/A',
                name: tle.name,
                category: tle.category,
                line1: tle.line1,
                line2: tle.line2,
                position: initialPos,
                history: [initialPos],
                orbitStartTime: this.state.simulationTime.getTime(),
                isSelected: false,
                isHovered: false
            });
        });
    }

    setWorkspaceMode(mode: WorkspaceInteractionMode) {
        this.state.workspaceMode = mode;
        this.clearTransientInspectionState();
        this.notify(true);
    }

    setDashboardType(type: DashboardType) {
        this.state.dashboardType = type;
        this.notify();
    }

    update(dtMs: number) {
        const externallyDriven = Date.now() - this.lastExternalTimeUpdate < 100;
        if (this.state.isPlaying && !externallyDriven) {
            this.state.simulationTime = this.calculateNextTime(dtMs);
        }

        this.updateSatellitePositions();
        this.notify();
    }

    setSimulationTime(time: Date | number) {
        this.state.simulationTime = typeof time === 'number' ? new Date(time) : time;
        this.lastExternalTimeUpdate = Date.now();
        this.notify(true);
    }

    setSpeed(speed: number) {
        this.state.speed = speed;
        this.notify();
    }

    togglePlay() {
        this.state.isPlaying = !this.state.isPlaying;
        this.notify();
    }

    resetTime() {
        this.state.simulationTime = new Date();
        this.notify();
    }

    selectSatellite(id: string | null) {
        if (this.state.selectedSatelliteId === id) return;

        if (this.state.selectedSatelliteId) {
            const previous = this.state.satellites.get(this.state.selectedSatelliteId);
            if (previous) previous.isSelected = false;
        }

        this.state.selectedSatelliteId = id;
        if (id) {
            this.state.selectedGroundStationId = null;
            const sat = this.state.satellites.get(id);
            if (sat) {
                sat.isSelected = true;
                this.refreshOrbitPath(sat, true);
            }
        }

        this.notify(true);
    }

    hoverSatellite(id: string | null) {
        if (this.state.hoveredSatelliteId === id) return;

        if (this.state.hoveredSatelliteId) {
            const previous = this.state.satellites.get(this.state.hoveredSatelliteId);
            if (previous) previous.isHovered = false;
        }

        this.state.hoveredSatelliteId = id;
        if (id) {
            const sat = this.state.satellites.get(id);
            if (sat) {
                sat.isHovered = true;
                this.refreshOrbitPath(sat, false);
            }
        }

        this.notify();
    }

    setTooltipPos(pos: { x: number; y: number } | null) {
        this.state.tooltipPos = pos;
        this.notify();
    }

    selectGroundStation(id: string | null) {
        if (this.state.selectedGroundStationId === id) return;

        if (this.state.selectedGroundStationId) {
            const previous = this.state.groundStations.find(gs => gs.id === this.state.selectedGroundStationId);
            if (previous) previous.isSelected = false;
        }

        this.state.selectedGroundStationId = id;
        if (id) {
            this.state.selectedSatelliteId = null;
            const gs = this.state.groundStations.find(station => station.id === id);
            if (gs) {
                gs.isSelected = true;
                if (gs.history.length === 0) {
                    gs.history = this.createGroundStationHistory();
                }
                this.updatePredictedPasses(id);
            }
        }

        this.notify(true);
    }

    hoverGroundStation(id: string | null, pos?: { x: number; y: number }) {
        if (this.state.hoveredGroundStationId === id && this.state.gsTooltipPos === (pos || null)) return;

        if (this.state.hoveredGroundStationId) {
            const previous = this.state.groundStations.find(gs => gs.id === this.state.hoveredGroundStationId);
            if (previous) previous.isHovered = false;
        }

        this.state.hoveredGroundStationId = id;
        this.state.gsTooltipPos = pos || null;
        if (id) {
            const gs = this.state.groundStations.find(station => station.id === id);
            if (gs) gs.isHovered = true;
        }

        this.notify();
    }

    setGsTooltipPos(pos: { x: number; y: number } | null) {
        this.state.gsTooltipPos = pos;
        this.notify();
    }

    toggleVisibilityCones() {
        this.state.showVisibilityCones = !this.state.showVisibilityCones;
        this.notify();
    }

    toggleGSNCoverage() {
        this.state.showGSNCoverage = !this.state.showGSNCoverage;
        this.notify();
    }

    toggleCommLinks() {
        this.state.showCommLinks = !this.state.showCommLinks;
        this.notify();
    }

    private calculateNextTime(dtMs: number): Date {
        const dtSeconds = (dtMs / 1000) * this.state.speed;
        const nextTimeMs = this.state.simulationTime.getTime() + dtSeconds * 1000;
        let minStart: number | null = null;
        let maxFiniteEnd: number | null = null;
        let hasOpenEndedOrbit = false;

        this.state.satellites.forEach(sat => {
            if (Number.isFinite(sat.orbitStartTime)) {
                minStart = minStart === null ? sat.orbitStartTime : Math.min(minStart, sat.orbitStartTime);
            }
            if (typeof sat.orbitEndTime === 'number' && Number.isFinite(sat.orbitEndTime)) {
                maxFiniteEnd = maxFiniteEnd === null ? sat.orbitEndTime : Math.max(maxFiniteEnd, sat.orbitEndTime);
            } else {
                hasOpenEndedOrbit = true;
            }
        });

        if (this.state.speed > 0 && !hasOpenEndedOrbit && maxFiniteEnd !== null && nextTimeMs >= maxFiniteEnd) {
            this.state.isPlaying = false;
            this.state.speed = 0;
            return new Date(maxFiniteEnd);
        }
        if (this.state.speed < 0 && minStart !== null && nextTimeMs <= minStart) {
            this.state.isPlaying = false;
            this.state.speed = 0;
            return new Date(minStart);
        }
        return new Date(nextTimeMs);
    }

    private updateSatellitePositions() {
        this.state.satellites.forEach((sat, id) => {
            const propagator = this.propagators.get(id);
            if (!propagator) return;

            let effectiveTime = this.state.simulationTime;
            if (sat.orbitStartTime && this.state.simulationTime.getTime() < sat.orbitStartTime) {
                effectiveTime = new Date(sat.orbitStartTime);
            } else if (this.state.dashboardType === 'simulation' && sat.orbitEndTime) {
                const endTime = new Date(sat.orbitEndTime);
                if (this.state.simulationTime > endTime) effectiveTime = endTime;
            } else if (this.state.dashboardType === 'summary' && sat.orbitEndTime) {
                const duration = sat.orbitEndTime - sat.orbitStartTime;
                if (duration > 0) {
                    const elapsed = this.state.simulationTime.getTime() - sat.orbitStartTime;
                    const loopedElapsed = elapsed % duration;
                    effectiveTime = new Date(sat.orbitStartTime + (loopedElapsed < 0 ? loopedElapsed + duration : loopedElapsed));
                }
            }

            const newPos = propagator.propagate(effectiveTime);
            if (newPos) sat.position = newPos;

            if (sat.isSelected || sat.isHovered) {
                this.refreshOrbitPath(sat, true, effectiveTime);
            }
        });
    }

    private refreshOrbitPath(sat: SimulatedSatellite, allowReuse: boolean, time: Date = this.state.simulationTime) {
        const propagator = this.propagators.get(sat.id);
        if (!propagator) return;

        const hasPath = !!(sat.orbitPath && sat.orbitPath.length > 0);
        sat.orbitPath = propagator.getOrbitPath(
            time,
            sat.orbitStartTime,
            sat.orbitEndTime,
            allowReuse && hasPath,
            this.state.dashboardType
        );
    }

    private updatePredictedPasses(gsId: string) {
        const gs = this.state.groundStations.find(station => station.id === gsId);
        if (!gs) return;

        const passes: PredictedPass[] = [];
        const satellites = Array.from(this.state.satellites.values());
        const startTime = new Date(this.state.simulationTime);
        const durationHours = 4;
        const stepMinutes = 2;
        const totalSteps = (durationHours * 60) / stepMinutes;

        satellites.slice(0, 50).forEach(sat => {
            const propagator = this.propagators.get(sat.id);
            if (!propagator) return;

            let currentPass: PredictedPass | null = null;
            for (let i = 0; i < totalSteps; i++) {
                const checkTime = new Date(startTime.getTime() + i * stepMinutes * 60000);
                const pos = propagator.propagate(checkTime);
                if (!pos) continue;

                const elevation = calculateElevation(pos, gs);
                const threshold = gs.minElevation ?? 5;
                if (elevation > threshold) {
                    if (!currentPass) {
                        currentPass = {
                            satelliteId: sat.id,
                            satelliteName: sat.name,
                            startTime: checkTime,
                            endTime: checkTime,
                            maxElevation: elevation
                        };
                    } else {
                        currentPass.endTime = checkTime;
                        currentPass.maxElevation = Math.max(currentPass.maxElevation, elevation);
                    }
                } else if (currentPass) {
                    passes.push(currentPass);
                    currentPass = null;
                }
            }
            if (currentPass) passes.push(currentPass);
        });

        gs.predictedPasses = passes.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()).slice(0, 10);
    }

    private createGroundStationHistory() {
        const now = new Date();
        const events = [
            { event: 'CONTACT', detail: 'Satellite uplink acquired' },
            { event: 'CONTACT', detail: 'Telemetry downlink completed' },
            { event: 'MAINTENANCE', detail: 'Scheduled antenna calibration' },
            { event: 'CONTACT', detail: 'Tracking pass completed' }
        ];

        return events.map((entry, index) => ({
            timestamp: new Date(now.getTime() - index * 3600 * 1000),
            event: entry.event,
            detail: entry.detail
        }));
    }

    private clearSelections() {
        this.state.selectedSatelliteId = null;
        this.state.selectedGroundStationId = null;
        this.state.hoveredSatelliteId = null;
        this.state.hoveredGroundStationId = null;
        this.state.tooltipPos = null;
        this.state.gsTooltipPos = null;
    }

    private clearTransientInspectionState() {
        if (this.state.hoveredSatelliteId) {
            const sat = this.state.satellites.get(this.state.hoveredSatelliteId);
            if (sat) sat.isHovered = false;
        }
        if (this.state.hoveredGroundStationId) {
            const gs = this.state.groundStations.find(station => station.id === this.state.hoveredGroundStationId);
            if (gs) gs.isHovered = false;
        }

        this.state.hoveredSatelliteId = null;
        this.state.hoveredGroundStationId = null;
        this.state.tooltipPos = null;
        this.state.gsTooltipPos = null;
    }

    private generateMockTles(): TleData[] {
        const mocks: TleData[] = [];
        const categories = ['starlink', 'gps', 'weather', 'communication', 'operational'];
        for (let i = 0; i < 500; i++) {
            const category = categories[i % categories.length] || 'communication';
            const meanMotion = (10 + Math.random() * 6).toFixed(8).padStart(11, ' ');
            const inclination = (Math.random() * 98).toFixed(4).padStart(8, ' ');
            const raan = (Math.random() * 360).toFixed(4).padStart(8, ' ');
            const meanAnomaly = (Math.random() * 360).toFixed(4).padStart(8, ' ');
            const noradId = (25544 + i).toString().padStart(5, '0');

            mocks.push({
                name: `${category.toUpperCase()} SATCH-${i.toString().padStart(3, '0')}`,
                line1: `1 ${noradId}U 98067A   24065.52643519  .00016717  00000-0  30000-3 0  999${i % 10}`,
                line2: `2 ${noradId} ${inclination} ${raan} 0005371  95.0000 ${meanAnomaly} ${meanMotion}12345`,
                category
            });
        }
        return mocks;
    }
}

export const simulationStore = new SimulationStore();

import { h, Component } from 'preact';
import { simulationStore } from '../stores/simulationStore';
import './sim-dashboard-modern.css';

export class SimulationDashboard extends Component {
    private unsub: (() => void) | null = null;

    componentDidMount() {
        this.unsub = simulationStore.subscribe(() => this.forceUpdate());
    }

    componentWillUnmount() {
        this.unsub?.();
    }

    render() {
        const state = simulationStore.getState();

        return h('div', { class: 'sim-ui-modern' },
            this.renderTooltips(state)
        );
    }

    private getClampedTooltipStyle(pos: { x: number; y: number }, width = 260, height = 190) {
        const margin = 16;
        const offset = 14;
        const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
        const flipX = pos.x + width + offset > viewportWidth - margin;
        const flipY = pos.y + height + offset > viewportHeight - margin;
        const left = Math.max(margin, Math.min(pos.x, viewportWidth - margin));
        const top = Math.max(margin, Math.min(pos.y, viewportHeight - margin));

        return {
            left: `${left}px`,
            top: `${top}px`,
            position: 'fixed',
            width: `min(${width}px, calc(100vw - ${margin * 2}px))`,
            maxWidth: `calc(100vw - ${margin * 2}px)`,
            transform: flipX
                ? (flipY ? `translate(calc(-100% - ${offset}px), calc(-100% - ${offset}px))` : `translate(calc(-100% - ${offset}px), ${offset}px)`)
                : (flipY ? `translate(${offset}px, calc(-100% - ${offset}px))` : `translate(${offset}px, ${offset}px)`)
        };
    }

    private renderTooltips(state: any) {
        if (state.hoveredSatelliteId && state.tooltipPos) {
            const sat = state.satellites.get(state.hoveredSatelliteId);
            if (sat) {
                return h('div', {
                    class: 'intel-tooltip-modern',
                    style: this.getClampedTooltipStyle(state.tooltipPos, 285, 210)
                },
                    h('div', { class: 'tt-header' },
                        h('div', { class: 'tt-icon' }, 'SAT'),
                        h('div', null,
                            h('div', { class: 'tt-name' }, sat.name),
                            h('div', { class: 'tt-category' }, sat.category.toUpperCase())
                        )
                    ),
                    h('div', { class: 'tt-body' },
                        h('div', { class: 'tt-row' }, h('span', null, 'CURRENT'), h('span', null, new Date(state.simulationTime).toLocaleTimeString([], { hour12: false }))),
                        h('div', { class: 'tt-row' }, h('span', null, 'START'), h('span', null, new Date(sat.orbitStartTime).toLocaleTimeString([], { hour12: false }))),
                        sat.orbitEndTime && h('div', { class: 'tt-row' }, h('span', null, 'END'), h('span', null, new Date(sat.orbitEndTime).toLocaleTimeString([], { hour12: false }))),
                        h('div', { class: 'tt-row' }, h('span', null, 'LAT/LON'), h('span', null, `${sat.position.lat.toFixed(2)}°, ${sat.position.lon.toFixed(2)}°`)),
                        h('div', { class: 'tt-row' }, h('span', null, 'ALTITUDE'), h('span', null, `${sat.position.alt.toFixed(0)} km`))
                    )
                );
            }
        }

        if (state.hoveredGroundStationId && state.gsTooltipPos) {
            const gs = state.groundStations.find((groundStation: any) => groundStation.id === state.hoveredGroundStationId);
            if (gs) {
                return h('div', {
                    class: 'intel-tooltip-modern',
                    style: this.getClampedTooltipStyle(state.gsTooltipPos, 275, 180)
                },
                    h('div', { class: 'tt-header' },
                        h('div', { class: 'tt-icon' }, 'GS'),
                        h('div', null,
                            h('div', { class: 'tt-name' }, gs.name),
                            h('div', { class: 'tt-category' }, `${gs.country} · ${gs.agency}`)
                        )
                    ),
                    h('div', { class: 'tt-body' },
                        h('div', { class: 'tt-row' }, h('span', null, 'STATUS'), h('span', { style: { color: 'var(--sim-accent-green)' } }, gs.status?.toUpperCase() || 'ACTIVE')),
                        h('div', { class: 'tt-row' }, h('span', null, 'COORDS'), h('span', null, `${gs.lat.toFixed(2)}°, ${gs.lon.toFixed(2)}°`)),
                        h('div', { class: 'tt-row' }, h('span', null, 'HORIZON'), h('span', null, `${gs.minElevation || 10}° ELEV`))
                    )
                );
            }
        }

        return null;
    }
}

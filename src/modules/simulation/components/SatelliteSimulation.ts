import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import { EarthScene } from './EarthScene';
import { SatelliteInstancedMesh } from './SatelliteInstancedMesh';
import { GroundStationLayer } from './GroundStationMesh';
import type { SimulatedSatellite } from '../types';
import { simulationStore } from '../stores/simulationStore';
import { getSunPosition } from '../utils/sunUtils';
import { getSatelliteColor } from '../utils/satelliteUtils';
import { latLonToVector3 } from '../utils/coordUtils';
import {
    buildCoverageFootprint,
    calculateCoverageCentralAngleRad,
    calculateElevationDeg,
    findBestVisibleSatellite
} from '../utils/visibilityUtils';

type VisibilityTargetKind = 'ground-station' | 'point-target' | 'area-of-interest';

interface VisibilityTarget {
    id: string;
    kind: VisibilityTargetKind;
    label: string;
    position: THREE.Vector3;
    lat: number;
    lon: number;
    minElevationDeg: number;
    groundStation?: any;
}

export class SatelliteSimulation {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private earth: EarthScene;
    private spaceBackground: THREE.Texture | THREE.CubeTexture | THREE.Color | null = null;
    private instancedMesh: SatelliteInstancedMesh | null = null;
    private raycaster: THREE.Raycaster = new THREE.Raycaster();
    private mouse: THREE.Vector2 = new THREE.Vector2();
    private container: HTMLElement;
    private focusedModel: THREE.Group | null = null;
    private activeModelSatId: string | null = null;
    private orbitPathLines: Map<string, THREE.Line> = new Map();
    private isZoomed: boolean = false;
    private lastSelectedSatId: string | null = null;
    private lastSelectedGsId: string | null = null;
    private defaultCameraDistance = 45000;
    private groundStationLayer: GroundStationLayer | null = null;
    private sunLight: THREE.DirectionalLight;
    private boundResize: () => void;
    private boundClick: (e: MouseEvent) => void;
    private boundMouseMove: (e: MouseEvent) => void;
    private lastFollowSatPos: THREE.Vector3 | null = null;
    private lastGroundStationSignature = '';

    private visibilityCones: Map<string, THREE.Mesh> = new Map();
    private gsCoverageMeshes: Map<string, THREE.LineSegments> = new Map();
    private visibilityTargets: VisibilityTarget[] = [];
    private visibilityTargetById: Map<string, VisibilityTarget> = new Map();
    private activeVisibilityLinks: Map<string, { targetId: string; elevationDeg: number; distanceSq: number; centralAngleRad: number }> = new Map();
    private lastVisibilityTargetSignature: string = '';
    private lastVisibilityRefreshMs: number = 0;
    private visibilityConeFrame: number = 0;

    private static readonly MAX_ACTIVE_VISIBILITY_CONES = 512;
    private static readonly VISIBILITY_REFRESH_MS = 250;

    constructor(container: HTMLElement) {
        this.container = container;
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 10, 2000000);
        this.camera.position.set(12000, 12000, 24000);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            logarithmicDepthBuffer: true // Anti-flicker for space scale
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 7500;
        this.controls.maxDistance = 500000;

        // TRACK INTERACTION
        this.controls.addEventListener('start', () => { (this as any)._isInteracting = true; });
        this.controls.addEventListener('end', () => { (this as any)._isInteracting = false; });

        const ambientLight = new THREE.AmbientLight(0x404040, 2);
        this.scene.add(ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xffffff, 2);
        this.sunLight.position.set(5, 3, 5).normalize();
        this.scene.add(this.sunLight);

        this.earth = new EarthScene(this.scene);
        this.spaceBackground = this.scene.background as THREE.Texture | THREE.CubeTexture | THREE.Color | null;
        const earthGroup = this.earth.getGroup();
        earthGroup.name = 'earth';
        this.scene.add(earthGroup);

        this.boundResize = this.onResize.bind(this);
        this.boundClick = this.onClick.bind(this);
        this.boundMouseMove = this.onMouseMove.bind(this);

        window.addEventListener('resize', this.boundResize);
        this.renderer.domElement.addEventListener('click', this.boundClick);
        this.renderer.domElement.addEventListener('mousemove', this.boundMouseMove);

        this.groundStationLayer = new GroundStationLayer(
            this.scene, this.camera, this.controls, this.renderer
        );
        const gs = simulationStore.getState().groundStations;
        this.groundStationLayer.updateStations(gs);
    }

    initSatellites(satelliteCount: number): void {
        if (this.instancedMesh) {
            this.instancedMesh.destroy();
        }
        this.instancedMesh = new SatelliteInstancedMesh(this.scene, satelliteCount);
    }

    updateSatellites(satellites: Map<string, SimulatedSatellite>): void {
        const state = simulationStore.getState();
        const hoveredId = state.hoveredSatelliteId;
        const selectedId = state.selectedSatelliteId;

        if (!this.instancedMesh) {
            if (satellites.size > 0) {
                this.initSatellites(satellites.size);
            }
            return;
        }

        if (this.instancedMesh && satellites.size > 0) {
            const activeOrbitIds = new Set<string>();
            if (selectedId) activeOrbitIds.add(selectedId);
            if (hoveredId) activeOrbitIds.add(hoveredId);

            activeOrbitIds.forEach(id => {
                const pathSat = satellites.get(id);
                if (pathSat && pathSat.orbitPath && pathSat.orbitPath.length > 0) {
                    this.updateOrbitPath(pathSat);
                }
            });

            for (const [id, line] of this.orbitPathLines.entries()) {
                if (!activeOrbitIds.has(id)) {
                    this.scene.remove(line);
                    line.geometry.dispose();
                    (line.material as THREE.Material).dispose();
                    this.orbitPathLines.delete(id);
                }
            }

            if (!selectedId) {
                this.controls.minDistance = 7500;
                this.removeFocusedModel();
            }

            const currentGs = simulationStore.getState().groundStations;
            if (this.groundStationLayer && (this as any)._lastGsCount !== currentGs.length) {
                this.groundStationLayer.updateStations(currentGs);
                (this as any)._lastGsCount = currentGs.length;
            }
        }
    }

    private resetCameraZoom() {
        this.lastSelectedSatId = null;
        this.lastSelectedGsId = null;
        this.lastFollowSatPos = null;
        this.isZoomed = false;

        this.cameraTween?.kill();
        this.targetTween?.kill();

        const targetPos = new THREE.Vector3(12000, 12000, 24000);

        this.targetTween = gsap.to(this.controls.target, {
            x: 0,
            y: 0,
            z: 0,
            duration: 1.5,
            ease: "power2.inOut"
        });

        this.cameraTween = gsap.to(this.camera.position, {
            x: targetPos.x,
            y: targetPos.y,
            z: targetPos.z,
            duration: 1.5,
            ease: "power2.inOut",
            onComplete: () => {
                this.controls.minDistance = 7500;
            }
        });
    }

    private updateFocusedModel(pos: THREE.Vector3, velocity: THREE.Vector3, satId: string, color: THREE.Color) {
        if (!this.focusedModel || this.activeModelSatId !== satId) {
            this.removeFocusedModel();
            this.focusedModel = this.createSatelliteModel(color);
            this.activeModelSatId = satId;
            this.scene.add(this.focusedModel);
        }
        this.focusedModel.position.copy(pos);
        const targetPos = pos.clone().add(velocity);
        const upVec = new THREE.Vector3(0, 0, 0).sub(pos).normalize();
        this.focusedModel.up.copy(upVec);
        this.focusedModel.lookAt(targetPos);
    }

    private createSatelliteModel(color: THREE.Color): THREE.Group {
        const group = new THREE.Group();
        const foilMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.4, metalness: 0.8 });
        const solarPanelMat = new THREE.MeshStandardMaterial({ color: 0x051024, roughness: 0.2, metalness: 0.9, side: THREE.DoubleSide });
        const silverMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.4, metalness: 0.7 });
        const indicatorMat = new THREE.MeshBasicMaterial({ color: color });

        const body = new THREE.Mesh(new THREE.BoxGeometry(180, 180, 180), foilMat);
        group.add(body);

        const stripe = new THREE.Mesh(new THREE.BoxGeometry(190, 30, 190), indicatorMat);
        group.add(stripe);

        const panW = 100, panH = 260, gap = 8, numPanels = 3;
        [-1, 1].forEach(side => {
            const strutLength = 100 + (panW + gap) * numPanels;
            const strut = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, strutLength), silverMat);
            strut.rotation.z = Math.PI / 2;
            strut.position.x = side * (strutLength / 2 + 80);
            group.add(strut);

            for (let i = 0; i < numPanels; i++) {
                const panel = new THREE.Mesh(new THREE.BoxGeometry(panW, 4, panH), solarPanelMat);
                panel.position.x = side * (160 + i * (panW + gap) + panW / 2);
                panel.rotation.x = Math.PI / 12;
                group.add(panel);
            }
        });

        const dishGroup = new THREE.Group();
        dishGroup.position.set(0, 90, 0);
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 50), silverMat);
        mast.position.y = 25;
        dishGroup.add(mast);
        const dish = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.5), silverMat);
        dish.position.y = 60;
        dish.rotation.x = Math.PI;
        dishGroup.add(dish);
        group.add(dishGroup);

        group.scale.set(1.5, 1.5, 1.5);
        return group;
    }

    private updateOrbitPath(sat: SimulatedSatellite) {
        if (!sat.orbitPath) return;

        const points = sat.orbitPath.map(p => latLonToVector3(p.lat, p.lon, p.alt));
        const line = this.orbitPathLines.get(sat.id);

        if (line) {
            line.geometry.setFromPoints(points);
            line.geometry.attributes.position.needsUpdate = true;
        } else {
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const color = getSatelliteColor(sat.category, sat.id);
            const material = new THREE.LineBasicMaterial({
                color: color.getHex(),
                transparent: true,
                opacity: 0.7,
                blending: THREE.AdditiveBlending
            });
            const orbitLine = new THREE.Line(geometry, material);
            this.orbitPathLines.set(sat.id, orbitLine);
            this.scene.add(orbitLine);
        }
    }

    private removeFocusedModel() {
        if (this.focusedModel) {
            this.scene.remove(this.focusedModel);
            this.focusedModel = null;
            this.activeModelSatId = null;
        }
    }

    private updateRaycaster(event: MouseEvent) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const camDist = this.camera.position.length();
        this.raycaster.params.Points = { threshold: Math.max(15, camDist / 160) };
    }

    private onClick(event: MouseEvent) {
        this.updateRaycaster(event);
        if (simulationStore.getState().workspaceMode !== 'inspect') {
            return;
        }

        const satHit = this.getIntersectedSatelliteHit();
        const gsId = this.groundStationLayer?.getIntersectedGsId(this.raycaster);
        const earthIntersect = this.raycaster.intersectObject(this.scene.getObjectByName('earth') || this.scene, true);

        // Pick the closest hit logically
        // Note: For GS, we don't have the distance here easily without refactoring GS layer, 
        // but we can assume if gsId is found, it's a valid intent.

        if (satHit && !gsId) {
            simulationStore.selectSatellite(satHit.id);
            simulationStore.selectGroundStation(null);
            this.lastFollowSatPos = null;
            this.isZoomed = false;
        } else if (gsId) {
            simulationStore.selectGroundStation(gsId);
            simulationStore.selectSatellite(null);
            this.lastFollowSatPos = null;
            this.isZoomed = false;
            this.lastSelectedSatId = null;
            this.removeFocusedModel();
        } else if (earthIntersect.length > 0) {
            // Clicked on Earth -> Do nothing, don't reset camera
        } else {
            // Clicked on empty space -> Reset only if something was selected
            const state = simulationStore.getState();
            if (state.selectedSatelliteId || state.selectedGroundStationId) {
                simulationStore.selectSatellite(null);
                simulationStore.selectGroundStation(null);
                this.resetCameraZoom();
            }
            this.lastFollowSatPos = null;
        }
    }

    private onMouseMove(event: MouseEvent) {
        this.updateRaycaster(event);

        if (simulationStore.getState().workspaceMode !== 'inspect') {
            simulationStore.hoverSatellite(null);
            simulationStore.hoverGroundStation(null);
            simulationStore.setTooltipPos(null);
            simulationStore.setGsTooltipPos(null);
            this.renderer.domElement.style.cursor = 'default';
            return;
        }

        const satHit = this.getIntersectedSatelliteHit();
        const gsId = this.groundStationLayer?.getIntersectedGsId(this.raycaster);

        if (satHit) {
            simulationStore.hoverSatellite(satHit.id);
            simulationStore.hoverGroundStation(null);
            simulationStore.setTooltipPos({ x: event.clientX, y: event.clientY });
            simulationStore.setGsTooltipPos(null);
            this.renderer.domElement.style.cursor = 'pointer';
        } else if (gsId) {
            simulationStore.hoverGroundStation(gsId);
            simulationStore.hoverSatellite(null);
            simulationStore.setGsTooltipPos({ x: event.clientX, y: event.clientY });
            simulationStore.setTooltipPos(null);
            this.renderer.domElement.style.cursor = 'pointer';
        } else {
            simulationStore.hoverSatellite(null);
            simulationStore.hoverGroundStation(null);
            simulationStore.setTooltipPos(null);
            simulationStore.setGsTooltipPos(null);
            this.renderer.domElement.style.cursor = 'default';
        }
    }

    private getIntersectedSatelliteHit(): { id: string, distance: number } | null {
        if (!this.instancedMesh) return null;

        const meshes = this.instancedMesh.getMeshes();
        const satIntersects = this.raycaster.intersectObjects(meshes);
        if (satIntersects.length === 0) return null;

        const firstSat = satIntersects[0];

        // 1. Occlusion Check: Does Earth block this satellite?
        const earthIntersect = this.raycaster.intersectObject(this.earth.getGroup(), true);
        if (earthIntersect.length > 0 && earthIntersect[0].distance < firstSat.distance) {
            return null; // Earth is in front
        }

        const mesh = firstSat.object as any;
        const index = firstSat.index;

        if (index !== undefined && mesh.category) {
            const id = this.instancedMesh.getSatelliteId(mesh.category, index);
            if (id) return { id, distance: firstSat.distance };
        }
        return null;
    }

    private onResize(): void {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    private satCartesianPositions: Map<string, THREE.Vector3> = new Map();
    private cameraTween: gsap.core.Tween | null = null;
    private targetTween: gsap.core.Tween | null = null;

    public tick(): void {
        const state = simulationStore.getState();
        const sunPos = getSunPosition(state.simulationTime);

        this.scene.background = this.spaceBackground;
        this.earth.getGroup().visible = true;
        this.controls.enabled = true;
        this.instancedMesh?.setVisible(true);
        this.groundStationLayer?.setVisible(true);
        this.orbitPathLines.forEach(line => { line.visible = true; });
        if (state.workspaceMode !== 'inspect') {
            this.visibilityCones.forEach(cone => { cone.visible = false; });
            this.gsCoverageMeshes.forEach(mesh => { mesh.visible = false; });
        }

        // 2. PRE-CALCULATE COORDINATES (Single Pass)
        this.satCartesianPositions.clear();
        state.satellites.forEach((sat: SimulatedSatellite) => {
            if (sat.position) {
                this.satCartesianPositions.set(
                    sat.id,
                    latLonToVector3(sat.position.lat, sat.position.lon, sat.position.alt)
                );
            }
        });

        // 3. Selection & Tracking Logic
        const selectedId = state.selectedSatelliteId;
        const selectedGsId = state.selectedGroundStationId;

        if (selectedId) {
            const sat = state.satellites.get(selectedId);
            const pos = this.satCartesianPositions.get(selectedId);
            const propagator = simulationStore.getPropagators().get(selectedId);

            if (sat && pos && propagator) {
                const satColor = getSatelliteColor(sat.category, sat.id);

                // High-precision orientation (Lookahead +1s)
                const lookaheadTime = new Date(state.simulationTime.getTime() + 1000);
                const nextLla = propagator.propagate(lookaheadTime);
                let velocityVector = new THREE.Vector3(1, 0, 0);
                if (nextLla) {
                    const nextPos = latLonToVector3(nextLla.lat, nextLla.lon, nextLla.alt);
                    velocityVector.copy(nextPos).sub(pos).normalize();
                }

                this.updateFocusedModel(pos, velocityVector, sat.id, satColor);

                if (this.lastSelectedSatId !== selectedId) {
                    this.lastSelectedSatId = selectedId;
                    this.lastSelectedGsId = null;
                    this.isZoomed = false;
                    this.controls.minDistance = 500; // Allow close zoom

                    // Smooth Jump to Satellite using GSAP
                    this.cameraTween?.kill();
                    this.targetTween?.kill();

                    const upDir = pos.clone().normalize();
                    const desiredCamPos = pos.clone().add(upDir.multiplyScalar(10000));

                    this.targetTween = gsap.to(this.controls.target, {
                        x: pos.x, y: pos.y, z: pos.z,
                        duration: 1.2,
                        ease: "power3.out"
                    });

                    this.cameraTween = gsap.to(this.camera.position, {
                        x: desiredCamPos.x, y: desiredCamPos.y, z: desiredCamPos.z,
                        duration: 1.2,
                        ease: "power3.out",
                        onComplete: () => { this.isZoomed = true; }
                    });
                } else if (this.isZoomed && !(this as any)._isInteracting) {
                    // Constant Update (Sync with prop) ONLY IF NOT INTERACTING
                    const lastSatPos = this.lastFollowSatPos || pos.clone();
                    this.lastFollowSatPos = pos.clone();

                    const v1 = lastSatPos.clone().normalize();
                    const v2 = pos.clone().normalize();
                    const quaternion = new THREE.Quaternion().setFromUnitVectors(v1, v2);

                    this.camera.position.applyQuaternion(quaternion);
                    this.controls.target.copy(pos);
                }
            }
        } else if (selectedGsId) {
            const gs = state.groundStations?.find((g: any) => g.id === selectedGsId);
            if (gs) {
                const pos = latLonToVector3(gs.lat, gs.lon, 35);
                if (this.lastSelectedGsId !== selectedGsId) {
                    this.lastSelectedGsId = selectedGsId;
                    this.lastSelectedSatId = null;
                    this.isZoomed = false;
                    this.controls.minDistance = 500;

                    this.cameraTween?.kill();
                    this.targetTween?.kill();

                    const upDir = pos.clone().normalize();
                    const targetCamPos = pos.clone().add(upDir.multiplyScalar(10000));

                    this.targetTween = gsap.to(this.controls.target, {
                        x: pos.x, y: pos.y, z: pos.z,
                        duration: 1.5,
                        ease: "power2.inOut"
                    });

                    this.cameraTween = gsap.to(this.camera.position, {
                        x: targetCamPos.x, y: targetCamPos.y, z: targetCamPos.z,
                        duration: 1.5,
                        ease: "power2.inOut",
                        onComplete: () => { this.isZoomed = true; }
                    });
                }
            }
        } else {
            if (this.lastSelectedSatId || this.lastSelectedGsId) {
                this.lastSelectedSatId = null;
                this.lastSelectedGsId = null;
                this.removeFocusedModel();
            }
        }

        this.controls.update();

        // 4. Update Layers using the cached positions
        this.sunLight.position.copy(sunPos).multiplyScalar(100000);

        this.earth.update();

        if (this.instancedMesh) {
            this.instancedMesh.updatePositions(state.satellites, this.satCartesianPositions);
        }

        this.updateSimulationLayers(state, this.satCartesianPositions);
        this.syncGroundStationLayer(state.groundStations);
        this.groundStationLayer?.tick(null, this.satCartesianPositions);

        this.renderer.render(this.scene, this.camera);
    }

    private syncGroundStationLayer(groundStations: any[]): void {
        const signature = groundStations
            .map(gs => `${gs.id}:${gs.lat.toFixed(5)}:${gs.lon.toFixed(5)}`)
            .join('|');
        if (signature === this.lastGroundStationSignature) return;
        this.lastGroundStationSignature = signature;
        this.groundStationLayer?.updateStations(groundStations);
    }

    private updateSimulationLayers(state: any, satPositions: Map<string, THREE.Vector3>) {
        const groundStations = state.groundStations;

        if (state.workspaceMode !== 'inspect') {
            this.visibilityCones.forEach(cone => { cone.visible = false; });
            this.gsCoverageMeshes.forEach(mesh => { mesh.visible = false; });
            return;
        }

        this.updateTargetedVisibilityCones(state, satPositions);

        if (state.showGSNCoverage) {
            const activeCoverageIds = new Set<string>();
            groundStations.forEach((gs: any) => {
                const bestLink = findBestVisibleSatellite(gs, state.satellites.values());
                if (!bestLink) return;

                activeCoverageIds.add(gs.id);
                let ring = this.gsCoverageMeshes.get(gs.id);
                if (!ring) {
                    const geometry = new THREE.BufferGeometry();
                    const material = new THREE.LineBasicMaterial({
                        color: 0x00ff88,
                        transparent: true,
                        opacity: 0.45,
                        depthWrite: false,
                        blending: THREE.AdditiveBlending
                    });
                    ring = new THREE.LineSegments(geometry, material);
                    ring.renderOrder = 9;
                    this.gsCoverageMeshes.set(gs.id, ring);
                    this.scene.add(ring);
                }

                const footprint = buildCoverageFootprint(gs, bestLink.coverageCentralAngleRad, 144);
                const points: THREE.Vector3[] = [];
                for (let i = 1; i < footprint.length; i++) {
                    const prev = footprint[i - 1];
                    const current = footprint[i];
                    if (Math.abs(current.lon - prev.lon) > 180) continue;
                    points.push(
                        latLonToVector3(prev.lat, prev.lon, 15),
                        latLonToVector3(current.lat, current.lon, 15)
                    );
                }

                ring.geometry.setFromPoints(points);
                ring.visible = points.length > 0;
                const material = ring.material as THREE.LineBasicMaterial;
                material.color.setHex(gs.id === state.selectedGroundStationId ? 0x00ffff : 0x00ff88);
                material.opacity = gs.id === state.selectedGroundStationId ? 0.85 : 0.45;
            });

            this.gsCoverageMeshes.forEach((ring, id) => {
                if (!activeCoverageIds.has(id)) ring.visible = false;
            });
        } else {
            this.gsCoverageMeshes.forEach(m => m.visible = false);
        }
    }

    private updateTargetedVisibilityCones(state: any, satPositions: Map<string, THREE.Vector3>): void {
        if (!state.showVisibilityCones) {
            this.activeVisibilityLinks.clear();
            this.visibilityCones.forEach(cone => { cone.visible = false; });
            return;
        }

        this.syncVisibilityTargets(state.groundStations || []);
        this.refreshActiveVisibilityLinks(state.satellites, satPositions);

        this.visibilityConeFrame++;

        this.activeVisibilityLinks.forEach((link, satId) => {
            const sat = state.satellites.get(satId) as SimulatedSatellite | undefined;
            const satPos = satPositions.get(satId);
            const target = this.visibilityTargetById.get(link.targetId);
            if (!sat || !satPos || !target) return;

            let cone = this.visibilityCones.get(satId);
            if (!cone) {
                cone = this.createVisibilityCone(sat);
                this.visibilityCones.set(satId, cone);
                this.scene.add(cone);
            }

            const footprint = buildCoverageFootprint(
                { lat: target.lat, lon: target.lon },
                link.centralAngleRad,
                96
            );
            const geometry = this.buildVisibilityConeGeometry(satPos, footprint);
            if (!geometry) {
                cone.visible = false;
                return;
            }

            cone.geometry.dispose();
            cone.geometry = geometry;
            cone.visible = true;
            cone.userData.activeFrame = this.visibilityConeFrame;

            const material = cone.material as THREE.MeshBasicMaterial;
            material.color.copy(getSatelliteColor(sat.category, sat.id));
            material.opacity = sat.isSelected || sat.isHovered ? 0.32 : 0.18;
        });

        this.visibilityCones.forEach(cone => {
            if (cone.userData.activeFrame !== this.visibilityConeFrame) {
                cone.visible = false;
            }
        });
    }

    private buildVisibilityConeGeometry(
        apex: THREE.Vector3,
        footprint: { lat: number; lon: number }[]
    ): THREE.BufferGeometry | null {
        if (footprint.length < 3) return null;
        const positions: number[] = [];
        const surfaceOffsetKm = 45;

        for (let i = 1; i < footprint.length; i++) {
            const prev = latLonToVector3(footprint[i - 1].lat, footprint[i - 1].lon, surfaceOffsetKm);
            const current = latLonToVector3(footprint[i].lat, footprint[i].lon, surfaceOffsetKm);
            positions.push(
                apex.x, apex.y, apex.z,
                prev.x, prev.y, prev.z,
                current.x, current.y, current.z
            );
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.computeBoundingSphere();
        return geometry;
    }

    private createVisibilityCone(sat: SimulatedSatellite): THREE.Mesh {
        const material = new THREE.MeshBasicMaterial({
            color: getSatelliteColor(sat.category, sat.id),
            transparent: true,
            opacity: 0.18,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: true,
            blending: THREE.AdditiveBlending
        });
        const cone = new THREE.Mesh(new THREE.BufferGeometry(), material);
        cone.renderOrder = 4;
        cone.name = `visibility-cone-${sat.id}`;
        return cone;
    }

    private syncVisibilityTargets(groundStations: any[]): void {
        const signature = groundStations
            .map(gs => `${gs.id}:${gs.lat}:${gs.lon}:${gs.minElevation ?? 10}`)
            .join('|');

        if (signature === this.lastVisibilityTargetSignature) return;
        this.lastVisibilityTargetSignature = signature;
        this.visibilityTargets = [];
        this.visibilityTargetById.clear();

        groundStations.forEach(gs => {
            const position = latLonToVector3(gs.lat, gs.lon, 0);
            const target: VisibilityTarget = {
                id: `gs:${gs.id}`,
                kind: 'ground-station',
                label: gs.name,
                position,
                lat: gs.lat,
                lon: gs.lon,
                minElevationDeg: gs.minElevation ?? 10,
                groundStation: gs
            };
            this.visibilityTargets.push(target);
            this.visibilityTargetById.set(target.id, target);
        });
    }

    private refreshActiveVisibilityLinks(
        satellites: Map<string, SimulatedSatellite>,
        satPositions: Map<string, THREE.Vector3>
    ): void {
        const now = performance.now();
        if (now - this.lastVisibilityRefreshMs < SatelliteSimulation.VISIBILITY_REFRESH_MS) return;
        this.lastVisibilityRefreshMs = now;
        this.activeVisibilityLinks.clear();

        if (this.visibilityTargets.length === 0 || satellites.size === 0) return;

        const candidates: { satId: string; targetId: string; elevationDeg: number; distanceSq: number; centralAngleRad: number }[] = [];

        satellites.forEach((sat, satId) => {
            const satPos = satPositions.get(satId);
            if (!satPos) return;

            let bestTarget: VisibilityTarget | null = null;
            let bestElevation = -90;
            let bestDistanceSq = Infinity;

            for (const target of this.visibilityTargets) {
                const distanceSq = target.position.distanceToSquared(satPos);
                const elevationDeg = target.groundStation
                    ? calculateElevationDeg(sat.position, target.groundStation)
                    : -90;

                if (elevationDeg >= target.minElevationDeg && elevationDeg > bestElevation) {
                    bestTarget = target;
                    bestElevation = elevationDeg;
                    bestDistanceSq = distanceSq;
                }
            }

            if (bestTarget) {
                candidates.push({
                    satId,
                    targetId: bestTarget.id,
                    elevationDeg: bestElevation,
                    distanceSq: bestDistanceSq,
                    centralAngleRad: calculateCoverageCentralAngleRad(
                        sat.position.alt,
                        bestTarget.minElevationDeg
                    )
                });
            }
        });

        if (candidates.length > SatelliteSimulation.MAX_ACTIVE_VISIBILITY_CONES) {
            candidates.sort((a, b) => b.elevationDeg - a.elevationDeg || a.distanceSq - b.distanceSq);
            candidates.length = SatelliteSimulation.MAX_ACTIVE_VISIBILITY_CONES;
        }

        candidates.forEach(candidate => {
            this.activeVisibilityLinks.set(candidate.satId, {
                targetId: candidate.targetId,
                elevationDeg: candidate.elevationDeg,
                distanceSq: candidate.distanceSq,
                centralAngleRad: candidate.centralAngleRad
            });
        });
    }

    destroy(): void {
        window.removeEventListener('resize', this.boundResize);
        this.renderer.domElement.removeEventListener('click', this.boundClick);
        this.renderer.domElement.removeEventListener('mousemove', this.boundMouseMove);
        this.cameraTween?.kill();
        this.targetTween?.kill();
        this.groundStationLayer?.destroy();
        this.instancedMesh?.destroy();
        this.orbitPathLines.forEach(line => {
            this.scene.remove(line);
            line.geometry.dispose();
            (line.material as THREE.Material).dispose();
        });
        this.visibilityCones.forEach(cone => {
            this.scene.remove(cone);
            cone.geometry.dispose();
            (cone.material as THREE.Material).dispose();
        });
        this.gsCoverageMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            (mesh.material as THREE.Material).dispose();
        });
        this.earth.dispose();
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }
}

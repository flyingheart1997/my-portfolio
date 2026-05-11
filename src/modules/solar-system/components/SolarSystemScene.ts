import * as THREE from 'three';
import { FOCUS_PLANET_INDICES, SOLAR_DATA } from '../data/SolarData';
import { Planet } from './Planet';

const INTRO_OVERVIEW_PROGRESS = 0.18;
const CHAPTER_ZOOM_IN_END = 0.34;
const CHAPTER_HOLD_END = 0.54;
const CHAPTER_TRAVEL_START = 0.64;

export class SolarSystemScene {
    private readonly scene: THREE.Scene;
    private readonly camera: THREE.PerspectiveCamera;
    private readonly renderer: THREE.WebGLRenderer;
    private readonly container: HTMLElement;
    private readonly textureLoader = new THREE.TextureLoader();
    private readonly planets: Planet[] = [];
    private readonly sharedGeometry = new THREE.SphereGeometry(1, 80, 48);
    private readonly raycaster = new THREE.Raycaster();
    private readonly pointer = new THREE.Vector2(10, 10);
    private readonly cameraTarget = new THREE.Vector3();
    private readonly desiredCameraPosition = new THREE.Vector3();
    private readonly focusPosition = new THREE.Vector3();
    private readonly currentPlanetPosition = new THREE.Vector3();
    private readonly nextPlanetPosition = new THREE.Vector3();
    private readonly overviewTarget = new THREE.Vector3(0, 0, 0);
    private readonly overviewCameraPosition = new THREE.Vector3();
    private readonly clock = new THREE.Clock();
    private readonly backgroundObjects: Array<THREE.Mesh | THREE.Points> = [];
    private readonly beltGroups: THREE.Points[] = [];
    private readonly rockBelts: THREE.InstancedMesh[] = [];
    private readonly handleResize = () => this.onResize();
    private readonly onHoverChange?: (index: number | null) => void;
    private readonly screenProjection = new THREE.Vector3();
    private readonly screenWorldPosition = new THREE.Vector3();
    private readonly screenRadiusPosition = new THREE.Vector3();
    private readonly screenCameraRight = new THREE.Vector3();
    private readonly screenPlanetScale = new THREE.Vector3();
    private readonly orbitProjection = new THREE.Vector3();

    private isPointerActive = false;
    private isRunning = false;
    private frameId: number | null = null;
    private scrollProgress = 0;
    private activePlanetIndex = -1;
    private hoveredPlanet: Planet | null = null;
    private dragMode: 'none' | 'orbit' | 'planet' = 'none';
    private dragPlanet: Planet | null = null;
    private dragStartX = 0;
    private dragStartY = 0;
    private dragLastX = 0;
    private dragLastY = 0;
    private dragDistance = 0;
    private orbitYaw = 0.52;
    private orbitPitch = 0.62;
    private targetOrbitYaw = 0.52;
    private targetOrbitPitch = 0.62;
    private zoomDistanceOffset = 0;
    private targetZoomDistanceOffset = 0;
    private coreDiveStrength = 0;
    private targetCoreDiveStrength = 0;

    private smoothstep(value: number) {
        const clamped = THREE.MathUtils.clamp(value, 0, 1);
        return clamped * clamped * (3 - 2 * clamped);
    }

    constructor(container: HTMLElement, onHoverChange?: (index: number | null) => void) {
        this.container = container;
        this.onHoverChange = onHoverChange;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x01040d);
        this.scene.fog = new THREE.FogExp2(0x020713, 0.00088);

        this.camera = new THREE.PerspectiveCamera(
            42,
            container.clientWidth / container.clientHeight,
            0.1,
            3200
        );

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.45));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.18;
        this.renderer.domElement.style.display = 'block';
        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';
        this.renderer.domElement.style.touchAction = 'none';
        container.appendChild(this.renderer.domElement);

        this.setupLighting();
        this.setupBackground();
        this.initPlanets();
        this.createAsteroidBelts();
        this.updateCameraForProgress(true);

        window.addEventListener('resize', this.handleResize);
    }

    private setupLighting() {
        this.scene.add(new THREE.AmbientLight(0xb7c9ff, 0.2));
        this.scene.add(new THREE.HemisphereLight(0xc6d8ff, 0x09050b, 0.42));

        const cameraFill = new THREE.DirectionalLight(0xd9e8ff, 1.08);
        cameraFill.position.set(0, 0.6, 1);
        this.camera.add(cameraFill);
        this.scene.add(this.camera);
    }

    private setupBackground() {
        const skyTexture = this.textureLoader.load('/textures/solar-system/stars-milky-way.jpg');
        skyTexture.colorSpace = THREE.SRGBColorSpace;
        const skyGeo = new THREE.SphereGeometry(1800, 48, 24);
        const skyMat = new THREE.MeshBasicMaterial({
            map: skyTexture,
            color: 0xb3c4ff,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0.62,
            depthWrite: false,
            fog: false
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        sky.rotation.y = -0.8;
        sky.rotation.x = 0.18;
        sky.userData.skipRaycast = true;
        this.backgroundObjects.push(sky);
        this.scene.add(sky);

        const starCount = 2600;
        const starGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const color = new THREE.Color();

        for (let index = 0; index < starCount; index += 1) {
            const radius = 560 + Math.random() * 1300;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[index * 3 + 2] = radius * Math.cos(phi);

            color.setHSL(0.56 + Math.random() * 0.14, 0.32 + Math.random() * 0.34, 0.62 + Math.random() * 0.32);
            colors[index * 3] = color.r;
            colors[index * 3 + 1] = color.g;
            colors[index * 3 + 2] = color.b;
        }

        starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const starMat = new THREE.PointsMaterial({
            size: 0.95,
            vertexColors: true,
            transparent: true,
            opacity: 0.82,
            depthWrite: false,
            fog: false
        });

        const stars = new THREE.Points(starGeo, starMat);
        stars.userData.skipRaycast = true;
        this.backgroundObjects.push(stars);
        this.scene.add(stars);

        const galaxyCount = 1800;
        const galaxyGeo = new THREE.BufferGeometry();
        const galaxyPositions = new Float32Array(galaxyCount * 3);
        const galaxyColors = new Float32Array(galaxyCount * 3);

        for (let index = 0; index < galaxyCount; index += 1) {
            const spread = Math.pow(Math.random() - 0.5, 3) * 520;
            const along = (Math.random() - 0.5) * 2600;
            const depth = -1080 + (Math.random() - 0.5) * 260;
            galaxyPositions[index * 3] = along;
            galaxyPositions[index * 3 + 1] = spread + Math.sin(along * 0.004) * 54;
            galaxyPositions[index * 3 + 2] = depth + Math.cos(along * 0.003) * 120;

            const brightness = 0.46 + Math.random() * 0.38;
            color.setHSL(0.59 + Math.random() * 0.08, 0.36 + Math.random() * 0.2, brightness);
            galaxyColors[index * 3] = color.r;
            galaxyColors[index * 3 + 1] = color.g;
            galaxyColors[index * 3 + 2] = color.b;
        }

        galaxyGeo.setAttribute('position', new THREE.BufferAttribute(galaxyPositions, 3));
        galaxyGeo.setAttribute('color', new THREE.BufferAttribute(galaxyColors, 3));
        const galaxyMat = new THREE.PointsMaterial({
            size: 2.9,
            vertexColors: true,
            transparent: true,
            opacity: 0.34,
            depthWrite: false,
            fog: false,
            blending: THREE.AdditiveBlending
        });
        const galaxy = new THREE.Points(galaxyGeo, galaxyMat);
        galaxy.rotation.z = -0.16;
        galaxy.rotation.y = 0.28;
        galaxy.userData.skipRaycast = true;
        this.backgroundObjects.push(galaxy);
        this.scene.add(galaxy);

        const dustCount = 900;
        const dustGeo = new THREE.BufferGeometry();
        const dustPositions = new Float32Array(dustCount * 3);
        const dustColors = new Float32Array(dustCount * 3);

        for (let index = 0; index < dustCount; index += 1) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 460 + Math.random() * 1100;
            const band = (Math.random() - 0.5) * 74;
            dustPositions[index * 3] = Math.cos(angle) * radius;
            dustPositions[index * 3 + 1] = band + Math.sin(angle * 2.0) * 18;
            dustPositions[index * 3 + 2] = Math.sin(angle) * radius;

            color.setHSL(0.58 + Math.random() * 0.08, 0.42, 0.34 + Math.random() * 0.24);
            dustColors[index * 3] = color.r;
            dustColors[index * 3 + 1] = color.g;
            dustColors[index * 3 + 2] = color.b;
        }

        dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
        dustGeo.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
        const dustMat = new THREE.PointsMaterial({
            size: 2.6,
            vertexColors: true,
            transparent: true,
            opacity: 0.28,
            depthWrite: false,
            fog: false
        });
        const dust = new THREE.Points(dustGeo, dustMat);
        dust.rotation.x = -0.18;
        dust.userData.skipRaycast = true;
        this.backgroundObjects.push(dust);
        this.scene.add(dust);
    }

    private initPlanets() {
        SOLAR_DATA.forEach(config => {
            const planet = new Planet(config, this.textureLoader, this.sharedGeometry);
            this.planets.push(planet);
            this.scene.add(planet.orbitGroup);

            const orbitLine = planet.getOrbitLine();
            if (orbitLine) {
                this.scene.add(orbitLine);
            }
        });
    }

    private createAsteroidBelts() {
        this.beltGroups.push(this.createBelt(74, 92, 1150, 0xd6c7a6, 0.18, 0.42));
        this.beltGroups.push(this.createBelt(282, 345, 620, 0x8191aa, 0.14, 0.95));
        this.beltGroups.forEach(belt => this.scene.add(belt));
        this.rockBelts.push(this.createRockBelt(75, 91, 360, 0xb9aa8b, 0.1, 0.42));
        this.rockBelts.push(this.createRockBelt(288, 342, 160, 0x7b879d, 0.2, 0.95));
        this.rockBelts.forEach(belt => this.scene.add(belt));
    }

    private createBelt(
        innerRadius: number,
        outerRadius: number,
        count: number,
        baseColor: number,
        size: number,
        verticalSpread: number
    ): THREE.Points {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const color = new THREE.Color(baseColor);

        for (let index = 0; index < count; index += 1) {
            const angle = Math.random() * Math.PI * 2;
            const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
            const jitter = (Math.random() - 0.5) * 1.4;
            positions[index * 3] = Math.cos(angle) * (radius + jitter);
            positions[index * 3 + 1] = (Math.random() - 0.5) * verticalSpread;
            positions[index * 3 + 2] = Math.sin(angle) * (radius + jitter);

            const brightness = 0.65 + Math.random() * 0.35;
            colors[index * 3] = color.r * brightness;
            colors[index * 3 + 1] = color.g * brightness;
            colors[index * 3 + 2] = color.b * brightness;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size,
            vertexColors: true,
            transparent: true,
            opacity: 0.58,
            depthWrite: false
        });

        const belt = new THREE.Points(geometry, material);
        belt.userData.skipRaycast = true;
        return belt;
    }

    private createRockBelt(
        innerRadius: number,
        outerRadius: number,
        count: number,
        baseColor: number,
        baseScale: number,
        verticalSpread: number
    ): THREE.InstancedMesh {
        const geometry = new THREE.IcosahedronGeometry(1, 0);
        const material = new THREE.MeshStandardMaterial({
            color: baseColor,
            roughness: 0.96,
            metalness: 0.04,
            flatShading: true
        });
        const rocks = new THREE.InstancedMesh(geometry, material, count);
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const rotation = new THREE.Euler();
        const scale = new THREE.Vector3();
        const color = new THREE.Color();

        for (let index = 0; index < count; index += 1) {
            const angle = Math.random() * Math.PI * 2;
            const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
            position.set(
                Math.cos(angle) * radius,
                (Math.random() - 0.5) * verticalSpread,
                Math.sin(angle) * radius
            );
            rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            quaternion.setFromEuler(rotation);
            const scalar = baseScale * (0.55 + Math.random() * 1.8);
            scale.set(scalar * (0.75 + Math.random() * 0.7), scalar * (0.55 + Math.random() * 0.9), scalar);
            matrix.compose(position, quaternion, scale);
            rocks.setMatrixAt(index, matrix);

            color.set(baseColor).multiplyScalar(0.68 + Math.random() * 0.52);
            rocks.setColorAt(index, color);
        }

        rocks.instanceMatrix.needsUpdate = true;
        if (rocks.instanceColor) {
            rocks.instanceColor.needsUpdate = true;
        }
        rocks.userData.skipRaycast = true;
        return rocks;
    }

    private onResize() {
        const width = Math.max(this.container.clientWidth, 1);
        const height = Math.max(this.container.clientHeight, 1);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.45));
        this.updateCameraForProgress(true);
    }

    private getFocusStep(progress: number) {
        const clampedProgress = THREE.MathUtils.clamp(
            (progress - INTRO_OVERVIEW_PROGRESS) / (1 - INTRO_OVERVIEW_PROGRESS),
            0,
            1
        );
        const chapterCount = FOCUS_PLANET_INDICES.length;
        const chapterPosition = clampedProgress * chapterCount;
        const chapterIndex = Math.min(Math.floor(chapterPosition), chapterCount - 1);
        const phase = chapterPosition >= chapterCount
            ? 1
            : chapterPosition - chapterIndex;
        const fromStep = chapterIndex;
        const toStep = Math.min(fromStep + 1, FOCUS_PLANET_INDICES.length - 1);
        const isLastStep = fromStep === FOCUS_PLANET_INDICES.length - 1;
        const travelProgress = isLastStep || phase < CHAPTER_TRAVEL_START
            ? 0
            : this.smoothstep((phase - CHAPTER_TRAVEL_START) / (1 - CHAPTER_TRAVEL_START));
        const zoomStrength = isLastStep && phase >= CHAPTER_ZOOM_IN_END
            ? 1
            : phase < CHAPTER_ZOOM_IN_END
            ? this.smoothstep(phase / CHAPTER_ZOOM_IN_END)
            : phase < CHAPTER_HOLD_END
                ? 1
                : 1 - this.smoothstep((phase - CHAPTER_HOLD_END) / (1 - CHAPTER_HOLD_END));
        const sequencePosition = fromStep + travelProgress;

        return {
            fromIndex: FOCUS_PLANET_INDICES[fromStep],
            toIndex: FOCUS_PLANET_INDICES[toStep],
            localProgress: travelProgress,
            sequencePosition,
            phase,
            zoomStrength
        };
    }

    private updateCameraForProgress(immediate = false) {
        const focus = this.getFocusStep(this.scrollProgress);
        const fromPlanet = this.planets[focus.fromIndex];
        const toPlanet = this.planets[focus.toIndex];

        fromPlanet.planetGroup.getWorldPosition(this.currentPlanetPosition);
        toPlanet.planetGroup.getWorldPosition(this.nextPlanetPosition);
        this.focusPosition.copy(this.currentPlanetPosition).lerp(this.nextPlanetPosition, focus.localProgress);

        const radius = THREE.MathUtils.lerp(
            fromPlanet.config.radius,
            toPlanet.config.radius,
            focus.localProgress
        );
        const isMobile = this.container.clientWidth < 768;
        const arrivalDistance = THREE.MathUtils.clamp(radius * (isMobile ? 12 : 10.5), isMobile ? 8 : 7, isMobile ? 74 : 96);
        const maxZoomDistance = THREE.MathUtils.clamp(radius * (isMobile ? 6.4 : 5.4), isMobile ? 4.8 : 3.8, isMobile ? 46 : 58);
        const baseFocusDistance = THREE.MathUtils.lerp(arrivalDistance, maxZoomDistance, focus.zoomStrength);
        this.coreDiveStrength = THREE.MathUtils.lerp(this.coreDiveStrength, this.targetCoreDiveStrength, immediate ? 1 : 0.1);
        const coreDiveDistance = THREE.MathUtils.clamp(radius * (isMobile ? 3.4 : 2.85), isMobile ? 4.2 : 3.2, isMobile ? 38 : 44);
        const cameraBaseDistance = THREE.MathUtils.lerp(baseFocusDistance, coreDiveDistance, this.coreDiveStrength);
        this.zoomDistanceOffset = THREE.MathUtils.lerp(this.zoomDistanceOffset, this.targetZoomDistanceOffset, immediate ? 1 : 0.13);
        const focusDistance = THREE.MathUtils.clamp(cameraBaseDistance + this.zoomDistanceOffset, isMobile ? 4.2 : 3.2, isMobile ? 90 : 118);
        this.orbitYaw = THREE.MathUtils.lerp(this.orbitYaw, this.targetOrbitYaw, immediate ? 1 : 0.12);
        this.orbitPitch = THREE.MathUtils.lerp(this.orbitPitch, this.targetOrbitPitch, immediate ? 1 : 0.12);

        const horizontalDistance = Math.cos(this.orbitPitch) * focusDistance;

        this.desiredCameraPosition.set(
            this.focusPosition.x + Math.sin(this.orbitYaw) * horizontalDistance,
            this.focusPosition.y + Math.sin(this.orbitPitch) * focusDistance,
            this.focusPosition.z + Math.cos(this.orbitYaw) * horizontalDistance
        );

        if (this.scrollProgress < INTRO_OVERVIEW_PROGRESS) {
            const introProgress = THREE.MathUtils.clamp(this.scrollProgress / INTRO_OVERVIEW_PROGRESS, 0, 1);
            const introEase = introProgress * introProgress * (3 - 2 * introProgress);
            const overviewDistance = isMobile ? 1080 : 690;
            const overviewPitch = THREE.MathUtils.clamp(this.orbitPitch, -1.08, 1.08);
            const overviewHorizontalDistance = Math.cos(overviewPitch) * overviewDistance;

            this.overviewCameraPosition.set(
                Math.sin(this.orbitYaw) * overviewHorizontalDistance,
                Math.sin(overviewPitch) * overviewDistance,
                Math.cos(this.orbitYaw) * overviewHorizontalDistance
            );
            this.desiredCameraPosition.lerpVectors(this.overviewCameraPosition, this.desiredCameraPosition, introEase);
            this.focusPosition.lerpVectors(this.overviewTarget, this.focusPosition, introEase);
        }

        if (immediate) {
            this.camera.position.copy(this.desiredCameraPosition);
            this.cameraTarget.copy(this.focusPosition);
            this.camera.lookAt(this.cameraTarget);
            return;
        }

        this.camera.position.lerp(this.desiredCameraPosition, 0.095);
        this.cameraTarget.lerp(this.focusPosition, 0.13);
        this.camera.lookAt(this.cameraTarget);
    }

    private updatePlanetFocus() {
        const focus = this.getFocusStep(this.scrollProgress);
        const introFocusVisibility = this.scrollProgress < INTRO_OVERVIEW_PROGRESS
            ? THREE.MathUtils.clamp(this.scrollProgress / INTRO_OVERVIEW_PROGRESS, 0, 1)
            : 1;
        const overviewVisibility = 1 - introFocusVisibility;

        this.planets.forEach((planet, planetIndex) => {
            const sequenceIndex = FOCUS_PLANET_INDICES.indexOf(planetIndex);
            const strength = sequenceIndex === -1
                ? 0
                : Math.max(0, 1 - Math.abs(sequenceIndex - focus.sequencePosition)) * introFocusVisibility;
            planet.setFocusStrength(strength);
            planet.setOverviewStrength(overviewVisibility);
        });
    }

    private updatePointerInteraction() {
        if (this.dragMode !== 'none') return;

        if (!this.isPointerActive) {
            this.setHoveredPlanet(null);
            return;
        }

        if (this.isOverviewHoverMode()) {
            this.setHoveredPlanet(null);
            return;
        }

        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersections = this.raycaster.intersectObjects(
            this.planets.map(planet => planet.hitMesh),
            false
        );

        const hitPlanet = intersections.length > 0
            ? intersections[0].object.userData.planet as Planet
            : null;

        this.setHoveredPlanet(hitPlanet);
    }

    private isOverviewHoverMode() {
        return this.scrollProgress < INTRO_OVERVIEW_PROGRESS * 0.62;
    }

    private isPointerInsideOuterOrbitArea() {
        const outerOrbit = this.planets[this.planets.length - 1]?.getOrbitLine();
        const position = outerOrbit?.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
        if (!position) return false;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        const pointerX = (this.pointer.x * 0.5 + 0.5) * width;
        const pointerY = (-this.pointer.y * 0.5 + 0.5) * height;
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        let visiblePoints = 0;

        for (let index = 0; index < position.count; index += 12) {
            this.orbitProjection.fromBufferAttribute(position, index).project(this.camera);
            if (this.orbitProjection.z < -1 || this.orbitProjection.z > 1) continue;

            const x = (this.orbitProjection.x * 0.5 + 0.5) * width;
            const y = (-this.orbitProjection.y * 0.5 + 0.5) * height;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            visiblePoints += 1;
        }

        if (visiblePoints < 12) return false;

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const radiusX = Math.max((maxX - minX) / 2, 1);
        const radiusY = Math.max((maxY - minY) / 2, 1);
        const normalizedDistance = ((pointerX - centerX) ** 2) / (radiusX ** 2)
            + ((pointerY - centerY) ** 2) / (radiusY ** 2);

        return normalizedDistance <= 1.08;
    }

    private setHoveredPlanet(planet: Planet | null) {
        if (planet === this.hoveredPlanet) return;

        if (this.hoveredPlanet) {
            this.hoveredPlanet.setHover(false);
        }

        this.hoveredPlanet = planet;
        this.onHoverChange?.(planet ? this.planets.indexOf(planet) : null);
        this.renderer.domElement.style.cursor = planet ? 'pointer' : 'default';

        if (planet) {
            planet.setHover(true);
        }
    }

    private pickPlanet(x = this.pointer.x, y = this.pointer.y) {
        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
        const intersections = this.raycaster.intersectObjects(
            this.planets.map(planet => planet.hitMesh),
            false
        );

        return intersections.length > 0
            ? intersections[0].object.userData.planet as Planet
            : null;
    }

    public beginInteraction(x: number, y: number, clientX: number, clientY: number) {
        this.setPointer(x, y, true);
        const planet = this.pickPlanet(x, y);
        this.dragMode = planet ? 'planet' : 'orbit';
        this.dragPlanet = planet;
        this.dragStartX = clientX;
        this.dragStartY = clientY;
        this.dragLastX = clientX;
        this.dragLastY = clientY;
        this.dragDistance = 0;
        this.renderer.domElement.style.cursor = planet ? 'grabbing' : 'grab';

        if (planet) {
            planet.setHover(true);
        }
    }

    public dragInteraction(clientX: number, clientY: number) {
        if (this.dragMode === 'none') return;

        const deltaX = clientX - this.dragLastX;
        const deltaY = clientY - this.dragLastY;
        this.dragLastX = clientX;
        this.dragLastY = clientY;
        this.dragDistance += Math.hypot(deltaX, deltaY);

        if (this.dragMode === 'planet' && this.dragPlanet) {
            this.dragPlanet.inspectRotate(deltaX, deltaY);
            return;
        }

        this.targetOrbitYaw -= deltaX * 0.0028;
        this.targetOrbitPitch = THREE.MathUtils.clamp(
            this.targetOrbitPitch + deltaY * 0.0046,
            -1.2,
            1.2
        );
    }

    public dolly(delta: number) {
        this.targetZoomDistanceOffset = THREE.MathUtils.clamp(
            this.targetZoomDistanceOffset + delta,
            -14,
            72
        );
    }

    public setCoreDiveStrength(strength: number) {
        this.targetCoreDiveStrength = THREE.MathUtils.clamp(strength, 0, 1);
    }

    public orbitBy(deltaYaw: number, deltaPitch: number) {
        this.targetOrbitYaw += deltaYaw;
        this.targetOrbitPitch = THREE.MathUtils.clamp(
            this.targetOrbitPitch + deltaPitch,
            -1.2,
            1.2
        );
    }

    public resetView() {
        this.targetOrbitYaw = 0.52;
        this.targetOrbitPitch = 0.62;
        this.targetZoomDistanceOffset = 0;
    }

    public endInteraction() {
        const clickedPlanet = this.dragDistance < 5 ? this.dragPlanet : null;
        this.dragMode = 'none';
        this.dragPlanet = null;
        this.renderer.domElement.style.cursor = this.hoveredPlanet ? 'pointer' : 'default';
        return clickedPlanet ? this.planets.indexOf(clickedPlanet) : -1;
    }

    public getProgressForPlanetIndex(index: number) {
        const sequenceIndex = FOCUS_PLANET_INDICES.indexOf(index);
        if (sequenceIndex === -1) return null;
        return this.getProgressForFocusStep(sequenceIndex);
    }

    public getProgressForFocusStep(step: number) {
        const clampedStep = THREE.MathUtils.clamp(step, 0, FOCUS_PLANET_INDICES.length - 1);
        const focusProgress = (clampedStep + CHAPTER_HOLD_END) / FOCUS_PLANET_INDICES.length;
        return INTRO_OVERVIEW_PROGRESS + focusProgress * (1 - INTRO_OVERVIEW_PROGRESS);
    }

    public getFocusStepForPlanetIndex(index: number) {
        const sequenceIndex = FOCUS_PLANET_INDICES.indexOf(index);
        return sequenceIndex === -1 ? null : sequenceIndex;
    }

    public getFocusStepCount() {
        return FOCUS_PLANET_INDICES.length;
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.clock.start();
        this.animate();
    }

    public stop() {
        this.isRunning = false;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
        }
    }

    private animate = () => {
        if (!this.isRunning) return;

        this.frameId = requestAnimationFrame(this.animate);
        const delta = Math.min(this.clock.getDelta(), 0.05);
        const time = this.clock.elapsedTime;

        this.updateCameraForProgress();
        this.updatePlanetFocus();
        this.updatePointerInteraction();

        this.planets.forEach(planet => planet.update(time, delta));
        this.beltGroups.forEach((belt, index) => {
            belt.rotation.y += delta * (index === 0 ? 0.018 : 0.006);
        });
        this.rockBelts.forEach((belt, index) => {
            belt.rotation.y += delta * (index === 0 ? 0.012 : 0.004);
            belt.rotation.x = Math.sin(time * 0.08 + index) * 0.006;
        });

        this.renderer.render(this.scene, this.camera);
    };

    public setScrollProgress(progress: number) {
        this.scrollProgress = THREE.MathUtils.clamp(progress, 0, 1);
        if (this.scrollProgress < INTRO_OVERVIEW_PROGRESS * 0.6) {
            this.activePlanetIndex = -1;
            return this.activePlanetIndex;
        }

        const focus = this.getFocusStep(this.scrollProgress);
        this.activePlanetIndex = FOCUS_PLANET_INDICES[Math.round(focus.sequencePosition)];
        return this.activePlanetIndex;
    }

    public setPointer(x: number, y: number, active: boolean) {
        this.pointer.set(x, y);
        this.isPointerActive = active;
    }

    public getActivePlanetIndex() {
        return this.activePlanetIndex;
    }

    public getPlanetScreenPosition(index: number) {
        const planet = this.planets[index];
        if (!planet) return null;

        planet.planetGroup.getWorldPosition(this.screenWorldPosition);
        this.screenProjection.copy(this.screenWorldPosition).project(this.camera);

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        const x = (this.screenProjection.x * 0.5 + 0.5) * width;
        const y = (-this.screenProjection.y * 0.5 + 0.5) * height;
        planet.planetGroup.getWorldScale(this.screenPlanetScale);
        this.screenCameraRight.setFromMatrixColumn(this.camera.matrixWorld, 0).normalize();
        this.screenRadiusPosition
            .copy(this.screenWorldPosition)
            .addScaledVector(
                this.screenCameraRight,
                planet.config.radius * Math.max(this.screenPlanetScale.x, this.screenPlanetScale.y, this.screenPlanetScale.z)
            )
            .project(this.camera);
        const radiusX = (this.screenRadiusPosition.x * 0.5 + 0.5) * width;
        const radiusY = (-this.screenRadiusPosition.y * 0.5 + 0.5) * height;

        return {
            x,
            y,
            visible: this.screenProjection.z >= -1 && this.screenProjection.z <= 1,
            radius: Math.hypot(radiusX - x, radiusY - y)
        };
    }

    public getCamera() {
        return this.camera;
    }

    public getPlanets() {
        return this.planets;
    }

    public getScene() {
        return this.scene;
    }

    public getRendererElement() {
        return this.renderer.domElement;
    }

    public dispose() {
        this.stop();
        window.removeEventListener('resize', this.handleResize);
        this.setHoveredPlanet(null);
        this.planets.forEach(planet => planet.dispose());
        this.sharedGeometry.dispose();
        this.backgroundObjects.forEach(object => {
            object.geometry.dispose();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach(material => {
                const map = 'map' in material ? material.map : null;
                if (map instanceof THREE.Texture) {
                    map.dispose();
                }
                material.dispose();
            });
        });
        this.beltGroups.forEach(belt => {
            belt.geometry.dispose();
            (belt.material as THREE.Material).dispose();
        });
        this.rockBelts.forEach(belt => {
            belt.geometry.dispose();
            (belt.material as THREE.Material).dispose();
        });
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }
}

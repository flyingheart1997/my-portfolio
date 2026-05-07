import * as THREE from 'three';
import { PlanetConfig } from '../data/SolarData';
import {
    ATMOSPHERE_FRAGMENT_SHADER,
    ATMOSPHERE_VERTEX_SHADER,
    SUN_FRAGMENT_SHADER,
    SUN_VERTEX_SHADER
} from './PlanetShaders';

export class Planet {
    public readonly mesh: THREE.Mesh;
    public readonly orbitGroup: THREE.Group;
    public readonly planetGroup: THREE.Group;
    public readonly config: PlanetConfig;

    private readonly disposableGeometries: THREE.BufferGeometry[] = [];
    private readonly materials: THREE.Material[] = [];
    private readonly disposableTextures: THREE.Texture[] = [];
    private orbitLine: THREE.LineLoop | null = null;
    private sunMaterial: THREE.ShaderMaterial | null = null;
    private ringMaterial: THREE.MeshBasicMaterial | null = null;
    private cloudLayer: THREE.Mesh | null = null;
    private readonly manualRotation = new THREE.Quaternion();
    private currentScale = 1;
    private targetFocus = 0;
    private targetHover = 0;
    private targetOverview = 0;
    private orbitAngle: number;

    constructor(config: PlanetConfig, textureLoader: THREE.TextureLoader, sharedGeometry: THREE.SphereGeometry) {
        this.config = config;
        this.orbitGroup = new THREE.Group();
        this.planetGroup = new THREE.Group();
        this.orbitAngle = config.orbitalPhase;

        this.updateOrbitPosition();

        const material = this.createSurfaceMaterial(textureLoader);
        this.mesh = new THREE.Mesh(sharedGeometry, material);
        this.mesh.scale.setScalar(config.radius);
        this.mesh.rotation.z = config.axialTilt;
        this.mesh.rotation.y = config.orbitalPhase * 0.82;
        this.mesh.userData.planet = this;
        this.planetGroup.add(this.mesh);
        this.orbitGroup.add(this.planetGroup);

        if (config.distance > 0) {
            this.createOrbitRing();
        }

        if (config.atmosphere) {
            this.addAtmosphere(config.color);
        }

        if (config.cloudTextureUrl) {
            this.addCloudLayer(textureLoader, config.cloudTextureUrl);
        }

        if (config.ring) {
            this.addRings(textureLoader);
        }

        if (config.name === 'Sun') {
            this.addSunLight();
        }
    }

    private createSurfaceMaterial(textureLoader: THREE.TextureLoader): THREE.Material {
        const texture = this.loadTexture(textureLoader, this.config.textureUrl);

        if (this.config.name === 'Sun') {
            this.sunMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    textureMap: { value: texture }
                },
                vertexShader: SUN_VERTEX_SHADER,
                fragmentShader: SUN_FRAGMENT_SHADER
            });
            this.materials.push(this.sunMaterial);
            return this.sunMaterial;
        }

        const material = new THREE.MeshStandardMaterial({
            map: texture,
            color: 0xffffff,
            emissive: new THREE.Color(this.config.color),
            emissiveIntensity: 0.075,
            roughness: 0.82,
            metalness: 0.02
        });

        if (['Mercury', 'Venus', 'Earth', 'Mars'].includes(this.config.name)) {
            material.bumpMap = texture;
            material.bumpScale = this.config.name === 'Earth' ? 0.035 : 0.06;
        }

        if (this.config.nightTextureUrl) {
            material.emissiveMap = this.loadTexture(textureLoader, this.config.nightTextureUrl);
            material.emissive = new THREE.Color(0x7fb7ff);
            material.emissiveIntensity = 0.48;
        }

        this.materials.push(material);
        return material;
    }

    private loadTexture(textureLoader: THREE.TextureLoader, url: string): THREE.Texture {
        const texture = textureLoader.load(
            url,
            loadedTexture => {
                loadedTexture.anisotropy = 16;
                loadedTexture.generateMipmaps = true;
                loadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
                loadedTexture.magFilter = THREE.LinearFilter;
            },
            undefined,
            () => {
                console.warn(`Failed to load texture: ${url}`);
            }
        );
        texture.colorSpace = THREE.SRGBColorSpace;
        this.disposableTextures.push(texture);
        return texture;
    }

    private addAtmosphere(color: number) {
        const atmosphereGeo = new THREE.SphereGeometry(this.config.radius * 1.055, 48, 32);
        const atmosphereMat = new THREE.ShaderMaterial({
            vertexShader: ATMOSPHERE_VERTEX_SHADER,
            fragmentShader: ATMOSPHERE_FRAGMENT_SHADER,
            uniforms: {
                atmosphereColor: { value: new THREE.Color(color) },
                coefficient: { value: 0.18 },
                power: { value: 2.7 }
            },
            transparent: true,
            side: THREE.BackSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat);
        atmosphere.userData.skipRaycast = true;
        this.disposableGeometries.push(atmosphereGeo);
        this.materials.push(atmosphereMat);
        this.planetGroup.add(atmosphere);
    }

    private addCloudLayer(textureLoader: THREE.TextureLoader, cloudTextureUrl: string) {
        const cloudGeo = new THREE.SphereGeometry(this.config.radius * 1.018, 64, 32);
        const cloudMap = this.loadTexture(textureLoader, cloudTextureUrl);
        const cloudMat = new THREE.MeshStandardMaterial({
            alphaMap: cloudMap,
            color: 0xffffff,
            transparent: true,
            opacity: 0.28,
            roughness: 1,
            depthWrite: false
        });

        this.cloudLayer = new THREE.Mesh(cloudGeo, cloudMat);
        this.cloudLayer.userData.skipRaycast = true;
        this.disposableGeometries.push(cloudGeo);
        this.materials.push(cloudMat);
        this.planetGroup.add(this.cloudLayer);
    }

    private addRings(textureLoader: THREE.TextureLoader) {
        if (!this.config.ring) return;

        const innerRadius = this.config.radius * this.config.ring.innerRadius;
        const outerRadius = this.config.radius * this.config.ring.outerRadius;
        const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 160);
        const uv = geometry.attributes.uv;
        const position = geometry.attributes.position;
        const vertex = new THREE.Vector3();

        for (let index = 0; index < position.count; index += 1) {
            vertex.fromBufferAttribute(position, index);
            const normalizedRadius = (vertex.length() - innerRadius) / (outerRadius - innerRadius);
            uv.setXY(index, normalizedRadius, 1);
        }

        const materialOptions: THREE.MeshBasicMaterialParameters = {
            color: this.config.color,
            transparent: true,
            opacity: this.config.ring.opacity,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: true,
            blending: THREE.NormalBlending
        };

        if (this.config.name === 'Saturn' || this.config.name === 'Uranus') {
            const ringTexture = this.createPlanetRingTexture(this.config.name);
            materialOptions.map = ringTexture;
            materialOptions.color = 0xffffff;
            materialOptions.opacity = this.config.name === 'Saturn' ? 0.94 : 0.86;
            this.disposableTextures.push(ringTexture);
        } else if (this.config.ringTextureUrl) {
            const ringTexture = this.loadTexture(textureLoader, this.config.ringTextureUrl);
            materialOptions.map = ringTexture;
            materialOptions.alphaMap = ringTexture;
            materialOptions.color = 0xffffff;
            materialOptions.opacity = Math.min(this.config.ring.opacity, 0.72);
        }

        const material = new THREE.MeshBasicMaterial(materialOptions);
        this.ringMaterial = material;
        const rings = new THREE.Mesh(geometry, material);
        rings.rotation.x = this.config.ring.tilt;
        rings.rotation.z = this.config.axialTilt * 0.35;
        rings.renderOrder = 2;
        rings.userData.skipRaycast = true;

        this.disposableGeometries.push(geometry);
        this.materials.push(material);
        this.planetGroup.add(rings);
    }

    private createPlanetRingTexture(planetName: string) {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 16;
        const context = canvas.getContext('2d');

        if (!context) {
            return new THREE.CanvasTexture(canvas);
        }

        const bands = planetName === 'Saturn'
            ? [
                { stop: 0.00, color: 'rgba(0, 0, 0, 0)' },
                { stop: 0.08, color: 'rgba(205, 186, 135, 0.18)' },
                { stop: 0.17, color: 'rgba(236, 220, 174, 0.64)' },
                { stop: 0.27, color: 'rgba(129, 107, 73, 0.2)' },
                { stop: 0.36, color: 'rgba(248, 235, 190, 0.78)' },
                { stop: 0.48, color: 'rgba(60, 48, 34, 0.08)' },
                { stop: 0.54, color: 'rgba(0, 0, 0, 0)' },
                { stop: 0.62, color: 'rgba(230, 211, 161, 0.72)' },
                { stop: 0.73, color: 'rgba(176, 151, 102, 0.34)' },
                { stop: 0.86, color: 'rgba(244, 229, 184, 0.52)' },
                { stop: 1.00, color: 'rgba(0, 0, 0, 0)' }
            ]
            : [
                { stop: 0.00, color: 'rgba(0, 0, 0, 0)' },
                { stop: 0.08, color: 'rgba(116, 154, 168, 0.06)' },
                { stop: 0.16, color: 'rgba(178, 224, 233, 0.18)' },
                { stop: 0.24, color: 'rgba(235, 255, 255, 0.34)' },
                { stop: 0.32, color: 'rgba(122, 166, 180, 0.14)' },
                { stop: 0.40, color: 'rgba(0, 0, 0, 0.01)' },
                { stop: 0.48, color: 'rgba(164, 214, 224, 0.24)' },
                { stop: 0.56, color: 'rgba(238, 255, 255, 0.46)' },
                { stop: 0.64, color: 'rgba(106, 144, 158, 0.12)' },
                { stop: 0.72, color: 'rgba(160, 208, 220, 0.24)' },
                { stop: 0.82, color: 'rgba(230, 252, 255, 0.38)' },
                { stop: 0.92, color: 'rgba(95, 130, 145, 0.08)' },
                { stop: 1.00, color: 'rgba(0, 0, 0, 0)' }
            ];
        const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
        bands.forEach(band => gradient.addColorStop(band.stop, band.color));
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);

        if (planetName === 'Saturn') {
            context.fillStyle = 'rgba(245, 232, 190, 0.42)';
            [0.22, 0.405, 0.665, 0.81].forEach(stop => {
                const x = stop * canvas.width;
                context.fillRect(x, 0, 1.2, canvas.height);
            });
        } else {
            context.fillStyle = 'rgba(235, 255, 255, 0.34)';
            [0.18, 0.31, 0.43, 0.56, 0.69, 0.82].forEach(stop => {
                const x = stop * canvas.width;
                context.fillRect(x, 0, 1, canvas.height);
            });
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        return texture;
    }

    private addSunLight() {
        const light = new THREE.PointLight(0xfff0c7, 420, 900, 1.45);
        this.planetGroup.add(light);

        const coronaTexture = this.createSunCoronaTexture();
        const coronaMat = new THREE.SpriteMaterial({
            map: coronaTexture,
            transparent: true,
            opacity: 1,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false
        });
        const corona = new THREE.Sprite(coronaMat);
        corona.scale.setScalar(this.config.radius * 3.35);
        corona.renderOrder = -1;
        corona.userData.skipRaycast = true;
        this.disposableTextures.push(coronaTexture);
        this.materials.push(coronaMat);
        this.planetGroup.add(corona);
    }

    private createSunCoronaTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');

        if (!context) {
            return new THREE.CanvasTexture(canvas);
        }

        const center = canvas.width / 2;
        const gradient = context.createRadialGradient(center, center, canvas.width * 0.26, center, center, canvas.width * 0.5);
        gradient.addColorStop(0, 'rgba(255, 138, 20, 0.58)');
        gradient.addColorStop(0.24, 'rgba(255, 116, 18, 0.34)');
        gradient.addColorStop(0.52, 'rgba(255, 92, 14, 0.14)');
        gradient.addColorStop(0.82, 'rgba(255, 70, 10, 0.045)');
        gradient.addColorStop(1, 'rgba(255, 70, 10, 0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        return texture;
    }

    private createOrbitRing() {
        const segments = 720;
        const points: THREE.Vector3[] = [];

        for (let index = 0; index < segments; index += 1) {
            const angle = (index / segments) * Math.PI * 2;
            points.push(this.getOrbitPosition(angle));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0xb5cfff,
            transparent: true,
            opacity: 0.34,
            depthWrite: false,
            depthTest: true
        });

        this.orbitLine = new THREE.LineLoop(geometry, material);
        this.orbitLine.renderOrder = 1;
        this.orbitLine.userData.skipRaycast = true;
        this.disposableGeometries.push(geometry);
        this.materials.push(material);
    }

    public setFocusStrength(strength: number) {
        this.targetFocus = THREE.MathUtils.clamp(strength, 0, 1);
    }

    public setOverviewStrength(strength: number) {
        this.targetOverview = THREE.MathUtils.clamp(strength, 0, 1);
    }

    public setHover(active: boolean) {
        this.targetHover = active ? 1 : 0;
    }

    private getOverviewScaleBoost() {
        if (this.config.name === 'Sun') return 0;
        return THREE.MathUtils.clamp(2.2 / this.config.radius, 0.38, 2.7);
    }

    public setOrbitHighlight(highlight: boolean) {
        if (!this.orbitLine) return;

        const material = this.orbitLine.material as THREE.LineBasicMaterial;
        const baseOpacity = 0.34;
        material.opacity = highlight ? 0.54 : baseOpacity + this.targetFocus * 0.08;
        material.color.setHex(highlight || this.targetFocus > 0.2 ? 0xdbe9ff : 0x8aa4c8);
    }

    private getOrbitPosition(angle: number) {
        if (this.config.distance <= 0) {
            return new THREE.Vector3(0, 0, 0);
        }

        const eccentricity = this.config.orbitEccentricity ?? 0;
        const semiMajorAxis = this.config.distance;
        const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
        const focusOffset = semiMajorAxis * eccentricity;
        const position = new THREE.Vector3(
            Math.cos(angle) * semiMajorAxis - focusOffset,
            0,
            Math.sin(angle) * semiMinorAxis
        );

        position.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.config.orbitLongitude ?? 0);
        position.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.config.orbitInclination ?? 0);
        return position;
    }

    private updateOrbitPosition() {
        this.planetGroup.position.copy(this.getOrbitPosition(this.orbitAngle));
    }

    public update(time: number, delta: number) {
        this.mesh.rotation.y += this.config.rotationSpeed * delta * 60;
        this.mesh.quaternion.premultiply(this.manualRotation);
        this.manualRotation.slerp(new THREE.Quaternion(), 1 - Math.pow(0.0005, delta));

        if (this.cloudLayer) {
            this.cloudLayer.rotation.y += this.config.rotationSpeed * delta * 24;
        }

        if (this.sunMaterial) {
            this.sunMaterial.uniforms.time.value = time;
        }

        if (this.config.orbitSpeed > 0) {
            this.orbitAngle += this.config.orbitSpeed * delta;
            this.updateOrbitPosition();
        }

        const targetScale = 1
            + this.targetOverview * this.getOverviewScaleBoost()
            + this.targetFocus * 0.025
            + this.targetHover * 0.035;
        this.currentScale = THREE.MathUtils.lerp(this.currentScale, targetScale, 1 - Math.pow(0.001, delta));
        this.planetGroup.scale.setScalar(this.currentScale);
        this.setOrbitHighlight(this.targetHover > 0.1);

        if (this.ringMaterial) {
            const ringVisibility = THREE.MathUtils.clamp(
                this.targetFocus * 0.94 + this.targetOverview * 0.62 + this.targetHover * 0.24,
                0,
                1
            );
            const maxOpacity = this.config.name === 'Saturn' ? 0.96 : 0.88;
            this.ringMaterial.opacity = ringVisibility * maxOpacity;
        }
    }

    public getOrbitLine() {
        return this.orbitLine;
    }

    public inspectRotate(deltaX: number, deltaY: number) {
        const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), deltaX * 0.0034);
        const pitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), deltaY * 0.0034);
        this.manualRotation.multiplyQuaternions(yaw, pitch);
    }

    public dispose() {
        this.disposableGeometries.forEach(geometry => geometry.dispose());
        this.materials.forEach(material => material.dispose());
        this.disposableTextures.forEach(texture => texture.dispose());
    }
}

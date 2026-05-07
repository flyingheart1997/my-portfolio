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
    private cloudLayer: THREE.Mesh | null = null;
    private readonly manualRotation = new THREE.Quaternion();
    private currentScale = 1;
    private targetFocus = 0;
    private targetHover = 0;

    constructor(config: PlanetConfig, textureLoader: THREE.TextureLoader, sharedGeometry: THREE.SphereGeometry) {
        this.config = config;
        this.orbitGroup = new THREE.Group();
        this.planetGroup = new THREE.Group();

        this.orbitGroup.rotation.y = config.orbitalPhase;
        this.planetGroup.position.x = config.distance;

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
            depthWrite: false
        };

        if (this.config.ringTextureUrl) {
            const ringTexture = this.loadTexture(textureLoader, this.config.ringTextureUrl);
            materialOptions.map = ringTexture;
            materialOptions.alphaMap = ringTexture;
            materialOptions.color = 0xffffff;
        }

        const material = new THREE.MeshBasicMaterial(materialOptions);
        const rings = new THREE.Mesh(geometry, material);
        rings.rotation.x = this.config.ring.tilt;
        rings.rotation.z = this.config.axialTilt * 0.35;
        rings.userData.skipRaycast = true;

        this.disposableGeometries.push(geometry);
        this.materials.push(material);
        this.planetGroup.add(rings);
    }

    private addSunLight() {
        const light = new THREE.PointLight(0xfff0c7, 420, 900, 1.45);
        this.planetGroup.add(light);

        const glowGeo = new THREE.SphereGeometry(this.config.radius * 1.18, 48, 32);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xff9d1f,
            transparent: true,
            opacity: 0.24,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.userData.skipRaycast = true;
        this.disposableGeometries.push(glowGeo);
        this.materials.push(glowMat);
        this.planetGroup.add(glow);
    }

    private createOrbitRing() {
        const segments = 720;
        const points: THREE.Vector3[] = [];

        for (let index = 0; index < segments; index += 1) {
            const angle = (index / segments) * Math.PI * 2;
            points.push(new THREE.Vector3(
                Math.cos(angle) * this.config.distance,
                0,
                Math.sin(angle) * this.config.distance
            ));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0x8aa4c8,
            transparent: true,
            opacity: 0.14,
            depthWrite: false
        });

        this.orbitLine = new THREE.LineLoop(geometry, material);
        this.orbitLine.userData.skipRaycast = true;
        this.disposableGeometries.push(geometry);
        this.materials.push(material);
    }

    public setFocusStrength(strength: number) {
        this.targetFocus = THREE.MathUtils.clamp(strength, 0, 1);
    }

    public setHover(active: boolean) {
        this.targetHover = active ? 1 : 0;
    }

    public setOrbitHighlight(highlight: boolean) {
        if (!this.orbitLine) return;

        const material = this.orbitLine.material as THREE.LineBasicMaterial;
        material.opacity = highlight ? 0.44 : 0.14 + this.targetFocus * 0.28;
        material.color.setHex(highlight || this.targetFocus > 0.2 ? 0xdbe9ff : 0x8aa4c8);
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
            this.orbitGroup.rotation.y += this.config.orbitSpeed * delta;
        }

        const targetScale = 1 + this.targetFocus * 0.075 + this.targetHover * 0.07;
        this.currentScale = THREE.MathUtils.lerp(this.currentScale, targetScale, 1 - Math.pow(0.001, delta));
        this.planetGroup.scale.setScalar(this.currentScale);
        this.setOrbitHighlight(this.targetHover > 0.1);
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

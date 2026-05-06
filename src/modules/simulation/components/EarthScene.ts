import * as THREE from 'three';
import { SIMULATION_EARTH_TEXTURE, SIMULATION_SKY_TEXTURE } from '../utils/mapStyles';

export class EarthScene {
    private readonly earth: THREE.Group;
    private readonly sphere: THREE.Mesh;
    private readonly textureLoader = new THREE.TextureLoader();
    private readonly textures: THREE.Texture[] = [];

    constructor(scene: THREE.Scene) {
        this.earth = new THREE.Group();
        (this.earth as any).isEarthGroup = true;

        const earthTexture = this.loadTexture(SIMULATION_EARTH_TEXTURE);
        const skyTexture = this.loadTexture(SIMULATION_SKY_TEXTURE);
        const geometry = new THREE.SphereGeometry(6371, 128, 128);
        const material = new THREE.MeshBasicMaterial({
            map: earthTexture,
            color: 0xdcefff
        });

        this.sphere = new THREE.Mesh(geometry, material);
        this.earth.add(this.sphere);
        scene.background = skyTexture;
    }

    private loadTexture(url: string): THREE.Texture {
        const texture = this.textureLoader.load(url);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = 8;
        this.textures.push(texture);
        return texture;
    }

    getGroup(): THREE.Group {
        return this.earth;
    }

    update(): void {
        this.sphere.visible = true;
    }

    dispose(): void {
        this.sphere.geometry.dispose();
        (this.sphere.material as THREE.Material).dispose();
        this.textures.forEach(texture => texture.dispose());
    }
}

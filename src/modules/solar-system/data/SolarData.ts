import { SIMULATION_EARTH_TEXTURE } from '@/modules/simulation/utils/mapStyles';

export interface PlanetConfig {
    name: string;
    radius: number;
    distance: number;
    textureUrl: string;
    nightTextureUrl?: string;
    cloudTextureUrl?: string;
    ringTextureUrl?: string;
    rotationSpeed: number;
    orbitSpeed: number;
    orbitalPhase: number;
    axialTilt: number;
    description: string;
    color: number;
    atmosphere?: boolean;
    ring?: {
        innerRadius: number;
        outerRadius: number;
        tilt: number;
        opacity: number;
    };
}

const TEXTURE_BASE = '/textures/solar-system/';

export const DEFAULT_FOCUS_INDEX = 4;
export const FOCUS_PLANET_INDICES = [4, 3, 2, 1, 0, 5, 6, 7, 8];

export const SOLAR_DATA: PlanetConfig[] = [
    {
        name: "Sun",
        radius: 10,
        distance: 0,
        textureUrl: `${TEXTURE_BASE}sun.jpg`,
        rotationSpeed: 0.002,
        orbitSpeed: 0,
        orbitalPhase: 0,
        axialTilt: 0,
        description: "The star at the center of the Solar System. A nearly perfect sphere of hot plasma.",
        color: 0xffcc00
    },
    {
        name: "Mercury",
        radius: 0.65,
        distance: 18,
        textureUrl: `${TEXTURE_BASE}mercury.jpg`,
        rotationSpeed: 0.005,
        orbitSpeed: 0.018,
        orbitalPhase: 1.1,
        axialTilt: 0.0005,
        description: "The smallest planet in the Solar System and the closest to the Sun.",
        color: 0xaaaaaa
    },
    {
        name: "Venus",
        radius: 1.45,
        distance: 30,
        textureUrl: `${TEXTURE_BASE}venus.jpg`,
        rotationSpeed: 0.002,
        orbitSpeed: 0.012,
        orbitalPhase: 2.35,
        axialTilt: 3.096,
        description: "The second planet from the Sun. It is the hottest planet in our solar system.",
        color: 0xe3bb76,
        atmosphere: true
    },
    {
        name: "Earth",
        radius: 1.6,
        distance: 44,
        textureUrl: `${TEXTURE_BASE}earth-day.jpg`,
        nightTextureUrl: SIMULATION_EARTH_TEXTURE,
        cloudTextureUrl: `${TEXTURE_BASE}earth-clouds.jpg`,
        rotationSpeed: 0.01,
        orbitSpeed: 0.01,
        orbitalPhase: 3.05,
        axialTilt: 0.409,
        description: "Our home planet, and the only place we know of so far that’s inhabited by living things.",
        color: 0x66aaff,
        atmosphere: true
    },
    {
        name: "Mars",
        radius: 0.95,
        distance: 60,
        textureUrl: `${TEXTURE_BASE}mars.jpg`,
        rotationSpeed: 0.008,
        orbitSpeed: 0.008,
        orbitalPhase: 4.15,
        axialTilt: 0.439,
        description: "A dusty, cold, desert world with a very thin atmosphere.",
        color: 0xff7c4a,
        atmosphere: true
    },
    {
        name: "Jupiter",
        radius: 6.4,
        distance: 112,
        textureUrl: `${TEXTURE_BASE}jupiter.jpg`,
        rotationSpeed: 0.02,
        orbitSpeed: 0.003,
        orbitalPhase: 5.2,
        axialTilt: 0.054,
        description: "The largest planet in the solar system – more than twice as massive as all the other planets combined.",
        color: 0xd39c7e
    },
    {
        name: "Saturn",
        radius: 5.4,
        distance: 160,
        textureUrl: `${TEXTURE_BASE}saturn.jpg`,
        ringTextureUrl: `${TEXTURE_BASE}saturn-ring.png`,
        rotationSpeed: 0.018,
        orbitSpeed: 0.0024,
        orbitalPhase: 0.7,
        axialTilt: 0.466,
        description: "Adorned with a dazzling, complex system of icy rings, Saturn is unique in our solar system.",
        color: 0xc5ab6e,
        ring: {
            innerRadius: 1.35,
            outerRadius: 2.45,
            tilt: 1.18,
            opacity: 0.86
        }
    },
    {
        name: "Uranus",
        radius: 3.1,
        distance: 205,
        textureUrl: `${TEXTURE_BASE}uranus.jpg`,
        rotationSpeed: 0.012,
        orbitSpeed: 0.0016,
        orbitalPhase: 1.85,
        axialTilt: 1.706,
        description: "The seventh planet from the Sun, Uranus has the third-largest planetary radius.",
        color: 0xbbe1e4,
        atmosphere: true,
        ring: {
            innerRadius: 1.5,
            outerRadius: 1.95,
            tilt: 1.7,
            opacity: 0.25
        }
    },
    {
        name: "Neptune",
        radius: 3.0,
        distance: 245,
        textureUrl: `${TEXTURE_BASE}neptune.jpg`,
        rotationSpeed: 0.011,
        orbitSpeed: 0.0012,
        orbitalPhase: 2.8,
        axialTilt: 0.494,
        description: "Dark, cold, and whipped by supersonic winds, ice giant Neptune is the eighth and most distant solar planet.",
        color: 0x6081ff,
        atmosphere: true
    }
];

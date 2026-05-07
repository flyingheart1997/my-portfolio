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
    orbitEccentricity?: number;
    orbitInclination?: number;
    orbitLongitude?: number;
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
const DEG = Math.PI / 180;

export const DEFAULT_FOCUS_INDEX = 0;
export const FOCUS_PLANET_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8];

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
        orbitEccentricity: 0.206,
        orbitInclination: 7.005 * DEG,
        orbitLongitude: 77.456 * DEG,
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
        orbitEccentricity: 0.007,
        orbitInclination: 3.394 * DEG,
        orbitLongitude: 131.563 * DEG,
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
        orbitEccentricity: 0.017,
        orbitInclination: 0,
        orbitLongitude: 102.937 * DEG,
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
        orbitEccentricity: 0.093,
        orbitInclination: 1.85 * DEG,
        orbitLongitude: 336.041 * DEG,
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
        orbitEccentricity: 0.049,
        orbitInclination: 1.303 * DEG,
        orbitLongitude: 14.753 * DEG,
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
        orbitEccentricity: 0.057,
        orbitInclination: 2.485 * DEG,
        orbitLongitude: 92.431 * DEG,
        axialTilt: 0.466,
        description: "Adorned with a dazzling, complex system of icy rings, Saturn is unique in our solar system.",
        color: 0xc5ab6e,
        ring: {
            innerRadius: 1.42,
            outerRadius: 2.55,
            tilt: 1.08,
            opacity: 0.94
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
        orbitEccentricity: 0.046,
        orbitInclination: 0.773 * DEG,
        orbitLongitude: 170.964 * DEG,
        axialTilt: 1.706,
        description: "The seventh planet from the Sun, Uranus has the third-largest planetary radius.",
        color: 0xbbe1e4,
        atmosphere: true,
        ring: {
            innerRadius: 1.34,
            outerRadius: 2.62,
            tilt: 1.7,
            opacity: 0.86
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
        orbitEccentricity: 0.011,
        orbitInclination: 1.77 * DEG,
        orbitLongitude: 44.971 * DEG,
        axialTilt: 0.494,
        description: "Dark, cold, and whipped by supersonic winds, ice giant Neptune is the eighth and most distant solar planet.",
        color: 0x6081ff,
        atmosphere: true
    }
];

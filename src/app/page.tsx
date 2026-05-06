import { OriginalSimulation } from "@/modules/simulation/components/OriginalSimulation";
import { ManualGroundStation } from "@/modules/simulation/types";

const DEMO_START_TIME = Date.UTC(2026, 0, 1, 0, 0, 0);
const SATELLITE_CATEGORIES = ['operational', 'communication', 'weather', 'gps'];

const MOCK_SATELLITES = Array.from({ length: 20 }).map((_, i) => {
    const planeIdx = Math.floor(i / 5);
    const satIdxInPlane = i % 5;
    const openEndedOrbit = i < 2;

    return {
        id: `SAT-${i + 1}`,
        name: `ANTARIS-S${i + 1}`,
        altitude: 450,
        inclination: 15 + (planeIdx * 25),
        eccentricity: 0.001,
        RAAN: (planeIdx * 90) + (satIdxInPlane * 18),
        AP: 0,
        TA: satIdxInPlane * 72,
        startTime: DEMO_START_TIME,
        category: SATELLITE_CATEGORIES[i % SATELLITE_CATEGORIES.length],
        ...(openEndedOrbit ? {} : { endTime: DEMO_START_TIME + 130 * 60 * 1000 })
    };
});

const MOCK_GROUND_STATIONS: ManualGroundStation[] = [
    { id: 'GS-M1', name: 'Mondal Base Alpha', latitude: 22.57, longitude: 88.36, country: 'India', countryCode: 'IND', agency: 'MONDAL-AERO', type: 'research', status: 'active' },
    { id: 'GS-M2', name: 'Antaris Polar', latitude: -77.85, longitude: 166.67, country: 'Antarctica', countryCode: 'ATA', agency: 'MONDAL-AERO', type: 'military', status: 'active' },
    { id: 'GS-M3', name: 'High Sky Base', latitude: 40.71, longitude: -74.01, country: 'USA', countryCode: 'US', agency: 'MONDAL-AERO', type: 'civilian', status: 'active' }
];

export default function Home() {
    return (
        <main
            style={{
                width: '100vw',
                height: '100vh',
                margin: 0,
                background: '#02040a'
            }}
        >
            <OriginalSimulation
                satellites={MOCK_SATELLITES}
                groundStations={MOCK_GROUND_STATIONS}
            />
        </main>
    );
}

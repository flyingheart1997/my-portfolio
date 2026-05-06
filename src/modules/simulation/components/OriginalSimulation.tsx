'use client';

import React, { useEffect, useRef, useState } from 'react';
import { KeplerParams, ManualGroundStation, DashboardType } from '../types';
import { simulationView } from './SimulationManager';
import { simulationStore } from '../stores/simulationStore';

interface OriginalSimulationProps {
    satellites?: KeplerParams[];
    groundStations?: ManualGroundStation[];
    dashboardType?: DashboardType;
}

export const OriginalSimulation: React.FC<OriginalSimulationProps> = ({
    satellites = [],
    groundStations = [],
    dashboardType = 'simulation'
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (containerRef.current && isMounted) {
            if (satellites.length > 0 || groundStations.length > 0) {
                simulationStore.seedManualData(satellites, groundStations);
            }
            simulationStore.setDashboardType(dashboardType);
            simulationView.show(containerRef.current);
        }

        return () => {
            simulationView.hide();
        };
    }, [isMounted, satellites, groundStations, dashboardType]);

    if (!isMounted) return null;

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                position: 'relative',
                background: '#000',
                isolation: 'isolate'
            }}
        />
    );
};

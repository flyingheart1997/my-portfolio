'use client';

import { useEffect, useRef } from 'react';
import { SolarSystemScene } from './SolarSystemScene';
import { NavigationManager } from '../services/NavigationManager';

export const SolarExplorer = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<SolarSystemScene | null>(null);
    const navRef = useRef<NavigationManager | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const scene = new SolarSystemScene(containerRef.current);
        sceneRef.current = scene;
        scene.start();

        const nav = new NavigationManager(scene);
        navRef.current = nav;

        return () => {
            scene.dispose();
            nav.dispose();
        };
    }, []);

    return (
        <div style={{
            position: 'relative',
            minHeight: '100vh',
            background: '#000'
        }}>
            {/* The 3D Canvas fixed in the background */}
            <div
                ref={containerRef}
                style={{
                    width: '100vw',
                    height: '100vh',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    zIndex: 1,
                    pointerEvents: 'auto'
                }}
            />
        </div>
    );
};

'use client';

import { useEffect, useRef, useState } from 'react';
import { SolarSystemScene } from './SolarSystemScene';
import { NavigationManager } from '../services/NavigationManager';
import { FOCUS_PLANET_INDICES, SOLAR_DATA } from '../data/SolarData';
import gsap from 'gsap';

export const SolarExplorer = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const infoRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<SolarSystemScene | null>(null);
    const navRef = useRef<NavigationManager | null>(null);
    const [activeIndex, setActiveIndex] = useState(-1);

    useEffect(() => {
        if (!containerRef.current) return;

        const scene = new SolarSystemScene(containerRef.current);
        sceneRef.current = scene;
        scene.start();

        const nav = new NavigationManager(scene, (index) => {
            setActiveIndex(index);

            if (infoRef.current) {
                gsap.fromTo(infoRef.current,
                    { opacity: 0, y: 18, filter: 'blur(12px)' },
                    { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out' }
                );
            }
        });
        navRef.current = nav;

        return () => {
            scene.dispose();
            nav.dispose();
        };
    }, []);

    const overviewContent = {
        name: 'Solar System',
        description: 'A wide orbital view of the Sun, planets, asteroid belts, and the surrounding star field.'
    };
    const activePlanet = activeIndex === -1 ? overviewContent : SOLAR_DATA[activeIndex];
    const focusStep = Math.max(0, FOCUS_PLANET_INDICES.indexOf(activeIndex));
    const progress = activeIndex === -1 ? 4 : ((focusStep + 1) / FOCUS_PLANET_INDICES.length) * 100;

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

            {/* Scroll Track - This provides the height for document scrolling */}
            <div id="solar-scroller" style={{ height: `${FOCUS_PLANET_INDICES.length * 4200}px`, width: '100%', pointerEvents: 'none' }} />

            {/* Futuristic Planet Info Overlay */}
            {/* <div 
                ref={infoRef}
                style={{
                    position: 'fixed',
                    bottom: '8%',
                    left: '24px',
                    zIndex: 10,
                    color: 'white',
                    maxWidth: 'none',
                    width: 'min(360px, calc(100vw - 48px))',
                    boxSizing: 'border-box',
                    padding: '28px',
                    background: 'linear-gradient(135deg, rgba(6, 12, 23, 0.78), rgba(6, 12, 23, 0.38))',
                    backdropFilter: 'blur(18px) saturate(150%)',
                    WebkitBackdropFilter: 'blur(18px) saturate(150%)',
                    borderRadius: '8px',
                    border: '1px solid rgba(176, 207, 255, 0.16)',
                    boxShadow: '0 18px 50px rgba(0, 0, 0, 0.45)',
                    fontFamily: '"Inter", sans-serif',
                    pointerEvents: 'none'
                }}
            >
                <div style={{ 
                    fontSize: '0.72rem', 
                    letterSpacing: '4px', 
                    opacity: 0.58, 
                    marginBottom: '12px',
                    fontWeight: 600 
                }}>
                    SOLAR FOCUS
                </div>
                <h2 style={{ 
                    fontSize: '3rem', 
                    margin: '0 0 12px 0', 
                    fontWeight: 900, 
                    letterSpacing: 0,
                    textTransform: 'uppercase',
                    lineHeight: 1
                }}>
                    {activePlanet.name}
                </h2>
                <p style={{ 
                    fontSize: '0.95rem', 
                    lineHeight: '1.7', 
                    opacity: 0.76, 
                    fontWeight: 300,
                    margin: '20px 0'
                }}>
                    {activePlanet.description}
                </p>
                
                <div style={{ 
                    width: '100%', 
                    height: '2px', 
                    background: 'rgba(255, 255, 255, 0.1)',
                    marginTop: '30px',
                    position: 'relative'
                }}>
                    <div style={{ 
                        width: `${progress}%`, 
                        height: '100%', 
                        background: 'linear-gradient(90deg, #9fc8ff, #ffffff)',
                        transition: 'width 0.7s cubic-bezier(0.19, 1, 0.22, 1)',
                        boxShadow: '0 0 18px rgba(159, 200, 255, 0.85)'
                    }} />
                </div>
            </div> */}

            <div style={{
                position: 'fixed',
                right: 'max(22px, 4vw)',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px'
            }}>
                <div style={{ fontSize: '0.68rem', color: 'white', opacity: 0.42, writingMode: 'vertical-rl', letterSpacing: '2px' }}>
                    SCROLL
                </div>
                <div style={{ width: '1px', height: '104px', background: 'linear-gradient(to bottom, rgba(159,200,255,0.05), #cfe4ff, rgba(159,200,255,0.05))' }} />
            </div>
        </div>
    );
};

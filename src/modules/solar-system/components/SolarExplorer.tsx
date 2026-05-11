'use client';

import { CSSProperties, useEffect, useRef, useState, type TouchEvent, type WheelEvent } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { SolarSystemScene } from './SolarSystemScene';
import { NavigationManager } from '../services/NavigationManager';
import { PORTFOLIO_MISSION_DATA, PortfolioMissionChapter } from '../data/PortfolioMissionData';

type StyleWithVars = CSSProperties & Record<`--${string}`, string | number>;

const SURFACE_THEMES = [
    ['#ffcf62', '#ff7b1a', '#281004', '#ffd58a', 'rgba(255, 126, 24, 0.34)'],
    ['#c8d2db', '#626b75', '#10151b', '#8fd2ff', 'rgba(139, 198, 255, 0.22)'],
    ['#ffd08a', '#b96f24', '#170d05', '#ffe0a8', 'rgba(255, 160, 62, 0.25)'],
    ['#7dc9ff', '#1166bb', '#02172f', '#42f1d2', 'rgba(64, 170, 255, 0.28)'],
    ['#ff9b58', '#a13b20', '#1b0705', '#ffc08a', 'rgba(255, 101, 54, 0.24)'],
    ['#f1d29b', '#9c7441', '#171008', '#f7d288', 'rgba(255, 204, 132, 0.22)'],
    ['#dbc89e', '#7d6843', '#14120c', '#ffe3a6', 'rgba(236, 210, 154, 0.24)'],
    ['#a6ecff', '#5d96aa', '#06181f', '#bff7ff', 'rgba(126, 226, 255, 0.22)'],
    ['#4f8dff', '#092f9b', '#010b2c', '#44e3ff', 'rgba(64, 120, 255, 0.3)']
] as const;

const formatMissionIndex = (index: number) => `0${index + 1}`.slice(-2);

const getSurfaceStyle = (index: number) => {
    const theme = SURFACE_THEMES[index] ?? SURFACE_THEMES[0];

    return {
        '--surface-core': theme[0],
        '--surface-mid': theme[1],
        '--surface-edge': theme[2],
        '--surface-accent': theme[3],
        '--surface-glow': theme[4]
    } as StyleWithVars;
};

const getActionLabel = (category: string) => {
    const normalizedCategory = category.toLowerCase();
    if (normalizedCategory.includes('email')) return 'Send email';
    if (normalizedCategory.includes('linkedin')) return 'Open LinkedIn';
    if (normalizedCategory.includes('github')) return 'Open GitHub';
    if (normalizedCategory.includes('website')) return 'Open website';
    return 'Open signal';
};

const isExternalHref = (href: string) => /^https?:\/\//.test(href);

const getSurfaceScroller = (surface: HTMLElement) => surface.querySelector<HTMLElement>('.resumeGrid');

const getScrollState = (scroller: HTMLElement | null) => {
    if (!scroller) {
        return {
            canScroll: false,
            atTop: true,
            atBottom: true
        };
    }

    const canScroll = scroller.scrollHeight > scroller.clientHeight + 2;

    return {
        canScroll,
        atTop: scroller.scrollTop <= 2,
        atBottom: scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2
    };
};

const CoreBrief = ({
    chapter,
    chapterIndex,
    exiting,
    onSurfaceNavigate,
    onSurfaceRestore
}: {
    chapter: PortfolioMissionChapter;
    chapterIndex: number;
    exiting: boolean;
    onSurfaceNavigate: (deltaY: number) => void;
    onSurfaceRestore: () => void;
}) => {
    const touchStateRef = useRef({
        startY: 0,
        startedAtTop: true,
        startedAtBottom: true
    });
    const wheelBoundaryRef = useRef({
        direction: 0,
        lastWheelAt: 0,
        armed: false
    });

    const handleSurfaceWheel = (event: WheelEvent<HTMLElement>) => {
        const modeMultiplier = event.deltaMode === 1 ? 16 : 1;
        const deltaY = event.deltaY * modeMultiplier;
        if (deltaY === 0) return;

        const scroller = getSurfaceScroller(event.currentTarget);
        const { canScroll, atTop, atBottom } = getScrollState(scroller);
        const movingDown = deltaY > 0;
        const shouldNavigate = !canScroll || (movingDown && atBottom) || (!movingDown && atTop);
        const now = performance.now();
        const direction = Math.sign(deltaY);
        const wheelGap = now - wheelBoundaryRef.current.lastWheelAt;

        if (!shouldNavigate) {
            wheelBoundaryRef.current = {
                direction: 0,
                lastWheelAt: now,
                armed: false
            };
            event.stopPropagation();
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const isSeparateGesture = wheelBoundaryRef.current.armed
            && wheelBoundaryRef.current.direction === direction
            && wheelGap > 280;

        if (!isSeparateGesture) {
            wheelBoundaryRef.current = {
                direction,
                lastWheelAt: now,
                armed: true
            };
            return;
        }

        wheelBoundaryRef.current = {
            direction: 0,
            lastWheelAt: now,
            armed: false
        };
        onSurfaceNavigate(deltaY);
    };

    const handleSurfaceTouchStart = (event: TouchEvent<HTMLElement>) => {
        const touch = event.touches[0];
        if (!touch) return;

        const scroller = getSurfaceScroller(event.currentTarget);
        const { atTop, atBottom } = getScrollState(scroller);
        touchStateRef.current = {
            startY: touch.clientY,
            startedAtTop: atTop,
            startedAtBottom: atBottom
        };
    };

    const handleSurfaceTouchEnd = (event: TouchEvent<HTMLElement>) => {
        const touch = event.changedTouches[0];
        if (!touch) return;

        const deltaY = touchStateRef.current.startY - touch.clientY;
        if (Math.abs(deltaY) < 46) return;

        const movingDown = deltaY > 0;
        const scroller = getSurfaceScroller(event.currentTarget);
        const { canScroll, atTop, atBottom } = getScrollState(scroller);
        const shouldNavigate = !canScroll
            || (movingDown && atBottom && touchStateRef.current.startedAtBottom)
            || (!movingDown && atTop && touchStateRef.current.startedAtTop);

        if (shouldNavigate) {
            onSurfaceNavigate(deltaY);
        }
    };

    const handleOverlayPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement;
        if (target.closest('.flatSurface')) return;

        event.preventDefault();
        event.stopPropagation();
        onSurfaceRestore();
    };

    return (
        <div
            className={`coreBriefOverlay ${exiting ? 'exiting' : 'entering'}`}
            style={getSurfaceStyle(chapterIndex)}
            onPointerDown={handleOverlayPointerDown}
        >
        <div className="surfaceVignette" />

        <section
            className="flatSurface"
            aria-label={`${chapter.section} flat planet surface`}
            onWheel={handleSurfaceWheel}
            onTouchStart={handleSurfaceTouchStart}
            onTouchEnd={handleSurfaceTouchEnd}
        >
            <div className="surfaceTexture" aria-hidden="true" />
            <div className="surfaceScan" aria-hidden="true" />

            <div className="resumeBoard">
                <header className="resumeHero">
                    <div className="resumeAvatar typeLine" aria-hidden="true">
                        KM
                    </div>
                    <div className="resumeHeading">
                        <h2 className={`typeLine ${chapterIndex === 0 ? 'singleLineTitle' : ''}`}>{chapter.title}</h2>
                        <p className="typeLine">{chapter.subtitle}</p>
                    </div>
                    <div className="resumeMeta typeLine">
                        <span>{chapterIndex === 0 ? 'Pune, India' : `Mission ${formatMissionIndex(chapterIndex)}`}</span>
                        <b>{chapter.section}</b>
                    </div>
                </header>

                <section className="resumeImpact typeLine" style={{ '--text-delay': '760ms' } as StyleWithVars}>
                    {chapter.impact}
                </section>

                <div className="resumeGrid">
                    {chapter.callouts.slice(0, 2).map((callout, index) => (
                        <article
                            className="resumeCell"
                            key={`${callout.category}-${callout.title}`}
                            style={{ '--module-delay': `${940 + index * 120}ms` } as StyleWithVars}
                        >
                            <span className="resumeLabel">{callout.category}</span>
                            <h3>{callout.title}</h3>
                            <p>{callout.subtitle}</p>
                            <ul>
                                {callout.highlights.map(highlight => (
                                    <li key={highlight}>{highlight}</li>
                                ))}
                            </ul>
                            <div className="resumeMiniTags" aria-label={`${callout.title} signals`}>
                                {callout.tags.slice(0, 3).map((tag, tagIndex) => (
                                    <small
                                        key={tag}
                                        style={{
                                            '--pill-delay': `${1210 + index * 120 + tagIndex * 82}ms`
                                        } as StyleWithVars}
                                    >
                                        {tag}
                                    </small>
                                ))}
                            </div>
                            {callout.href ? (
                                <a
                                    className="resumeLink"
                                    href={callout.href}
                                    target={isExternalHref(callout.href) ? '_blank' : undefined}
                                    rel={isExternalHref(callout.href) ? 'noreferrer' : undefined}
                                >
                                    {getActionLabel(callout.category)}
                                </a>
                            ) : null}
                        </article>
                    ))}

                    {chapter.actionPanel ? (
                        <article
                            className="resumeCell resumeActionCell"
                            style={{ '--module-delay': '1180ms' } as StyleWithVars}
                        >
                            <span className="resumeLabel">{chapter.actionPanel.category}</span>
                            <h3>{chapter.actionPanel.title}</h3>
                            <p>{chapter.actionPanel.subtitle}</p>
                            <ul>
                                {chapter.actionPanel.highlights.map(highlight => (
                                    <li key={highlight}>{highlight}</li>
                                ))}
                            </ul>
                            <a
                                className="resumeDownload"
                                href={chapter.actionPanel.href}
                                download={chapter.actionPanel.download}
                            >
                                {chapter.actionPanel.cta}
                            </a>
                        </article>
                    ) : chapter.tags.length > 0 ? (
                        <article
                            className="resumeCell"
                            style={{ '--module-delay': '1180ms' } as StyleWithVars}
                        >
                            <span className="resumeLabel">{chapter.stackLabel ?? 'Tech Stack'}</span>
                            <div className="resumeStack" aria-label={`${chapter.title} technologies`}>
                                {chapter.tags.map((tag, tagIndex) => (
                                    <small
                                        key={tag}
                                        style={{
                                            '--pill-delay': `${1410 + tagIndex * 58}ms`
                                        } as StyleWithVars}
                                    >
                                        {tag}
                                    </small>
                                ))}
                            </div>
                        </article>
                    ) : null}

                    {chapter.callouts.slice(2, 3).map(callout => (
                        <article
                            className="resumeCell"
                            key={`${callout.category}-${callout.title}`}
                            style={{ '--module-delay': '1300ms' } as StyleWithVars}
                        >
                            <span className="resumeLabel">{callout.category}</span>
                            <h3>{callout.title}</h3>
                            <p>{callout.subtitle}</p>
                            <ul>
                                {callout.highlights.map(highlight => (
                                    <li key={highlight}>{highlight}</li>
                                ))}
                            </ul>
                            {callout.href ? (
                                <a
                                    className="resumeLink"
                                    href={callout.href}
                                    target={isExternalHref(callout.href) ? '_blank' : undefined}
                                    rel={isExternalHref(callout.href) ? 'noreferrer' : undefined}
                                >
                                    {getActionLabel(callout.category)}
                                </a>
                            ) : null}
                        </article>
                    ))}
                </div>
            </div>
        </section>

        <div className="coreHint" aria-hidden="true">
            <span />
            <b>Zoom to restore globe</b>
            <span />
        </div>
        </div>
    );
};

export const SolarExplorer = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<SolarSystemScene | null>(null);
    const navRef = useRef<NavigationManager | null>(null);
    const coreCloseTimerRef = useRef(0);
    const [activePlanetIndex, setActivePlanetIndex] = useState(-1);
    const [, setHoveredPlanetIndex] = useState<number | null>(null);
    const [isSceneReady, setIsSceneReady] = useState(false);
    const [coreBrief, setCoreBrief] = useState({
        render: false,
        exiting: false,
        index: 0
    });

    const activeChapter = PORTFOLIO_MISSION_DATA[coreBrief.index] ?? PORTFOLIO_MISSION_DATA[0];

    const handleSurfaceNavigate = (deltaY: number) => {
        const nav = navRef.current;
        if (!nav) return;

        if (typeof nav.navigateFromSurfaceScroll === 'function') {
            nav.navigateFromSurfaceScroll(deltaY);
            return;
        }

        const legacyNav = nav as unknown as {
            navigateByStep?: (direction: number) => void;
        };
        legacyNav.navigateByStep?.(-Math.sign(deltaY));
    };

    const handleSurfaceRestore = () => {
        const nav = navRef.current;
        if (!nav) return;

        if (typeof nav.restoreFromSurface === 'function') {
            nav.restoreFromSurface();
        }
    };

    useEffect(() => {
        if (!containerRef.current) return;

        const scene = new SolarSystemScene(containerRef.current, setHoveredPlanetIndex);
        sceneRef.current = scene;
        scene.start();
        const readyFrame = window.requestAnimationFrame(() => {
            setIsSceneReady(true);
        });

        const nav = new NavigationManager(
            scene,
            setActivePlanetIndex,
            (open, planetIndex) => {
                window.clearTimeout(coreCloseTimerRef.current);

                if (open) {
                    setCoreBrief({
                        render: true,
                        exiting: false,
                        index: Math.max(planetIndex, 0)
                    });
                    return;
                }

                setCoreBrief(previous => {
                    if (!previous.render) return previous;
                    return { ...previous, exiting: true };
                });

                coreCloseTimerRef.current = window.setTimeout(() => {
                    setCoreBrief(previous => ({
                        ...previous,
                        render: false,
                        exiting: false
                    }));
                }, 620);
            }
        );
        navRef.current = nav;

        return () => {
            window.cancelAnimationFrame(readyFrame);
            window.clearTimeout(coreCloseTimerRef.current);
            scene.dispose();
            nav.dispose();
            sceneRef.current = null;
            navRef.current = null;
            setHoveredPlanetIndex(null);
            setIsSceneReady(false);
        };
    }, []);

    return (
        <div style={{
            position: 'relative',
            minHeight: '100vh',
            background: '#000'
        }}>
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

            {coreBrief.render ? (
                <CoreBrief
                    chapter={activeChapter}
                    chapterIndex={coreBrief.index}
                    exiting={coreBrief.exiting}
                    onSurfaceNavigate={handleSurfaceNavigate}
                    onSurfaceRestore={handleSurfaceRestore}
                    key={`${coreBrief.index}-${coreBrief.exiting ? 'out' : 'in'}`}
                />
            ) : null}

            {isSceneReady && !coreBrief.render && activePlanetIndex < 0 ? (
                <div className="exploreHint" aria-hidden="true">
                    <span className="hintLine left" />
                    <span className="hintText">Zoom to explore</span>
                    <span className="hintLine right" />
                </div>
            ) : null}

            {isSceneReady && !coreBrief.render && activePlanetIndex >= 0 ? (
                <div className="exploreHint focused" aria-hidden="true">
                    <span className="hintLine left" />
                    <span className="hintText">Zoom to flatten surface</span>
                    <span className="hintLine right" />
                </div>
            ) : null}

            <style jsx global>{`
                .coreBriefOverlay {
                    position: fixed;
                    inset: 0;
                    z-index: 6;
                    display: grid;
                    place-items: center;
                    color: #edf7ff;
                    pointer-events: auto;
                    perspective: 1400px;
                    font-family: var(--font-body);
                }

                .surfaceVignette {
                    position: absolute;
                    inset: 0;
                    background:
                        radial-gradient(circle at center, transparent 0 38%, rgba(0, 0, 0, 0.48) 72%, rgba(0, 0, 0, 0.82)),
                        linear-gradient(180deg, rgba(1, 8, 20, 0.16), rgba(0, 0, 0, 0.42));
                    opacity: 0;
                    animation: surfaceVignetteIn 620ms ease forwards;
                }

                .coreBriefOverlay.exiting .surfaceVignette {
                    animation: surfaceVignetteOut 420ms ease forwards;
                }

                .flatSurface {
                    position: relative;
                    z-index: 2;
                    width: min(1080px, calc(100vw - 96px));
                    height: min(600px, calc(100vh - 158px));
                    min-height: 0;
                    display: grid;
                    grid-template-rows: auto 1fr;
                    gap: 0;
                    padding: clamp(18px, 2.4vw, 30px);
                    overflow: hidden;
                    color: #f3f8ff;
                    border: 1px solid color-mix(in srgb, var(--surface-accent), transparent 38%);
                    border-radius: 24px;
                    background:
                        radial-gradient(circle at 24% 16%, color-mix(in srgb, var(--surface-core), white 14%) 0 8%, transparent 22%),
                        radial-gradient(circle at 72% 74%, color-mix(in srgb, var(--surface-mid), white 8%) 0 12%, transparent 34%),
                        radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--surface-core), transparent 24%), color-mix(in srgb, var(--surface-mid), transparent 16%) 48%, var(--surface-edge) 100%),
                        linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.015));
                    box-shadow:
                        0 32px 120px rgba(0, 0, 0, 0.62),
                        0 0 70px var(--surface-glow),
                        inset 0 0 0 1px rgba(255, 255, 255, 0.055),
                        inset 0 -70px 120px rgba(0, 0, 0, 0.28);
                    backdrop-filter: blur(10px) saturate(132%);
                    -webkit-backdrop-filter: blur(10px) saturate(132%);
                    opacity: 0;
                    transform-origin: center center;
                    animation: surfaceFlatten 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    pointer-events: auto;
                    overscroll-behavior: contain;
                }

                .flatSurface::before,
                .flatSurface::after {
                    content: "";
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                }

                .flatSurface::before {
                    background:
                        linear-gradient(90deg, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.26) 45%, rgba(0, 0, 0, 0.42)),
                        linear-gradient(180deg, rgba(0, 0, 0, 0.3), transparent 38%, rgba(0, 0, 0, 0.28)),
                        linear-gradient(112deg, transparent 0 34%, rgba(255, 255, 255, 0.16) 42%, transparent 55%),
                        radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.11), transparent 46%);
                    opacity: 0.92;
                }

                .flatSurface::after {
                    inset: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.085);
                    border-radius: 18px;
                    box-shadow: inset 0 0 32px rgba(0, 0, 0, 0.24);
                }

                .coreBriefOverlay.exiting .flatSurface {
                    animation: surfaceUnflatten 580ms cubic-bezier(0.55, 0, 1, 0.45) forwards;
                }

                .surfaceTexture {
                    position: absolute;
                    inset: -18%;
                    pointer-events: none;
                    background:
                        repeating-linear-gradient(9deg, rgba(255, 255, 255, 0.055) 0 1px, transparent 1px 12px),
                        repeating-linear-gradient(-17deg, rgba(0, 0, 0, 0.12) 0 2px, transparent 2px 22px),
                        radial-gradient(ellipse at 26% 44%, rgba(255, 255, 255, 0.12), transparent 24%),
                        radial-gradient(ellipse at 78% 28%, rgba(0, 0, 0, 0.2), transparent 26%);
                    filter: blur(0.2px);
                    opacity: 0.62;
                    transform: rotate(-3deg);
                }

                .surfaceScan {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    background:
                        linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px),
                        linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px);
                    background-size: 54px 54px;
                    mask-image: radial-gradient(ellipse at center, black 0 62%, transparent 90%);
                    opacity: 0.22;
                }

                .resumeBoard {
                    position: relative;
                    z-index: 2;
                    display: grid;
                    grid-template-rows: minmax(78px, auto) minmax(68px, auto) 1fr;
                    height: 100%;
                    min-height: 0;
                    overflow: hidden;
                    border: 1px solid rgba(255, 255, 255, 0.11);
                    border-radius: 18px;
                    background: transparent;
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045);
                    backdrop-filter: none;
                    -webkit-backdrop-filter: none;
                }

                .resumeHero {
                    display: grid;
                    grid-template-columns: auto minmax(0, 1fr) minmax(132px, auto);
                    gap: 16px;
                    align-items: center;
                    padding: clamp(14px, 1.7vw, 20px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
                }

                .resumeAvatar.typeLine,
                .resumeMeta.typeLine {
                    display: grid;
                }

                .resumeAvatar {
                    display: grid;
                    place-items: center;
                    width: clamp(52px, 4.8vw, 68px);
                    aspect-ratio: 1;
                    color: color-mix(in srgb, var(--surface-accent), white 24%);
                    font-size: clamp(1.12rem, 1.4vw, 1.5rem);
                    font-family: var(--font-code);
                    font-weight: 760;
                    letter-spacing: 0.02em;
                    border-radius: 50%;
                    background:
                        radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.14), transparent 38%),
                        color-mix(in srgb, var(--surface-accent), transparent 80%);
                    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
                }

                .resumeHeading {
                    min-width: 0;
                    display: grid;
                    gap: 5px;
                    align-items: center;
                }

                .resumeHeading h2 {
                    margin: 0;
                    color: #ffffff;
                    font-family: var(--font-display);
                    font-size: clamp(1.82rem, 2.75vw, 2.82rem);
                    line-height: 1.02;
                    font-weight: 880;
                    letter-spacing: 0;
                    text-shadow: 0 3px 18px rgba(0, 0, 0, 0.68);
                }

                .resumeHeading h2.singleLineTitle {
                    white-space: nowrap;
                }

                .resumeHeading p {
                    margin: 0;
                    color: rgba(255, 255, 255, 0.88);
                    font-size: clamp(0.8rem, 1.06vw, 0.96rem);
                    line-height: 1.32;
                    font-weight: 650;
                    text-shadow: 0 2px 14px rgba(0, 0, 0, 0.58);
                }

                .resumeMeta {
                    display: grid;
                    justify-items: end;
                    gap: 5px;
                    min-width: 0;
                    color: rgba(255, 255, 255, 0.88);
                    text-align: right;
                    align-content: center;
                }

                .resumeMeta span {
                    font-size: clamp(0.68rem, 0.82vw, 0.78rem);
                    font-family: var(--font-code);
                    font-weight: 760;
                    white-space: nowrap;
                    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.58);
                }

                .resumeMeta b {
                    color: rgba(255, 255, 255, 0.9);
                    font-size: 0.52rem;
                    font-family: var(--font-code);
                    font-weight: 900;
                    letter-spacing: 0.18em;
                    text-transform: uppercase;
                    white-space: nowrap;
                    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.58);
                }

                .resumeImpact {
                    padding: clamp(13px, 1.7vw, 20px);
                    color: rgba(255, 255, 255, 0.92);
                    font-size: clamp(0.86rem, 1.16vw, 1.02rem);
                    line-height: 1.42;
                    font-weight: 680;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
                    text-shadow: 0 3px 18px rgba(0, 0, 0, 0.66);
                }

                .resumeGrid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    grid-template-rows: repeat(2, minmax(0, 1fr));
                    min-height: 0;
                    overflow: hidden;
                }

                .resumeCell {
                    display: grid;
                    align-content: center;
                    gap: 7px;
                    min-width: 0;
                    padding: clamp(13px, 1.55vw, 18px);
                    border-right: 1px solid rgba(255, 255, 255, 0.12);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
                    background: transparent;
                    opacity: 0;
                    transform: translate3d(0, 12px, 0);
                    animation: surfaceModuleIn 520ms var(--module-delay) cubic-bezier(0.19, 1, 0.22, 1) forwards;
                }

                .resumeCell:nth-child(2n) {
                    border-right: 0;
                }

                .resumeCell:nth-last-child(-n + 2) {
                    border-bottom: 0;
                }

                .coreBriefOverlay.exiting .resumeCell {
                    animation: surfaceModuleOut 240ms ease forwards;
                }

                .resumeLabel {
                    width: max-content;
                    max-width: 100%;
                    color: rgba(255, 232, 186, 0.82);
                    font-size: 0.58rem;
                    font-family: var(--font-code);
                    font-weight: 900;
                    letter-spacing: 0.18em;
                    line-height: 1;
                    text-transform: uppercase;
                    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.66);
                }

                .resumeCell h3 {
                    margin: 0;
                    color: #ffffff;
                    font-family: var(--font-display);
                    font-size: clamp(0.96rem, 1.2vw, 1.16rem);
                    line-height: 1.12;
                    font-weight: 840;
                    letter-spacing: 0;
                    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.45);
                }

                .resumeCell p {
                    margin: 0;
                    color: rgba(255, 255, 255, 0.84);
                    font-size: clamp(0.7rem, 0.88vw, 0.8rem);
                    line-height: 1.32;
                    font-weight: 620;
                    text-shadow: 0 2px 14px rgba(0, 0, 0, 0.62);
                }

                .resumeCell ul {
                    display: grid;
                    gap: 6px;
                    margin: 0;
                    padding: 0;
                    list-style: none;
                }

                .resumeCell li {
                    position: relative;
                    padding-left: 18px;
                    color: rgba(255, 255, 255, 0.88);
                    font-size: clamp(0.66rem, 0.82vw, 0.76rem);
                    line-height: 1.3;
                    font-weight: 560;
                    text-shadow: 0 2px 14px rgba(0, 0, 0, 0.62);
                }

                .resumeCell li::before {
                    content: "";
                    position: absolute;
                    left: 3px;
                    top: 0.35em;
                    width: 8px;
                    height: 5px;
                    border-left: 2px solid color-mix(in srgb, var(--surface-accent), #6ee75f 38%);
                    border-bottom: 2px solid color-mix(in srgb, var(--surface-accent), #6ee75f 38%);
                    transform: rotate(-45deg);
                }

                .resumeMiniTags,
                .resumeStack {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }

                .resumeMiniTags small,
                .resumeStack small {
                    display: inline-flex;
                    align-items: center;
                    min-height: 22px;
                    padding: 5px 9px 4px;
                    color: #fff3d7;
                    font-size: clamp(0.62rem, 0.76vw, 0.7rem);
                    font-family: var(--font-code);
                    font-weight: 760;
                    line-height: 1;
                    border: 1px solid color-mix(in srgb, var(--surface-accent), transparent 42%);
                    border-radius: 999px;
                    background: rgba(0, 0, 0, 0.28);
                    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.54);
                    opacity: 0;
                    transform: translate3d(0, 7px, 0) scale(0.94);
                    animation: pillReveal 420ms var(--pill-delay) cubic-bezier(0.19, 1, 0.22, 1) forwards;
                    will-change: transform, opacity;
                }

                .coreBriefOverlay.exiting .resumeMiniTags small,
                .coreBriefOverlay.exiting .resumeStack small {
                    animation: pillExit 180ms ease forwards;
                }

                .resumeCell a {
                    width: max-content;
                    max-width: 100%;
                    color: color-mix(in srgb, var(--surface-accent), white 20%);
                    font-size: 0.56rem;
                    font-family: var(--font-code);
                    font-weight: 900;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    text-decoration: none;
                    pointer-events: auto;
                }

                .resumeCell a.resumeDownload {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 30px;
                    margin-top: 2px;
                    padding: 8px 12px 7px;
                    color: #081016;
                    font-size: clamp(0.64rem, 0.78vw, 0.72rem);
                    letter-spacing: 0.1em;
                    border: 1px solid color-mix(in srgb, var(--surface-accent), white 16%);
                    border-radius: 999px;
                    background:
                        linear-gradient(135deg, color-mix(in srgb, var(--surface-accent), white 36%), color-mix(in srgb, var(--surface-accent), white 4%));
                    box-shadow:
                        0 0 22px color-mix(in srgb, var(--surface-glow), transparent 38%),
                        inset 0 1px 0 rgba(255, 255, 255, 0.42);
                    text-shadow: none;
                }

                .surfaceHeader,
                .surfaceBody {
                    position: relative;
                    z-index: 2;
                }

                .surfaceHeader {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    padding-bottom: 14px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.14);
                }

                .surfaceHeader span,
                .surfaceHeader b,
                .surfaceEyebrow {
                    font-size: 0.66rem;
                    font-weight: 900;
                    letter-spacing: 0.24em;
                    line-height: 1;
                    text-transform: uppercase;
                }

                .surfaceHeader span,
                .surfaceEyebrow {
                    color: color-mix(in srgb, var(--surface-accent), white 10%);
                }

                .surfaceHeader b {
                    color: rgba(255, 255, 255, 0.82);
                }

                .surfaceBody {
                    display: grid;
                    grid-template-columns: minmax(340px, 0.92fr) minmax(480px, 1.08fr);
                    gap: clamp(24px, 3.2vw, 48px);
                    align-items: center;
                }

                .surfaceIdentity {
                    display: grid;
                    align-content: center;
                    gap: 13px;
                    min-width: 0;
                }

                .surfaceIdentity h2 {
                    max-width: min(760px, 100%);
                    margin: 0;
                    color: #ffffff;
                    font-size: clamp(2.35rem, 4.2vw, 4.35rem);
                    line-height: 0.98;
                    font-weight: 940;
                    letter-spacing: 0;
                    text-shadow: 0 16px 60px rgba(0, 0, 0, 0.42);
                }

                .surfaceIdentity h2.singleLineTitle {
                    font-size: clamp(3rem, 5.6vw, 6.2rem);
                    white-space: nowrap;
                }

                .surfaceIdentity p {
                    max-width: 560px;
                    margin: 0;
                    color: rgba(245, 249, 255, 0.76);
                    font-size: clamp(0.92rem, 1.4vw, 1.08rem);
                    line-height: 1.58;
                    font-weight: 650;
                }

                .surfaceImpact {
                    position: relative;
                    display: grid;
                    gap: 6px;
                    margin-top: 6px;
                    padding: 16px 18px;
                    color: rgba(240, 248, 255, 0.9);
                    border-left: 2px solid color-mix(in srgb, var(--surface-accent), white 10%);
                    background:
                        linear-gradient(90deg, rgba(0, 0, 0, 0.34), rgba(255, 255, 255, 0.045)),
                        rgba(0, 0, 0, 0.14);
                    font-style: normal;
                }

                .surfaceImpact span {
                    color: color-mix(in srgb, var(--surface-accent), white 8%);
                    font-size: 0.58rem;
                    font-weight: 900;
                    letter-spacing: 0.18em;
                    text-transform: uppercase;
                }

                .surfaceImpact b {
                    color: rgba(246, 250, 255, 0.9);
                    font-size: 0.86rem;
                    line-height: 1.5;
                    font-weight: 740;
                }

                .surfaceTags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-top: 4px;
                }

                .surfaceTag {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    min-height: 26px;
                    padding: 7px 12px 6px;
                    color: rgba(255, 255, 255, 0.9);
                    font-size: 0.62rem;
                    font-weight: 860;
                    line-height: 1;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    border: 1px solid rgba(255, 255, 255, 0.22);
                    border-radius: 999px;
                    background:
                        linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(0, 0, 0, 0.18)),
                        color-mix(in srgb, var(--surface-accent), transparent 86%);
                    box-shadow:
                        inset 0 0 0 1px rgba(255, 255, 255, 0.035),
                        0 8px 20px rgba(0, 0, 0, 0.12);
                }

                .surfaceTag::before {
                    content: "";
                    width: 5px;
                    height: 5px;
                    border-radius: 50%;
                    background: color-mix(in srgb, var(--surface-accent), white 12%);
                    box-shadow: 0 0 10px var(--surface-glow);
                }

                .surfaceModules {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 10px;
                    align-content: center;
                }

                .surfaceModule {
                    min-width: 0;
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-areas:
                        "label"
                        "title"
                        "subtitle"
                        "tags"
                        "points"
                        "link";
                    gap: 8px;
                    align-content: start;
                    padding: 16px 17px;
                    border: 1px solid rgba(255, 255, 255, 0.14);
                    border-left: 2px solid color-mix(in srgb, var(--surface-accent), white 4%);
                    background:
                        linear-gradient(105deg, rgba(4, 9, 18, 0.58), rgba(0, 0, 0, 0.26)),
                        rgba(255, 255, 255, 0.035);
                    box-shadow:
                        inset 0 1px 0 rgba(255, 255, 255, 0.06),
                        0 12px 30px rgba(0, 0, 0, 0.16);
                    opacity: 0;
                    transform: translate3d(0, 14px, 0);
                    animation: surfaceModuleIn 520ms var(--module-delay) cubic-bezier(0.19, 1, 0.22, 1) forwards;
                }

                .coreBriefOverlay.exiting .surfaceModule {
                    animation: surfaceModuleOut 240ms ease forwards;
                }

                .surfaceModule span {
                    grid-area: label;
                    width: max-content;
                    max-width: 100%;
                    padding: 7px 10px 6px;
                    color: color-mix(in srgb, var(--surface-accent), white 8%);
                    font-size: 0.56rem;
                    font-weight: 900;
                    letter-spacing: 0.18em;
                    text-transform: uppercase;
                    border: 1px solid color-mix(in srgb, var(--surface-accent), transparent 58%);
                    border-radius: 999px;
                    background:
                        linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(0, 0, 0, 0.16)),
                        color-mix(in srgb, var(--surface-accent), transparent 88%);
                }

                .surfaceModule h3 {
                    grid-area: title;
                    margin: 0;
                    color: #ffffff;
                    font-size: clamp(1rem, 1.35vw, 1.24rem);
                    line-height: 1.12;
                    font-weight: 880;
                    letter-spacing: 0;
                }

                .surfaceModule p {
                    grid-area: subtitle;
                    margin: 0;
                    color: rgba(241, 246, 255, 0.66);
                    font-size: 0.72rem;
                    line-height: 1.45;
                    font-weight: 650;
                }

                .moduleTags {
                    grid-area: tags;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }

                .moduleTags small {
                    display: inline-flex;
                    align-items: center;
                    min-height: 20px;
                    padding: 4px 7px 3px;
                    color: rgba(255, 255, 255, 0.78);
                    font-size: 0.54rem;
                    font-weight: 850;
                    letter-spacing: 0.08em;
                    line-height: 1;
                    text-transform: uppercase;
                    border: 1px solid rgba(255, 255, 255, 0.13);
                    background: rgba(0, 0, 0, 0.18);
                }

                .surfaceModule ul {
                    grid-area: points;
                    display: grid;
                    gap: 6px;
                    margin: 0;
                    padding: 0;
                    list-style: none;
                }

                .surfaceModule li {
                    position: relative;
                    padding-left: 12px;
                    color: rgba(245, 249, 255, 0.72);
                    font-size: 0.72rem;
                    line-height: 1.42;
                    font-weight: 520;
                }

                .surfaceModule li::before {
                    content: "";
                    position: absolute;
                    left: 0;
                    top: 0.58em;
                    width: 4px;
                    height: 4px;
                    border-radius: 50%;
                    background: color-mix(in srgb, var(--surface-accent), white 12%);
                    box-shadow: 0 0 10px var(--surface-glow);
                }

                .surfaceModule a {
                    grid-area: link;
                    width: max-content;
                    margin-top: 2px;
                    color: color-mix(in srgb, var(--surface-accent), white 12%);
                    font-size: 0.62rem;
                    font-weight: 900;
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                    text-decoration: none;
                    pointer-events: auto;
                }

                .typeLine {
                    display: block;
                    max-width: 100%;
                    opacity: 0;
                    clip-path: inset(0 100% 0 0);
                    animation: textType 560ms steps(30, end) forwards;
                    animation-delay: var(--text-delay, 620ms);
                }

                .coreBriefOverlay.exiting .typeLine {
                    animation: textOut 220ms ease forwards;
                }

                .coreHint,
                .exploreHint {
                    position: fixed;
                    left: 50%;
                    bottom: 30px;
                    z-index: 7;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    transform: translateX(-50%);
                    pointer-events: none;
                    color: rgba(232, 242, 255, 0.74);
                    font-family: var(--font-code);
                    opacity: 0;
                    animation: hintReveal 720ms 520ms ease forwards;
                }

                .coreHint {
                    z-index: 8;
                    animation-delay: 1280ms;
                }

                .hintText,
                .coreHint b {
                    font-size: 0.68rem;
                    font-weight: 850;
                    letter-spacing: 0.24em;
                    line-height: 1;
                    text-transform: uppercase;
                    text-shadow: 0 0 18px rgba(138, 195, 255, 0.36);
                    white-space: nowrap;
                }

                .hintLine,
                .coreHint span {
                    position: relative;
                    width: clamp(70px, 10vw, 148px);
                    height: 10px;
                    overflow: hidden;
                }

                .hintLine::before,
                .coreHint span::before {
                    content: "";
                    position: absolute;
                    inset: 0;
                    clip-path: polygon(0 19%, 100% 46%, 100% 54%, 0 81%);
                    background: linear-gradient(90deg, rgba(255, 204, 120, 0.82), rgba(70, 229, 255, 0.36), transparent);
                    filter: drop-shadow(0 0 10px rgba(56, 213, 255, 0.28));
                }

                .hintLine.left,
                .coreHint span:first-child {
                    transform: scaleX(-1);
                }

                .exploreHint.focused .hintText {
                    color: rgba(255, 213, 142, 0.82);
                }

                @keyframes surfaceVignetteIn {
                    to {
                        opacity: 1;
                    }
                }

                @keyframes surfaceVignetteOut {
                    from {
                        opacity: 1;
                    }
                    to {
                        opacity: 0;
                    }
                }

                @keyframes surfaceFlatten {
                    0% {
                        opacity: 0;
                        border-radius: 50%;
                        transform: translate3d(0, 30px, 0) rotateX(64deg) scale(0.28);
                        filter: blur(2px) brightness(1.18);
                    }
                    38% {
                        opacity: 1;
                        border-radius: 50%;
                        transform: translate3d(0, 2px, 0) rotateX(34deg) scale(0.58);
                    }
                    100% {
                        opacity: 1;
                        border-radius: 24px;
                        transform: translate3d(0, 0, 0) rotateX(0deg) scale(1);
                        filter: blur(0) brightness(1);
                    }
                }

                @keyframes surfaceUnflatten {
                    from {
                        opacity: 1;
                        border-radius: 24px;
                        transform: translate3d(0, 0, 0) rotateX(0deg) scale(1);
                    }
                    to {
                        opacity: 0;
                        border-radius: 50%;
                        transform: translate3d(0, 24px, 0) rotateX(58deg) scale(0.32);
                        filter: blur(1.4px) brightness(1.18);
                    }
                }

                @keyframes surfaceModuleIn {
                    to {
                        opacity: 1;
                        transform: translate3d(0, 0, 0);
                    }
                }

                @keyframes surfaceModuleOut {
                    to {
                        opacity: 0;
                        transform: translate3d(0, 8px, 0);
                    }
                }

                @keyframes pillReveal {
                    0% {
                        opacity: 0;
                        transform: translate3d(0, 7px, 0) scale(0.94);
                    }
                    72% {
                        opacity: 1;
                        transform: translate3d(0, -1px, 0) scale(1.015);
                    }
                    100% {
                        opacity: 1;
                        transform: translate3d(0, 0, 0) scale(1);
                    }
                }

                @keyframes pillExit {
                    to {
                        opacity: 0;
                        transform: translate3d(0, 4px, 0) scale(0.96);
                    }
                }

                @keyframes textType {
                    from {
                        opacity: 1;
                        clip-path: inset(0 100% 0 0);
                    }
                    to {
                        opacity: 1;
                        clip-path: inset(0 0 0 0);
                    }
                }

                @keyframes textOut {
                    to {
                        opacity: 0;
                        clip-path: inset(0 0 0 100%);
                    }
                }

                @keyframes hintReveal {
                    from {
                        opacity: 0;
                        transform: translate3d(-50%, 6px, 0);
                    }
                    to {
                        opacity: 1;
                        transform: translate3d(-50%, 0, 0);
                    }
                }

                @media (max-width: 900px) {
                    .flatSurface {
                        width: calc(100vw - 28px);
                        height: calc(100vh - 118px);
                        min-height: 0;
                        padding: 20px;
                    }

                    .resumeHero {
                        grid-template-columns: auto 1fr;
                    }

                    .resumeMeta {
                        grid-column: 1 / -1;
                        justify-items: start;
                        text-align: left;
                        display: flex;
                        gap: 10px;
                    }

                    .resumeGrid {
                        grid-template-columns: 1fr;
                        grid-template-rows: none;
                        overflow-y: auto;
                        overscroll-behavior: contain;
                        -webkit-overflow-scrolling: touch;
                        touch-action: pan-y;
                    }

                    .resumeCell,
                    .resumeCell:nth-child(2n),
                    .resumeCell:nth-last-child(-n + 2) {
                        border-right: 0;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
                    }

                    .resumeCell:last-child {
                        border-bottom: 0;
                    }

                    .surfaceHeader {
                        align-items: flex-start;
                        flex-direction: column;
                        gap: 7px;
                    }

                    .surfaceBody {
                        grid-template-columns: 1fr;
                        gap: 18px;
                    }

                    .surfaceModules {
                        grid-template-columns: 1fr;
                    }

                    .surfaceModule {
                        grid-template-columns: 1fr;
                        grid-template-areas:
                            "label"
                            "title"
                            "subtitle"
                            "tags"
                            "points"
                            "link";
                    }

                    .surfaceIdentity {
                        align-content: start;
                    }
                }

                @media (max-width: 760px) {
                    .flatSurface {
                        max-height: calc(100vh - 90px);
                        height: calc(100vh - 90px);
                        min-height: 0;
                        overflow: hidden;
                        padding: 12px;
                    }

                    .resumeBoard {
                        grid-template-rows: auto auto 1fr;
                        overflow: hidden;
                    }

                    .surfaceIdentity h2 {
                        font-size: clamp(2rem, 13vw, 3.15rem);
                    }

                    .surfaceIdentity h2.singleLineTitle {
                        font-size: clamp(2.25rem, 11vw, 3.25rem);
                        white-space: normal;
                    }

                    .resumeHero {
                        gap: 12px;
                        padding: 12px;
                    }

                    .resumeAvatar {
                        width: 46px;
                    }

                    .resumeHeading h2,
                    .resumeHeading h2.singleLineTitle {
                        font-size: clamp(1.75rem, 8vw, 2.6rem);
                        white-space: normal;
                    }

                    .resumeImpact {
                        padding: 12px;
                    }

                    .resumeCell {
                        padding: 12px;
                        align-content: start;
                    }

                    .resumeGrid {
                        overflow: auto;
                    }

                    .resumeGrid::-webkit-scrollbar {
                        width: 4px;
                    }

                    .resumeGrid::-webkit-scrollbar-thumb {
                        border-radius: 999px;
                        background: color-mix(in srgb, var(--surface-accent), transparent 52%);
                    }

                    .coreHint,
                    .exploreHint {
                        bottom: 18px;
                        gap: 10px;
                    }

                    .hintText,
                    .coreHint b {
                        font-size: 0.58rem;
                        letter-spacing: 0.18em;
                    }

                    .hintLine,
                    .coreHint span {
                        width: 44px;
                    }
                }
            `}</style>
        </div>
    );
};

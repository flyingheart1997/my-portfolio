'use client';

import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { SolarSystemScene } from './SolarSystemScene';
import { NavigationManager } from '../services/NavigationManager';
import { PORTFOLIO_MISSION_DATA, PortfolioCallout } from '../data/PortfolioMissionData';

interface ScreenAnchor {
    x: number;
    y: number;
    visible: boolean;
    radius: number;
}

interface ViewportSize {
    width: number;
    height: number;
}

interface CalloutLayout {
    left: number;
    top?: number;
    bottom?: number;
    width: number;
    minHeight: number;
    anchorX: number;
    anchorY: number;
    direction: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

interface OverlayLayout {
    hub: CalloutLayout;
    cards: CalloutLayout[];
    allCards: CalloutLayout[];
}

type StyleWithVars = CSSProperties & Record<`--${string}`, string | number>;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getOverlayLayout = (viewport: ViewportSize): OverlayLayout => {
    const isMobile = viewport.width < 760;
    const cardWidth = isMobile ? Math.min(viewport.width - 28, 322) : clamp(viewport.width * 0.25, 350, 392);
    const cardHeight = isMobile ? 132 : 154;
    const edge = isMobile ? 14 : 50;

    const makeLayout = (direction: CalloutLayout['direction']): CalloutLayout => {
        const isLeft = direction.endsWith('left');
        const isTop = direction.startsWith('top');
        const left = isLeft ? edge : viewport.width - cardWidth - edge;
        const top = isTop ? edge : undefined;
        const bottom = isTop ? undefined : edge;
        const anchorY = isTop
            ? edge + cardHeight / 2
            : viewport.height - edge - cardHeight / 2;

        return {
            left,
            top,
            bottom,
            width: cardWidth,
            minHeight: cardHeight,
            anchorX: isLeft ? left + cardWidth : left,
            anchorY,
            direction
        };
    };

    const hub = makeLayout('top-left');
    const cards = [
        makeLayout('top-right'),
        makeLayout('bottom-left'),
        makeLayout('bottom-right')
    ];

    return {
        hub,
        cards,
        allCards: [hub, ...cards]
    };
};

const getConnectorPath = (from: ScreenAnchor, card: CalloutLayout) => {
    const isLeft = card.direction.endsWith('left');
    const elbowX = card.anchorX + (isLeft ? 72 : -72);
    const elbowY = card.anchorY;
    const directionX = elbowX - from.x;
    const directionY = elbowY - from.y;
    const length = Math.max(Math.hypot(directionX, directionY), 1);
    const startPadding = Math.min(Math.max(from.radius + 14, 22), Math.max(length - 36, 22));
    const startX = from.x + (directionX / length) * startPadding;
    const startY = from.y + (directionY / length) * startPadding;

    return `M ${startX} ${startY} L ${elbowX} ${elbowY} L ${card.anchorX} ${card.anchorY}`;
};

const CalloutCard = ({
    callout,
    index,
    layout
}: {
    callout: PortfolioCallout;
    index: number;
    layout: CalloutLayout;
}) => {
    const style = {
        left: layout.left,
        ...(layout.top !== undefined ? { top: layout.top } : { bottom: layout.bottom }),
        width: layout.width,
        minHeight: layout.minHeight,
        '--card-delay': `${760 + index * 260}ms`,
        '--card-min-height': `${layout.minHeight}px`
    } satisfies StyleWithVars;
    const content = (
        <>
            <div className="calloutHeader">
                <span className="typeLine">{callout.category}</span>
                {callout.href ? <b className="typeLine">OPEN</b> : null}
            </div>
            <h3 className="typeLine">{callout.title}</h3>
            <p className="calloutSubtitle typeLine">{callout.subtitle}</p>
            <div className="calloutDetails">
                {callout.details.map((detail, detailIndex) => (
                    <p
                        className="typeLine"
                        key={detail}
                        style={{ '--text-delay': `${1370 + index * 260 + detailIndex * 120}ms` } as StyleWithVars}
                    >
                        {detail}
                    </p>
                ))}
            </div>
        </>
    );

    if (callout.href) {
        return (
            <a className="calloutCard" href={callout.href} target="_blank" rel="noreferrer" style={style}>
                {content}
            </a>
        );
    }

    return (
        <div className="calloutCard" style={style}>
            {content}
        </div>
    );
};

const CategoryHub = ({
    section,
    title,
    subtitle,
    mode,
    layout
}: {
    section: string;
    title: string;
    subtitle: string;
    mode: string;
    layout: CalloutLayout;
}) => {
    const style = {
        left: layout.left,
        ...(layout.top !== undefined ? { top: layout.top } : { bottom: layout.bottom }),
        width: layout.width,
        minHeight: layout.minHeight,
        '--card-delay': '420ms',
        '--card-min-height': `${layout.minHeight}px`
    } satisfies StyleWithVars;

    return (
        <div className="categoryHub" style={style}>
            <span className="typeLine">{mode}</span>
            <h2 className="typeLine">{section}</h2>
            <p className="typeLine">{title}</p>
            <b className="typeLine">{subtitle}</b>
        </div>
    );
};

export const SolarExplorer = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<SolarSystemScene | null>(null);
    const navRef = useRef<NavigationManager | null>(null);
    const selectedIndexRef = useRef(0);
    const [activePlanetIndex, setActivePlanetIndex] = useState(-1);
    const [hoveredPlanetIndex, setHoveredPlanetIndex] = useState<number | null>(null);
    const [viewport, setViewport] = useState<ViewportSize>({ width: 1440, height: 900 });
    const [planetAnchor, setPlanetAnchor] = useState<ScreenAnchor>({ x: 720, y: 450, visible: false, radius: 0 });
    const [renderOverlay, setRenderOverlay] = useState(false);
    const [isOverlayExiting, setIsOverlayExiting] = useState(false);
    const [displayedOverlay, setDisplayedOverlay] = useState({ index: 0, preview: false });

    const selectedPlanetIndex = activePlanetIndex >= 0 ? activePlanetIndex : 0;
    const isPreview = false;
    const shouldShowOverlay = activePlanetIndex >= 0;
    const overlayPlanetIndex = renderOverlay ? displayedOverlay.index : selectedPlanetIndex;
    const activeChapter = PORTFOLIO_MISSION_DATA[overlayPlanetIndex] ?? PORTFOLIO_MISSION_DATA[0];
    const overlayLayout = useMemo(
        () => getOverlayLayout(viewport),
        [viewport]
    );

    useEffect(() => {
        selectedIndexRef.current = selectedPlanetIndex;
    }, [selectedPlanetIndex]);

    useEffect(() => {
        let timeoutId = 0;

        if (shouldShowOverlay) {
            setDisplayedOverlay({ index: selectedPlanetIndex, preview: isPreview });
            setRenderOverlay(true);
            setIsOverlayExiting(false);
            return () => window.clearTimeout(timeoutId);
        }

        if (renderOverlay) {
            setIsOverlayExiting(true);
            timeoutId = window.setTimeout(() => {
                setRenderOverlay(false);
                setIsOverlayExiting(false);
            }, 560);
        }

        return () => window.clearTimeout(timeoutId);
    }, [isPreview, renderOverlay, selectedPlanetIndex, shouldShowOverlay]);

    useEffect(() => {
        if (!containerRef.current) return;

        const syncViewport = () => {
            const rect = containerRef.current?.getBoundingClientRect();
            setViewport({
                width: rect?.width || window.innerWidth,
                height: rect?.height || window.innerHeight
            });
        };

        const scene = new SolarSystemScene(containerRef.current, setHoveredPlanetIndex);
        sceneRef.current = scene;
        scene.start();

        const nav = new NavigationManager(scene, setActivePlanetIndex);
        navRef.current = nav;

        syncViewport();
        window.addEventListener('resize', syncViewport);

        let frameId = 0;
        const syncAnchor = () => {
            const position = scene.getPlanetScreenPosition(selectedIndexRef.current);

            if (position) {
                setPlanetAnchor(previous => {
                    const next = {
                        x: position.x,
                        y: position.y,
                        visible: position.visible,
                        radius: position.radius
                    };
                    const changed = Math.abs(previous.x - next.x) > 0.5
                        || Math.abs(previous.y - next.y) > 0.5
                        || Math.abs(previous.radius - next.radius) > 0.5
                        || previous.visible !== next.visible;
                    return changed ? next : previous;
                });
            }

            frameId = requestAnimationFrame(syncAnchor);
        };
        syncAnchor();

        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener('resize', syncViewport);
            scene.dispose();
            nav.dispose();
            setHoveredPlanetIndex(null);
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

            {renderOverlay ? (
            <div
                className={`portfolioOverlay ${isOverlayExiting ? 'exiting' : 'entering'}`}
                key={`${overlayPlanetIndex}-${displayedOverlay.preview ? 'preview' : 'focus'}`}
            >
                <svg className="connectorLayer" viewBox={`0 0 ${viewport.width} ${viewport.height}`} aria-hidden="true">
                    <circle className="anchorPulse" cx={planetAnchor.x} cy={planetAnchor.y} r="18" />
                    <circle className="anchorDot" cx={planetAnchor.x} cy={planetAnchor.y} r="3.5" />
                    {overlayLayout.allCards.map((layout, index) => (
                        <path
                            key={`${activeChapter.planet}-${layout.direction}`}
                            className={`connectorLine radialConnector ${index === 0 ? 'primaryConnector' : ''}`}
                            d={getConnectorPath(planetAnchor, layout)}
                            style={{ '--line-delay': `${index * 130}ms` } as StyleWithVars}
                        />
                    ))}
                </svg>

                <CategoryHub
                    section={activeChapter.section}
                    title={activeChapter.title}
                    subtitle={activeChapter.subtitle}
                    mode={displayedOverlay.preview ? 'Preview' : 'Focus'}
                    layout={overlayLayout.hub}
                />

                {activeChapter.callouts.map((callout, index) => (
                    <CalloutCard
                        key={`${activeChapter.planet}-${callout.category}-${callout.title}`}
                        callout={callout}
                        index={index}
                        layout={overlayLayout.cards[index]}
                    />
                ))}

                <div className="chapterRail" aria-hidden="true">
                    {PORTFOLIO_MISSION_DATA.map((chapter, index) => (
                        <span
                            key={chapter.planet}
                            className={index === overlayPlanetIndex ? 'active' : ''}
                        />
                    ))}
                </div>
            </div>
            ) : null}

            {!renderOverlay && activePlanetIndex < 0 ? (
                <div className="initialExploreHint" aria-hidden="true">
                    <span className="hintLine left" />
                    <span className="hintText">Zoom to explore</span>
                    <span className="hintLine right" />
                </div>
            ) : null}

            <style jsx>{`
                .portfolioOverlay {
                    position: fixed;
                    inset: 0;
                    z-index: 5;
                    pointer-events: none;
                    color: #eef5ff;
                    font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                }

                .connectorLayer {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    overflow: visible;
                }

                .connectorLine {
                    fill: none;
                    stroke: rgba(44, 229, 255, 0.46);
                    stroke-width: 1.15;
                    stroke-dasharray: 8 8;
                    filter: drop-shadow(0 0 8px rgba(35, 218, 255, 0.24));
                    opacity: 0;
                    animation: connectorDraw 520ms var(--line-delay, 0ms) cubic-bezier(0.19, 1, 0.22, 1) forwards;
                }

                .portfolioOverlay.exiting .connectorLine {
                    animation: connectorErase 360ms cubic-bezier(0.4, 0, 1, 1) forwards;
                }

                .portfolioOverlay.exiting .anchorPulse,
                .portfolioOverlay.exiting .anchorDot {
                    animation: anchorFade 280ms ease forwards;
                }

                .primaryConnector {
                    stroke: rgba(255, 199, 107, 0.58);
                    stroke-width: 1.45;
                    stroke-dasharray: 9 8;
                    filter: drop-shadow(0 0 10px rgba(255, 190, 88, 0.3));
                }

                .anchorPulse {
                    fill: none;
                    stroke: rgba(143, 195, 255, 0.34);
                    stroke-width: 1;
                    stroke-dasharray: 4 7;
                    transform-origin: center;
                    opacity: 0;
                }

                .anchorDot {
                    fill: rgba(255, 207, 137, 0.92);
                    filter: drop-shadow(0 0 12px rgba(255, 186, 92, 0.86));
                }

                :global(.categoryHub) {
                    position: absolute;
                    display: grid;
                    align-content: start;
                    gap: 7px;
                    padding: 20px 22px 18px;
                    color: #eef5ff;
                    pointer-events: none;
                    background:
                        linear-gradient(180deg, rgba(13, 22, 42, 0.92), rgba(5, 10, 21, 0.86)),
                        radial-gradient(circle at top left, rgba(34, 230, 255, 0.12), transparent 46%);
                    border: 1px solid rgba(35, 226, 255, 0.72);
                    border-radius: 2px;
                    box-shadow:
                        0 20px 50px rgba(0, 0, 0, 0.46),
                        inset 0 0 0 1px rgba(255, 255, 255, 0.045),
                        0 0 28px rgba(27, 219, 255, 0.13);
                    backdrop-filter: blur(14px) saturate(135%);
                    -webkit-backdrop-filter: blur(14px) saturate(135%);
                    opacity: 0;
                    transform: translate3d(0, 10px, 0);
                    animation: cardConstruct 360ms var(--card-delay) cubic-bezier(0.19, 1, 0.22, 1) forwards;
                }

                :global(.portfolioOverlay.exiting .categoryHub),
                :global(.portfolioOverlay.exiting .calloutCard) {
                    animation: cardDismiss 320ms cubic-bezier(0.4, 0, 1, 1) forwards;
                }

                :global(.categoryHub::before) {
                    content: "";
                    position: absolute;
                    inset: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.055);
                    border-radius: 2px;
                    pointer-events: none;
                }

                :global(.categoryHub::after),
                :global(.calloutCard::after) {
                    content: "";
                    position: absolute;
                    inset: -1px;
                    pointer-events: none;
                    background:
                        linear-gradient(90deg, #21e8ff 0 24px, transparent 24px) left top / 74px 2px no-repeat,
                        linear-gradient(#21e8ff 0 24px, transparent 24px) left top / 2px 74px no-repeat,
                        linear-gradient(270deg, #21e8ff 0 24px, transparent 24px) right bottom / 74px 2px no-repeat,
                        linear-gradient(0deg, #21e8ff 0 24px, transparent 24px) right bottom / 2px 74px no-repeat;
                    opacity: 0.82;
                }

                :global(.categoryHub span) {
                    color: rgba(255, 200, 104, 0.96);
                    font-size: 0.67rem;
                    font-weight: 900;
                    letter-spacing: 0.24em;
                    text-transform: uppercase;
                }

                :global(.categoryHub h2) {
                    margin: 0;
                    color: #ffffff;
                    font-size: 1.24rem;
                    line-height: 1.1;
                    font-weight: 900;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                }

                :global(.categoryHub p) {
                    margin: 0;
                    color: rgba(219, 232, 255, 0.84);
                    font-size: 0.88rem;
                    line-height: 1.45;
                    font-weight: 760;
                }

                :global(.categoryHub b) {
                    color: rgba(167, 196, 236, 0.72);
                    font-size: 0.74rem;
                    line-height: 1.4;
                    font-weight: 620;
                }

                :global(.calloutCard) {
                    position: absolute;
                    display: block;
                    padding: 18px 22px 17px;
                    color: inherit;
                    text-decoration: none;
                    pointer-events: auto;
                    overflow: hidden;
                    background:
                        linear-gradient(180deg, rgba(12, 20, 38, 0.9), rgba(4, 9, 19, 0.82)),
                        radial-gradient(circle at 10% 0%, rgba(40, 231, 255, 0.11), transparent 46%);
                    border: 1px solid rgba(35, 226, 255, 0.5);
                    border-radius: 2px;
                    box-shadow:
                        0 20px 50px rgba(0, 0, 0, 0.46),
                        inset 0 0 0 1px rgba(255, 255, 255, 0.04),
                        0 0 24px rgba(27, 219, 255, 0.09);
                    backdrop-filter: blur(14px) saturate(135%);
                    -webkit-backdrop-filter: blur(14px) saturate(135%);
                    opacity: 0;
                    transform: translate3d(0, 12px, 0) scale(0.985);
                    animation: cardConstruct 400ms var(--card-delay) cubic-bezier(0.19, 1, 0.22, 1) forwards;
                }

                :global(.calloutCard::before) {
                    content: "";
                    position: absolute;
                    left: 22px;
                    right: 22px;
                    top: 46px;
                    height: 1px;
                    background: linear-gradient(90deg, rgba(40, 232, 255, 0.26), rgba(255, 255, 255, 0.08), transparent);
                    pointer-events: none;
                }

                :global(.calloutCard:hover) {
                    border-color: rgba(35, 226, 255, 0.78);
                    box-shadow: 0 24px 58px rgba(0, 0, 0, 0.46), 0 0 28px rgba(27, 219, 255, 0.16);
                }

                :global(.categoryHub),
                :global(.calloutCard) {
                    min-height: var(--card-min-height);
                }

                :global(.calloutHeader) {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    margin-bottom: 18px;
                }

                :global(.calloutHeader span) {
                    color: #26f6d2;
                    font-size: 0.68rem;
                    font-weight: 900;
                    letter-spacing: 0.22em;
                    text-transform: uppercase;
                }

                :global(.calloutHeader b) {
                    color: rgba(255, 200, 122, 0.84);
                    font-size: 0.66rem;
                    letter-spacing: 0.12em;
                    font-weight: 900;
                }

                :global(.calloutCard h3) {
                    margin: 0;
                    color: #f7fbff;
                    font-size: clamp(1.02rem, 1.35vw, 1.22rem);
                    line-height: 1.12;
                    font-weight: 850;
                    letter-spacing: 0;
                }

                :global(.calloutSubtitle) {
                    margin: 8px 0 0;
                    color: rgba(216, 225, 240, 0.78);
                    font-size: 0.82rem;
                    line-height: 1.45;
                    font-weight: 600;
                }

                :global(.calloutDetails) {
                    display: grid;
                    gap: 5px;
                    margin-top: 10px;
                }

                :global(.calloutDetails p) {
                    position: relative;
                    margin: 0;
                    padding-left: 13px;
                    color: rgba(226, 235, 248, 0.66);
                    font-size: 0.72rem;
                    line-height: 1.52;
                    font-weight: 420;
                }

                :global(.calloutDetails p::before) {
                    content: "";
                    position: absolute;
                    left: 0;
                    top: 0.6em;
                    width: 5px;
                    height: 5px;
                    border-radius: 50%;
                    background: rgba(129, 195, 255, 0.82);
                    box-shadow: 0 0 10px rgba(129, 195, 255, 0.72);
                }

                :global(.typeLine) {
                    display: block;
                    max-width: 100%;
                    opacity: 0;
                    clip-path: inset(0 100% 0 0);
                    animation: textType 560ms steps(28, end) forwards;
                    animation-delay: calc(var(--card-delay, 0ms) + 220ms);
                }

                :global(.calloutHeader .typeLine:nth-child(2)) {
                    animation-delay: calc(var(--card-delay, 0ms) + 260ms);
                }

                :global(.calloutCard h3.typeLine),
                :global(.categoryHub h2.typeLine) {
                    animation-delay: calc(var(--card-delay, 0ms) + 340ms);
                }

                :global(.calloutSubtitle.typeLine),
                :global(.categoryHub p.typeLine) {
                    animation-delay: calc(var(--card-delay, 0ms) + 470ms);
                }

                :global(.categoryHub b.typeLine) {
                    animation-delay: calc(var(--card-delay, 0ms) + 610ms);
                }

                :global(.calloutDetails p.typeLine) {
                    animation-delay: var(--text-delay, calc(var(--card-delay, 0ms) + 610ms));
                }

                .chapterRail {
                    position: absolute;
                    left: 50%;
                    bottom: 31px;
                    display: flex;
                    gap: 10px;
                    transform: translateX(-50%);
                }

                .chapterRail span {
                    width: 20px;
                    height: 2px;
                    border-radius: 999px;
                    background: rgba(180, 211, 255, 0.2);
                    transition: width 320ms ease, background 320ms ease, box-shadow 320ms ease;
                }

                .chapterRail span.active {
                    width: 44px;
                    background: rgba(255, 212, 132, 0.92);
                    box-shadow: 0 0 18px rgba(255, 197, 110, 0.58);
                }

                .initialExploreHint {
                    position: fixed;
                    left: 50%;
                    bottom: 30px;
                    z-index: 4;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    transform: translateX(-50%);
                    pointer-events: none;
                    color: rgba(232, 242, 255, 0.74);
                    font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    opacity: 0;
                    animation: hintReveal 720ms 520ms ease forwards;
                }

                .hintText {
                    font-size: 0.68rem;
                    font-weight: 850;
                    letter-spacing: 0.24em;
                    line-height: 1;
                    text-transform: uppercase;
                    text-shadow: 0 0 18px rgba(138, 195, 255, 0.36);
                    white-space: nowrap;
                }

                .hintLine {
                    position: relative;
                    width: clamp(70px, 10vw, 148px);
                    height: 10px;
                    overflow: hidden;
                }

                .hintLine::before {
                    content: "";
                    position: absolute;
                    inset: 0;
                    clip-path: polygon(0 19%, 100% 46%, 100% 54%, 0 81%);
                    background: linear-gradient(90deg, rgba(255, 204, 120, 0.82), rgba(70, 229, 255, 0.36), transparent);
                    filter: drop-shadow(0 0 10px rgba(56, 213, 255, 0.28));
                }

                .hintLine.left {
                    transform: scaleX(-1);
                }

                @keyframes connectorDraw {
                    from {
                        opacity: 0;
                        stroke-dashoffset: 42;
                    }
                    to {
                        opacity: 1;
                        stroke-dashoffset: 0;
                    }
                }

                @keyframes connectorErase {
                    from {
                        opacity: 1;
                        stroke-dashoffset: 0;
                    }
                    to {
                        opacity: 0;
                        stroke-dashoffset: 42;
                    }
                }

                @keyframes anchorFade {
                    to {
                        opacity: 0;
                        transform: scale(0.78);
                    }
                }

                @keyframes anchorPulse {
                    0%, 100% {
                        opacity: 0.4;
                        transform: scale(0.9);
                    }
                    50% {
                        opacity: 0.9;
                        transform: scale(1.2);
                    }
                }

                @keyframes badgeReveal {
                    from {
                        opacity: 0;
                        transform: translate3d(-8px, 8px, 0);
                    }
                    to {
                        opacity: 1;
                        transform: translate3d(0, 0, 0);
                    }
                }

                @keyframes cardConstruct {
                    to {
                        opacity: 1;
                        transform: translate3d(0, 0, 0) scale(1);
                    }
                }

                @keyframes cardDismiss {
                    from {
                        opacity: 1;
                        transform: translate3d(0, 0, 0) scale(1);
                    }
                    to {
                        opacity: 0;
                        transform: translate3d(0, 8px, 0) scale(0.985);
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

                @media (max-width: 760px) {
                    .connectorLine {
                        stroke-opacity: 0.26;
                    }

                    :global(.categoryHub) {
                        padding: 8px 10px;
                    }

                    :global(.calloutCard) {
                        min-height: 116px;
                        padding: 14px 15px;
                    }

                    :global(.calloutDetails p) {
                        font-size: 0.74rem;
                    }

                    .chapterRail {
                        bottom: 20px;
                        gap: 7px;
                    }

                    .chapterRail span {
                        width: 13px;
                    }

                    .chapterRail span.active {
                        width: 28px;
                    }

                    .initialExploreHint {
                        bottom: 20px;
                        gap: 10px;
                    }

                    .hintText {
                        font-size: 0.58rem;
                        letter-spacing: 0.18em;
                    }

                    .hintLine {
                        width: 48px;
                    }
                }
            `}</style>
        </div>
    );
};

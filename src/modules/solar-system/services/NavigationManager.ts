import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SolarSystemScene } from '../components/SolarSystemScene';

gsap.registerPlugin(ScrollTrigger);

export class NavigationManager {
    private readonly sceneManager: SolarSystemScene;
    private readonly onPlanetChange?: (index: number) => void;
    private scrollTrigger: ScrollTrigger | null = null;
    private activePlanetIndex: number;
    private isDragging = false;
    private readonly pressedKeys = new Set<string>();
    private keyFrameId: number | null = null;

    private readonly handlePointerMove = (event: PointerEvent) => {
        const canvas = this.sceneManager.getRendererElement();
        const bounds = canvas.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
        const y = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1);
        this.sceneManager.setPointer(x, y, true);

        if (this.isDragging) {
            event.preventDefault();
            this.sceneManager.dragInteraction(event.clientX, event.clientY);
        }
    };

    private readonly handlePointerLeave = () => {
        if (this.isDragging) return;
        this.sceneManager.setPointer(10, 10, false);
    };

    private readonly handlePointerDown = (event: PointerEvent) => {
        if (event.button !== 0 && event.pointerType === 'mouse') return;

        const canvas = this.sceneManager.getRendererElement();
        const bounds = canvas.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
        const y = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1);
        this.isDragging = true;
        canvas.setPointerCapture(event.pointerId);
        this.sceneManager.beginInteraction(x, y, event.clientX, event.clientY);
    };

    private readonly handlePointerUp = (event: PointerEvent) => {
        if (!this.isDragging) return;

        const canvas = this.sceneManager.getRendererElement();
        this.isDragging = false;
        if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
        }

        const clickedPlanetIndex = this.sceneManager.endInteraction();
        if (clickedPlanetIndex === -1) return;

        const progress = this.sceneManager.getProgressForPlanetIndex(clickedPlanetIndex);
        if (progress === null || !this.scrollTrigger) return;

        const scrollStart = this.scrollTrigger.start;
        const scrollEnd = this.scrollTrigger.end;
        window.scrollTo({
            top: scrollStart + (scrollEnd - scrollStart) * progress,
            behavior: 'smooth'
        });
    };

    private readonly handleWheel = (event: WheelEvent) => {
        if (!event.altKey && !event.metaKey && !event.ctrlKey) return;

        event.preventDefault();
        this.sceneManager.dolly(event.deltaY * 0.035);
    };

    private readonly handleKeyDown = (event: KeyboardEvent) => {
        const key = event.key.toLowerCase();
        if (!['w', 'a', 's', 'd', 'q', 'e', 'c'].includes(key)) return;

        this.pressedKeys.add(key);
        this.startKeyboardLoop();
    };

    private readonly handleKeyUp = (event: KeyboardEvent) => {
        this.pressedKeys.delete(event.key.toLowerCase());
    };

    constructor(sceneManager: SolarSystemScene, onPlanetChange?: (index: number) => void) {
        this.sceneManager = sceneManager;
        this.onPlanetChange = onPlanetChange;
        this.activePlanetIndex = sceneManager.getActivePlanetIndex();
        this.initScrollNavigation();
        this.initInteractivity();
    }

    private initScrollNavigation() {
        const scroller = document.getElementById('solar-scroller');

        if (scroller) {
            scroller.style.height = `${Math.max(window.innerHeight * 34, 30000)}px`;
        }

        this.scrollTrigger = ScrollTrigger.create({
            trigger: '#solar-scroller',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 4.2,
            invalidateOnRefresh: true,
            onUpdate: self => {
                const planetIndex = this.sceneManager.setScrollProgress(self.progress);

                if (planetIndex !== this.activePlanetIndex) {
                    this.activePlanetIndex = planetIndex;
                    this.onPlanetChange?.(planetIndex);
                }
            }
        });

        const initialPlanetIndex = this.sceneManager.setScrollProgress(this.scrollTrigger.progress);
        if (initialPlanetIndex !== this.activePlanetIndex) {
            this.activePlanetIndex = initialPlanetIndex;
            this.onPlanetChange?.(initialPlanetIndex);
        }
        ScrollTrigger.refresh();
    }

    private startKeyboardLoop() {
        if (this.keyFrameId) return;

        const tick = () => {
            if (this.pressedKeys.size === 0) {
                this.keyFrameId = null;
                return;
            }

            const orbitStep = 0.026;
            if (this.pressedKeys.has('a')) this.sceneManager.orbitBy(-orbitStep, 0);
            if (this.pressedKeys.has('d')) this.sceneManager.orbitBy(orbitStep, 0);
            if (this.pressedKeys.has('w')) this.sceneManager.orbitBy(0, -orbitStep * 0.72);
            if (this.pressedKeys.has('s')) this.sceneManager.orbitBy(0, orbitStep * 0.72);
            if (this.pressedKeys.has('q')) this.sceneManager.dolly(-0.52);
            if (this.pressedKeys.has('e')) this.sceneManager.dolly(0.52);
            if (this.pressedKeys.has('c')) {
                this.sceneManager.resetView();
                this.pressedKeys.delete('c');
            }

            this.keyFrameId = requestAnimationFrame(tick);
        };

        this.keyFrameId = requestAnimationFrame(tick);
    }

    private initInteractivity() {
        const canvas = this.sceneManager.getRendererElement();
        canvas.addEventListener('pointerdown', this.handlePointerDown);
        canvas.addEventListener('pointermove', this.handlePointerMove);
        canvas.addEventListener('pointerup', this.handlePointerUp);
        canvas.addEventListener('pointercancel', this.handlePointerUp);
        canvas.addEventListener('pointerleave', this.handlePointerLeave);
        canvas.addEventListener('wheel', this.handleWheel, { passive: false });
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
    }

    public dispose() {
        const canvas = this.sceneManager.getRendererElement();
        canvas.removeEventListener('pointerdown', this.handlePointerDown);
        canvas.removeEventListener('pointermove', this.handlePointerMove);
        canvas.removeEventListener('pointerup', this.handlePointerUp);
        canvas.removeEventListener('pointercancel', this.handlePointerUp);
        canvas.removeEventListener('pointerleave', this.handlePointerLeave);
        canvas.removeEventListener('wheel', this.handleWheel);
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        if (this.keyFrameId) {
            cancelAnimationFrame(this.keyFrameId);
        }
        this.pressedKeys.clear();
        this.scrollTrigger?.kill();
        this.scrollTrigger = null;
    }
}

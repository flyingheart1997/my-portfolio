import gsap from 'gsap';
import { SolarSystemScene } from '../components/SolarSystemScene';

type CoreBriefChangeHandler = (open: boolean, planetIndex: number) => void;

export class NavigationManager {
    private readonly sceneManager: SolarSystemScene;
    private readonly onPlanetChange?: (index: number) => void;
    private readonly onCoreBriefChange?: CoreBriefChangeHandler;
    private readonly navigationState = { progress: 0 };
    private navigationTween: gsap.core.Tween | null = null;
    private targetProgress = 0;
    private currentStep = -1;
    private coreBriefStage: 'idle' | 'open' | 'restored' = 'idle';
    private inputLockedUntil = 0;
    private wheelIntent = 0;
    private wheelResetId: number | null = null;
    private lastWheelStepAt = 0;
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
        if (progress === null) return;

        const step = this.sceneManager.getFocusStepForPlanetIndex(clickedPlanetIndex);
        if (step !== null) {
            this.currentStep = step;
        }
        this.closeCoreBrief('idle');
        this.setNavigationProgress(progress, 1.65);
    };

    private readonly handleWheel = (event: WheelEvent) => {
        event.preventDefault();
        const modeMultiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1;
        const rawDelta = event.deltaY * modeMultiplier;
        const direction = Math.sign(rawDelta);
        if (direction === 0) return;
        if (performance.now() < this.inputLockedUntil) return;
        if (this.navigationTween) return;

        this.wheelIntent += rawDelta;

        if (this.wheelResetId !== null) {
            window.clearTimeout(this.wheelResetId);
        }
        this.wheelResetId = window.setTimeout(() => {
            this.wheelIntent = 0;
            this.wheelResetId = null;
        }, 180);

        const threshold = event.ctrlKey || event.metaKey ? 34 : 76;
        if (Math.abs(this.wheelIntent) < threshold) return;

        const now = performance.now();
        if (now - this.lastWheelStepAt < 920) {
            this.wheelIntent = 0;
            return;
        }

        const stepDirection = -Math.sign(this.wheelIntent);
        this.lastWheelStepAt = now;
        this.wheelIntent = 0;
        if (this.wheelResetId !== null) {
            window.clearTimeout(this.wheelResetId);
            this.wheelResetId = null;
        }
        this.navigateByStep(stepDirection);
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

    constructor(
        sceneManager: SolarSystemScene,
        onPlanetChange?: (index: number) => void,
        onCoreBriefChange?: CoreBriefChangeHandler
    ) {
        this.sceneManager = sceneManager;
        this.onPlanetChange = onPlanetChange;
        this.onCoreBriefChange = onCoreBriefChange;
        this.activePlanetIndex = sceneManager.getActivePlanetIndex();
        this.applyProgress(0);
        this.initInteractivity();
    }

    private applyProgress(progress: number) {
        const planetIndex = this.sceneManager.setScrollProgress(progress);

        if (planetIndex !== this.activePlanetIndex) {
            this.activePlanetIndex = planetIndex;
            this.onPlanetChange?.(planetIndex);
            if (planetIndex === -1) {
                this.closeCoreBrief('idle');
            } else {
                this.coreBriefStage = 'idle';
            }
        }
    }

    private setNavigationProgress(progress: number, duration = 2.2) {
        this.targetProgress = gsap.utils.clamp(0, 1, progress);
        this.navigationTween?.kill();
        this.sceneManager.setNavigationActive(true);
        this.navigationTween = gsap.to(this.navigationState, {
            progress: this.targetProgress,
            duration,
            ease: 'sine.inOut',
            overwrite: true,
            onUpdate: () => this.applyProgress(this.navigationState.progress),
            onComplete: () => {
                this.navigationState.progress = this.targetProgress;
                this.applyProgress(this.targetProgress);
                this.sceneManager.setNavigationActive(false);
                this.navigationTween = null;
            }
        });
    }

    private navigateByStep(direction: number) {
        const lastStep = this.sceneManager.getFocusStepCount() - 1;
        let nextStep = this.currentStep;

        if (direction > 0) {
            if (this.currentStep === -1) {
                nextStep = 0;
            } else if (this.coreBriefStage === 'idle') {
                this.openCoreBrief();
                this.inputLockedUntil = performance.now() + 1380;
                return;
            } else if (this.coreBriefStage === 'open') {
                this.closeCoreBrief('restored');
                this.inputLockedUntil = performance.now() + 1080;
                return;
            } else {
                this.coreBriefStage = 'idle';
                nextStep = this.currentStep >= lastStep ? -1 : this.currentStep + 1;
            }
        } else {
            if (this.coreBriefStage === 'open') {
                this.closeCoreBrief('idle');
                this.inputLockedUntil = performance.now() + 1080;
                return;
            }
            this.coreBriefStage = 'idle';
            nextStep = Math.max(-1, this.currentStep - 1);
        }

        this.currentStep = nextStep;

        if (nextStep === -1) {
            this.inputLockedUntil = performance.now() + 1180;
            this.jumpNavigationProgress(0);
            return;
        }

        this.inputLockedUntil = performance.now() + 1280;
        this.setNavigationProgress(this.sceneManager.getProgressForFocusStep(nextStep), 2.15);
    }

    private openCoreBrief() {
        if (this.coreBriefStage === 'open') return;

        this.coreBriefStage = 'open';
        this.sceneManager.setCoreDiveStrength(1);
        this.onCoreBriefChange?.(true, this.activePlanetIndex);
    }

    private closeCoreBrief(nextStage: 'idle' | 'restored') {
        if (this.coreBriefStage !== 'open') {
            this.coreBriefStage = nextStage;
            this.sceneManager.setCoreDiveStrength(0);
            return;
        }

        this.coreBriefStage = nextStage;
        this.sceneManager.setCoreDiveStrength(0);
        this.onCoreBriefChange?.(false, this.activePlanetIndex);
    }

    private jumpNavigationProgress(progress: number) {
        this.targetProgress = gsap.utils.clamp(0, 1, progress);
        this.navigationTween?.kill();
        this.navigationTween = null;
        this.sceneManager.setNavigationActive(false);
        this.closeCoreBrief('idle');
        this.navigationState.progress = this.targetProgress;
        this.applyProgress(this.targetProgress);
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
        if (this.wheelResetId !== null) {
            window.clearTimeout(this.wheelResetId);
        }
        this.navigationTween?.kill();
        this.navigationTween = null;
        this.sceneManager.setNavigationActive(false);
    }
}

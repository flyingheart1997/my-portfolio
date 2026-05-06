import { h, render } from 'preact';
import { SimulationDashboard } from './SimulationDashboard';
import { SatelliteSimulation } from './SatelliteSimulation';
import { simulationStore } from '../stores/simulationStore';

export class SimulationManager {
    private container: HTMLElement | null = null;
    private dashboardRoot: HTMLElement | null = null;
    private simulation: SatelliteSimulation | null = null;
    private isActive: boolean = false;
    private onExitCallback: (() => void) | null = null;
    private updateInterval: any;

    public async show(parent: HTMLElement, onExit?: () => void): Promise<void> {
        if (this.isActive) return;

        this.onExitCallback = onExit || null;
        this.isActive = true;
        simulationStore.setWorkspaceMode('inspect');
        simulationStore.setSpeed(1);
        if (!simulationStore.getState().isPlaying) simulationStore.togglePlay();

        this.container = document.createElement('div');
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.position = 'relative';
        this.container.style.backgroundColor = '#000';
        parent.appendChild(this.container);

        const sceneContainer = document.createElement('div');
        sceneContainer.style.width = '100%';
        sceneContainer.style.height = '100%';
        this.container.appendChild(sceneContainer);

        this.dashboardRoot = document.createElement('div');
        this.dashboardRoot.style.position = 'absolute';
        this.dashboardRoot.style.inset = '0';
        this.dashboardRoot.style.pointerEvents = 'none';
        this.container.appendChild(this.dashboardRoot);

        this.simulation = new SatelliteSimulation(sceneContainer);

        render(h(SimulationDashboard, {}), this.dashboardRoot);

        await simulationStore.init();

        this.startUpdateLoop();
    }

    private startUpdateLoop() {
        let lastTime = performance.now();
        const loop = (now: number) => {
            const dt = now - lastTime;
            lastTime = now;

            simulationStore.update(dt);
            if (this.simulation) {
                this.simulation.updateSatellites(simulationStore.getState().satellites);
                this.simulation.tick();
            }

            this.updateInterval = requestAnimationFrame(loop);
        };
        this.updateInterval = requestAnimationFrame(loop);
    }

    private stopUpdateLoop() {
        if (this.updateInterval) cancelAnimationFrame(this.updateInterval);
    }

    public hide(): void {
        if (!this.isActive) return;

        this.stopUpdateLoop();

        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        if (this.simulation) {
            this.simulation.destroy();
            this.simulation = null;
        }

        if (this.dashboardRoot) {
            render(null, this.dashboardRoot);
            this.dashboardRoot = null;
        }

        this.isActive = false;
        if (this.onExitCallback) {
            this.onExitCallback();
        }
    }

    public isVisible(): boolean {
        return this.isActive;
    }
}

// Export singleton instance
export const simulationView = new SimulationManager();

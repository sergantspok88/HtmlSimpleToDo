import { formatStopwatch } from './time.js';
import { setLabel } from './ui.js';

const PLAY_ICON = "bi-play-fill";
const PAUSE_ICON = "bi-pause-fill";

export class Stopwatch {
    constructor(display, toggleButton) {
        this.display = display;
        this.toggleButton = toggleButton;
        this.accumulatedMilliseconds = 0; // time from previous runs, before the last pause
        this.startedAt = null; // performance.now() when the current run started, null while paused
        this.frameId = 0;
    }

    get isRunning() {
        return this.startedAt !== null;
    }

    get elapsedMilliseconds() {
        const currentRun = this.isRunning ? performance.now() - this.startedAt : 0;
        return this.accumulatedMilliseconds + currentRun;
    }

    start() {
        if (this.isRunning) {
            return;
        }
        this.startedAt = performance.now();
        this.updateButton();
        this.tick();
    }

    pause() {
        if (!this.isRunning) {
            return;
        }
        cancelAnimationFrame(this.frameId);
        this.accumulatedMilliseconds = this.elapsedMilliseconds;
        this.startedAt = null;
        this.updateDisplay();
        this.updateButton();
    }

    toggle() {
        if (this.isRunning) {
            this.pause();
        } else {
            this.start();
        }
    }

    reset() {
        cancelAnimationFrame(this.frameId);
        this.accumulatedMilliseconds = 0;
        this.startedAt = null;
        this.updateDisplay();
        this.updateButton();
    }

    tick() {
        this.updateDisplay();
        this.frameId = requestAnimationFrame(() => this.tick());
    }

    updateDisplay() {
        const text = formatStopwatch(this.elapsedMilliseconds);
        // Runs every frame, but the DOM only changes when the shown tenth of a second does
        if (this.display.textContent !== text) {
            this.display.textContent = text;
        }
    }

    updateButton() {
        this.toggleButton.querySelector(".bi").className = `bi ${this.isRunning ? PAUSE_ICON : PLAY_ICON}`;
        setLabel(this.toggleButton, this.isRunning ? "Pause stopwatch" : "Start stopwatch");
    }
}

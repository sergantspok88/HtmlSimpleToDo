export class Stopwatch {
    constructor() {
        this.lastStopwatchTime = 0;
        this.stopwatchTimer = null;
        this.isStopwatchRunning = false;
        this.elapsedMilliseconds = 0;
        this.playText = "&#x23F5;";
        this.pauseText = "&#x23F8;";
    }

    startStopwatch() {
        this.lastStopwatchTime = new Date().getTime();
        this.stopwatchTimer = setInterval(() => this.updateStopwatchDisplay(), 10);
        document.getElementById("startPause").innerHTML = this.pauseText;
        this.isStopwatchRunning = true;
    }

    pauseStopwatch() {
        clearInterval(this.stopwatchTimer);
        document.getElementById("startPause").innerHTML = this.playText;
        this.isStopwatchRunning = false;
    }

    toggleStopwatch() {
        if (this.isStopwatchRunning) {
            this.pauseStopwatch();
        } else {
            this.startStopwatch();
        }
    }

    resetStopwatch() {
        clearInterval(this.stopwatchTimer);
        this.elapsedMilliseconds = 0;
        document.getElementById("stopwatch").innerHTML = this.formatMilliseconds(this.elapsedMilliseconds);
        document.getElementById("startPause").innerHTML = this.playText;
        this.isStopwatchRunning = false;
    }

    updateStopwatchDisplay() {
        const now = new Date().getTime();
        const elapsedMillisecondsSinceLast = now - this.lastStopwatchTime;
        this.lastStopwatchTime = now;
        this.elapsedMilliseconds += elapsedMillisecondsSinceLast;
        const display = document.getElementById("stopwatch");
        display.textContent = this.formatMilliseconds(this.elapsedMilliseconds);
    }

    formatMilliseconds(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, "0");
        const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
        const seconds = (totalSeconds % 60).toString().padStart(2, "0");
        const remainingMilliseconds = Math.floor(milliseconds % 1000 / 100).toString();

        return `${hours}:${minutes}:${seconds}.${remainingMilliseconds}`;
    }
}
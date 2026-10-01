import { formatCompletedTime, formatCountdown, secondsUntil } from './time.js';
import { setLabel } from './ui.js';

const template = document.getElementById("taskTemplate");

// One task's <li>. It looks up its parts once, and update() keeps them in line with the task.
export class TaskRow {
    constructor(id) {
        this.element = template.content.firstElementChild.cloneNode(true);
        this.element.dataset.id = id;

        const part = (selector) => this.element.querySelector(selector);
        this.checkbox = part(".task-check");
        this.name = part(".task-name");
        this.completedAt = part(".task-completed-at");
        this.timer = part(".task-timer");
        this.progress = part(".task-progress");
        this.timerForm = part(".timer-form");
        this.editButton = part('[data-action="edit"]');
        this.timerButton = part('[data-action="timer"]');

        this.checkbox.id = `task-${id}`;
        this.name.htmlFor = this.checkbox.id;
    }

    update(task, now = Date.now()) {
        this.element.classList.toggle("completed", task.done);
        this.checkbox.checked = task.done;
        this.name.textContent = task.text;

        const hasCompletedAt = task.done && task.completedAt !== null;
        this.completedAt.textContent = hasCompletedAt ? `done ${formatCompletedTime(task.completedAt)}` : "";
        this.completedAt.title = hasCompletedAt ? new Date(task.completedAt).toLocaleString() : "";

        const timerRunning = task.timerEndsAt !== null;
        this.timerButton.querySelector(".bi").className = `bi ${timerRunning ? "bi-stop-circle" : "bi-stopwatch"}`;
        setLabel(this.timerButton, timerRunning ? "Stop timer" : "Start timer");
        if (task.done) {
            this.closeTimerForm();
        }
        this.updateCountdown(task, now);
    }

    updateCountdown(task, now) {
        if (task.timerEndsAt === null) {
            this.timer.textContent = "";
            this.progress.hidden = true;
            return;
        }

        this.timer.textContent = formatCountdown(secondsUntil(task.timerEndsAt, now));
        // Timers saved before durations were stored have no progress bar
        this.progress.hidden = !task.timerDuration;
        if (task.timerDuration) {
            const elapsed = 1 - (task.timerEndsAt - now) / task.timerDuration;
            this.progress.style.width = `${Math.min(Math.max(elapsed, 0), 1) * 100}%`;
        }
    }

    // Swaps the name for a text field. Enter or leaving the field saves, Escape cancels.
    // onSave(text) is only called with a non-empty name, so clearing the field keeps the old one.
    startEditing(text, onSave) {
        if (this.name.hidden) {
            return; // already editing
        }

        const input = document.createElement("input");
        input.type = "text";
        input.className = "form-control form-control-sm task-edit-input";
        input.value = text;
        input.setAttribute("aria-label", "Task name");

        this.name.hidden = true;
        this.name.after(input);
        input.focus();

        let finished = false;
        const finish = (save) => {
            // Removing the focused input fires "blur" in some browsers, so make sure this runs once
            if (finished) {
                return;
            }
            finished = true;
            input.remove();
            this.name.hidden = false;

            const newText = input.value.trim();
            if (save && newText) {
                onSave(newText);
            }
        };

        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === "Escape") {
                finish(event.key === "Enter");
                this.editButton.focus();
            }
        });
        input.addEventListener("blur", () => finish(true));
    }

    openTimerForm() {
        this.element.classList.add("setting-timer");
        this.timerForm.hidden = false;
        this.timerForm.elements.minutes.focus();
    }

    closeTimerForm({ focusTimerButton = false } = {}) {
        if (this.timerForm.hidden) {
            return;
        }
        this.element.classList.remove("setting-timer");
        this.timerForm.hidden = true;
        this.timerForm.reset();
        if (focusTimerButton) {
            this.timerButton.focus();
        }
    }
}

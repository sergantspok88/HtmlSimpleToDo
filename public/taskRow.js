import {
    formatCompletedTime, formatCountdown, formatDuration, formatTimeOfDay, formatUpcomingTime, isSameDay,
    nextTimeOfDay, parseTimeOfDay, secondsUntil, upcomingRoundTimes,
} from './time.js';
import { setLabel } from './ui.js';

const template = document.getElementById("taskTemplate");
const timeSuggestions = document.getElementById("timeSuggestions");

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
        this.timeHint = part(".timer-hint");
        this.editButton = part('[data-action="edit"]');
        this.timerButton = part('[data-action="timer"]');

        this.checkbox.id = `task-${id}`;
        this.name.htmlFor = this.checkbox.id;

        // The timer form takes either a number of minutes or a time of day, so filling in one clears the other
        const { minutes, at } = this.timerForm.elements;
        minutes.addEventListener("input", () => {
            at.value = "";
            this.resetTimerFormMessages();
        });
        at.addEventListener("input", () => {
            minutes.value = "";
            this.resetTimerFormMessages();
            this.showTimeHint();
        });
    }

    // `highlight` is the search pattern (a RegExp) to mark in the name, if any
    update(task, { highlight = null, now = Date.now() } = {}) {
        this.element.classList.toggle("completed", task.done);
        this.checkbox.checked = task.done;
        this.showName(task.text, highlight);

        const hasCompletedAt = task.done && task.completedAt !== null;
        this.completedAt.textContent = hasCompletedAt ? `done ${formatCompletedTime(task.completedAt)}` : "";
        this.completedAt.title = hasCompletedAt ? new Date(task.completedAt).toLocaleString() : "";

        const timerRunning = task.timerEndsAt !== null;
        this.timerButton.querySelector(".bi").className = `bi ${timerRunning ? "bi-stop-circle" : "bi-stopwatch"}`;
        setLabel(this.timerButton, timerRunning ? "Stop timer" : "Start timer");
        this.timer.title = timerRunning ? `Ends ${formatUpcomingTime(task.timerEndsAt, new Date(now))}` : "";
        if (task.done) {
            this.closeTimerForm();
        }
        this.updateCountdown(task, now);
    }

    showName(text, highlight) {
        const match = highlight?.exec(text);
        if (!match) {
            this.name.textContent = text;
            return;
        }
        const mark = document.createElement("mark");
        mark.textContent = match[0];
        this.name.replaceChildren(text.slice(0, match.index), mark, text.slice(match.index + match[0].length));
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

    // When the timer chosen in the form should end, in epoch milliseconds. If nothing usable was entered,
    // shows a message on the form and returns null.
    chosenTimerEnd(now = Date.now()) {
        const { minutes, at } = this.timerForm.elements;
        if (at.value.trim()) {
            const time = parseTimeOfDay(at.value);
            if (!time) {
                at.setCustomValidity("Enter a time like 15:30");
                at.reportValidity();
                return null;
            }
            return nextTimeOfDay(time.hours, time.minutes, new Date(now));
        }
        if (minutes.value) {
            return now + minutes.valueAsNumber * 60 * 1000;
        }
        minutes.setCustomValidity("Enter the minutes, or a time of day");
        minutes.reportValidity();
        return null;
    }

    // "in 20 min" or "tomorrow, in 16 h 50 min" next to the time field, so it's clear when the timer would go off
    showTimeHint(now = new Date()) {
        const time = parseTimeOfDay(this.timerForm.elements.at.value);
        if (!time) {
            this.timeHint.textContent = "";
            return;
        }
        const endsAt = nextTimeOfDay(time.hours, time.minutes, now);
        const day = isSameDay(new Date(endsAt), now) ? "" : "tomorrow, ";
        this.timeHint.textContent = `${day}in ${formatDuration(endsAt - now.getTime())}`;
    }

    resetTimerFormMessages() {
        const { minutes, at } = this.timerForm.elements;
        minutes.setCustomValidity("");
        at.setCustomValidity("");
        this.timeHint.textContent = "";
    }

    openTimerForm() {
        fillTimeSuggestions();
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
        this.resetTimerFormMessages();
        if (focusTimerButton) {
            this.timerButton.focus();
        }
    }
}

// Fills the shared suggestions list under the time fields with the next round half-hours,
// each labelled with how far away it is, e.g. "23:30 · in 50 min"
function fillTimeSuggestions(now = new Date()) {
    const options = upcomingRoundTimes(now).map((time) => {
        const option = document.createElement("option");
        option.value = formatTimeOfDay(new Date(time));
        option.label = `in ${formatDuration(time - now.getTime())}`;
        return option;
    });
    timeSuggestions.replaceChildren(...options);
}

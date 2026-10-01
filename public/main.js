import Sortable from './vendor/sortablejs/sortable.esm.js';
import { Stopwatch } from './stopwatch.js';
import { formatClock, formatCountdown } from './time.js';
import { STORAGE_KEY, createTask, loadSettings, loadTasks, saveSettings, saveTasks } from './storage.js';
import { announceTimeUp, requestNotificationPermission } from './alarm.js';
import { setLabel, showAlert } from './ui.js';

const TIMER_ICON = "⏲";
const STOP_ICON = "⏹";
// Longer setTimeout delays overflow and fire immediately
const MAX_TIMEOUT = 2 ** 31 - 1;

const taskList = document.getElementById("taskList");
const taskTemplate = document.getElementById("taskTemplate");
const taskInput = document.getElementById("taskInput");
const addPositionSelect = document.getElementById("addPosition");
const clearCompletedButton = document.getElementById("clearCompletedButton");
const deleteAllButton = document.getElementById("deleteAllButton");
const currentTime = document.getElementById("currentTime");

// `tasks` is the single source of truth: change it, then call commit() to save and redraw
let tasks = loadTasks();
const settings = loadSettings();
const taskElements = new Map(); // task id -> <li>
let alarmTimeoutId = 0;
let saveFailureShown = false;

// ---- Changing tasks ----

function commit() {
    if (!saveTasks(tasks) && !saveFailureShown) {
        saveFailureShown = true;
        showAlert("Tasks could not be saved, so they will be lost when this page is closed.", "danger");
    }
    render();
    scheduleAlarm();
}

function findTask(id) {
    return tasks.find((task) => task.id === id);
}

function addTask(text) {
    const task = createTask(text);
    if (settings.addPosition === "top") {
        tasks.unshift(task);
    } else {
        tasks.push(task);
    }
    commit();
}

function updateTask(id, changes) {
    const task = findTask(id);
    if (task) {
        Object.assign(task, changes);
        commit();
    }
}

function removeTasks(shouldRemove) {
    tasks = tasks.filter((task) => !shouldRemove(task));
    commit();
}

function setDone(id, done) {
    // Completing a task also stops its timer
    if (done) {
        updateTask(id, { done: true, completedAt: Date.now(), timerEndsAt: null });
    } else {
        updateTask(id, { done: false, completedAt: null });
    }
}

function startTimer(id, minutes) {
    if (!Number.isFinite(minutes) || minutes <= 0) {
        return;
    }
    requestNotificationPermission();
    updateTask(id, { timerEndsAt: Date.now() + minutes * 60 * 1000 });
}

// ---- Rendering ----

// Updates the existing <li> elements in place instead of rebuilding the list,
// so an edit in progress or an open timer form isn't thrown away
function render() {
    const ids = new Set(tasks.map((task) => task.id));
    for (const [id, li] of taskElements) {
        if (!ids.has(id)) {
            li.remove();
            taskElements.delete(id);
        }
    }

    tasks.forEach((task, index) => {
        let li = taskElements.get(task.id);
        if (!li) {
            li = createTaskElement(task.id);
            taskElements.set(task.id, li);
        }
        updateTaskElement(li, task);

        // Only move elements that are out of place, since moving one takes focus away from it
        const current = taskList.children[index];
        if (current !== li) {
            taskList.insertBefore(li, current ?? null);
        }
    });

    clearCompletedButton.disabled = !tasks.some((task) => task.done);
    deleteAllButton.disabled = tasks.length === 0;
}

function createTaskElement(id) {
    const li = taskTemplate.content.firstElementChild.cloneNode(true);
    li.dataset.id = id;

    const checkbox = li.querySelector(".task-check");
    checkbox.id = `task-${id}`;
    li.querySelector(".task-name").htmlFor = checkbox.id;
    return li;
}

function updateTaskElement(li, task) {
    li.classList.toggle("completed", task.done);
    li.querySelector(".task-check").checked = task.done;
    li.querySelector(".task-name").textContent = task.text;
    li.querySelector(".task-completed-at").textContent = task.done && task.completedAt
        ? `Completed at ${new Date(task.completedAt).toLocaleString()}`
        : "";

    const timerRunning = task.timerEndsAt !== null;
    const timerButton = li.querySelector('[data-action="timer"]');
    timerButton.textContent = timerRunning ? STOP_ICON : TIMER_ICON;
    setLabel(timerButton, timerRunning ? "Stop timer" : "Start timer");
    if (task.done) {
        closeTimerForm(li);
    }
    updateCountdown(li, task, Date.now());
}

function updateCountdown(li, task, now) {
    const timer = li.querySelector(".task-timer");
    if (task.timerEndsAt === null) {
        timer.textContent = "";
    } else {
        const remainingSeconds = Math.max(0, Math.ceil((task.timerEndsAt - now) / 1000));
        timer.textContent = formatCountdown(remainingSeconds);
    }
}

// ---- Editing ----

function startEditing(li) {
    const task = findTask(li.dataset.id);
    const name = li.querySelector(".task-name");
    if (!task || name.hidden) {
        return;
    }

    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control form-control-sm task-edit-input";
    input.value = task.text;
    input.setAttribute("aria-label", "Task name");

    name.hidden = true;
    name.after(input);
    input.focus();

    let finished = false;
    function finish(save) {
        // Removing the focused input fires "blur" in some browsers, so make sure this runs once
        if (finished) {
            return;
        }
        finished = true;
        input.remove();
        name.hidden = false;

        // An empty name keeps the old one
        const text = input.value.trim();
        if (save && text) {
            updateTask(task.id, { text });
        }
    }

    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === "Escape") {
            finish(event.key === "Enter");
            li.querySelector('[data-action="edit"]').focus();
        }
    });
    input.addEventListener("blur", () => finish(true));
}

// ---- Timers ----

function openTimerForm(li) {
    const form = li.querySelector(".timer-form");
    li.classList.add("setting-timer");
    form.hidden = false;
    form.elements.minutes.focus();
}

function closeTimerForm(li, { focusTimerButton = false } = {}) {
    const form = li.querySelector(".timer-form");
    if (form.hidden) {
        return;
    }
    li.classList.remove("setting-timer");
    form.hidden = true;
    form.reset();
    if (focusTimerButton) {
        li.querySelector('[data-action="timer"]').focus();
    }
}

function submitTimer(li, minutes) {
    closeTimerForm(li, { focusTimerButton: true });
    startTimer(li.dataset.id, minutes);
}

// A single timeout for the earliest running timer. It fires on time (no polling), and because it is
// started from a user action, browsers throttle it far less in background tabs than a repeating interval.
function scheduleAlarm() {
    clearTimeout(alarmTimeoutId);
    const endTimes = tasks.map((task) => task.timerEndsAt).filter((endsAt) => endsAt !== null);
    if (endTimes.length === 0) {
        return;
    }
    const delay = Math.min(Math.max(Math.min(...endTimes) - Date.now(), 0), MAX_TIMEOUT);
    alarmTimeoutId = setTimeout(finishDueTimers, delay);
}

function finishDueTimers() {
    const now = Date.now();
    const dueTasks = tasks.filter((task) => task.timerEndsAt !== null && task.timerEndsAt <= now);
    dueTasks.forEach((task) => {
        task.timerEndsAt = null;
    });
    commit(); // also schedules the next timer, if any
    dueTasks.forEach(announceTimeUp);
}

// ---- Clock ----

// Runs right after each full second, so the clock and countdowns stay in step with the system time
function updateEverySecond() {
    const now = new Date();
    currentTime.textContent = formatClock(now);
    for (const task of tasks) {
        if (task.timerEndsAt !== null) {
            updateCountdown(taskElements.get(task.id), task, now.getTime());
        }
    }
    setTimeout(updateEverySecond, 1000 - now.getMilliseconds());
}

// ---- Event handlers ----

document.getElementById("addTaskForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const text = taskInput.value.trim();
    if (text) {
        addTask(text);
        taskInput.value = "";
    }
});

addPositionSelect.value = settings.addPosition;
addPositionSelect.addEventListener("change", () => {
    settings.addPosition = addPositionSelect.value;
    saveSettings(settings);
});

// One set of listeners on the list handles every task, including ones added later
taskList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
        return;
    }
    const li = button.closest(".task");
    const id = li.dataset.id;

    switch (button.dataset.action) {
        case "edit":
            startEditing(li);
            break;
        case "timer":
            if (findTask(id)?.timerEndsAt) {
                updateTask(id, { timerEndsAt: null });
            } else {
                openTimerForm(li);
            }
            break;
        case "preset":
            submitTimer(li, Number(button.dataset.minutes));
            break;
        case "cancel-timer":
            closeTimerForm(li, { focusTimerButton: true });
            break;
        case "delete":
            removeTasks((task) => task.id === id);
            break;
    }
});

taskList.addEventListener("change", (event) => {
    if (event.target.matches(".task-check")) {
        setDone(event.target.closest(".task").dataset.id, event.target.checked);
    }
});

// The browser only fires "submit" once the minutes field passes its required/min/max checks
taskList.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target;
    submitTimer(form.closest(".task"), form.elements.minutes.valueAsNumber);
});

taskList.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && event.target.closest(".timer-form")) {
        closeTimerForm(event.target.closest(".task"), { focusTimerButton: true });
    }
});

clearCompletedButton.addEventListener("click", () => {
    removeTasks((task) => task.done);
});

deleteAllButton.addEventListener("click", () => {
    const count = tasks.length;
    if (confirm(`Delete all ${count} task${count === 1 ? "" : "s"}? This cannot be undone.`)) {
        removeTasks(() => true);
    }
});

Sortable.create(taskList, {
    animation: 150,
    handle: ".drag-handle",
    // Fires after a drag changed the order. Sortable has already moved the element, so read the order back.
    onUpdate: () => {
        const order = [...taskList.children].map((li) => li.dataset.id);
        tasks.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
        commit();
    },
});

// Another tab saved its tasks (or storage was cleared): show the same list here
window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY || event.key === null) {
        tasks = loadTasks();
        render();
        scheduleAlarm();
    }
});

const stopwatch = new Stopwatch(document.getElementById("stopwatch"), document.getElementById("startPause"));
document.getElementById("startPause").addEventListener("click", () => stopwatch.toggle());
document.getElementById("reset").addEventListener("click", () => stopwatch.reset());

// Module scripts run after the page has been parsed, so no "load" handler is needed.
// commit() also re-saves tasks loaded in the old format, and announces timers that ran out while the page was closed.
commit();
updateEverySecond();

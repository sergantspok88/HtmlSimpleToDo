import Sortable from './vendor/sortablejs/sortable.esm.js';
import { Stopwatch } from './stopwatch.js';
import { formatClock, formatCompletedTime, formatCountdown, formatIsoDate } from './time.js';
import { STORAGE_KEY, createTask, loadSettings, loadTasks, parseBackup, saveSettings, saveTasks } from './storage.js';
import { announceTimeUp, requestNotificationPermission } from './alarm.js';
import { setLabel, showAlert, showUndoToast } from './ui.js';

const SNOOZE_MINUTES = 5;
// Longer setTimeout delays overflow and fire immediately
const MAX_TIMEOUT = 2 ** 31 - 1;
const BASE_TITLE = document.title;

const tasksSection = document.getElementById("tasks");
const activeList = document.getElementById("activeList");
const completedSection = document.getElementById("completedSection");
const completedList = document.getElementById("completedList");
const completedToggle = document.getElementById("completedToggle");
const completedCount = document.getElementById("completedCount");
const emptyState = document.getElementById("emptyState");
const taskTemplate = document.getElementById("taskTemplate");
const taskInput = document.getElementById("taskInput");
const addPositionSelect = document.getElementById("addPosition");
const clearCompletedButton = document.getElementById("clearCompletedButton");
const deleteAllButton = document.getElementById("deleteAllButton");
const currentTime = document.getElementById("currentTime");
const settingsPanel = document.getElementById("settingsPanel");
const repeatAlarmInput = document.getElementById("repeatAlarm");
const importFile = document.getElementById("importFile");

// `tasks` is the single source of truth: change it, then call commit() to save and redraw
let tasks = loadTasks();
const settings = loadSettings();
let filter = "all"; // "all", "active" or "done"
const taskElements = new Map(); // task id -> <li>
let alarmTimeoutId = 0;
let saveFailureShown = false;

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

// ---- Changing tasks ----

function commit() {
    if (!saveTasks(tasks) && !saveFailureShown) {
        saveFailureShown = true;
        showAlert("Tasks could not be saved, so they will be lost when this page is closed.", { variant: "danger" });
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

// Removes tasks, then offers to bring them back. `describe` turns the count into a message.
function removeTasks(shouldRemove, describe) {
    const removed = [];
    tasks.forEach((task, index) => {
        if (shouldRemove(task)) {
            removed.push({ task, index });
        }
    });
    if (removed.length === 0) {
        return;
    }

    tasks = tasks.filter((task) => !shouldRemove(task));
    commit();
    showUndoToast(describe(removed.length), () => {
        // Put each task back where it was; going from the lowest position up keeps the later ones right
        for (const { task, index } of removed) {
            if (!findTask(task.id)) {
                tasks.splice(Math.min(index, tasks.length), 0, task);
            }
        }
        commit();
    });
}

function setDone(id, done) {
    // Completing a task also stops its timer
    if (done) {
        updateTask(id, { done: true, completedAt: Date.now(), timerEndsAt: null, timerDuration: null });
    } else {
        updateTask(id, { done: false, completedAt: null });
    }
}

function startTimer(id, minutes) {
    const task = findTask(id);
    if (!task || task.done || !Number.isFinite(minutes) || minutes <= 0) {
        return;
    }
    requestNotificationPermission();
    const duration = minutes * 60 * 1000;
    updateTask(id, { timerEndsAt: Date.now() + duration, timerDuration: duration });
}

function stopTimer(id) {
    updateTask(id, { timerEndsAt: null, timerDuration: null });
}

// Swaps an active task with the active task above (-1) or below (+1) it
function moveTask(id, direction) {
    const activeTasks = tasks.filter((task) => !task.done);
    const index = activeTasks.findIndex((task) => task.id === id);
    const neighbor = activeTasks[index + direction];
    if (index === -1 || !neighbor) {
        return;
    }
    const from = tasks.indexOf(activeTasks[index]);
    const to = tasks.indexOf(neighbor);
    [tasks[from], tasks[to]] = [tasks[to], tasks[from]];
    commit();
}

// ---- Rendering ----

// Updates the existing <li> elements in place instead of rebuilding the lists,
// so an edit in progress or an open timer form isn't thrown away
function render() {
    const activeTasks = tasks.filter((task) => !task.done);
    // Most recently completed first; tasks completed before completion times were saved go last
    const doneTasks = tasks
        .filter((task) => task.done)
        .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

    const ids = new Set(tasks.map((task) => task.id));
    for (const [id, li] of taskElements) {
        if (!ids.has(id)) {
            li.remove();
            taskElements.delete(id);
        }
    }
    placeTasks(activeList, activeTasks);
    placeTasks(completedList, doneTasks);

    activeList.hidden = filter === "done";
    completedSection.hidden = filter === "active" || doneTasks.length === 0;
    completedList.hidden = !settings.showCompleted;
    completedToggle.setAttribute("aria-expanded", String(settings.showCompleted));
    completedCount.textContent = doneTasks.length;

    document.querySelector('[data-count="all"]').textContent = tasks.length;
    document.querySelector('[data-count="active"]').textContent = activeTasks.length;
    document.querySelector('[data-count="done"]').textContent = doneTasks.length;

    let emptyMessage = "";
    if (tasks.length === 0) {
        emptyMessage = "No tasks yet. Add one above.";
    } else if (filter === "done" && doneTasks.length === 0) {
        emptyMessage = "No completed tasks yet.";
    } else if (filter !== "done" && activeTasks.length === 0) {
        emptyMessage = "Nothing left to do.";
    }
    emptyState.textContent = emptyMessage;
    emptyState.hidden = !emptyMessage;

    deleteAllButton.disabled = tasks.length === 0;
    updateTitle(Date.now());
}

// Puts the elements for `listTasks` into `list`, in order
function placeTasks(list, listTasks) {
    // Take out tasks that now belong in the other list first, so they don't throw off the positions below
    const ids = new Set(listTasks.map((task) => task.id));
    for (const li of [...list.children]) {
        if (!ids.has(li.dataset.id)) {
            li.remove();
        }
    }

    listTasks.forEach((task, index) => {
        let li = taskElements.get(task.id);
        if (!li) {
            li = createTaskElement(task.id);
            taskElements.set(task.id, li);
        }
        updateTaskElement(li, task);

        // Only move elements that are out of place, since moving one takes focus away from it
        const current = list.children[index];
        if (current !== li) {
            list.insertBefore(li, current ?? null);
        }
    });
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

    const completedAt = li.querySelector(".task-completed-at");
    const hasCompletedAt = task.done && task.completedAt !== null;
    completedAt.textContent = hasCompletedAt ? `done ${formatCompletedTime(task.completedAt)}` : "";
    completedAt.title = hasCompletedAt ? new Date(task.completedAt).toLocaleString() : "";

    const timerRunning = task.timerEndsAt !== null;
    const timerButton = li.querySelector('[data-action="timer"]');
    timerButton.querySelector(".bi").className = `bi ${timerRunning ? "bi-stop-circle" : "bi-stopwatch"}`;
    setLabel(timerButton, timerRunning ? "Stop timer" : "Start timer");
    if (task.done) {
        closeTimerForm(li);
    }
    updateCountdown(li, task, Date.now());
}

function remainingSeconds(task, now) {
    return Math.max(0, Math.ceil((task.timerEndsAt - now) / 1000));
}

function updateCountdown(li, task, now) {
    const timer = li.querySelector(".task-timer");
    const progress = li.querySelector(".task-progress");
    if (task.timerEndsAt === null) {
        timer.textContent = "";
        progress.hidden = true;
        return;
    }

    timer.textContent = formatCountdown(remainingSeconds(task, now));
    // Timers saved before durations were stored have no progress bar
    progress.hidden = !task.timerDuration;
    if (task.timerDuration) {
        const elapsed = 1 - (task.timerEndsAt - now) / task.timerDuration;
        progress.style.width = `${Math.min(Math.max(elapsed, 0), 1) * 100}%`;
    }
}

// Shows the timer that ends first in the tab title, so it can be seen from other tabs
function updateTitle(now) {
    const runningTasks = tasks.filter((task) => task.timerEndsAt !== null);
    if (runningTasks.length === 0) {
        document.title = BASE_TITLE;
        return;
    }
    const next = runningTasks.reduce((soonest, task) => (task.timerEndsAt < soonest.timerEndsAt ? task : soonest));
    document.title = `⏲ ${formatCountdown(remainingSeconds(next, now))} · ${BASE_TITLE}`;
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
        task.timerDuration = null;
    });
    commit(); // also schedules the next timer, if any

    for (const task of dueTasks) {
        announceTimeUp(task, {
            repeatSound: settings.repeatAlarm,
            onMarkDone: () => setDone(task.id, true),
            onSnooze: () => startTimer(task.id, SNOOZE_MINUTES),
        });
    }
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
    updateTitle(now.getTime());
    setTimeout(updateEverySecond, 1000 - now.getMilliseconds());
}

// ---- Backup ----

function exportTasks() {
    const backup = { app: "html-simple-todo", version: 1, exportedAt: new Date().toISOString(), tasks };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `todo-backup-${formatIsoDate(new Date())}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    // Some browsers read the file after click() returns, so release it a little later
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importTasks(file) {
    let imported = null;
    try {
        imported = parseBackup(JSON.parse(await file.text()));
    } catch (error) {
        console.warn("Could not read backup", error);
    }
    if (!imported) {
        showAlert(`"${file.name}" isn't a ToDo backup file.`, { variant: "danger" });
        return;
    }

    const previousTasks = tasks;
    tasks = imported;
    commit();
    settingsPanel.hidePopover?.();
    showUndoToast(`Imported ${plural(imported.length, "task")}`, () => {
        tasks = previousTasks;
        commit();
    });
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

for (const input of document.querySelectorAll('input[name="filter"]')) {
    input.addEventListener("change", () => {
        filter = input.value;
        if (filter === "done" && !settings.showCompleted) {
            settings.showCompleted = true;
            saveSettings(settings);
        }
        render();
    });
}

// One set of listeners on the task section handles every task in both lists, including ones added later
tasksSection.addEventListener("click", (event) => {
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
                stopTimer(id);
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
            removeTasks((task) => task.id === id, () => "Task deleted");
            break;
    }
});

tasksSection.addEventListener("change", (event) => {
    if (!event.target.matches(".task-check")) {
        return;
    }
    const li = event.target.closest(".task");
    const neighbor = li.nextElementSibling ?? li.previousElementSibling;
    setDone(li.dataset.id, event.target.checked);

    // The task moved to the other list, which takes focus away; keep keyboard users near where they were
    if (document.activeElement === document.body) {
        neighbor?.querySelector(".task-check").focus();
    }
});

// The browser only fires "submit" once the minutes field passes its required/min/max checks
tasksSection.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target;
    submitTimer(form.closest(".task"), form.elements.minutes.valueAsNumber);
});

tasksSection.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && event.target.closest(".timer-form")) {
        closeTimerForm(event.target.closest(".task"), { focusTimerButton: true });
    }
});

completedToggle.addEventListener("click", () => {
    settings.showCompleted = !settings.showCompleted;
    saveSettings(settings);
    render();
});

clearCompletedButton.addEventListener("click", () => {
    removeTasks((task) => task.done, (count) => `Cleared ${plural(count, "completed task")}`);
});

deleteAllButton.addEventListener("click", () => {
    removeTasks(() => true, (count) => `Deleted ${plural(count, "task")}`);
});

repeatAlarmInput.checked = settings.repeatAlarm;
repeatAlarmInput.addEventListener("change", () => {
    settings.repeatAlarm = repeatAlarmInput.checked;
    saveSettings(settings);
});

document.getElementById("exportButton").addEventListener("click", exportTasks);
document.getElementById("importButton").addEventListener("click", () => importFile.click());
importFile.addEventListener("change", () => {
    const file = importFile.files[0];
    importFile.value = ""; // so choosing the same file again still triggers "change"
    if (file) {
        importTasks(file);
    }
});

// Keyboard shortcuts: N or / to type a new task, Alt+Up/Down to move the focused task
document.addEventListener("keydown", (event) => {
    const target = event.target;

    if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
        const li = target.closest?.("#activeList > .task");
        if (li && !target.matches(".task-edit-input")) {
            event.preventDefault();
            moveTask(li.dataset.id, event.key === "ArrowUp" ? -1 : 1);
            target.focus(); // moving the element takes focus away from it
        }
        return;
    }

    const isShortcut = event.key === "n" || event.key === "N" || event.key === "/";
    const isTyping = target.matches?.("input:not([type='checkbox'], [type='radio']), textarea, select, [contenteditable]");
    if (isShortcut && !event.ctrlKey && !event.metaKey && !event.altKey && !isTyping) {
        event.preventDefault();
        taskInput.focus();
    }
});

Sortable.create(activeList, {
    animation: 150,
    handle: ".drag-handle",
    // Fires after a drag changed the order. Sortable has already moved the element, so read the order back.
    onUpdate: () => {
        const tasksById = new Map(tasks.map((task) => [task.id, task]));
        const reordered = [...activeList.children].map((li) => tasksById.get(li.dataset.id)).filter(Boolean);
        tasks = [...reordered, ...tasks.filter((task) => task.done)];
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

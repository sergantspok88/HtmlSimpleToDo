// @ts-check

/**
 * A task as kept in memory, in localStorage and in backup files.
 * @typedef {object} Task
 * @property {string} id
 * @property {string} text
 * @property {boolean} done
 * @property {number | null} completedAt epoch milliseconds
 * @property {number | null} timerEndsAt epoch milliseconds, null when no timer is running
 * @property {number | null} timerDuration milliseconds, for the progress bar
 */

/**
 * @typedef {object} Settings
 * @property {"top" | "bottom"} addPosition where new tasks go
 * @property {boolean} showCompleted whether the completed section is expanded
 * @property {boolean} repeatAlarm repeat the timer sound until the message is dismissed
 */

export const STORAGE_KEY = "tasks";
const SETTINGS_KEY = "settings";

/** @type {Settings} */
const DEFAULT_SETTINGS = {
    addPosition: "top",
    showCompleted: true,
    repeatAlarm: true,
};

/** @returns {Settings} */
export function loadSettings() {
    const saved = readJson(SETTINGS_KEY);

    // Use saved values only when they have the right type, so a bad value falls back to the default
    const settings = { ...DEFAULT_SETTINGS };
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
        if (typeof saved?.[key] === typeof DEFAULT_SETTINGS[key]) {
            settings[key] = saved[key];
        }
    }
    if (!["top", "bottom"].includes(settings.addPosition)) {
        settings.addPosition = DEFAULT_SETTINGS.addPosition;
    }
    return settings;
}

/** @param {Settings} settings */
export function saveSettings(settings) {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error("Could not save settings", error);
    }
}

/**
 * @param {string} text
 * @returns {Task}
 */
export function createTask(text) {
    return {
        id: createId(),
        text,
        done: false,
        completedAt: null,
        timerEndsAt: null,
        timerDuration: null,
    };
}

/** @returns {Task[]} */
export function loadTasks() {
    const saved = readJson(STORAGE_KEY);
    return Array.isArray(saved) ? normalizeTasks(saved) : [];
}

/**
 * Returns false when the browser refuses to store data (storage disabled or full).
 * @param {readonly Task[]} tasks
 */
export function saveTasks(tasks) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch (error) {
        console.error("Could not save tasks", error);
        return false;
    }
}

/**
 * Reads an exported backup ({ tasks: [...] }) or a plain list of tasks. Returns null if it is neither.
 * @param {unknown} data parsed JSON
 * @returns {Task[] | null}
 */
export function parseBackup(data) {
    const saved = Array.isArray(data) ? data : /** @type {any} */ (data)?.tasks;
    if (!Array.isArray(saved)) {
        return null;
    }
    const tasks = normalizeTasks(saved);
    if (saved.length > 0 && tasks.length === 0) {
        return null;
    }

    // Timers that ran out after the backup was made would all go off at once, so drop them
    const now = Date.now();
    for (const task of tasks) {
        if (task.timerEndsAt !== null && task.timerEndsAt <= now) {
            task.timerEndsAt = null;
            task.timerDuration = null;
        }
    }
    return tasks;
}

// Parsed JSON from localStorage; null when missing, undefined when unreadable or storage is unavailable
function readJson(key) {
    try {
        return JSON.parse(localStorage.getItem(key) ?? "null");
    } catch (error) {
        console.error(`Could not read saved ${key}`, error);
        return undefined;
    }
}

/**
 * @param {any[]} saved
 * @returns {Task[]}
 */
function normalizeTasks(saved) {
    const seenIds = new Set();
    return saved
        .filter((task) => typeof (task?.text ?? task?.name) === "string")
        .map((task) => {
            const normalized = normalizeTask(task);
            if (seenIds.has(normalized.id)) {
                normalized.id = createId();
            }
            seenIds.add(normalized.id);
            return normalized;
        });
}

/**
 * Earlier versions saved only { name, checked }, so fill in anything missing.
 * @param {any} saved
 * @returns {Task}
 */
function normalizeTask(saved) {
    const timerEndsAt = Number.isFinite(saved.timerEndsAt) ? saved.timerEndsAt : null;
    return {
        id: typeof saved.id === "string" ? saved.id : createId(),
        text: saved.text ?? saved.name,
        done: Boolean(saved.done ?? saved.checked),
        completedAt: Number.isFinite(saved.completedAt) ? saved.completedAt : null,
        timerEndsAt,
        timerDuration: timerEndsAt !== null && Number.isFinite(saved.timerDuration) ? saved.timerDuration : null,
    };
}

function createId() {
    // crypto.randomUUID only exists on https or localhost, e.g. not when opened via a LAN IP
    if (crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export const STORAGE_KEY = "tasks";
const SETTINGS_KEY = "settings";

const DEFAULT_SETTINGS = {
    addPosition: "top", // where new tasks go: "top" or "bottom"
};

export function loadSettings() {
    let saved;
    try {
        saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    } catch (error) {
        console.error("Could not read saved settings", error);
    }

    const settings = { ...DEFAULT_SETTINGS, ...saved };
    if (!["top", "bottom"].includes(settings.addPosition)) {
        settings.addPosition = DEFAULT_SETTINGS.addPosition;
    }
    return settings;
}

export function saveSettings(settings) {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error("Could not save settings", error);
    }
}

// A task as kept in memory and in localStorage
export function createTask(text) {
    return {
        id: createId(),
        text,
        done: false,
        completedAt: null, // epoch milliseconds
        timerEndsAt: null, // epoch milliseconds, null when no timer is running
    };
}

export function loadTasks() {
    let saved;
    try {
        saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (error) {
        console.error("Could not read saved tasks", error);
        return [];
    }

    if (!Array.isArray(saved)) {
        return [];
    }
    return saved.filter((task) => typeof (task?.text ?? task?.name) === "string").map(normalizeTask);
}

// Returns false when the browser refuses to store data (storage disabled or full)
export function saveTasks(tasks) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch (error) {
        console.error("Could not save tasks", error);
        return false;
    }
}

// Earlier versions saved only { name, checked }, so fill in anything missing
function normalizeTask(saved) {
    return {
        id: typeof saved.id === "string" ? saved.id : createId(),
        text: saved.text ?? saved.name,
        done: Boolean(saved.done ?? saved.checked),
        completedAt: Number.isFinite(saved.completedAt) ? saved.completedAt : null,
        timerEndsAt: Number.isFinite(saved.timerEndsAt) ? saved.timerEndsAt : null,
    };
}

function createId() {
    // crypto.randomUUID only exists on https or localhost, e.g. not when opened via a LAN IP
    if (crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

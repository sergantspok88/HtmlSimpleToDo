import { startAlarmScheduler } from './alarmScheduler.js';
import { startClock } from './clock.js';
import { setupSettingsPanel } from './settingsPanel.js';
import { createSettingsStore } from './settingsStore.js';
import { setupShortcuts } from './shortcuts.js';
import { STORAGE_KEY, loadSettings, loadTasks, saveTasks } from './storage.js';
import { Stopwatch } from './stopwatch.js';
import { createTabTitle } from './tabTitle.js';
import { createTaskList } from './taskList.js';
import { createTaskStore } from './taskStore.js';
import { setupToolbar } from './toolbar.js';
import { showAlert } from './ui.js';

// The data: every module reads it from these stores and subscribes to hear about changes
const tasks = createTaskStore(loadTasks());
const settings = createSettingsStore(loadSettings());

// Save on every change, and warn once if the browser won't store anything
let saveFailureShown = false;
function save(allTasks) {
    if (!saveTasks(allTasks) && !saveFailureShown) {
        saveFailureShown = true;
        showAlert("Tasks could not be saved, so they will be lost when this page is closed.", { variant: "danger" });
    }
}
tasks.subscribe(save);
save(tasks.all); // also re-saves tasks loaded in the old format

// The page
const list = createTaskList(document.getElementById("tasks"), { tasks, settings });
const tabTitle = createTabTitle({ tasks });
startAlarmScheduler({ tasks, settings });
setupToolbar({ tasks, settings, list });
setupSettingsPanel({ tasks, settings });
setupShortcuts({ tasks });

startClock(document.getElementById("currentTime"), (now) => {
    list.updateCountdowns(now);
    tabTitle.update(now);
});

const stopwatch = new Stopwatch(document.getElementById("stopwatch"), document.getElementById("startPause"));
document.getElementById("startPause").addEventListener("click", () => stopwatch.toggle());
document.getElementById("reset").addEventListener("click", () => stopwatch.reset());

// Another tab saved its tasks (or storage was cleared): show the same list here
window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY || event.key === null) {
        tasks.replaceAll(loadTasks());
    }
});

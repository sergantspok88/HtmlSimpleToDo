import { exportTasks, readBackupFile } from './backup.js';
import { plural, showAlert, showUndoToast } from './ui.js';

// The Settings popover: repeating alarm sound, and backup export/import
export function setupSettingsPanel({ tasks, settings }) {
    const panel = document.getElementById("settingsPanel");
    const repeatAlarmInput = document.getElementById("repeatAlarm");
    const importFile = document.getElementById("importFile");

    repeatAlarmInput.checked = settings.current.repeatAlarm;
    repeatAlarmInput.addEventListener("change", () => {
        settings.update({ repeatAlarm: repeatAlarmInput.checked });
    });

    document.getElementById("exportButton").addEventListener("click", () => exportTasks(tasks.all));
    document.getElementById("importButton").addEventListener("click", () => importFile.click());

    importFile.addEventListener("change", async () => {
        const file = importFile.files[0];
        importFile.value = ""; // so choosing the same file again still triggers "change"
        if (!file) {
            return;
        }

        const imported = await readBackupFile(file);
        if (!imported) {
            showAlert(`"${file.name}" isn't a ToDo backup file.`, { variant: "danger" });
            return;
        }
        const undo = tasks.replaceAll(imported);
        panel.hidePopover?.();
        showUndoToast(`Imported ${plural(imported.length, "task")}`, undo);
    });
}

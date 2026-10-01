import { exportTasks, readBackupFile } from './backup.js';
import { plural, showAlert, showUndoToast } from './ui.js';

// The Settings popover: backup export/import (and a list of keyboard shortcuts, which needs no code)
export function setupSettingsPanel({ tasks }) {
    const panel = document.getElementById("settingsPanel");
    const importFile = document.getElementById("importFile");

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

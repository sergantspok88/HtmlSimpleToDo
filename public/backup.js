import { parseBackup } from './storage.js';
import { formatIsoDate } from './time.js';

// Downloads the tasks as a JSON file
export function exportTasks(tasks) {
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

// Reads a file the user picked. Returns its tasks, or null if it isn't a backup.
export async function readBackupFile(file) {
    try {
        return parseBackup(JSON.parse(await file.text()));
    } catch (error) {
        console.warn("Could not read backup", error);
        return null;
    }
}

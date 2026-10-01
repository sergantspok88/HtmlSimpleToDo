// Keyboard shortcuts: N or / to type a new task, Alt+Up/Down to move the focused task
export function setupShortcuts({ tasks }) {
    const taskInput = document.getElementById("taskInput");

    document.addEventListener("keydown", (event) => {
        const target = event.target;

        if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
            const li = target.closest?.("#activeList > .task");
            if (li && !target.matches(".task-edit-input")) {
                event.preventDefault();
                tasks.move(li.dataset.id, event.key === "ArrowUp" ? -1 : 1);
                target.focus(); // moving the row takes focus away from it
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
}

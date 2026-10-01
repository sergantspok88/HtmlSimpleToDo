// Keyboard shortcuts: N to type a new task, / to search, Alt+Up/Down to move the focused task
export function setupShortcuts({ tasks }) {
    const taskInput = document.getElementById("taskInput");
    const searchInput = document.getElementById("searchInput");

    document.addEventListener("keydown", (event) => {
        const target = event.target;

        if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
            const li = target.closest?.("#activeList > .task");
            if (li && !target.matches(".task-edit-input")) {
                event.preventDefault();
                // Swap with the row shown next to it, which skips tasks hidden by a search
                const neighbor = event.key === "ArrowUp" ? li.previousElementSibling : li.nextElementSibling;
                if (neighbor) {
                    tasks.swap(li.dataset.id, neighbor.dataset.id);
                    target.focus(); // moving the row takes focus away from it
                }
            }
            return;
        }

        const isTyping = target.matches?.("input:not([type='checkbox'], [type='radio']), textarea, select, [contenteditable]");
        if (isTyping || event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }
        if (event.key === "n" || event.key === "N") {
            event.preventDefault();
            taskInput.focus();
        } else if (event.key === "/") {
            event.preventDefault();
            searchInput.focus();
        }
    });
}

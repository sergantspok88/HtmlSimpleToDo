import { plural, removeWithUndo } from './ui.js';

// The controls around the list: the add form, where new tasks go, the filter buttons and Delete All
export function setupToolbar({ tasks, settings, list }) {
    const taskInput = document.getElementById("taskInput");
    const addPositionSelect = document.getElementById("addPosition");
    const deleteAllButton = document.getElementById("deleteAllButton");
    const filterCount = (name) => document.querySelector(`[data-count="${name}"]`);
    const counts = { all: filterCount("all"), active: filterCount("active"), done: filterCount("done") };

    document.getElementById("addTaskForm").addEventListener("submit", (event) => {
        event.preventDefault();
        const text = taskInput.value.trim();
        if (text) {
            tasks.add(text, settings.current.addPosition);
            taskInput.value = "";
        }
    });

    addPositionSelect.value = settings.current.addPosition;
    addPositionSelect.addEventListener("change", () => {
        settings.update({ addPosition: addPositionSelect.value });
    });

    for (const input of document.querySelectorAll('input[name="filter"]')) {
        input.addEventListener("change", () => list.setFilter(input.value));
    }

    deleteAllButton.addEventListener("click", () => {
        removeWithUndo(tasks, () => true, (count) => `Deleted ${plural(count, "task")}`);
    });

    function render(allTasks) {
        const doneCount = allTasks.filter((task) => task.done).length;
        counts.all.textContent = allTasks.length;
        counts.active.textContent = allTasks.length - doneCount;
        counts.done.textContent = doneCount;
        deleteAllButton.disabled = allTasks.length === 0;
    }

    tasks.subscribe(render);
    render(tasks.all);
}

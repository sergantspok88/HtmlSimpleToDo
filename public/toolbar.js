import { plural, removeWithUndo } from './ui.js';

// The controls around the list: the add form, where new tasks go, filter buttons, search and Delete All
export function setupToolbar({ tasks, settings, list }) {
    const taskInput = document.getElementById("taskInput");
    const addPositionSelect = document.getElementById("addPosition");
    const searchInput = document.getElementById("searchInput");
    const deleteAllButton = document.getElementById("deleteAllButton");
    const filterCount = (name) => document.querySelector(`[data-count="${name}"]`);
    const counts = { all: filterCount("all"), active: filterCount("active"), done: filterCount("done") };

    const clearSearch = () => {
        searchInput.value = "";
        list.setSearch("");
    };

    document.getElementById("addTaskForm").addEventListener("submit", (event) => {
        event.preventDefault();
        const text = taskInput.value.trim();
        if (text) {
            // A new task that doesn't match the search would vanish as soon as it's added
            if (searchInput.value) {
                clearSearch();
            }
            tasks.add(text, settings.current.addPosition);
            taskInput.value = "";
        }
    });

    searchInput.addEventListener("input", () => list.setSearch(searchInput.value.trim()));
    searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            clearSearch();
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

import Sortable from './vendor/sortablejs/sortable.esm.js';
import { requestNotificationPermission } from './alarm.js';
import { TaskRow } from './taskRow.js';
import { plural, removeWithUndo } from './ui.js';

// The active and completed lists, and everything done to the tasks in them
export function createTaskList(section, { tasks, settings }) {
    const activeList = section.querySelector("#activeList");
    const completedSection = section.querySelector("#completedSection");
    const completedList = section.querySelector("#completedList");
    const completedToggle = section.querySelector("#completedToggle");
    const completedCount = section.querySelector("#completedCount");
    const clearCompletedButton = section.querySelector("#clearCompletedButton");
    const emptyState = section.querySelector("#emptyState");

    const rows = new Map(); // task id -> TaskRow
    let filter = "all"; // "all", "active" or "done"

    // ---- Drawing ----

    // Updates the existing rows in place instead of rebuilding the lists,
    // so an edit in progress or an open timer form isn't thrown away
    function render() {
        const allTasks = tasks.all;
        const activeTasks = allTasks.filter((task) => !task.done);
        // Most recently completed first; tasks completed before completion times were saved go last
        const doneTasks = allTasks
            .filter((task) => task.done)
            .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

        removeDeletedRows(allTasks);
        placeRows(activeList, activeTasks);
        placeRows(completedList, doneTasks);

        activeList.hidden = filter === "done";
        completedSection.hidden = filter === "active" || doneTasks.length === 0;
        completedList.hidden = !settings.current.showCompleted;
        completedToggle.setAttribute("aria-expanded", String(settings.current.showCompleted));
        completedCount.textContent = doneTasks.length;

        const message = emptyMessage(allTasks.length, activeTasks.length, doneTasks.length);
        emptyState.textContent = message;
        emptyState.hidden = !message;
    }

    function removeDeletedRows(allTasks) {
        const ids = new Set(allTasks.map((task) => task.id));
        for (const [id, row] of rows) {
            if (!ids.has(id)) {
                row.element.remove();
                rows.delete(id);
            }
        }
    }

    // Puts the rows for `listTasks` into `list`, in order
    function placeRows(list, listTasks) {
        // Take out rows that now belong in the other list first, so they don't throw off the positions below
        const ids = new Set(listTasks.map((task) => task.id));
        for (const li of [...list.children]) {
            if (!ids.has(li.dataset.id)) {
                li.remove();
            }
        }

        listTasks.forEach((task, index) => {
            let row = rows.get(task.id);
            if (!row) {
                row = new TaskRow(task.id);
                rows.set(task.id, row);
            }
            row.update(task);

            // Only move rows that are out of place, since moving one takes focus away from it
            const current = list.children[index];
            if (current !== row.element) {
                list.insertBefore(row.element, current ?? null);
            }
        });
    }

    function emptyMessage(total, activeCount, doneCount) {
        if (total === 0) {
            return "No tasks yet. Add one above.";
        }
        if (filter === "done" && doneCount === 0) {
            return "No completed tasks yet.";
        }
        if (filter !== "done" && activeCount === 0) {
            return "Nothing left to do.";
        }
        return "";
    }

    function updateCountdowns(now) {
        for (const task of tasks.all) {
            if (task.timerEndsAt !== null) {
                rows.get(task.id)?.updateCountdown(task, now);
            }
        }
    }

    // ---- Actions on a task ----

    function startTimer(row, task, minutes) {
        row.closeTimerForm({ focusTimerButton: true });
        requestNotificationPermission();
        tasks.startTimer(task.id, minutes);
    }

    // What each button with a data-action attribute does
    const actions = {
        edit: (row, task) => row.startEditing(task.text, (text) => tasks.rename(task.id, text)),
        timer: (row, task) => (task.timerEndsAt !== null ? tasks.stopTimer(task.id) : row.openTimerForm()),
        preset: (row, task, button) => startTimer(row, task, Number(button.dataset.minutes)),
        "cancel-timer": (row) => row.closeTimerForm({ focusTimerButton: true }),
        delete: (row, task) => removeWithUndo(tasks, (t) => t.id === task.id, () => "Task deleted"),
    };

    // The row and task that an element belongs to
    function rowOf(element) {
        const id = element.closest(".task")?.dataset.id;
        return { row: rows.get(id), task: tasks.find(id) };
    }

    // One set of listeners on the section handles every row in both lists, including rows added later
    section.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button) {
            return;
        }
        const { row, task } = rowOf(button);
        if (row && task) {
            actions[button.dataset.action]?.(row, task, button);
        }
    });

    section.addEventListener("change", (event) => {
        if (!event.target.matches(".task-check")) {
            return;
        }
        const li = event.target.closest(".task");
        const neighbor = li.nextElementSibling ?? li.previousElementSibling;
        tasks.setDone(li.dataset.id, event.target.checked);

        // The task moved to the other list, which takes focus away; keep keyboard users near where they were
        if (document.activeElement === document.body) {
            neighbor?.querySelector(".task-check").focus();
        }
    });

    // The browser only fires "submit" once the minutes field passes its required/min/max checks
    section.addEventListener("submit", (event) => {
        event.preventDefault();
        const { row, task } = rowOf(event.target);
        if (row && task) {
            startTimer(row, task, event.target.elements.minutes.valueAsNumber);
        }
    });

    section.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && event.target.closest(".timer-form")) {
            rowOf(event.target).row?.closeTimerForm({ focusTimerButton: true });
        }
    });

    completedToggle.addEventListener("click", () => {
        settings.update({ showCompleted: !settings.current.showCompleted });
    });

    clearCompletedButton.addEventListener("click", () => {
        removeWithUndo(tasks, (task) => task.done, (count) => `Cleared ${plural(count, "completed task")}`);
    });

    Sortable.create(activeList, {
        animation: 150,
        handle: ".drag-handle",
        // Fires after a drag changed the order. Sortable has already moved the row, so read the order back.
        onUpdate: () => tasks.reorderActive([...activeList.children].map((li) => li.dataset.id)),
    });

    tasks.subscribe(render);
    settings.subscribe(render);
    render();

    return {
        // "all", "active" or "done". Showing only done tasks also expands the completed section.
        setFilter(value) {
            filter = value;
            if (filter === "done" && !settings.current.showCompleted) {
                settings.update({ showCompleted: true }); // re-renders through the subscription
            } else {
                render();
            }
        },
        updateCountdowns,
    };
}

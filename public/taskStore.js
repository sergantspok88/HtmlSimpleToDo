// @ts-check
import { createListeners } from './listeners.js';
import { createTask } from './storage.js';

/** @typedef {import('./storage.js').Task} Task */

/**
 * Holds the task list and every way of changing it. It knows nothing about the page: other modules
 * subscribe() to hear about changes, so the rules here can be tested without a browser.
 * @param {Task[]} initialTasks
 */
export function createTaskStore(initialTasks) {
    let tasks = initialTasks;
    const { subscribe, notify } = createListeners();

    const changed = () => notify(tasks);

    /** @param {string} id */
    const find = (id) => tasks.find((task) => task.id === id);

    /**
     * @param {string} id
     * @param {Partial<Task>} changes
     */
    function update(id, changes) {
        const task = find(id);
        if (task) {
            Object.assign(task, changes);
            changed();
        }
    }

    return {
        /** Calls `listener(tasks)` after every change. Returns a function that stops it. */
        subscribe,
        find,

        /** @returns {readonly Task[]} */
        get all() {
            return tasks;
        },

        /**
         * @param {string} text
         * @param {"top" | "bottom"} position
         */
        add(text, position) {
            const task = createTask(text);
            if (position === "top") {
                tasks.unshift(task);
            } else {
                tasks.push(task);
            }
            changed();
        },

        /**
         * @param {string} id
         * @param {string} text
         */
        rename(id, text) {
            update(id, { text });
        },

        /**
         * Completing a task also stops its timer.
         * @param {string} id
         * @param {boolean} done
         */
        setDone(id, done, now = Date.now()) {
            if (done) {
                update(id, { done: true, completedAt: now, timerEndsAt: null, timerDuration: null });
            } else {
                update(id, { done: false, completedAt: null });
            }
        },

        /**
         * Returns false, and changes nothing, for a completed task or an invalid length.
         * @param {string} id
         * @param {number} minutes
         */
        startTimer(id, minutes, now = Date.now()) {
            const task = find(id);
            if (!task || task.done || !Number.isFinite(minutes) || minutes <= 0) {
                return false;
            }
            const duration = minutes * 60 * 1000;
            update(id, { timerEndsAt: now + duration, timerDuration: duration });
            return true;
        },

        /** @param {string} id */
        stopTimer(id) {
            update(id, { timerEndsAt: null, timerDuration: null });
        },

        /** Stops every timer that has run out, and returns those tasks. */
        finishDueTimers(now = Date.now()) {
            const dueTasks = tasks.filter((task) => task.timerEndsAt !== null && task.timerEndsAt <= now);
            for (const task of dueTasks) {
                task.timerEndsAt = null;
                task.timerDuration = null;
            }
            if (dueTasks.length > 0) {
                changed();
            }
            return dueTasks;
        },

        /**
         * Swaps an active task with the active task above (-1) or below (+1) it.
         * @param {string} id
         * @param {-1 | 1} direction
         */
        move(id, direction) {
            const activeTasks = tasks.filter((task) => !task.done);
            const index = activeTasks.findIndex((task) => task.id === id);
            const neighbor = activeTasks[index + direction];
            if (index === -1 || !neighbor) {
                return;
            }
            const from = tasks.indexOf(activeTasks[index]);
            const to = tasks.indexOf(neighbor);
            [tasks[from], tasks[to]] = [tasks[to], tasks[from]];
            changed();
        },

        /**
         * Puts the active tasks in the given order, followed by everything else in its current order.
         * @param {string[]} ids
         */
        reorderActive(ids) {
            const ordered = ids.map(find).filter((task) => task !== undefined && !task.done);
            const rest = tasks.filter((task) => !ordered.includes(task));
            tasks = [...ordered, ...rest];
            changed();
        },

        /**
         * Removes the matching tasks. Returns how many, and an undo() that puts them back where they were.
         * @param {(task: Task) => boolean} shouldRemove
         */
        remove(shouldRemove) {
            /** @type {{ task: Task, index: number }[]} */
            const removed = [];
            /** @type {Task[]} */
            const kept = [];
            tasks.forEach((task, index) => {
                if (shouldRemove(task)) {
                    removed.push({ task, index });
                } else {
                    kept.push(task);
                }
            });
            tasks = kept;
            if (removed.length > 0) {
                changed();
            }

            return {
                count: removed.length,
                undo() {
                    // Going from the lowest position up keeps the later positions right
                    for (const { task, index } of removed) {
                        if (!find(task.id)) {
                            tasks.splice(Math.min(index, tasks.length), 0, task);
                        }
                    }
                    changed();
                },
            };
        },

        /**
         * Replaces every task, e.g. from a backup or another tab. Returns a function that brings the old ones back.
         * @param {Task[]} newTasks
         */
        replaceAll(newTasks) {
            const previousTasks = tasks;
            tasks = newTasks;
            changed();
            return () => {
                tasks = previousTasks;
                changed();
            };
        },
    };
}

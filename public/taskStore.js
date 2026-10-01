// @ts-check
import { createListeners } from './listeners.js';
import { createTask } from './storage.js';

/** @typedef {import('./storage.js').Task} Task */

// The timer fields of a task with no timer running
const NO_TIMER = Object.freeze({ timerEndsAt: null, timerDuration: null, timerRepeat: false });

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

    /**
     * Starts a timer that ends at `endsAt` (epoch milliseconds), e.g. for a reminder at a time of day.
     * `repeat` repeats the sound until the time's-up message is dismissed.
     * Returns false, and changes nothing, for a completed task or a time that isn't in the future.
     * @param {string} id
     * @param {number} endsAt
     */
    function startTimerUntil(id, endsAt, { repeat = false, now = Date.now() } = {}) {
        const task = find(id);
        if (!task || task.done || !Number.isFinite(endsAt) || endsAt <= now) {
            return false;
        }
        update(id, { timerEndsAt: endsAt, timerDuration: endsAt - now, timerRepeat: repeat });
        return true;
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
                update(id, { done: true, completedAt: now, ...NO_TIMER });
            } else {
                update(id, { done: false, completedAt: null });
            }
        },

        /**
         * Starts a timer that runs for `minutes`. `repeat` repeats the sound until the time's-up message
         * is dismissed. Returns false, and changes nothing, for a completed task or an invalid length.
         * @param {string} id
         * @param {number} minutes
         */
        startTimer(id, minutes, { repeat = false, now = Date.now() } = {}) {
            return startTimerUntil(id, now + minutes * 60 * 1000, { repeat, now });
        },

        startTimerUntil,

        /** @param {string} id */
        stopTimer(id) {
            update(id, NO_TIMER);
        },

        /** Stops every timer that has run out. Returns those tasks as they were just before, timer settings included. */
        finishDueTimers(now = Date.now()) {
            const dueTasks = tasks.filter((task) => task.timerEndsAt !== null && task.timerEndsAt <= now);
            const before = dueTasks.map((task) => ({ ...task }));
            for (const task of dueTasks) {
                Object.assign(task, NO_TIMER);
            }
            if (dueTasks.length > 0) {
                changed();
            }
            return before;
        },

        /**
         * Swaps the positions of two tasks, e.g. to move a task past the one shown next to it.
         * @param {string} firstId
         * @param {string} secondId
         */
        swap(firstId, secondId) {
            const first = tasks.findIndex((task) => task.id === firstId);
            const second = tasks.findIndex((task) => task.id === secondId);
            if (first === -1 || second === -1 || first === second) {
                return;
            }
            [tasks[first], tasks[second]] = [tasks[second], tasks[first]];
            changed();
        },

        /**
         * Puts the given active tasks in this order, within the positions they already take up.
         * Every other task stays where it is, so reordering a filtered list doesn't move hidden tasks.
         * @param {string[]} ids
         */
        reorderActive(ids) {
            const ordered = ids.map(find).filter((task) => task !== undefined && !task.done);
            const reordering = new Set(ordered);
            let next = 0;
            tasks = tasks.map((task) => (reordering.has(task) ? ordered[next++] : task));
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

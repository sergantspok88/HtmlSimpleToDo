import { announceTimeUp } from './alarm.js';

const SNOOZE_MINUTES = 5;
// Longer setTimeout delays overflow and fire immediately
const MAX_TIMEOUT = 2 ** 31 - 1;

// Keeps a single timeout for the earliest running timer, and announces timers when they run out.
// One timeout fires on time without polling, and because it is usually started from a user action,
// browsers throttle it far less in background tabs than a repeating interval.
export function startAlarmScheduler({ tasks }) {
    let timeoutId = 0;

    function schedule() {
        clearTimeout(timeoutId);
        const endTimes = tasks.all.map((task) => task.timerEndsAt).filter((endsAt) => endsAt !== null);
        if (endTimes.length === 0) {
            return;
        }
        const delay = Math.min(Math.max(Math.min(...endTimes) - Date.now(), 0), MAX_TIMEOUT);
        timeoutId = setTimeout(finishDueTimers, delay);
    }

    function finishDueTimers() {
        // Stopping the timers notifies subscribers, which schedules the next timer
        const dueTasks = tasks.finishDueTimers();
        if (dueTasks.length === 0) {
            schedule(); // woke up early, e.g. for a timer longer than MAX_TIMEOUT
            return;
        }

        for (const task of dueTasks) {
            announceTimeUp(task, {
                repeatSound: task.timerRepeat,
                onMarkDone: () => tasks.setDone(task.id, true),
                // A snoozed timer keeps its sound setting
                onSnooze: () => tasks.startTimer(task.id, SNOOZE_MINUTES, { repeat: task.timerRepeat }),
            });
        }
    }

    tasks.subscribe(schedule);
    // Timers that ran out while the page was closed go off right away
    schedule();
}

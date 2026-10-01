import { formatCountdown, secondsUntil } from './time.js';

// Shows the timer that ends first in the browser tab title, so it can be seen from other tabs
export function createTabTitle({ tasks }) {
    const baseTitle = document.title;

    function update(now = Date.now()) {
        const runningTasks = tasks.all.filter((task) => task.timerEndsAt !== null);
        if (runningTasks.length === 0) {
            document.title = baseTitle;
            return;
        }
        const next = runningTasks.reduce((soonest, task) => (task.timerEndsAt < soonest.timerEndsAt ? task : soonest));
        document.title = `⏲ ${formatCountdown(secondsUntil(next.timerEndsAt, now))} · ${baseTitle}`;
    }

    tasks.subscribe(() => update());
    update();
    return { update };
}

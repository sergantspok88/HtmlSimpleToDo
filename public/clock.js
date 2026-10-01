import { formatClock } from './time.js';

// Shows the time in `element` and calls onTick(now) every second. It runs right after each full second,
// so the clock and anything updated in onTick stay in step with the system time.
export function startClock(element, onTick) {
    function tick() {
        const now = new Date();
        element.textContent = formatClock(now);
        onTick(now.getTime());
        setTimeout(tick, 1000 - now.getMilliseconds());
    }
    tick();
}

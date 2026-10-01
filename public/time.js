// @ts-check

/** @param {number} number */
const pad = (number) => number.toString().padStart(2, "0");

/**
 * Whole seconds left until `timestamp`, rounded up and never below 0.
 * @param {number} timestamp
 * @param {number} now
 */
export function secondsUntil(timestamp, now) {
    return Math.max(0, Math.ceil((timestamp - now) / 1000));
}

/**
 * Wall-clock time as hh:mm:ss.
 * @param {Date} date
 */
export function formatClock(date) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Elapsed time as hh:mm:ss.t (t = tenths of a second).
 * @param {number} milliseconds
 */
export function formatStopwatch(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const tenths = Math.floor(milliseconds / 100) % 10;

    return `${pad(hours)}:${pad(minutes)}:${pad(totalSeconds % 60)}.${tenths}`;
}

/**
 * Remaining time as mm:ss, or h:mm:ss from an hour up.
 * @param {number} totalSeconds
 */
export function formatCountdown(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutesAndSeconds = `${pad(Math.floor(totalSeconds / 60) % 60)}:${pad(totalSeconds % 60)}`;
    return hours > 0 ? `${hours}:${minutesAndSeconds}` : minutesAndSeconds;
}

/**
 * Reads a time of day typed by hand: "15:30", "15.30", "1530", "930", "15", "3pm", "3:30 pm".
 * Returns 24-hour { hours, minutes }, or null if it isn't a valid time.
 * @param {string} text
 */
export function parseTimeOfDay(text) {
    const match = /^\s*(\d{1,2})(?:[:.\s]?(\d{2}))?\s*(am|pm|a|p)?\s*$/i.exec(text);
    if (!match) {
        return null;
    }
    let hours = Number(match[1]);
    const minutes = Number(match[2] ?? 0);
    const suffix = match[3]?.toLowerCase();
    if (suffix) {
        if (hours < 1 || hours > 12) {
            return null;
        }
        hours = (hours % 12) + (suffix.startsWith("p") ? 12 : 0);
    }
    if (hours > 23 || minutes > 59) {
        return null;
    }
    return { hours, minutes };
}

/**
 * Round times coming up, e.g. every 30 minutes, to suggest as reminder times.
 * @returns {number[]} epoch milliseconds
 */
export function upcomingRoundTimes(now = new Date(), { stepMinutes = 30, count = 24 } = {}) {
    const first = new Date(now);
    first.setSeconds(0, 0);
    first.setMinutes((Math.floor(first.getMinutes() / stepMinutes) + 1) * stepMinutes);
    return Array.from({ length: count }, (_, index) => first.getTime() + index * stepMinutes * 60 * 1000);
}

/**
 * A length of time in whole minutes, rounded up: "1 min", "45 min", "2 h", "2 h 15 min".
 * @param {number} milliseconds
 */
export function formatDuration(milliseconds) {
    const totalMinutes = Math.max(1, Math.ceil(milliseconds / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) {
        return `${minutes} min`;
    }
    return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

/**
 * The next moment the clock shows hours:minutes: later today, or tomorrow if that time has passed.
 * @param {number} hours
 * @param {number} minutes
 * @returns {number} epoch milliseconds
 */
export function nextTimeOfDay(hours, minutes, now = new Date()) {
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    if (next <= now) {
        next.setDate(next.getDate() + 1);
    }
    return next.getTime();
}

/**
 * When something is due: "at 15:00" today, "tomorrow at 07:00", otherwise "on Oct 3 at 07:00".
 * @param {number} timestamp
 */
export function formatUpcomingTime(timestamp, now = new Date()) {
    const date = new Date(timestamp);
    const time = formatTimeOfDay(date);
    if (isSameDay(date, now)) {
        return `at ${time}`;
    }
    if (isSameDay(date, addDays(now, 1))) {
        return `tomorrow at ${time}`;
    }
    return `on ${date.toLocaleDateString([], { month: "short", day: "numeric" })} at ${time}`;
}

/**
 * Short completion time: "20:03" today, "yesterday 20:03", "Sep 28" this year, "Sep 28, 2025" before that.
 * @param {number} timestamp
 */
export function formatCompletedTime(timestamp, now = new Date()) {
    const date = new Date(timestamp);
    const time = formatTimeOfDay(date);
    if (isSameDay(date, now)) {
        return time;
    }
    if (isSameDay(date, addDays(now, -1))) {
        return `yesterday ${time}`;
    }

    /** @type {Intl.DateTimeFormatOptions} */
    const options = date.getFullYear() === now.getFullYear()
        ? { month: "short", day: "numeric" }
        : { year: "numeric", month: "short", day: "numeric" };
    return date.toLocaleDateString([], options);
}

/**
 * Local date as yyyy-mm-dd, e.g. for file names.
 * @param {Date} date
 */
export function formatIsoDate(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * 24-hour hh:mm, like the clock.
 * @param {Date} date
 */
export function formatTimeOfDay(date) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * @param {Date} first
 * @param {Date} second
 */
export function isSameDay(first, second) {
    return first.toDateString() === second.toDateString();
}

/**
 * @param {Date} date
 * @param {number} days
 */
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

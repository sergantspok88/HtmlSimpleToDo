const pad = (number) => number.toString().padStart(2, "0");

// Wall-clock time as hh:mm:ss
export function formatClock(date) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// Elapsed time as hh:mm:ss.t (t = tenths of a second)
export function formatStopwatch(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const tenths = Math.floor(milliseconds / 100) % 10;

    return `${pad(hours)}:${pad(minutes)}:${pad(totalSeconds % 60)}.${tenths}`;
}

// Remaining time as mm:ss (minutes may go above 59)
export function formatCountdown(totalSeconds) {
    return `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;
}

// Short completion time: "20:03" today, "yesterday 20:03", "Sep 28" this year, "Sep 28, 2025" before that.
// Times are 24-hour, like the clock.
export function formatCompletedTime(timestamp, now = new Date()) {
    const date = new Date(timestamp);
    const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    if (date.toDateString() === now.toDateString()) {
        return time;
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return `yesterday ${time}`;
    }

    const options = date.getFullYear() === now.getFullYear()
        ? { month: "short", day: "numeric" }
        : { year: "numeric", month: "short", day: "numeric" };
    return date.toLocaleDateString([], options);
}

// Local date as yyyy-mm-dd, e.g. for file names
export function formatIsoDate(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

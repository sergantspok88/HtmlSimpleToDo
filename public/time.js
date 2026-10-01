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

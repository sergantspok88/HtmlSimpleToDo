import { test } from "node:test";
import assert from "node:assert/strict";
import {
    formatClock, formatCompletedTime, formatCountdown, formatDuration, formatIsoDate, formatStopwatch,
    formatUpcomingTime, nextTimeOfDay, parseTimeOfDay, secondsUntil, upcomingRoundTimes,
} from "../public/time.js";

test("parseTimeOfDay understands the usual ways of typing a time", () => {
    const cases = {
        "15:30": [15, 30], "15.30": [15, 30], "1530": [15, 30], "15 30": [15, 30], " 7:05 ": [7, 5],
        "930": [9, 30], "0930": [9, 30], "15": [15, 0], "0": [0, 0], "23:59": [23, 59],
        "3pm": [15, 0], "3:30 PM": [15, 30], "3p": [15, 0], "12am": [0, 0], "12pm": [12, 0], "9 am": [9, 0],
    };
    for (const [text, [hours, minutes]] of Object.entries(cases)) {
        assert.deepEqual(parseTimeOfDay(text), { hours, minutes }, text);
    }
});

test("parseTimeOfDay rejects anything that isn't a time", () => {
    for (const text of ["", "abc", "24:00", "12:60", "15:3", "13pm", "0am", "1:2:3", "12345"]) {
        assert.equal(parseTimeOfDay(text), null, text);
    }
});

test("formatDuration rounds up to whole minutes", () => {
    assert.equal(formatDuration(10_000), "1 min");
    assert.equal(formatDuration(45 * 60_000), "45 min");
    assert.equal(formatDuration(120 * 60_000), "2 h");
    assert.equal(formatDuration(135 * 60_000 - 1), "2 h 15 min");
});

test("upcomingRoundTimes starts at the next round time", () => {
    const times = upcomingRoundTimes(new Date(2026, 9, 1, 22, 40, 15), { stepMinutes: 30, count: 3 });
    assert.deepEqual(times, [new Date(2026, 9, 1, 23, 0), new Date(2026, 9, 1, 23, 30), new Date(2026, 9, 2, 0, 0)].map(Number));

    // Exactly on a round time, the next one is suggested, not now
    assert.equal(upcomingRoundTimes(new Date(2026, 9, 1, 23, 0), { count: 1 })[0], new Date(2026, 9, 1, 23, 30).getTime());
});

test("formatClock shows 24-hour hh:mm:ss", () => {
    assert.equal(formatClock(new Date(2026, 9, 1, 7, 5, 9)), "07:05:09");
    assert.equal(formatClock(new Date(2026, 9, 1, 21, 30, 0)), "21:30:00");
});

test("formatStopwatch shows hours, minutes, seconds and tenths", () => {
    assert.equal(formatStopwatch(0), "00:00:00.0");
    assert.equal(formatStopwatch(3_723_456), "01:02:03.4");
});

test("formatCountdown shows mm:ss, and hours from an hour up", () => {
    assert.equal(formatCountdown(125), "02:05");
    assert.equal(formatCountdown(3599), "59:59");
    assert.equal(formatCountdown(3600), "1:00:00");
    assert.equal(formatCountdown(90 * 60 + 5), "1:30:05");
    assert.equal(formatCountdown(23 * 3600), "23:00:00");
});

test("nextTimeOfDay is later today, or tomorrow once the time has passed", () => {
    const now = new Date(2026, 9, 1, 14, 30);
    assert.equal(nextTimeOfDay(15, 0, now), new Date(2026, 9, 1, 15, 0).getTime());
    assert.equal(nextTimeOfDay(9, 0, now), new Date(2026, 9, 2, 9, 0).getTime());
    assert.equal(nextTimeOfDay(14, 30, now), new Date(2026, 9, 2, 14, 30).getTime()); // exactly now counts as passed
});

test("nextTimeOfDay handles the end of a month", () => {
    assert.equal(nextTimeOfDay(8, 0, new Date(2026, 9, 31, 22, 0)), new Date(2026, 10, 1, 8, 0).getTime());
});

test("formatUpcomingTime says today, tomorrow or the date", () => {
    const now = new Date(2026, 9, 1, 14, 30);
    assert.equal(formatUpcomingTime(new Date(2026, 9, 1, 15, 0).getTime(), now), "at 15:00");
    assert.equal(formatUpcomingTime(new Date(2026, 9, 2, 7, 5).getTime(), now), "tomorrow at 07:05");
    assert.match(formatUpcomingTime(new Date(2026, 9, 5, 7, 5).getTime(), now), /^on .*5.* at 07:05$/);
});

test("secondsUntil rounds up and never goes below zero", () => {
    assert.equal(secondsUntil(10_500, 10_000), 1);
    assert.equal(secondsUntil(12_000, 10_000), 2);
    assert.equal(secondsUntil(5_000, 10_000), 0);
});

test("formatCompletedTime gets shorter the more recent the time", () => {
    const now = new Date(2026, 9, 1, 21, 0);
    assert.equal(formatCompletedTime(new Date(2026, 9, 1, 20, 3).getTime(), now), "20:03");
    assert.equal(formatCompletedTime(new Date(2026, 8, 30, 9, 15).getTime(), now), "yesterday 09:15");
    // The month name depends on the computer's language, so only check what doesn't
    const thisYear = formatCompletedTime(new Date(2026, 8, 28, 12, 0).getTime(), now);
    assert.match(thisYear, /28/);
    assert.doesNotMatch(thisYear, /2026/);
    assert.match(formatCompletedTime(new Date(2025, 8, 28).getTime(), now), /2025/);
});

test("formatIsoDate pads month and day", () => {
    assert.equal(formatIsoDate(new Date(2026, 0, 5)), "2026-01-05");
});

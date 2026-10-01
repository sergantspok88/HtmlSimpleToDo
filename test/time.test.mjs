import { test } from "node:test";
import assert from "node:assert/strict";
import {
    formatClock, formatCompletedTime, formatCountdown, formatIsoDate, formatStopwatch, secondsUntil,
} from "../public/time.js";

test("formatClock shows 24-hour hh:mm:ss", () => {
    assert.equal(formatClock(new Date(2026, 9, 1, 7, 5, 9)), "07:05:09");
    assert.equal(formatClock(new Date(2026, 9, 1, 21, 30, 0)), "21:30:00");
});

test("formatStopwatch shows hours, minutes, seconds and tenths", () => {
    assert.equal(formatStopwatch(0), "00:00:00.0");
    assert.equal(formatStopwatch(3_723_456), "01:02:03.4");
});

test("formatCountdown lets minutes go past 59", () => {
    assert.equal(formatCountdown(125), "02:05");
    assert.equal(formatCountdown(90 * 60), "90:00");
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

import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { loadSettings, loadTasks, parseBackup, saveTasks } from "../public/storage.js";

// storage.js uses the browser's localStorage, so give it a simple in-memory one
const items = new Map();
Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
        getItem: (key) => items.get(key) ?? null,
        setItem: (key, value) => items.set(key, String(value)),
    },
});
beforeEach(() => items.clear());

test("loadTasks converts the old { name, checked } format", () => {
    items.set("tasks", JSON.stringify([{ name: "Old done", checked: true }, { name: "Old open", checked: false }]));
    const tasks = loadTasks();
    assert.deepEqual(tasks.map(({ text, done }) => ({ text, done })), [
        { text: "Old done", done: true },
        { text: "Old open", done: false },
    ]);
    for (const task of tasks) {
        assert.equal(typeof task.id, "string");
        assert.deepEqual([task.completedAt, task.timerEndsAt, task.timerDuration, task.timerRepeat], [null, null, null, false]);
    }
});

test("loadTasks returns an empty list for missing or unreadable data", (t) => {
    assert.deepEqual(loadTasks(), []);
    t.mock.method(console, "error", () => {}); // keep the expected error out of the test output
    items.set("tasks", "{not json");
    assert.deepEqual(loadTasks(), []);
});

test("saved tasks load back unchanged", () => {
    const tasks = [
        { id: "a", text: "Task", done: true, completedAt: 1, timerEndsAt: null, timerDuration: null, timerRepeat: false },
        { id: "b", text: "Timer", done: false, completedAt: null, timerEndsAt: 5000, timerDuration: 4000, timerRepeat: true },
    ];
    assert.equal(saveTasks(tasks), true);
    assert.deepEqual(loadTasks(), tasks);
});

test("tasks saved before the repeat option load with a single sound", () => {
    items.set("tasks", JSON.stringify([{ id: "a", text: "Timer", done: false, timerEndsAt: 5000, timerDuration: 4000 }]));
    assert.equal(loadTasks()[0].timerRepeat, false);
});

test("parseBackup accepts an exported file or a plain list of tasks", () => {
    const task = { id: "a", text: "Task", done: false };
    assert.equal(parseBackup({ version: 1, tasks: [task] }).length, 1);
    assert.equal(parseBackup([task]).length, 1);
    assert.deepEqual(parseBackup({ tasks: [] }), []);
});

test("parseBackup rejects files that aren't backups", () => {
    assert.equal(parseBackup("text"), null);
    assert.equal(parseBackup({ foo: 1 }), null);
    assert.equal(parseBackup([{ foo: 1 }]), null);
});

test("parseBackup drops timers that have already run out", () => {
    const now = Date.now();
    const [expired, running] = parseBackup([
        { id: "a", text: "Expired", timerEndsAt: now - 1000, timerDuration: 60_000 },
        { id: "b", text: "Running", timerEndsAt: now + 60_000, timerDuration: 120_000 },
    ]);
    assert.deepEqual([expired.timerEndsAt, expired.timerDuration], [null, null]);
    assert.deepEqual([running.timerEndsAt, running.timerDuration], [now + 60_000, 120_000]);
});

test("parseBackup gives duplicate ids a new id", () => {
    const [first, second] = parseBackup([{ id: "same", text: "One" }, { id: "same", text: "Two" }]);
    assert.equal(first.id, "same");
    assert.notEqual(second.id, "same");
});

test("loadSettings uses defaults for missing or invalid values", () => {
    assert.deepEqual(loadSettings(), { addPosition: "top", showCompleted: true });

    items.set("settings", JSON.stringify({ addPosition: "sideways", showCompleted: "yes", repeatAlarm: true }));
    assert.deepEqual(loadSettings(), { addPosition: "top", showCompleted: true }); // settings that no longer exist are dropped
});

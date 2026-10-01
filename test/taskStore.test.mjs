import { test } from "node:test";
import assert from "node:assert/strict";
import { createTaskStore } from "../public/taskStore.js";

const task = (id, fields = {}) => ({
    id, text: id, done: false, completedAt: null, timerEndsAt: null, timerDuration: null, ...fields,
});
const storeWith = (...ids) => createTaskStore(ids.map((id) => task(id)));
const texts = (store) => store.all.map((t) => t.text);

test("add puts new tasks at the top or the bottom", () => {
    const store = storeWith("a");
    store.add("first", "top");
    store.add("last", "bottom");
    assert.deepEqual(texts(store), ["first", "a", "last"]);
});

test("subscribers are told about every change until they unsubscribe", () => {
    const store = storeWith("a");
    const calls = [];
    const unsubscribe = store.subscribe((tasks) => calls.push(tasks.length));
    store.add("b", "bottom");
    store.rename("a", "renamed");
    unsubscribe();
    store.add("c", "bottom");
    assert.deepEqual(calls, [2, 2]);
});

test("completing a task records when, and stops its timer", () => {
    const store = createTaskStore([task("a", { timerEndsAt: 5000, timerDuration: 1000 })]);
    store.setDone("a", true, 1234);
    const { done, completedAt, timerEndsAt, timerDuration } = store.find("a");
    assert.deepEqual({ done, completedAt, timerEndsAt, timerDuration }, { done: true, completedAt: 1234, timerEndsAt: null, timerDuration: null });

    store.setDone("a", false);
    assert.equal(store.find("a").done, false);
    assert.equal(store.find("a").completedAt, null);
});

test("startTimer refuses completed tasks and invalid lengths", () => {
    const store = createTaskStore([task("a"), task("done", { done: true })]);
    assert.equal(store.startTimer("a", 0), false);
    assert.equal(store.startTimer("a", -5), false);
    assert.equal(store.startTimer("a", NaN), false);
    assert.equal(store.startTimer("done", 5), false);
    assert.equal(store.startTimer("missing", 5), false);
    assert.equal(store.find("a").timerEndsAt, null);

    assert.equal(store.startTimer("a", 1.5, 1000), true);
    assert.equal(store.find("a").timerEndsAt, 1000 + 90_000);
    assert.equal(store.find("a").timerDuration, 90_000);
});

test("finishDueTimers stops and returns only the timers that have run out", () => {
    const store = createTaskStore([
        task("due", { timerEndsAt: 1000, timerDuration: 500 }),
        task("later", { timerEndsAt: 9000, timerDuration: 500 }),
    ]);
    const due = store.finishDueTimers(2000);
    assert.deepEqual(due.map((t) => t.id), ["due"]);
    assert.equal(store.find("due").timerEndsAt, null);
    assert.equal(store.find("later").timerEndsAt, 9000);
});

test("finishDueTimers doesn't notify when nothing was due", () => {
    const store = createTaskStore([task("later", { timerEndsAt: 9000 })]);
    let notified = false;
    store.subscribe(() => { notified = true; });
    assert.deepEqual(store.finishDueTimers(1000), []);
    assert.equal(notified, false);
});

test("remove returns the count, and undo puts tasks back where they were", () => {
    const store = storeWith("a", "b", "c", "d");
    const removal = store.remove((t) => t.id === "b" || t.id === "d");
    assert.equal(removal.count, 2);
    assert.deepEqual(texts(store), ["a", "c"]);

    removal.undo();
    assert.deepEqual(texts(store), ["a", "b", "c", "d"]);
});

test("undo keeps tasks added after the removal, and never duplicates", () => {
    const store = storeWith("a", "b", "c");
    const removal = store.remove((t) => t.id === "b");
    store.add("new", "bottom");
    removal.undo();
    removal.undo();
    assert.deepEqual(texts(store), ["a", "b", "c", "new"]);
});

test("removing nothing reports a count of 0", () => {
    const store = storeWith("a");
    assert.equal(store.remove(() => false).count, 0);
});

test("move swaps with the next active task, skipping completed ones", () => {
    const store = createTaskStore([task("a"), task("done", { done: true }), task("b")]);
    store.move("a", 1);
    assert.deepEqual(texts(store), ["b", "done", "a"]);

    store.move("a", 1); // already the last active task
    assert.deepEqual(texts(store), ["b", "done", "a"]);
});

test("reorderActive puts active tasks in the given order, completed ones after", () => {
    const store = createTaskStore([task("a"), task("done", { done: true }), task("b"), task("c")]);
    store.reorderActive(["c", "a", "b"]);
    assert.deepEqual(texts(store), ["c", "a", "b", "done"]);
});

test("reorderActive keeps active tasks that were left out of the order", () => {
    const store = storeWith("a", "b", "c");
    store.reorderActive(["c"]);
    assert.deepEqual(texts(store), ["c", "a", "b"]);
});

test("replaceAll can be undone", () => {
    const store = storeWith("a", "b");
    const undo = store.replaceAll([task("x")]);
    assert.deepEqual(texts(store), ["x"]);
    undo();
    assert.deepEqual(texts(store), ["a", "b"]);
});

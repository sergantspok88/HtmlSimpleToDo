# ToDo

Simple ToDo list with a clock, a stopwatch and per-task countdown timers.

- Tasks are saved in the browser's `localStorage` on every change, including completion times and running timers.
  Use Settings → Backup to export them to a file or import them again.
- New tasks go to the top or the bottom of the list; pick which with the dropdown next to "Add" (remembered per browser).
- Completed tasks move to a collapsible "Completed" section. Filter the list with All / Active / Done,
  or search it (press /).
- Reorder tasks by dragging the grip handle, or with Alt+↑/↓ on the focused task. Press N to type a new task.
- Deleting or clearing tasks can be undone from the message at the bottom of the page.
- Timers run for a number of minutes, or until a time of day: type it in 24-hour form ("15:30", "1530", "15")
  or as "3pm", or pick one of the suggested half-hours. A time that has passed today means tomorrow.
  A running timer shows a progress bar on its task and its countdown in the browser tab title.
- When a timer ends you get a sound, a message with "Mark done" and "Snooze 5 min" buttons and, if allowed,
  a desktop notification. The sound plays once; tick "Repeat sound" when setting the timer to have it repeat
  every few seconds until you dismiss the message (for up to a minute).
- Follows the system light/dark theme.

## Run server

Install dependencies once:

```sh
npm install
```

Start the server on http://localhost:8000 (set the `PORT` environment variable to change it):

```sh
npm start
```

For development, restart the server automatically when `server.js` changes:

```sh
npm run dev
```

Files in `public/` are served straight from disk, so changes to them only need a browser refresh.
On Windows you can also double-click `start_project.bat`.

To start the server automatically in the background, without a console window, see [docs/run-in-background.md](docs/run-in-background.md).

## Tests

```sh
npm test
```

Runs the unit tests in `test/` with Node's built-in test runner. They cover the task rules, saving and loading,
backups and time formatting. The page itself isn't covered, so check changes to it in the browser.

## Code structure

All app code is in `public/` as plain ES modules, with no build step.

Data and rules (no page code, unit tested, type-checked in VS Code through `// @ts-check`):

| File | Purpose |
|---|---|
| `taskStore.js` | The task list and every way of changing it. Other modules `subscribe()` to hear about changes. |
| `settingsStore.js` | The settings; `update()` saves them and notifies subscribers. |
| `storage.js` | Reading and writing `localStorage`, converting old data, reading backups. Defines the `Task` and `Settings` types. |
| `time.js` | Time formatting. |
| `listeners.js` | The small subscribe/notify helper the stores use. |

The page:

| File | Purpose |
|---|---|
| `main.js` | Creates the stores and connects the modules below. Start reading here. |
| `taskList.js` | Draws the active and completed lists and handles everything done to a task in them. |
| `taskRow.js` | One task's row: updating it, editing the name, the timer form. |
| `toolbar.js` | Add form, top/bottom setting, filter buttons, Delete All. |
| `settingsPanel.js`, `backup.js` | The Settings popover, and export/import of backup files. |
| `alarmScheduler.js`, `alarm.js` | When timers run out, and the sound, message and notification that follow. |
| `clock.js`, `tabTitle.js`, `stopwatch.js` | Clock, countdown in the tab title, stopwatch. |
| `shortcuts.js` | Keyboard shortcuts. |
| `ui.js` | Shared helpers: messages, the Undo message, button labels. |

To add a feature, give it its own module that takes the stores, subscribes to the changes it cares about,
and is set up in `main.js`.

# ToDo

Simple ToDo list with a clock, a stopwatch and per-task countdown timers.

- Tasks are saved in the browser's `localStorage` on every change, including completion times and running timers.
  Use Settings → Backup to export them to a file or import them again.
- New tasks go to the top or the bottom of the list; pick which with the dropdown next to "Add" (remembered per browser).
- Completed tasks move to a collapsible "Completed" section. Filter the list with All / Active / Done.
- Reorder tasks by dragging the grip handle, or with Alt+↑/↓ on the focused task. Press N or / to type a new task.
- Deleting or clearing tasks can be undone from the message at the bottom of the page.
- A running timer shows a progress bar on its task and its countdown in the browser tab title.
- When a timer ends you get a sound (repeated until dismissed, configurable in Settings), a message with
  "Mark done" and "Snooze 5 min" buttons and, if allowed, a desktop notification.
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

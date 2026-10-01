# ToDo

Simple ToDo list with a clock, a stopwatch and per-task countdown timers.

- Tasks are saved in the browser's `localStorage` on every change, including completion times and running timers.
- New tasks go to the top or the bottom of the list; pick which with the dropdown next to "Add" (remembered per browser).
- Drag tasks by the &#9776; handle to reorder them.
- When a timer ends you get a sound, a message on the page and (if allowed) a desktop notification.

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

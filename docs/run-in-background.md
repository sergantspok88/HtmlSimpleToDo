# Run the server in the background on Windows

Starting the server from a `.cmd` file in the Startup folder keeps a console window open, and closing that window stops the server.
Below are two ways to run it without a window. Pick one.

You don't need `nodemon` or `npm run dev` for everyday use: files in `public/` are read fresh on every request,
so only changes to `server.js` need a server restart.

## Before you start

1. Run `npm install` in the project folder if you haven't yet.
2. Stop any server that is already running (Ctrl+C in its window), otherwise port 8000 is taken.
3. If something in your Startup folder already starts the server, remove it: press Win+R, run `shell:startup`, and delete it.

In the commands below, replace `C:\path\to\HtmlSimpleToDo` with the folder you cloned the project into.

## Option A: Task Scheduler (recommended, needs admin once)

Runs at boot with no window at all, even before you log in, and Windows retries if it fails.

Open an **administrator** terminal (Win+X, then "Terminal (Admin)") and run:

```powershell
$project   = "C:\path\to\HtmlSimpleToDo"
$node      = (Get-Command node).Source
$action    = New-ScheduledTaskAction -Execute $node -Argument "`"$project\server.js`"" -WorkingDirectory $project
$trigger   = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U
$settings  = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName "ToDo server" -Action $action -Trigger $trigger -Principal $principal -Settings $settings
Start-ScheduledTask -TaskName "ToDo server"
```

Then open http://localhost:8000.

What the settings do:

- `-LogonType S4U` means "run whether the user is logged on or not". This is what hides the window, and why admin rights are needed.
- `-ExecutionTimeLimit ([TimeSpan]::Zero)` removes the time limit. By default Windows stops a task after 3 days.
- `-AllowStartIfOnBatteries -DontStopIfGoingOnBatteries`: by default a task won't start, or gets stopped, while a laptop runs on battery.

Managing it (in an administrator terminal, or right-click the task in Task Scheduler, `taskschd.msc`):

```powershell
Stop-ScheduledTask  -TaskName "ToDo server"      # stop
Start-ScheduledTask -TaskName "ToDo server"      # start, e.g. after editing server.js
Get-ScheduledTask   -TaskName "ToDo server" | Get-ScheduledTaskInfo   # last run time and result
Unregister-ScheduledTask -TaskName "ToDo server" -Confirm:$false     # remove it completely
```

## Option B: Startup shortcut (no admin)

A shortcut in the Startup folder that runs the server through `conhost.exe --headless`, which starts a console program without a window.
`--headless` is an undocumented Windows option, and nothing restarts the server if it crashes.

Run in a normal terminal:

```powershell
$project  = "C:\path\to\HtmlSimpleToDo"
$node     = (Get-Command node).Source
$shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut("$([Environment]::GetFolderPath('Startup'))\ToDo server.lnk")
$shortcut.TargetPath       = "$env:WINDIR\System32\conhost.exe"
$shortcut.Arguments        = "--headless `"$node`" `"$project\server.js`""
$shortcut.WorkingDirectory = $project
$shortcut.Save()
```

It starts at your next login. To start it right away, double-click "ToDo server" in the Startup folder (`shell:startup`).
To remove it, delete that shortcut.

## Stopping the server by hand

With no window there's nothing to close. This stops the ToDo server's `node.exe` and leaves other Node processes alone:

```powershell
$project = "C:\path\to\HtmlSimpleToDo"
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object CommandLine -like "*$project\server.js*" |
    ForEach-Object { Stop-Process -Id $_.ProcessId }
```

## If the page doesn't load

A background server has no window to show errors. Stop it, then run `npm start` in the project folder to see what's wrong.
A common cause is another server already using port 8000.

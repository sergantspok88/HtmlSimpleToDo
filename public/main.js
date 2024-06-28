import { Stopwatch } from './stopwatch.js';

function updateClock() {
    const currentTimeElement = document.getElementById("currentTime");
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");

    const formattedTime = `${hours}:${minutes}:${seconds}`;
    currentTimeElement.textContent = formattedTime;
}

function initializeSortable() {
    const taskList = document.getElementById("taskList");
    new Sortable(taskList, {
        animation: 150,
        handle: ".drag-handle",
    });
}

function editTask(li) {
    const taskNameSpan = li.querySelector(".task-name");
    const taskText = taskNameSpan.textContent;
    const inputField = document.createElement("input");
    inputField.type = "text";
    inputField.value = taskText;
    inputField.className = "form-control edit-input";
    inputField.style.flex = "1";

    // Set a flag to track whether "blur" event is user-triggered or programmatic
    let isUserBlur = false;

    // Replace task name with the input field
    li.replaceChild(inputField, taskNameSpan);

    // Focus on the input field for editing
    inputField.focus();

    // Listen for Enter key to save changes
    inputField.addEventListener("keydown", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            isUserBlur = true; // Set the flag for user-triggered "blur" event
            updateTaskName(li, inputField.value);
        }
    });

    // Listen for blur to save changes when input field loses focus
    inputField.addEventListener("blur", function() {
        if (isUserBlur) {
            isUserBlur = false; // Reset the flag
            return;
        }
        updateTaskName(li, inputField.value);
    });
}

function updateTaskName(li, newTaskText) {
    const taskNameSpan = document.createElement("span");
    taskNameSpan.className = "task-name";
    taskNameSpan.textContent = newTaskText;
    taskNameSpan.style.flex = "1";

    const editInput = li.querySelector(".edit-input");

    // Replace input field with the updated task name
    li.replaceChild(taskNameSpan, editInput);


    //ToDo: Update the task name in the database or wherever you're storing it
    //...
}

function addTask() {
    const taskInput = document.getElementById("taskInput");
    const taskList = document.getElementById("taskList");

    if (taskInput.value.trim() === "") {
        return;
    }

    const taskText = taskInput.value;
    taskInput.value = "";

    addTaskByName(taskText, false);
}

function addTaskByName(taskText, checked) {
    const taskNameSpan = document.createElement("span");
    taskNameSpan.textContent = taskText;
    taskNameSpan.style.flex = "1"; // To make the task name span take up remaining space
    taskNameSpan.className = "task-name";

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.innerHTML = "X";
    deleteButton.addEventListener("click", function() {
        taskList.removeChild(li);
    });

    const timerButton = document.createElement("button");

    const editButton = document.createElement("button");

    const li = document.createElement("li");
    li.className = "list-group-item d-flex align-items-center justify-content-between"; // Apply Bootstrap classes for alignment
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = checked;

    checkbox.addEventListener("change", setStyleBasedOnChecked);

    function setStyleBasedOnChecked() {
        setStyleBasedOnChecked2(li, timerButton, editButton, deleteButton, checkbox);
    }

    function setStyleBasedOnChecked2(li2, timerButton2, editButton2, deleteButton2, checkbox2) {
        li2.querySelector(".task-name").style.textDecoration = checkbox2.checked ? "line-through" : "none";
        timerButton2.style.visibility = checkbox2.checked ? "hidden" : "visible";
        editButton2.style.visibility = checkbox2.checked ? "hidden" : "visible";

        li2.style.height = checkbox2.checked ? "25px" : "auto";

        if (checkbox2.checked) {
            const timestamp = document.createElement("span");
            timestamp.className = "timestamp";
            timestamp.textContent = "Completed at " + new Date().toLocaleString();
            li2.insertBefore(timestamp, deleteButton2);
        } else {
            const timestamp = li2.querySelector(".timestamp");
            if (timestamp) {
                li2.removeChild(timestamp);
            }
        }
    }

    let isTimerStarted = false;
    timerButton.className = "btn btn-secondary btn-sm timer-button";
    timerButton.style = "padding: 5px 15px;"
    timerButton.innerHTML = "&#x23F2;";
    let intervalId = -1;
    timerButton.addEventListener("click", function() {
        if (isTimerStarted) {
            clearInterval(intervalId);
            li.removeChild(li.querySelector(".timer-span"));
            li.querySelector(".timer-button").innerHTML = "&#x23F2;";
            isTimerStarted = false;
        } else {
            const time = prompt("Enter the time in minutes:");
            if (time !== null && !isNaN(time)) {
                intervalId = startTimer(li, parseInt(time));
                //Update right away, because startTime will have first update only after 1s
                updateRemainingTime(li, parseInt(time) * 60);
                li.querySelector(".timer-button").innerHTML = "&#x23F9;";
                isTimerStarted = true;
            }
        }

        function startTimer(li, minutes) {
            const time = minutes * 60;
            const startTime = Date.now();
            const notificationAudio = new Audio('high-pitched-two-note-notification.mp3');
            const intervalId = setInterval(() => {
                const currentTime = Date.now();
                const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
                const remainingTime = Math.max(time - elapsedSeconds, 0);
                updateRemainingTime(li, remainingTime);

                if (remainingTime === 0) {
                    clearInterval(intervalId);
                    li.querySelector(".timer-button").innerHTML = "&#x23F2;";
                    li.removeChild(li.querySelector(".timer-span"));
                    isTimerStarted = false;
                    notificationAudio.play();
                    alert(`Time's up for task: ${li.querySelector(".task-name").textContent}`);
                }
            }, 1000);
            return intervalId;
        }
    });

    editButton.className = "btn btn-secondary btn-sm mirror";
    editButton.innerHTML = "&#9998;";
    editButton.style = "padding: 5px 15px;"
    editButton.addEventListener("click", function() {
        editTask(li);
    });

    const dragHandle = document.createElement("span");
    dragHandle.className = "drag-handle";
    dragHandle.innerHTML = "&#9776;";

    li.appendChild(dragHandle);
    li.appendChild(checkbox);
    li.appendChild(taskNameSpan);
    li.appendChild(editButton);
    li.appendChild(timerButton);
    li.appendChild(deleteButton);
    taskList.appendChild(li);

    setStyleBasedOnChecked2(li, timerButton, editButton, deleteButton, checkbox);

    initializeSortable();
}

function updateRemainingTime(li, remainingTime) {
    let timerSpan = li.querySelector(".timer-span");
    if (!timerSpan) {
        const newTimerSpan = document.createElement("span");
        newTimerSpan.className = "timer-span";
        li.appendChild(newTimerSpan);
        timerSpan = newTimerSpan;
    }
    timerSpan.textContent = formatTime(remainingTime);
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    // Use string interpolation to format the time mm:ss
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

const deleteAllButton = document.getElementById("deleteAllButton");

deleteAllButton.addEventListener("click", function() {
    while (taskList.firstChild) {
        taskList.removeChild(taskList.firstChild);
    }
});

// Update the clock every second
setInterval(updateClock, 1000);

// Initial call to set the clock
updateClock();

//TODO: 
//- can save time of completion of task
//- running timer if any 
function saveTasksToLocalStorage() {
    const tasks = Array.from(document.querySelectorAll('.list-group-item')).map(li => {
        return {
            name: li.querySelector('.task-name').textContent,
            checked: li.querySelector('input[type="checkbox"]').checked
        };
    });

    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function loadTasksFromLocalStorage() {
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    tasks.forEach(task => {
        addTaskByName(task.name, task.checked);
    });

    initializeSortable();
}

// Load tasks from local storage when the page loads
window.addEventListener('load', loadTasksFromLocalStorage);

// Save tasks to local storage before the page is closed
window.addEventListener('beforeunload', saveTasksToLocalStorage);

let myStopwatch = new Stopwatch();

const startPauseButton = document.getElementById("startPause");
startPauseButton.addEventListener("click", () => {
    myStopwatch.toggleStopwatch();
});

const resetButton = document.getElementById("reset");
resetButton.addEventListener("click", () => {
    myStopwatch.resetStopwatch();
});

window.onload = function() {
    initializeSortable();

    const taskInput = document.getElementById("taskInput");
    taskInput.addEventListener("keydown", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            addTask();
        }
    });

    const addButton = document.getElementById("addButton");
    addButton.addEventListener("click", addTask);
};
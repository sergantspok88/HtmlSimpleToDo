import { showAlert } from './ui.js';

const REPEAT_EVERY_MS = 3000;
const REPEAT_FOR_MS = 60 * 1000;

const notificationAudio = new Audio('high-pitched-two-note-notification.mp3');
const openAlarms = new Set(); // close functions of time's-up messages still on the page
let repeatIntervalId = 0;

// Browsers only show the permission prompt in response to a user action, so call this from one
export function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
}

export function announceTimeUp(task, { repeatSound, onMarkDone, onSnooze }) {
    const close = showAlert(`Time's up: ${task.text}`, {
        actions: [
            { label: "Mark done", onClick: onMarkDone },
            { label: "Snooze 5 min", onClick: onSnooze },
        ],
        onClose: () => {
            openAlarms.delete(close);
            if (openAlarms.size === 0) {
                stopSound();
            }
        },
    });
    openAlarms.add(close);

    playSound();
    if (repeatSound) {
        repeatSoundForAWhile();
    }
    showNotification(task);
}

function playSound() {
    notificationAudio.currentTime = 0;
    // Autoplay rules block sound until the user has interacted with the page (e.g. right after a reload)
    notificationAudio.play().catch(() => {});
}

// Replays the sound every few seconds until the messages are dismissed, but at most for a minute
function repeatSoundForAWhile() {
    clearInterval(repeatIntervalId);
    const stopAt = Date.now() + REPEAT_FOR_MS;
    repeatIntervalId = setInterval(() => {
        if (Date.now() >= stopAt) {
            clearInterval(repeatIntervalId);
        } else {
            playSound();
        }
    }, REPEAT_EVERY_MS);
}

function stopSound() {
    clearInterval(repeatIntervalId);
    notificationAudio.pause();
}

// A desktop notification also reaches the user when this tab is in the background
function showNotification(task) {
    if (!("Notification" in window) || Notification.permission !== "granted") {
        return;
    }
    try {
        const notification = new Notification("Time's up", { body: task.text, icon: "favicon.ico", tag: task.id });
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    } catch (error) {
        // Some mobile browsers only allow notifications from a service worker
        console.warn("Could not show notification", error);
    }
}

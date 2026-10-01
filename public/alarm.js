import { showAlert } from './ui.js';

const notificationAudio = new Audio('high-pitched-two-note-notification.mp3');

// Browsers only show the permission prompt in response to a user action, so call this from one
export function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
}

export function announceTimeUp(task) {
    notificationAudio.currentTime = 0;
    // Autoplay rules block sound until the user has interacted with the page (e.g. right after a reload)
    notificationAudio.play().catch(() => {});

    showAlert(`Time's up for task: ${task.text}`);

    // A desktop notification also reaches the user when this tab is in the background
    if ("Notification" in window && Notification.permission === "granted") {
        try {
            new Notification("Time's up", { body: task.text, icon: "favicon.ico", tag: task.id });
        } catch (error) {
            // Some mobile browsers only allow notifications from a service worker
            console.warn("Could not show notification", error);
        }
    }
}

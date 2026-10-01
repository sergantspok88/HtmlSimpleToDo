const UNDO_TIMEOUT_MS = 8000;
let hideToastTimeoutId = 0;

// Accessible name for screen readers plus a hover tooltip, for icon-only buttons
export function setLabel(element, text) {
    element.setAttribute("aria-label", text);
    element.title = text;
}

// Dismissible message at the top of the page, optionally with action buttons that also close it.
// Returns a function that closes the message.
export function showAlert(message, { variant = "warning", actions = [], onClose } = {}) {
    const alert = document.createElement("div");
    alert.className = `alert alert-${variant} alert-dismissible d-flex flex-wrap align-items-center gap-2`;
    alert.setAttribute("role", "alert");

    const text = document.createElement("span");
    text.className = "me-auto";
    text.textContent = message;
    alert.append(text);

    let closed = false;
    const close = () => {
        if (closed) {
            return;
        }
        closed = true;
        alert.remove();
        onClose?.();
    };

    for (const { label, onClick } of actions) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-sm alert-action";
        button.textContent = label;
        button.addEventListener("click", () => {
            close();
            onClick();
        });
        alert.append(button);
    }

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "btn-close";
    closeButton.setAttribute("aria-label", "Close");
    closeButton.addEventListener("click", close);
    alert.append(closeButton);

    document.getElementById("alerts").append(alert);
    return close;
}

// Message at the bottom of the page with an Undo button. It hides itself after a few seconds,
// and a new one replaces the previous one.
export function showUndoToast(message, onUndo) {
    const toast = document.getElementById("undoToast");
    const hide = () => {
        clearTimeout(hideToastTimeoutId);
        toast.classList.remove("show");
    };

    toast.querySelector(".toast-message").textContent = message;
    toast.querySelector(".undo-button").onclick = () => {
        hide();
        onUndo();
    };
    toast.querySelector(".btn-close").onclick = hide;

    toast.classList.add("show");
    clearTimeout(hideToastTimeoutId);
    hideToastTimeoutId = setTimeout(hide, UNDO_TIMEOUT_MS);
}

// Accessible name for screen readers plus a hover tooltip, for icon-only buttons
export function setLabel(element, text) {
    element.setAttribute("aria-label", text);
    element.title = text;
}

// Dismissible message at the top of the page
export function showAlert(message, variant = "warning") {
    const alert = document.createElement("div");
    alert.className = `alert alert-${variant} alert-dismissible`;
    alert.setAttribute("role", "alert");
    alert.textContent = message;

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "btn-close";
    closeButton.setAttribute("aria-label", "Close");
    closeButton.addEventListener("click", () => alert.remove());

    alert.append(closeButton);
    document.getElementById("alerts").append(alert);
}

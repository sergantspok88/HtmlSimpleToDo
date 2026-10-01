// @ts-check

// Minimal publish/subscribe, used by the stores to tell the rest of the app about changes
export function createListeners() {
    /** @type {Set<Function>} */
    const listeners = new Set();

    return {
        /**
         * Calls `listener` after every change. Returns a function that stops it.
         * @param {Function} listener
         */
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },

        /** @param {...any} args */
        notify(...args) {
            for (const listener of listeners) {
                listener(...args);
            }
        },
    };
}

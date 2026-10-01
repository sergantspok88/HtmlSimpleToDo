// @ts-check
import { createListeners } from './listeners.js';
import { saveSettings } from './storage.js';

/** @typedef {import('./storage.js').Settings} Settings */

/**
 * Holds the settings. update() saves them and tells subscribers.
 * @param {Settings} initialSettings
 * @param {(settings: Settings) => void} save
 */
export function createSettingsStore(initialSettings, save = saveSettings) {
    let settings = initialSettings;
    const { subscribe, notify } = createListeners();

    return {
        /** Calls `listener(settings)` after every change. Returns a function that stops it. */
        subscribe,

        /** @returns {Readonly<Settings>} */
        get current() {
            return settings;
        },

        /** @param {Partial<Settings>} changes */
        update(changes) {
            settings = { ...settings, ...changes };
            save(settings);
            notify(settings);
        },
    };
}

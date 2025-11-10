// PWA Update Detection and State Management
// This module handles PWA update notifications and state management

import { reactive } from "vue";

// Get version from package.json
import packageJson from "../../package.json";
const APP_VERSION = packageJson.version as string;

// LocalStorage keys for PWA state management
export const PWA_DISMISSED_VERSION_KEY = "sprint-it:pwa:dismissed-version";
export const PWA_LAST_SEEN_VERSION_KEY = "sprint-it:pwa:last-seen-version";
export const PWA_NOTIFICATION_VISIBLE_KEY = "sprint-it:pwa:notification-visible";

// Reactive state for version update notification
export const versionUpdateState = reactive({
    visible: false,
    version: APP_VERSION,
});

// Initialize state from localStorage
const initializeState = (): void => {
    try {
        // Check if there's a pending notification visible
        const notificationVisible = localStorage.getItem(PWA_NOTIFICATION_VISIBLE_KEY);
        if (notificationVisible === "true") {
            versionUpdateState.visible = true;
        }
    } catch (error) {
        console.warn("[PWA] No se pudo inicializar el estado desde localStorage", error);
    }
};

// Function to dismiss the version update notification
export const dismissVersionUpdateNotification = (): void => {
    versionUpdateState.visible = false;
    try {
        localStorage.setItem(PWA_DISMISSED_VERSION_KEY, APP_VERSION);
        localStorage.removeItem(PWA_NOTIFICATION_VISIBLE_KEY);
    } catch (error) {
        console.warn("[PWA] No se pudo guardar la versión descartada", error);
    }
};

// Function to show version update notification
export const showVersionUpdateNotification = (version: string): void => {
    versionUpdateState.visible = true;
    versionUpdateState.version = version;
    try {
        localStorage.setItem(PWA_NOTIFICATION_VISIBLE_KEY, "true");
    } catch (error) {
        console.warn("[PWA] No se pudo guardar el estado de visibilidad", error);
    }
};

const maybeShowUpdatedNotification = (): void => {
    try {
        const lastSeenVersion = localStorage.getItem(PWA_LAST_SEEN_VERSION_KEY);
        const dismissedVersion = localStorage.getItem(PWA_DISMISSED_VERSION_KEY);

        // Check if version changed
        const versionChanged = lastSeenVersion !== APP_VERSION;

        // Check if this version was dismissed
        const wasDismissed = dismissedVersion === APP_VERSION;

        // Show notification if version changed and not dismissed
        if (versionChanged && !wasDismissed) {
            console.log("📱 Nueva versión detectada:", APP_VERSION);
            // Show custom version update notification
            versionUpdateState.visible = true;
            versionUpdateState.version = APP_VERSION;
            try {
                localStorage.setItem(PWA_NOTIFICATION_VISIBLE_KEY, "true");
            } catch (error) {
                console.warn("[PWA] No se pudo guardar el estado de visibilidad", error);
            }
        } else {
            // Ensure initial state is set correctly
            versionUpdateState.version = APP_VERSION;
        }

        // Update last seen version
        localStorage.setItem(PWA_LAST_SEEN_VERSION_KEY, APP_VERSION);
    } catch (error) {
        console.warn("[PWA] No se pudo mostrar la notificación de versión", error);
    }
};

// Initialize PWA update detection
export const initPWAUpdater = (): void => {
    // Initialize state from localStorage
    initializeState();

    console.log("PWA Updater initialized");
    console.log("📱 App Version:", APP_VERSION);
    maybeShowUpdatedNotification();

    // Listen for service worker updates
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.addEventListener("controllerchange", () => {
            console.log("🔄 Service Worker actualizado, recargando página...");
            // Delay reload to show notification
            setTimeout(() => {
                window.location.reload();
            }, 3000);
        });
    }
};

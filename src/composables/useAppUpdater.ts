import MyAlerts from "@/plugins/my-alerts";
import { ref } from "vue";

const isUpdateAvailable = ref(false);
const pendingWorker = ref<ServiceWorker | null>(null);
let updateCheckInterval: ReturnType<typeof setInterval> | null = null;

const checkForUpdates = async (): Promise<void> => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    try {
        const registration = await navigator.serviceWorker.getRegistration();

        if (registration) {
            await registration.update();

            registration.addEventListener("updatefound", () => {
                const newWorker = registration.installing;

                if (newWorker) {
                    newWorker.addEventListener("statechange", () => {
                        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                            isUpdateAvailable.value = true;
                            pendingWorker.value = newWorker;
                            promptUpdate();
                        }
                    });
                }
            });

            if (registration.installing && registration.waiting) {
                isUpdateAvailable.value = true;
                pendingWorker.value = registration.waiting;
            }
        }
    } catch (error) {
        console.error("Error checking for updates:", error);
    }
};

const promptUpdate = async (): Promise<void> => {
    if (!isUpdateAvailable.value) return;

    const result = await MyAlerts.confirmWithButtonsAsync(
        "Nueva versión disponible",
        "Hay una nueva versión de la aplicación. ¿Deseas actualizarla ahora?",
        [
            { text: "Actualizar ahora", value: "update" },
            { text: "Más tarde", value: "later" }
        ],
        "info"
    );

    if (result === "update") {
        reloadApp();
    } else {
        isUpdateAvailable.value = false;
    }
};

const reloadApp = (): void => {
    if (pendingWorker.value) {
        pendingWorker.value.postMessage({ type: "SKIP_WAITING" });
    }

    window.location.reload();
};

const startUpdateChecker = (): void => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    checkForUpdates();

    if (updateCheckInterval) return;
    updateCheckInterval = setInterval(checkForUpdates, 60 * 60 * 1000);

    navigator.serviceWorker.addEventListener("controllerchange", () => {
        reloadApp();
    });
};

const stopUpdateChecker = (): void => {
    if (updateCheckInterval) {
        clearInterval(updateCheckInterval);
        updateCheckInterval = null;
    }
};

export const useAppUpdater = () => {
    startUpdateChecker();

    return {
        isUpdateAvailable,
        checkForUpdates,
        reloadApp,
        stopUpdateChecker
    };
};

export { startUpdateChecker, stopUpdateChecker };

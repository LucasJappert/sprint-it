import { STATE_VALUES } from "@/constants/states";
import { getChangesByAssociatedId } from "@/services/firestore";
import { onMounted, onUnmounted, ref, watch } from "vue";

export const useInProgressTime = (
    associatedId: string,
    associatedType: "task" | "item",
    currentState: () => string
) => {
    const inProgressSince = ref<Date | null>(null);
    const elapsedTime = ref("00:00");
    const isInProgress = ref(false);
    const isLoading = ref(true);

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const formatElapsedTime = (startDate: Date): string => {
        const now = new Date();
        const diffMs = now.getTime() - startDate.getTime();

        const totalSeconds = Math.floor(diffMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const pad = (num: number): string => num.toString().padStart(2, "0");

        // Formato dinámico: mostrar solo lo necesario
        if (hours > 0) {
            return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        }
        if (minutes > 0) {
            return `${pad(minutes)}:${pad(seconds)}`;
        }
        return `00:${pad(seconds)}`;
    };

    const updateElapsedTime = () => {
        // Verificar que todavía esté en In Progress
        if (currentState() !== STATE_VALUES.IN_PROGRESS) {
            isInProgress.value = false;
            elapsedTime.value = "00:00";
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
            return;
        }

        if (inProgressSince.value) {
            elapsedTime.value = formatElapsedTime(inProgressSince.value);
        }
    };

    const loadInProgressTime = async () => {
        if (!associatedId) {
            isLoading.value = false;
            return;
        }

        // Verificar estado actual primero
        if (currentState() !== STATE_VALUES.IN_PROGRESS) {
            isInProgress.value = false;
            elapsedTime.value = "00:00";
            isLoading.value = false;
            return;
        }

        try {
            const changes = await getChangesByAssociatedId(associatedId);

            // Filtrar cambios de estado que sean hacia "In Progress"
            const stateChanges = changes.filter(
                (change) =>
                    change.field === "state" &&
                    change.newValue === STATE_VALUES.IN_PROGRESS &&
                    change.associatedType === associatedType
            );

            if (stateChanges.length === 0) {
                // No hay historial, usar fecha actual (caso cuando se acaba de cambiar a InProgress)
                inProgressSince.value = new Date();
                isInProgress.value = true;
                updateElapsedTime();
                intervalId = setInterval(updateElapsedTime, 1000);
                isLoading.value = false;
                return;
            }

            // Ordenar por fecha descendente (más reciente primero)
            stateChanges.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            // Obtener el cambio más reciente a "In Progress"
            const latestInProgressChange = stateChanges[0];

            // Verificar si hay un cambio posterior desde "In Progress" a otro estado
            const subsequentChanges = changes.filter(
                (change) =>
                    change.field === "state" &&
                    change.createdAt.getTime() > latestInProgressChange.createdAt.getTime() &&
                    change.associatedType === associatedType
            );

            // Si hay un cambio posterior desde "In Progress", buscar el anterior
            const hasLeftInProgress = subsequentChanges.some(
                (change) => change.oldValue === STATE_VALUES.IN_PROGRESS
            );

            let startDate: Date;
            if (hasLeftInProgress && stateChanges.length > 1) {
                // Usar el cambio anterior a InProgress (el segundo más reciente)
                startDate = stateChanges[1].createdAt;
            } else {
                // Usar el cambio más reciente a InProgress
                startDate = latestInProgressChange.createdAt;
            }

            // Verificar que la fecha no sea futura (por si acaso hay datos corruptos)
            const now = new Date();
            if (startDate.getTime() > now.getTime()) {
                startDate = now;
            }

            inProgressSince.value = startDate;
            isInProgress.value = true;
            updateElapsedTime();

            // Actualizar cada segundo
            intervalId = setInterval(updateElapsedTime, 1000);
        } catch (error) {
            console.error("Error loading in-progress time:", error);
            inProgressSince.value = null;
            isInProgress.value = false;
            elapsedTime.value = "00:00";
        } finally {
            isLoading.value = false;
        }
    };

    onMounted(() => {
        loadInProgressTime();
    });

    // Watch for state changes to reload timer
    watch(
        () => currentState(),
        () => {
            loadInProgressTime();
        }
    );

    onUnmounted(() => {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    });

    return {
        inProgressSince,
        elapsedTime,
        isInProgress,
        isLoading,
    };
};

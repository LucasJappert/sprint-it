import { notifyOk } from "@/plugins/my-notification-helper/my-notification-helper";
import { getAllSprints, saveSprint, subscribeToSprint } from "@/services/firestore";
import { useLoadingStore } from "@/stores/loading";
import type { Item, Sprint } from "@/types";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

export const useSprintStore = defineStore("sprint", () => {
    const loadingStore = useLoadingStore();
    const sprints = ref<Sprint[]>([]);
    const currentSprintId = ref<string>("");

    const currentSprint = computed(() =>
        sprints.value.find((s) => s.id === currentSprintId.value)
    );

    const generateSprints = async () => {
        loadingStore.setLoading(true);
        try {
            // Obtener todos los sprints existentes
            const allSprints = await getAllSprints();

            if (allSprints.length === 0) {
                // Crear Sprint 1 inicial si no existen sprints
                const sprint1Start = new Date(2025, 9, 13); // 13 de octubre de 2025 (mes 9 porque enero es 0)
                const sprint1End = new Date(2025, 9, 27); // 2 semanas después

                const sprint1 = {
                    id: "sprint-1",
                    titulo: "Sprint 1",
                    fechaDesde: sprint1Start,
                    fechaHasta: sprint1End,
                    diasHabiles: 10,
                    items: [],
                };
                await saveSprint(sprint1);
                allSprints.push(sprint1);
            }

            sprints.value = allSprints;
            currentSprintId.value = allSprints[0]?.id || "sprint-1";

            // Subscribe to all sprint changes
            allSprints.forEach((sprint: Sprint) => {
                subscribeToSprint(sprint.id, (updatedSprint) => {
                    const index = sprints.value.findIndex(s => s.id === updatedSprint.id);
                    if (index !== -1) {
                        sprints.value[index] = updatedSprint;
                    }
                });
            });
        } finally {
            loadingStore.setLoading(false);
        }
    };

    const addItem = async (item: Item) => {
        loadingStore.setLoading(true);
        try {
            const sprint = sprints.value.find((s) => s.id === currentSprintId.value);
            if (sprint) {
                sprint.items.push(item);
                await saveSprint(sprint);
            }
        } finally {
            loadingStore.setLoading(false);
        }
    };

    const updateItem = async (itemId: string, updatedItem: Partial<Item>) => {
        if (currentSprint.value) {
            const index = currentSprint.value.items.findIndex((i) => i.id === itemId);
            if (index !== -1 && currentSprint.value.items[index]) {
                Object.assign(currentSprint.value.items[index], updatedItem);
                await saveSprint(currentSprint.value);
            }
        }
    };

    const moveTask = (fromItemId: string, toItemId: string, taskId: string, newIndex: number) => {
        const fromItem = currentSprint.value?.items.find((i) => i.id === fromItemId);
        const toItem = currentSprint.value?.items.find((i) => i.id === toItemId);
        if (fromItem && toItem) {
            const taskIndex = fromItem.tasks.findIndex((t) => t.id === taskId);
            if (taskIndex !== -1) {
                const task = fromItem.tasks[taskIndex];
                if (task) {
                    fromItem.tasks.splice(taskIndex, 1);
                    toItem.tasks.splice(newIndex, 0, task);
                }
            }
        }
    };

    const reorderTasks = (itemId: string, oldIndex: number, newIndex: number) => {
        const item = currentSprint.value?.items.find((i) => i.id === itemId);
        if (item && oldIndex >= 0 && oldIndex < item.tasks.length) {
            const task = item.tasks[oldIndex];
            if (task) {
                item.tasks.splice(oldIndex, 1);
                item.tasks.splice(newIndex, 0, task);
            }
        }
    };

    const createNewSprint = async () => {
        const lastSprintNumber = sprints.value.length > 0
            ? Math.max(...sprints.value.map(s => {
                const parts = s.titulo.split(' ');
                const numStr = parts.length > 1 ? parts[1] : '0';
                const num = parseInt(numStr || '0');
                return isNaN(num) ? 0 : num;
            }))
            : 0;
        const newSprintNumber = lastSprintNumber + 1;

        const lastSprint = sprints.value[sprints.value.length - 1];
        if (!lastSprint) return;

        const newStart = new Date(lastSprint.fechaHasta);
        newStart.setDate(newStart.getDate() + 1); // Día siguiente al último sprint
        const newEnd = new Date(newStart);
        newEnd.setDate(newEnd.getDate() + 13); // 2 semanas después

        const newSprint: Sprint = {
            id: `sprint-${newSprintNumber}`,
            titulo: `Sprint ${newSprintNumber}`,
            fechaDesde: newStart,
            fechaHasta: newEnd,
            diasHabiles: 10,
            items: [],
        };

        await saveSprint(newSprint);
        sprints.value.push(newSprint);
        // No cambiar currentSprintId para mantener la selección actual

        // Subscribe to new sprint changes
        subscribeToSprint(newSprint.id, (updatedSprint) => {
            const index = sprints.value.findIndex(s => s.id === updatedSprint.id);
            if (index !== -1) {
                sprints.value[index] = updatedSprint;
            }
        });

        // Emitir notificación de éxito
        notifyOk(`Sprint ${newSprintNumber} creado`, "El nuevo sprint ha sido creado exitosamente");
    };

    const updateSprintDiasHabiles = async (diasHabiles: number) => {
        if (currentSprint.value) {
            currentSprint.value.diasHabiles = diasHabiles;
            await saveSprint(currentSprint.value);
        }
    };

    return {
        sprints,
        currentSprintId,
        currentSprint,
        generateSprints,
        addItem,
        updateItem,
        moveTask,
        reorderTasks,
        createNewSprint,
        updateSprintDiasHabiles,
    };
});

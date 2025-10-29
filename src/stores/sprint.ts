import MyAlerts from "@/plugins/my-alerts";
import { notifyOk } from "@/plugins/my-notification-helper/my-notification-helper";
import { convertFirestoreTimestamp, getAllSprints, saveSprint, subscribeToSprint } from "@/services/firestore";
import { useLoadingStore } from "@/stores/loading";
import type { Item, Sprint } from "@/types";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

export const useSprintStore = defineStore("sprint", () => {
    const loadingStore = useLoadingStore();
    const sprints = ref<Sprint[]>([]);
    const currentSprintId = ref<string>("");

    // Backup para prevenir pérdida de datos
    const sprintItemsBackup = ref<Item[]>([]);

    const currentSprint = computed(() =>
        sprints.value.find((s) => s.id === currentSprintId.value)
    );

    /**
     * Convierte las propiedades createdAt de items y tasks de timestamps de Firestore a objetos Date
     */
    const processSprintItems = (sprint: Sprint): Sprint => {
        const processedSprint = { ...sprint };

        if (Array.isArray(processedSprint.items)) {
            processedSprint.items = processedSprint.items.map((item: Item) => {
                const processedItem = {
                    ...item,
                    createdAt: convertFirestoreTimestamp(item.createdAt)
                };

                if (Array.isArray(processedItem.tasks)) {
                    processedItem.tasks = processedItem.tasks.map((task) => ({
                        ...task,
                        createdAt: convertFirestoreTimestamp(task.createdAt)
                    }));
                }

                return processedItem;
            });
        }

        return processedSprint;
    };

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

            sprints.value = allSprints.map(processSprintItems);

            // Seleccionar automáticamente el sprint actual basado en la fecha
            const now = new Date();
            const currentSprint = allSprints.find(sprint =>
                now >= sprint.fechaDesde && now <= sprint.fechaHasta
            );

            if (currentSprint) {
                currentSprintId.value = currentSprint.id;
            } else {
                // Fallback al primer sprint si no hay ninguno actual
                currentSprintId.value = allSprints[0]?.id || "sprint-1";
            }

            // Log para debug: mostrar sprints y items obtenidos
            console.log("📋 Sprints obtenidos:", allSprints.map(s => ({ id: s.id, titulo: s.titulo, itemsCount: s.items.length })));
            allSprints.forEach(sprint => {
                console.log(`📋 Items del sprint "${sprint.titulo}":`, Array.isArray(sprint.items) ? sprint.items : Object.values(sprint.items || {}));
            });

            // Subscribe to all sprint changes
            allSprints.forEach((sprint: Sprint) => {
                subscribeToSprint(sprint.id, (updatedSprint) => {
                    const index = sprints.value.findIndex(s => s.id === updatedSprint.id);
                    if (index !== -1) {
                        // Asegurar que items sea un array y procesar createdAt
                        const safeUpdatedSprint = processSprintItems({
                            ...updatedSprint,
                            items: Array.isArray(updatedSprint.items) ? updatedSprint.items : []
                        });

                        // Actualizar backup cuando se recibe un sprint actualizado
                        if (safeUpdatedSprint.id === currentSprintId.value) {
                            sprintItemsBackup.value = [...safeUpdatedSprint.items];
                        }
                        sprints.value[index] = safeUpdatedSprint;
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
                if (await validateSprintItemsBeforeSave(sprint)) {
                    await saveSprint(sprint);
                }
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
                if (await validateSprintItemsBeforeSave(currentSprint.value)) {
                    await saveSprint(currentSprint.value);
                }
            }
        }
    };

    const updateTask = async (taskId: string, itemId: string, updatedTask: Partial<Item['tasks'][0]>) => {
        if (currentSprint.value) {
            const itemIndex = currentSprint.value.items.findIndex((i) => i.id === itemId);
            if (itemIndex !== -1) {
                const item = currentSprint.value.items[itemIndex];
                if (item) {
                    const taskIndex = item.tasks.findIndex((t) => t.id === taskId);
                    if (taskIndex !== -1) {
                        const task = item.tasks[taskIndex];
                        if (task) {
                            Object.assign(task, updatedTask);

                            // Recalcular esfuerzos del item padre si tiene tasks
                            if (item.tasks.length > 0) {
                                item.estimatedEffort = item.tasks.reduce((sum, t) => sum + t.estimatedEffort, 0);
                                item.actualEffort = item.tasks.reduce((sum, t) => sum + t.actualEffort, 0);
                            }

                            if (await validateSprintItemsBeforeSave(currentSprint.value)) {
                                await saveSprint(currentSprint.value);
                            }
                        }
                    }
                }
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

        const newStart = new Date(lastSprint.fechaHasta); // Comienza el mismo día que termina el anterior
        const newEnd = new Date(newStart);
        newEnd.setDate(newEnd.getDate() + 14); // 2 semanas completas (14 días)

        const newSprint: Sprint = {
            id: `sprint-${newSprintNumber}`,
            titulo: `Sprint ${newSprintNumber}`,
            fechaDesde: newStart,
            fechaHasta: newEnd,
            diasHabiles: 10,
            items: [],
        };

        const html = `
            <p><strong>Título:</strong> ${newSprint.titulo}</p>
            <p><strong>Fecha Desde:</strong> ${newSprint.fechaDesde.toLocaleDateString("es-ES")}</p>
            <p><strong>Fecha Hasta:</strong> ${newSprint.fechaHasta.toLocaleDateString("es-ES")}</p>
        `;
        const result = await MyAlerts.confirmAsync("Estás seguro de crear el siguiente sprint?", html, "info");
        if (!result) return;

        await saveSprint(newSprint);
        sprints.value.push(newSprint);
        // No cambiar currentSprintId para mantener la selección actual

        // Subscribe to new sprint changes
        subscribeToSprint(newSprint.id, (updatedSprint) => {
            const index = sprints.value.findIndex(s => s.id === updatedSprint.id);
            if (index !== -1) {
                sprints.value[index] = processSprintItems(updatedSprint);
            }
        });

        // Emitir notificación de éxito
        notifyOk(`Sprint ${newSprintNumber} creado`, "El nuevo sprint ha sido creado exitosamente");
    };

    const recalculateSprintDates = async () => {
        loadingStore.setLoading(true);
        try {
            // Ordenar sprints por número
            const sortedSprints = [...sprints.value].sort((a, b) => {
                const numA = parseInt(a.id.replace("sprint-", ""));
                const numB = parseInt(b.id.replace("sprint-", ""));
                return numA - numB;
            });

            // Fijar fechaDesde del primer sprint (si es sprint-1)
            if (sortedSprints[0] && sortedSprints[0].id === "sprint-1") {
                sortedSprints[0].fechaDesde = new Date(2025, 9, 13); // 13 de octubre de 2025
                sortedSprints[0].fechaHasta = new Date(sortedSprints[0].fechaDesde);
                sortedSprints[0].fechaHasta.setDate(sortedSprints[0].fechaHasta.getDate() + 14);
                await saveSprint(sortedSprints[0]);
            }

            // Recalcular fechas para los siguientes sprints
            for (let i = 1; i < sortedSprints.length; i++) {
                const prevSprint = sortedSprints[i - 1];
                const currentSprint = sortedSprints[i];
                if (prevSprint && currentSprint) {
                    currentSprint.fechaDesde = new Date(prevSprint.fechaHasta);
                    currentSprint.fechaHasta = new Date(currentSprint.fechaDesde);
                    currentSprint.fechaHasta.setDate(currentSprint.fechaHasta.getDate() + 14);
                    await saveSprint(currentSprint);
                }
            }

            // Actualizar el array local
            sprints.value = sortedSprints;

            notifyOk("Fechas recalculadas", "Las fechas de los sprints han sido corregidas");
        } finally {
            loadingStore.setLoading(false);
        }
    };

    const deleteItem = async (itemId: string) => {
        if (currentSprint.value) {
            const index = currentSprint.value.items.findIndex((i) => i.id === itemId);
            if (index !== -1) {
                currentSprint.value.items.splice(index, 1);
                if (await validateSprintItemsBeforeSave(currentSprint.value)) {
                    await saveSprint(currentSprint.value);
                }
            }
        }
    };

    const moveItemToSprint = async (itemId: string, targetSprintId: string) => {
        loadingStore.setLoading(true);
        try {
            const currentSprint = sprints.value.find((s) => s.id === currentSprintId.value);
            const targetSprint = sprints.value.find((s) => s.id === targetSprintId);

            if (!currentSprint || !targetSprint) {
                throw new Error("Sprint actual o destino no encontrado");
            }

            const itemIndex = currentSprint.items.findIndex((i) => i.id === itemId);
            if (itemIndex === -1) {
                throw new Error("Item no encontrado en el sprint actual");
            }

            const item = currentSprint.items[itemIndex];
            if (!item) {
                throw new Error("Item no encontrado");
            }

            // Remover del sprint actual
            currentSprint.items.splice(itemIndex, 1);
            if (await validateSprintItemsBeforeSave(currentSprint)) {
                await saveSprint(currentSprint);
            }

            // Agregar al sprint destino
            targetSprint.items.push(item);
            if (await validateSprintItemsBeforeSave(targetSprint)) {
                await saveSprint(targetSprint);
            }

            notifyOk("Item movido", `El item "${item.title}" ha sido movido a ${targetSprint.titulo}`);
        } finally {
            loadingStore.setLoading(false);
        }
    };

    // Función de validación para prevenir pérdida de datos
    const validateSprintItemsBeforeSave = async (sprint: Sprint): Promise<boolean> => {
        const currentItemsCount = sprintItemsBackup.value.length;
        const newItemsCount = sprint.items.length;

        // Si hay una reducción significativa de items (más del 50% o de varios a ninguno), alertar
        if (currentItemsCount > 0 && newItemsCount === 0 && currentItemsCount >= 1) {
            const html = `
                <p><strong>⚠️ Advertencia de pérdida de datos</strong></p>
                <p>El sprint "${sprint.titulo}" actualmente tiene ${currentItemsCount} items.</p>
                <p>Estás a punto de guardar 0 items. ¿Esto es correcto?</p>
                <p>Si es un error, puedes cancelar y verificar qué pasó.</p>
            `;
            const result = await MyAlerts.confirmAsync("¿Guardar cambios?", html, "warning");
            if (!result) {
                console.warn("🚫 Guardado cancelado por el usuario debido a posible pérdida de datos");
                return false;
            }
        } else if (currentItemsCount > newItemsCount && (currentItemsCount - newItemsCount) >= 2) {
            const lostItems = currentItemsCount - newItemsCount;
            const html = `
                <p><strong>⚠️ Posible pérdida de datos detectada</strong></p>
                <p>El sprint "${sprint.titulo}" tenía ${currentItemsCount} items y ahora tiene ${newItemsCount}.</p>
                <p>Se perderían ${lostItems} items. ¿Continuar?</p>
            `;
            const result = await MyAlerts.confirmAsync("¿Guardar cambios?", html, "warning");
            if (!result) {
                console.warn(`🚫 Guardado cancelado: posible pérdida de ${lostItems} items`);
                return false;
            }
        }

        // Actualizar backup después de validación exitosa
        sprintItemsBackup.value = [...sprint.items];
        return true;
    };

    const updateSprintDiasHabiles = async (diasHabiles: number) => {
        if (currentSprint.value) {
            currentSprint.value.diasHabiles = diasHabiles;
            if (await validateSprintItemsBeforeSave(currentSprint.value)) {
                await saveSprint(currentSprint.value);
            }
        }
    };

    return {
        sprints,
        currentSprintId,
        currentSprint,
        generateSprints,
        addItem,
        updateItem,
        deleteItem,
        moveTask,
        reorderTasks,
        createNewSprint,
        recalculateSprintDates,
        updateSprintDiasHabiles,
        updateTask,
        moveItemToSprint,
    };
});

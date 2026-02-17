import MyAlerts from "@/plugins/my-alerts";
import { notifyOk } from "@/plugins/my-notification-helper/my-notification-helper";
import { convertFirestoreTimestamp, getAllSprints, saveSprint, subscribeToSprint } from "@/services/firestore";
import { useAuthStore } from "@/stores/auth";
import { useLoadingStore } from "@/stores/loading";
import type { Item, Sprint } from "@/types";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

export const useSprintStore = defineStore("sprint", () => {
    const loadingStore = useLoadingStore();
    const authStore = useAuthStore();
    const sprints = ref<Sprint[]>([]);
    const currentSprintId = ref<string>("");

    // Backup para prevenir pérdida de datos
    const sprintItemsBackup = ref<Item[]>([]);

    const currentSprint = computed(() =>
        sprints.value.find((s) => s.id === currentSprintId.value)
    );

    /**
     * Convierte las propiedades createdAt de items y tasks de timestamps de Firestore a objetos Date
     * También migra diasHabiles a workingDays si es necesario
     */
    const processSprintItems = (sprint: any): Sprint => {
        const processedSprint = { ...sprint };

        // Migrar diasHabiles a workingDays si existe la propiedad antigua
        if (processedSprint.diasHabiles !== undefined && !processedSprint.workingDays) {
            const diasHabiles = processedSprint.diasHabiles;
            processedSprint.workingDays = Array.from({ length: 10 }, (_, i) => i < diasHabiles);
            delete processedSprint.diasHabiles; // Remover propiedad antigua
        }

        // Asegurar que workingDays tenga exactamente 10 elementos
        if (!Array.isArray(processedSprint.workingDays)) {
            processedSprint.workingDays = Array(10).fill(true);
        } else if (processedSprint.workingDays.length !== 10) {
            // Si tiene menos de 10, completar con true; si tiene más, truncar
            processedSprint.workingDays = processedSprint.workingDays.slice(0, 10);
            while (processedSprint.workingDays.length < 10) {
                processedSprint.workingDays.push(true);
            }
        }

        // Inicializar userWorkingDays si no existe
        if (!processedSprint.userWorkingDays) {
            processedSprint.userWorkingDays = {};
        }

        if (Array.isArray(processedSprint.items)) {
            processedSprint.items = processedSprint.items.map((item: Item) => {
                const processedItem = {
                    ...item,
                    createdAt: convertFirestoreTimestamp(item.createdAt),
                    deletedAt: item.deletedAt ? convertFirestoreTimestamp(item.deletedAt) : null,
                    createdBy: item.createdBy || "" // Asegurar que createdBy tenga un valor por defecto
                };

                if (Array.isArray(processedItem.tasks)) {
                    processedItem.tasks = processedItem.tasks.map((task) => ({
                        ...task,
                        createdAt: convertFirestoreTimestamp(task.createdAt),
                        deletedAt: task.deletedAt ? convertFirestoreTimestamp(task.deletedAt) : null,
                        createdBy: task.createdBy || "" // Asegurar que createdBy tenga un valor por defecto
                    }));
                }

                return processedItem;
            });
        }

        return processedSprint;
    };

    /**
     * Todos los 10 días del sprint son hábiles (lunes a viernes de 2 semanas)
     */
    const calculateWorkingDays = (): boolean[] => {
        return Array(10).fill(true);
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
                    workingDays: calculateWorkingDays(), // Todos los 10 días son hábiles
                    userWorkingDays: {}, // Inicializar vacío
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
            // allSprints.forEach(sprint => {
            //     console.log(`📋 Items del sprint "${sprint.titulo}":`, Array.isArray(sprint.items) ? sprint.items : Object.values(sprint.items || {}));
            // });

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

                            // Verificar si todas las tasks activas están en "Done"
                            const activeTasks = item.tasks.filter(t => t.deletedAt === null);
                            const allTasksDone = activeTasks.length > 0 && activeTasks.every(t => t.state === "Done");
                            if (allTasksDone) {
                                item.state = "Done";
                            }

                            // Si la task cambió a "In Progress" y el item está en "To Do" o "Done", marcar item como "In Progress"
                            if (updatedTask.state === "In Progress" && (item.state === "To Do" || item.state === "Done")) {
                                item.state = "In Progress";
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

    const sortTasksByState = async (itemId: string) => {
        const item = currentSprint.value?.items.find((i) => i.id === itemId);
        if (!item || !currentSprint.value) return;

        // Filter active tasks
        const activeTasks = item.tasks.filter(task => task.deletedAt === null);

        // Define the order: Done, Ready for test, Waiting, In Progress, To Do
        const stateOrder = ["Done", "Ready For Test", "In Progress", "To Do", "Waiting"];

        // Define priority order: High, Medium, Normal (higher priority first)
        const priorityOrder = ["High", "Medium", "Normal"];

        // Sort active tasks based on state order, then by priority, then by original order
        activeTasks.sort((a, b) => {
            const aStateIndex = stateOrder.indexOf(a.state);
            const bStateIndex = stateOrder.indexOf(b.state);
            if (aStateIndex !== bStateIndex) {
                return aStateIndex - bStateIndex;
            }

            // Same state, sort by priority
            const aPriorityIndex = priorityOrder.indexOf(a.priority);
            const bPriorityIndex = priorityOrder.indexOf(b.priority);
            if (aPriorityIndex !== bPriorityIndex) {
                return aPriorityIndex - bPriorityIndex;
            }

            // Same state and priority, maintain original order
            return a.order - b.order;
        });

        // Update order property for each active task
        activeTasks.forEach((task, index) => {
            task.order = index + 1;
        });

        // Separate deleted tasks
        const deletedTasks = item.tasks.filter(task => task.deletedAt !== null);

        // Reorder item.tasks: sorted active tasks first, then deleted tasks
        item.tasks = [...activeTasks, ...deletedTasks];

        // Save the changes
        if (await validateSprintItemsBeforeSave(currentSprint.value)) {
            await saveSprint(currentSprint.value);
            notifyOk("Tasks sorted", `Tasks in "${item.title}" have been sorted by state and priority`);
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
            workingDays: calculateWorkingDays(), // Todos los 10 días son hábiles
            userWorkingDays: {}, // Inicializar vacío
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

    const softDeleteItem = async (itemId: string) => {
        if (currentSprint.value) {
            const index = currentSprint.value.items.findIndex((i) => i.id === itemId);
            if (index !== -1 && currentSprint.value.items[index]) {
                // Marcar como borrado en lugar de eliminar físicamente
                currentSprint.value.items[index].deletedAt = new Date();
                // Reordenar los ítems activos restantes
                const activeItems = currentSprint.value.items.filter((item) => item.deletedAt === null);
                activeItems.forEach((item, idx) => {
                    item.order = idx + 1;
                });
                if (await validateSprintItemsBeforeSave(currentSprint.value)) {
                    await saveSprint(currentSprint.value);
                }
            }
        }
    };

    const deleteItem = async (itemId: string) => {
        if (currentSprint.value) {
            const index = currentSprint.value.items.findIndex((i) => i.id === itemId);
            if (index !== -1) {
                currentSprint.value.items.splice(index, 1);
                // Reordenar solo los ítems activos (no eliminados)
                const activeItems = currentSprint.value.items.filter((item) => item.deletedAt === null);
                activeItems.forEach((item, idx) => {
                    item.order = idx + 1;
                });
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
            // Reordenar solo los ítems activos en el sprint actual
            const activeItems = currentSprint.items.filter((item) => item.deletedAt === null);
            activeItems.forEach((item, idx) => {
                item.order = idx + 1;
            });
            if (await validateSprintItemsBeforeSave(currentSprint)) {
                await saveSprint(currentSprint);
            }

            // Agregar al sprint destino
            // Actualizar backup antes de modificar para evitar falsa alerta de pérdida de items
            sprintItemsBackup.value = [...targetSprint.items];
            targetSprint.items.push(item);
            // Recalcular órdenes para TODOS los items (incluyendo el item movido)
            const targetActiveItems = targetSprint.items.filter((it) => it.deletedAt === null);
            targetActiveItems.forEach((it, idx) => {
                it.order = idx + 1;
            });
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

    const duplicateItem = async (itemId: string, includeTasks: boolean = false) => {
        if (!currentSprint.value) return;

        const originalItem = currentSprint.value.items.find(i => i.id === itemId);
        if (!originalItem) return;

        // Calcular el nuevo orden (al final de la lista de items activos)
        const activeItems = currentSprint.value.items.filter(item => item.deletedAt === null);
        const maxOrder = activeItems.length > 0
            ? Math.max(...activeItems.map(item => item.order))
            : 0;

        const duplicatedItem: Item = {
            ...originalItem,
            id: `item-copy-${Date.now()}`,
            title: `${originalItem.title}`,
            order: maxOrder + 1,
            createdAt: new Date(),
            createdBy: authStore.user?.id || "",
            actualEffort: 0,
            tasks: includeTasks ? originalItem.tasks.map((task) => ({
                ...task,
                id: `task-copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                order: task.order,
                createdAt: new Date(),
                createdBy: authStore.user?.id || "",
                actualEffort: 0
            })) : []
        };

        await addItem(duplicatedItem);
    };

    const softDeleteTask = async (taskId: string, item: Item) => {
        if (!currentSprint.value) return;

        const taskIndex = item.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;

        // Marcar como borrado en lugar de eliminar físicamente
        item.tasks[taskIndex].deletedAt = new Date();

        // Reordenar las tasks activas restantes
        const activeTasks = item.tasks.filter((task) => task.deletedAt === null);
        activeTasks.forEach((task, idx) => {
            task.order = idx + 1;
        });

        await updateItem(item.id, { tasks: item.tasks });
    };

    const duplicateTask = async (taskId: string, itemId: string) => {
        if (!currentSprint.value) return;

        const item = currentSprint.value.items.find(i => i.id === itemId);
        if (!item) return;

        const originalTask = item.tasks.find(t => t.id === taskId);
        if (!originalTask) return;

        // Calcular el nuevo orden (al final de la lista de tasks activas)
        const activeTasks = item.tasks.filter(t => t.deletedAt === null);
        const maxOrder = activeTasks.length > 0
            ? Math.max(...activeTasks.map(task => task.order))
            : 0;

        const duplicatedTask = {
            ...originalTask,
            id: `task-copy-${Date.now()}`,
            title: `${originalTask.title}`,
            order: maxOrder + 1,
            createdAt: new Date(),
            createdBy: authStore.user?.id || "",
            deletedAt: null
        };

        item.tasks.push(duplicatedTask);
        await updateItem(itemId, { tasks: item.tasks });
    };

    const copyItemWithTaskSplit = async (itemId: string) => {
        if (!currentSprint.value) return;

        const originalItem = currentSprint.value.items.find(i => i.id === itemId);
        if (!originalItem) return;

        // Separar tasks: Done quedan en original, otras van a la copia
        const doneTasks = originalItem.tasks.filter(task => task.state === "Done");
        const otherTasks = originalItem.tasks.filter(task => task.state !== "Done");

        // Encontrar la posición del item original
        const originalIndex = currentSprint.value.items.findIndex(i => i.id === itemId);
        if (originalIndex === -1) return;

        // Crear item copiado
        const copiedItem: Item = {
            ...originalItem,
            id: `item-copy-${Date.now()}`,
            title: `${originalItem.title} Copy`,
            order: originalItem.order + 1, // Orden siguiente al original
            createdAt: new Date(),
            createdBy: authStore.user?.id || "",
            tasks: otherTasks.map((task) => ({
                ...task,
                id: `task-copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                createdAt: new Date(),
                createdBy: authStore.user?.id || ""
            }))
        };

        // Actualizar item original con solo tasks Done
        originalItem.tasks = doneTasks;
        originalItem.state = "Done";

        // Ordenar tasks en ambos items usando la lógica de sortTasksByState
        const sortTasks = (tasks: any[]) => {
            const stateOrder = ["Done", "Ready For Test", "Waiting", "In Progress", "To Do"];
            const priorityOrder = ["High", "Medium", "Normal"];

            tasks.sort((a, b) => {
                const aStateIndex = stateOrder.indexOf(a.state);
                const bStateIndex = stateOrder.indexOf(b.state);
                if (aStateIndex !== bStateIndex) {
                    return aStateIndex - bStateIndex;
                }

                const aPriorityIndex = priorityOrder.indexOf(a.priority);
                const bPriorityIndex = priorityOrder.indexOf(b.priority);
                if (aPriorityIndex !== bPriorityIndex) {
                    return aPriorityIndex - bPriorityIndex;
                }

                return a.order - b.order;
            });

            tasks.forEach((task, index) => {
                task.order = index + 1;
            });
        };

        if (doneTasks.length > 0) {
            sortTasks(originalItem.tasks);
        }
        if (otherTasks.length > 0) {
            sortTasks(copiedItem.tasks);
        }

        // Insertar el item copiado justo después del original
        currentSprint.value.items.splice(originalIndex + 1, 0, copiedItem);

        // Reordenar solo los items activos que vienen después
        const activeItems = currentSprint.value.items.filter((item) => item.deletedAt === null);
        activeItems.forEach((item, idx) => {
            item.order = idx + 1;
        });

        // Guardar cambios
        if (await validateSprintItemsBeforeSave(currentSprint.value)) {
            await saveSprint(currentSprint.value);
            notifyOk("Item finalized", `Item "${originalItem.title}" has been finalized. Tasks in "Done" state remain in the original item, others have been moved to the copy.`);
        }
    };

    const updateSprintWorkingDays = async (workingDays: boolean[]) => {
        if (currentSprint.value) {
            currentSprint.value.workingDays = [...workingDays];
            if (await validateSprintItemsBeforeSave(currentSprint.value)) {
                await saveSprint(currentSprint.value);
            }
        }
    };

    // Legacy function for backward compatibility (will be removed)
    const updateSprintDiasHabiles = async (diasHabiles: number) => {
        const workingDays = Array.from({ length: 10 }, (_, i) => i < diasHabiles);
        await updateSprintWorkingDays(workingDays);
    };

    const updateUserWorkingDays = async (userId: string, workingDays: boolean[]) => {
        if (currentSprint.value) {
            currentSprint.value.userWorkingDays[userId] = [...workingDays];
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
        softDeleteItem,
        softDeleteTask,
        moveTask,
        reorderTasks,
        sortTasksByState,
        createNewSprint,
        recalculateSprintDates,
        updateSprintDiasHabiles, // Legacy function
        updateSprintWorkingDays,
        updateUserWorkingDays,
        updateTask,
        moveItemToSprint,
        duplicateItem,
        duplicateTask,
        copyItemWithTaskSplit,
    };
});

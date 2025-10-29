<template>
    <Header />
    <div class="dashboard">
        <!-- Botón para agregar nuevo item -->
        <div class="board-header">
            <MyButton class="ml-2" @click="showAddItemDialog = true" btn-class="px-2" accent="blue" density="comfortable" :opacity="0.8">
                <v-icon left class="mr-2 blue">mdi-clipboard-text</v-icon>
                New Item
            </MyButton>
        </div>

        <!-- Lista de items -->
        <div class="board" @dragover="onItemDragOver" @drop="onBoardDrop">
            <!-- Cabecera de columnas -->
            <div class="header-row">
                <div class="item-col cols-actions text-left">
                    <v-btn v-if="items.some((item) => item.tasks.length > 0)" icon size="x-small" @click="toggleAllTasks" @mousedown.stop>
                        <v-icon size="16" :class="{ yellow: allTasksExpanded, text: !allTasksExpanded }">{{
                            allTasksExpanded ? "mdi-collapse-all" : "mdi-expand-all"
                        }}</v-icon>
                    </v-btn>
                </div>
                <div class="item-col cols-order flex-center">#</div>
                <div class="item-col cols-title text-left">Title</div>
                <div class="item-col cols-assigned">Assigned</div>
                <div class="item-col cols-state">State</div>
                <div class="item-col cols-effort flex-center" title="Estimated/Real">Efforts</div>
                <div class="item-col cols-priority">Priority</div>
            </div>

            <div class="list">
                <ItemCard
                    v-for="it in items"
                    :key="it.id"
                    :item="it"
                    :showBorder="dragDropStore.highlightedItems.some((h) => h.itemId === it.id)"
                    :borderPosition="dragDropStore.highlightedItems.find((h) => h.itemId === it.id)?.position || null"
                    :isContextMenuOpen="contextMenuItemId === it.id"
                    :isExpanded="expandedItems.has(it.id)"
                    @contextMenuOpened="onContextMenuOpened"
                    @contextMenuClosed="onContextMenuClosed"
                    @taskReceived="onTaskReceived"
                    @toggleExpanded="onToggleExpanded"
                />
            </div>
        </div>

        <!-- Diálogo para agregar nuevo item -->
        <ItemDialog v-if="showAddItemDialog" :visible="showAddItemDialog" :next-order="items.length + 1" @close="showAddItemDialog = false" @save="onAddItem" />

        <!-- Diálogo para editar item existente -->
        <ItemDialog
            v-if="showEditItemDialog"
            :visible="showEditItemDialog"
            :next-order="editingItem?.order || 1"
            :existing-item="editingItem"
            @close="onCloseEditItemDialog"
            @save="onSaveEditItem"
        />

        <!-- Diálogo para agregar/editar task -->
        <TaskDialog
            v-if="showEditTaskDialog"
            :visible="showEditTaskDialog"
            :item="currentItemForTaskDialog"
            :existing-task="editingTask"
            @close="closeDialogs"
            @save="saveTask"
        />

        <!-- Gráfico de progreso de usuarios -->
        <UserProgressChart v-if="chartReady" />
    </div>
</template>

<script setup lang="ts">
import Header from "@/components/Header.vue";
import ItemCard from "@/components/ItemCard.vue";
import ItemDialog from "@/components/ItemDialog.vue";
import TaskDialog from "@/components/TaskDialog.vue";
import UserProgressChart from "@/components/UserProgressChart.vue";
import { useTaskManagement } from "@/composables/useTaskManagement";
import { useUrlManagement } from "@/composables/useUrlManagement";
import { saveSprint } from "@/services/firestore";
import { useDragDropStore } from "@/stores/dragDrop";
import { useLoadingStore } from "@/stores/loading";
import { useSprintStore } from "@/stores/sprint";
import type { Item } from "@/types";
import { eventBus } from "@/utils/eventBus";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const sprintStore = useSprintStore();
const dragDropStore = useDragDropStore();
const loadingStore = useLoadingStore();
const { getTaskIdFromUrl, getItemIdFromUrl } = useUrlManagement(router);

// Estado para controlar cuándo mostrar el gráfico (solo después de carga inicial)
const chartReady = ref(false);

// Estado para el diálogo de tasks
const { showAddTaskDialog, showEditTaskDialog, editingTask, currentItem, openAddTaskDialog, openEditTaskDialog, closeDialogs, saveTask } = useTaskManagement();

// Estado para el diálogo de edición de items
const showEditItemDialog = ref(false);
const editingItem = ref<Item | null>(null);

// Computed para el item actual del diálogo de task
const currentItemForTaskDialog = computed((): Item => {
    const item = currentItem.value || items.value[0];
    if (item) {
        return {
            ...item,
            tasks: [...item.tasks],
        };
    }
    // Fallback item por si no hay ninguno
    return {
        id: "",
        title: "",
        detail: "",
        priority: "Normal" as any,
        state: "To Do" as any,
        estimatedEffort: 0,
        actualEffort: 0,
        assignedUser: null,
        tasks: [],
        order: 1,
    };
});

// Estado para controlar qué item tiene el menú contextual abierto
const contextMenuItemId = ref<string | null>(null);

// Suponiendo que currentSprint.items existe y es reactivo
const items = computed<Item[]>(() => {
    const currentItems = sprintStore.currentSprint?.items ?? [];
    // Convertir de objeto a array si es necesario (compatibilidad con Firestore)
    return Array.isArray(currentItems) ? currentItems : Object.values(currentItems || {});
});

// Logs de debug removidos para simplificar la lógica

// Asegurar que los sprints estén generados
onMounted(async () => {
    if (sprintStore.sprints.length === 0) {
        await sprintStore.generateSprints();
    }

    // Actualizar el título de la página con el sprint actual
    document.title = `Sprint It - ${sprintStore.currentSprint?.titulo || "Sprint xx"}`;

    // Marcar el gráfico como listo después de la carga inicial
    chartReady.value = true;

    // Escuchar eventos del eventBus
    eventBus.on("taskCreated", onTaskCreated);

    // Revisar si hay un taskId o itemId en la URL para abrir el modal
    const taskId = getTaskIdFromUrl();
    const itemId = getItemIdFromUrl();

    console.log("onMounted - URL params:", { taskId, itemId });

    if (taskId) {
        console.log("Buscando task con ID:", taskId);
        const taskData = findTaskById(taskId);
        if (taskData) {
            console.log("Task encontrada, expandiendo item y abriendo modal de edición");
            // Expandir el item que contiene la task
            expandedItems.value.add(taskData.item.id);
            openEditTaskDialog(taskData.task, taskData.item, true);
        } else {
            console.log("Task no encontrada");
        }
    } else if (itemId) {
        console.log("Buscando item con ID:", itemId);
        const item = items.value.find((i) => i.id === itemId);
        if (item) {
            console.log("Item encontrado, abriendo modal de edición");
            // No expandir el item automáticamente, solo abrir el modal de edición
            openEditItemDialog(item);
        } else {
            console.log("Item no encontrado");
        }
    }
});

// Watcher para actualizar el título cuando cambia el sprint actual
watch(
    () => sprintStore.currentSprint,
    (newSprint) => {
        document.title = `Sprint It - ${newSprint?.titulo}`;
    },
    { immediate: true },
);

// Limpiar listeners al desmontar
onUnmounted(() => {
    eventBus.off("taskCreated", onTaskCreated);
});

// Selector de sprint
const sprintOptions = computed(() =>
    sprintStore.sprints.map((sprint) => ({
        name: sprint.titulo,
        checked: sprint.id === sprintStore.currentSprintId,
        value: sprint.id,
    })),
);

// Días hábiles del sprint actual
const currentSprintDiasHabiles = computed({
    get: () => sprintStore.currentSprint?.diasHabiles || 10,
    set: (value: number) => {
        if (sprintStore.currentSprint) {
            sprintStore.currentSprint.diasHabiles = value;
        }
    },
});

// Fechas del sprint actual formateadas
const currentSprintDates = computed(() => {
    if (!sprintStore.currentSprint) return "";
    const desde = sprintStore.currentSprint.fechaDesde.toLocaleDateString("es-ES");
    const hasta = sprintStore.currentSprint.fechaHasta.toLocaleDateString("es-ES");
    return `${desde} - ${hasta}`;
});

const currentSprintDiasHabilesString = computed({
    get: () => currentSprintDiasHabiles.value.toString(),
    set: (value: string) => {
        const num = parseInt(value);
        if (!isNaN(num)) {
            currentSprintDiasHabiles.value = num;
        }
    },
});

const updateDiasHabiles = async () => {
    await sprintStore.updateSprintDiasHabiles(currentSprintDiasHabiles.value);
};

const onSprintOptionsChange = (options: any[]) => {
    const selectedOption = options.find((opt) => opt.checked);
    if (selectedOption) {
        sprintStore.currentSprintId = selectedOption.value;
        // Actualizar el título cuando cambia el sprint
        document.title = `Sprint It - ${sprintStore.currentSprint?.titulo || "Sprint xx"}`;
    }
};

const createNewSprint = async () => {
    await sprintStore.createNewSprint();
};

// Crear nuevo item
const showAddItemDialog = ref(false);

const onAddItem = async (item: Item) => {
    await sprintStore.addItem(item);
};

// Funciones para editar items
const openEditItemDialog = (item: Item) => {
    editingItem.value = item;
    showEditItemDialog.value = true;
};

const onCloseEditItemDialog = () => {
    showEditItemDialog.value = false;
    editingItem.value = null;
    // Limpiar la URL cuando se cierra el modal de edición de item
    const { clearQueryParams } = useUrlManagement(router);
    clearQueryParams();
};

const onSaveEditItem = async (item: Item) => {
    if (editingItem.value) {
        await sprintStore.updateItem(editingItem.value.id, {
            title: item.title,
            detail: item.detail,
            priority: item.priority,
            state: item.state,
            estimatedEffort: item.estimatedEffort,
            actualEffort: item.actualEffort,
            assignedUser: item.assignedUser,
        });
    }
    // No cerrar el diálogo para que persista visible después de guardar
};

// Usar el store para el estado del drag & drop

const onItemDragStart = (item: Item) => {
    // Nota: Las coordenadas iniciales se pasan desde ItemCard
    // El store ya fue iniciado desde ItemCard con las coordenadas correctas
};

const onItemDragOver = (e: DragEvent) => {
    // Actualizar posición del ghost siguiendo al mouse
    dragDropStore.updateGhostPositionWithMouseAsync(e.clientX, e.clientY);

    // Actualizar bordes basado en posición del mouse (solo si superó el umbral)
    dragDropStore.updateBorderHighlightsAsync(e.clientX, e.clientY, items.value);
};

const reorder = async (source: Item, target: Item, position: "above" | "below") => {
    const list = items.value;
    const from = list.findIndex((i) => i.id === source.id);
    let to = list.findIndex((i) => i.id === target.id);
    if (from === -1 || to === -1) return;

    if (position === "below") to += 1;

    const toAdjusted = to > from ? to - 1 : to;

    const moved = list.splice(from, 1)[0];
    if (moved === undefined) return;
    list.splice(toAdjusted, 0, moved);

    // Reasignar order determinista
    list.forEach((it, idx) => (it.order = idx + 1));

    if (sprintStore.currentSprint) {
        // Usar la función de validación del store (accediendo internamente)
        const isValid = await (sprintStore as any).validateSprintItemsBeforeSave(sprintStore.currentSprint);
        if (isValid) {
            saveSprint(sprintStore.currentSprint);
        }
    }
};

const onItemDrop = async (target: Item) => {
    if (dragDropStore.dragItem && dragDropStore.dragItem.id !== target.id) {
        // Encontrar la posición basada en el target item
        const targetIndex = items.value.findIndex((item) => item.id === target.id);
        if (targetIndex !== -1) {
            await reorder(dragDropStore.dragItem, target, "below");
        }
    }
    dragDropStore.clearDragStateAsync();
};

const onBoardDrop = async (e: DragEvent) => {
    if (dragDropStore.dragItem) {
        // Calcular la posición de inserción basada en donde se soltó el mouse
        const insertIndex = calculateInsertIndex(e.clientY, items.value);

        if (insertIndex !== -1 && insertIndex !== items.value.findIndex((item) => item.id === dragDropStore.dragItem!.id)) {
            // Mover el item a la nueva posición
            await moveItemToPosition(dragDropStore.dragItem, insertIndex);
        }
    }

    // Limpiar el estado del drag
    dragDropStore.clearDragStateAsync();
};

const calculateInsertIndex = (mouseY: number, allItems: Item[]): number => {
    for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        if (!item) continue;

        const element = document.querySelector(`[data-item-id="${item.id}"]`) as HTMLElement | null;
        if (element) {
            const rect = element.getBoundingClientRect();
            if (mouseY < rect.top + rect.height / 2) {
                return i;
            }
        }
    }
    return allItems.length;
};

const moveItemToPosition = async (item: Item, targetIndex: number) => {
    const currentIndex = items.value.findIndex((i) => i.id === item.id);
    if (currentIndex === -1) return;

    // Crear nueva lista con el item movido
    const newList = [...items.value];
    newList.splice(currentIndex, 1); // Remover del índice actual
    newList.splice(targetIndex, 0, item); // Insertar en nueva posición

    // Actualizar el orden de todos los items
    newList.forEach((it, idx) => {
        it.order = idx + 1;
    });

    // Guardar cambios usando la mutación directa y saveSprint
    if (sprintStore.currentSprint) {
        sprintStore.currentSprint.items = newList;
        // Usar la función de validación del store (accediendo internamente)
        const isValid = await (sprintStore as any).validateSprintItemsBeforeSave(sprintStore.currentSprint);
        if (isValid) {
            saveSprint(sprintStore.currentSprint);
        }
    }
};

const onContextMenuOpened = (itemId: string) => {
    contextMenuItemId.value = itemId;
};

// Limpiar el estado cuando se cierra el menú contextual
const onContextMenuClosed = () => {
    contextMenuItemId.value = null;
};

// Estado para controlar qué items están expandidos
const expandedItems = ref<Set<string>>(new Set());

// Estado para controlar si todas las tasks están expandidas o colapsadas
const allTasksExpanded = ref(false);

// Función para encontrar una task por ID
const findTaskById = (taskId: string) => {
    for (const item of items.value) {
        const task = item.tasks.find((t) => t.id === taskId);
        if (task) {
            return { task, item };
        }
    }
    return null;
};

// Manejar cuando un item recibe una task desde otro item
const onTaskReceived = (itemId: string) => {
    // Encontrar el item y expandir sus tasks si no está expandido
    const item = items.value.find((it) => it.id === itemId);
    if (item && item.tasks.length > 0) {
        // Forzar la expansión del item destino
        expandedItems.value.add(itemId);
    }
};

// Manejar cuando se crea una nueva task en un item
const onTaskCreated = (item: Item) => {
    expandedItems.value.add(item.id);
};

// Manejar la expansión/colapso manual de items
const onToggleExpanded = (itemId: string) => {
    if (expandedItems.value.has(itemId)) {
        expandedItems.value.delete(itemId);
    } else {
        expandedItems.value.add(itemId);
    }
};

// Función para expandir/colapsar todas las tasks
const toggleAllTasks = () => {
    if (allTasksExpanded.value) {
        // Colapsar todas las tasks
        expandedItems.value.clear();
        allTasksExpanded.value = false;
    } else {
        // Expandir todas las tasks que tienen tasks
        items.value.forEach((item) => {
            if (item.tasks.length > 0) {
                expandedItems.value.add(item.id);
            }
        });
        allTasksExpanded.value = true;
    }
};
</script>

<style scoped lang="scss">
@use "@/styles/dashboard-columns.scss" as *;
.dashboard {
    padding: 6px;
    padding-top: 66px; /* Adjusted for 50px header + 16px padding */
    font-size: 0.9rem;
}

.board-header {
    display: flex;
    justify-content: flex-start;
}

.board {
    padding: 8px;
}

.header-row {
    display: flex;
    align-items: center;
    padding: 8px;
    background: #00000020;
    // border-bottom: 1px solid rgba($primary, 0.3);
    border-radius: 8px 8px 0 0;
    font-weight: bold;
    color: $text;
}

.list {
    display: flex;
    flex-direction: column;
}

/* Responsive */
@media (max-width: 768px) {
    .dashboard-header {
        flex-direction: column;
        align-items: stretch;
    }
}
</style>

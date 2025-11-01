<template>
    <div
        class="item-card"
        :data-item-id="item.id"
        :class="[
            dragDropStore.dragItem?.id === item.id ? 'dragging' : '',
            isHighlighted && highlightPosition === 'above' ? 'show-border-top' : '',
            isHighlighted && highlightPosition === 'below' ? 'show-border-bottom' : '',
            props.isContextMenuOpen ? 'context-menu-open' : '',
        ]"
        @click="onEditItem"
        @contextmenu.prevent.stop="onRightClick"
        @dragover.prevent="onDragOver"
        @drop.prevent="onDrop"
    >
        <div class="cols-actions text-left">
            <span class="drag-handle" :draggable="true" @dragstart.stop="onDragStart" @dragend="onDragEnd" @click.stop>
                <v-icon size="24">mdi-drag</v-icon>
            </span>
            <v-btn v-if="item.tasks.length > 0" icon size="x-small" @click.stop="onToggleTasks" @mousedown.stop>
                <v-icon size="16">{{ showTasks || props.isExpanded ? "mdi-chevron-up" : "mdi-chevron-down" }}</v-icon>
            </v-btn>
        </div>

        <div class="item-col cols-order" :title="item.order.toString()">
            {{ item.order }}
        </div>
        <div class="item-col cols-assigned">
            {{ assignedUserName }}
        </div>
        <div class="item-col cols-state state-cell">
            <span class="state-content" v-html="getStateHtml(item.state || STATE_VALUES.TODO)"></span>
        </div>
        <div class="item-col cols-title text-left">
            <v-icon class="blue mr-1" size="16">mdi-clipboard-text</v-icon>
            <span v-if="item.tasks.length" class="mr-1">({{ item.tasks.length }})</span>{{ item.title }}
        </div>
        <div class="item-col cols-effort">{{ calculatedEstimatedEffort }} - {{ calculatedActualEffort }}</div>
        <div class="item-col cols-priority priority-cell">
            <span class="priority-content" v-html="getPriorityHtml(item.priority)"></span>
        </div>
    </div>

    <div v-if="showTasks || props.isExpanded" class="tasks-container">
        <TaskCard v-for="task in item.tasks" :key="task.id" :task="task" :item="item" :show-dialog="false" />
    </div>

    <ItemDialog
        v-if="showEditItemDialog"
        :visible="showEditItemDialog"
        :existing-item="item"
        :next-order="item.order"
        @close="onCloseItemDialog"
        @save="onSaveEditItem"
    />

    <!-- Menú contextual -->
    <ContextMenu :options="contextMenuOptions" ref="contextMenuRef" @close="onContextMenuClosed" />
</template>

<script setup lang="ts">
import { useContextMenuOptions, type ContextMenuOption } from "@/composables/useContextMenuOptions";
import { useTaskManagement } from "@/composables/useTaskManagement";
import { useUrlManagement } from "@/composables/useUrlManagement";
import { PRIORITY_OPTIONS } from "@/constants/priorities";
import { STATE_OPTIONS, STATE_VALUES } from "@/constants/states";
import { getUser, saveSprint } from "@/services/firestore";
import { useAuthStore } from "@/stores/auth";
import { useDragDropStore } from "@/stores/dragDrop";
import { useSprintStore } from "@/stores/sprint";
import type { Item } from "@/types";
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import ContextMenu from "./ContextMenu.vue";
import ItemDialog from "./ItemDialog.vue";
import TaskCard from "./TaskCard.vue";

const props = defineProps<{
    item: Item;
    showBorder: boolean;
    borderPosition?: "above" | "below" | null;
    isContextMenuOpen?: boolean;
    isExpanded?: boolean;
}>();

const emit = defineEmits<{
    contextMenuOpened: [itemId: string];
    contextMenuClosed: [];
    toggleExpanded: [itemId: string];
    taskReceived: [itemId: string];
}>();

// Remover lógica de tasks ya que ahora se maneja en el composable

const router = useRouter();
const sprintStore = useSprintStore();
const authStore = useAuthStore();
const dragDropStore = useDragDropStore();
const { showAddTaskDialog, openAddTaskDialog, closeDialogs, saveTask } = useTaskManagement();
const { setItemUrl, clearQueryParams } = useUrlManagement(router);
const showTasks = ref(false);

// Computed para determinar si este item debe mostrar bordes
const isHighlighted = computed(() => {
    return dragDropStore.highlightedItems.some((highlight) => highlight.itemId === props.item.id);
});

const highlightPosition = computed(() => {
    const highlight = dragDropStore.highlightedItems.find((h) => h.itemId === props.item.id);
    return highlight?.position || null;
});

const assignedUserName = ref("");

const calculatedEstimatedEffort = computed(() => {
    if (props.item.tasks.length === 0) return props.item.estimatedEffort;
    return props.item.tasks.reduce((sum, task) => sum + task.estimatedEffort, 0);
});

const calculatedActualEffort = computed(() => {
    if (props.item.tasks.length === 0) return props.item.actualEffort;
    return props.item.tasks.reduce((sum, task) => sum + task.actualEffort, 0);
});

const loadAssignedUserName = async () => {
    if (!props.item.assignedUser) {
        assignedUserName.value = "";
        return;
    }

    // Si es el usuario actual, mostrar solo nombre
    if (props.item.assignedUser === authStore.user?.id) {
        assignedUserName.value = authStore.user.name;
        return;
    }

    // Para otros usuarios, obtener datos desde Firestore y mostrar solo nombre
    try {
        const user = await getUser(props.item.assignedUser);
        if (user) {
            assignedUserName.value = user.name;
            return;
        }
    } catch (error) {
        console.warn(`Error al obtener usuario ${props.item.assignedUser}:`, error);
    }

    assignedUserName.value = props.item.assignedUser;
};

// Cargar el nombre cuando el componente se monta o cuando cambia el item
onMounted(() => {
    loadAssignedUserName();
});

// Watch para recargar cuando cambia el assignedUser
watch(
    () => props.item.assignedUser,
    () => {
        loadAssignedUserName();
    },
);

// Hook para crear simulación de drag al montar el componente
onMounted(() => {
    // Simulación removida completamente
});

const showEditItemDialog = ref(false);

const onEditItem = () => {
    showEditItemDialog.value = true;
    setItemUrl(props.item.id);
};

// Menú contextual
const contextMenuRef = ref();
const { createItemContextMenuOptions } = useContextMenuOptions();
const contextMenuOptions = ref<ContextMenuOption[]>([]);

const loadContextMenuOptions = async () => {
    contextMenuOptions.value = await createItemContextMenuOptions(props.item, openAddTaskDialog, sprintStore.duplicateItem);
};

onMounted(() => {
    loadContextMenuOptions();
});

watch(
    () => props.item,
    () => {
        loadContextMenuOptions();
    },
);

const getPriorityHtml = (priority: string) => {
    const option = PRIORITY_OPTIONS.find((opt) => opt.value.toLowerCase() === priority.toLowerCase());
    return option ? option.name : priority;
};

const getStateHtml = (state: string | undefined) => {
    if (!state) return "To Do"; // Default fallback
    const option = STATE_OPTIONS.find((opt) => opt.value.toLowerCase() === state.toLowerCase());
    return option ? option.name : state;
};

// Funciones de simulación removidas completamente

const onSaveEditItem = async (item: Item) => {
    await sprintStore.updateItem(props.item.id, {
        title: item.title,
        detail: item.detail,
        priority: item.priority,
        state: item.state,
        estimatedEffort: item.estimatedEffort,
        actualEffort: item.actualEffort,
        assignedUser: item.assignedUser,
    });
    // No cerrar el diálogo para que persista visible después de guardar
};

const onCloseItemDialog = () => {
    showEditItemDialog.value = false;
    clearQueryParams();
};

const onRightClick = (event: MouseEvent) => {
    event.preventDefault();
    contextMenuRef.value?.show(event.clientX, event.clientY);
    // Emitir evento para indicar que este item tiene el menú contextual abierto
    emit("contextMenuOpened", props.item.id);
};

const onContextMenuClosed = () => {
    // Emitir evento para indicar que el menú contextual se cerró
    emit("contextMenuClosed");
};

const onToggleTasks = () => {
    emit("toggleExpanded", props.item.id);
};

const onDragStart = (e: DragEvent) => {
    const card = (e.currentTarget as HTMLElement)?.closest(".item-card") as HTMLElement;

    // dataTransfer: necesario para Firefox/otros
    try {
        e.dataTransfer?.setData("text/plain", String(props.item.id));
        if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    } catch (err) {}

    // Usar el store para manejar el drag con posición inicial
    dragDropStore.startDragAsync(props.item, e.clientX, e.clientY);

    // Crear ghost usando el store
    requestAnimationFrame(() => {
        dragDropStore.createGhostAsync(card);
    });
};

const onDragEnd = (e: DragEvent) => {
    // Siempre limpiar el estado del drag cuando termina el evento
    // El drop ya fue manejado por onDrop si ocurrió
    dragDropStore.clearDragStateAsync();
};

// Evento para actualizar posición del ghost y bordes mientras se arrastra
const onDragOver = (e: DragEvent) => {
    // Actualizar posición del ghost siguiendo al mouse
    dragDropStore.updateGhostPositionWithMouseAsync(e.clientX, e.clientY);

    // Actualizar bordes para tasks si estamos arrastrando una task
    if (dragDropStore.dragTask) {
        dragDropStore.updateTaskBorderHighlightsAsync(e.clientX, e.clientY, props.item.tasks);
    }

    // Nota: Los bordes se actualizarán desde el componente padre (DashboardView)
    // para tener acceso a todos los items
};

const calculateTaskInsertIndex = (mouseY: number, tasks: any[]) => {
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        if (!task) continue;

        const element = document.querySelector(`[data-task-id="${task.id}"]`) as HTMLElement | null;
        if (element) {
            const taskRect = element.getBoundingClientRect();
            const taskMiddle = taskRect.top + taskRect.height / 2;

            if (mouseY < taskMiddle) return i;
        }
    }
    return tasks.length;
};

const reorderTasksInSameItem = (draggedTask: any, insertIndex: number) => {
    const currentIndex = props.item.tasks.findIndex((task) => task.id === draggedTask.id);
    if (currentIndex === -1) return;

    if (currentIndex < insertIndex) {
        insertIndex--;
    }

    const newList = [...props.item.tasks];
    newList.splice(currentIndex, 1);
    newList.splice(insertIndex, 0, draggedTask);

    newList.forEach((task, idx) => {
        task.order = idx + 1;
    });

    props.item.tasks = newList;
    if (sprintStore.currentSprint) saveSprint(sprintStore.currentSprint);
};

const moveTaskToDifferentItem = (draggedTask: any, sourceItem: any, insertIndex: number) => {
    const targetItem = props.item;

    if (sourceItem) {
        sourceItem.tasks = sourceItem.tasks.filter((task: any) => task.id !== draggedTask.id);
        sourceItem.tasks.forEach((task: any, idx: number) => {
            task.order = idx + 1;
        });

        // Recalcular esfuerzos del item fuente si tiene tasks restantes
        if (sourceItem.tasks.length > 0) {
            sourceItem.estimatedEffort = sourceItem.tasks.reduce((sum: number, task: any) => sum + task.estimatedEffort, 0);
            sourceItem.actualEffort = sourceItem.tasks.reduce((sum: number, task: any) => sum + task.actualEffort, 0);
        }
    }

    targetItem.tasks.splice(insertIndex, 0, draggedTask);
    targetItem.tasks.forEach((task: any, idx: number) => {
        task.order = idx + 1;
    });

    // Recalcular esfuerzos del item destino
    if (targetItem.tasks.length > 0) {
        targetItem.estimatedEffort = targetItem.tasks.reduce((sum: number, task: any) => sum + task.estimatedEffort, 0);
        targetItem.actualEffort = targetItem.tasks.reduce((sum: number, task: any) => sum + task.actualEffort, 0);
    }

    emit("taskReceived", props.item.id);
    if (sprintStore.currentSprint) saveSprint(sprintStore.currentSprint);
};

const handleTaskDrop = (e: DragEvent) => {
    const draggedTask = dragDropStore.dragTask;
    const sourceItem = dragDropStore.dragTaskParentItem;

    const insertIndex = calculateTaskInsertIndex(e.clientY, props.item.tasks);

    if (sourceItem && sourceItem.id === props.item.id) {
        reorderTasksInSameItem(draggedTask, insertIndex);
    } else {
        moveTaskToDifferentItem(draggedTask, sourceItem, insertIndex);
    }

    dragDropStore.clearDragStateAsync();
};

const handleItemDrop = (e: DragEvent) => {
    if (!dragDropStore.dragItem || dragDropStore.dragItem.id === props.item.id) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const isInUpperHalf = e.clientY < rect.top + rect.height / 2;

    const currentSprint = sprintStore.currentSprint;
    if (!currentSprint) return;

    const currentIndex = currentSprint.items.findIndex((item) => item.id === dragDropStore.dragItem!.id);
    const targetIndex = currentSprint.items.findIndex((item) => item.id === props.item.id);

    if (currentIndex === -1 || targetIndex === -1) return;

    let insertIndex = isInUpperHalf ? targetIndex : targetIndex + 1;
    if (currentIndex < insertIndex) {
        insertIndex--;
    }

    const newList = [...currentSprint.items];
    newList.splice(currentIndex, 1);
    newList.splice(insertIndex, 0, dragDropStore.dragItem!);

    newList.forEach((it, idx) => {
        it.order = idx + 1;
    });

    currentSprint.items = newList;
    saveSprint(currentSprint);
    dragDropStore.clearDragStateAsync();
};

// Evento para manejar cuando se suelta un item sobre este componente
const onDrop = (e: DragEvent) => {
    e.preventDefault();

    if (dragDropStore.dragTask) return handleTaskDrop(e);

    handleItemDrop(e);
};

// No necesitamos estas funciones con la nueva implementación
</script>

<style scoped lang="scss">
@use "@/styles/dashboard-columns.scss" as *;
.item-card {
    color: $text;
    display: flex;
    align-items: center;
    padding: 3px 8px;
    height: 40px;
    border: 1px solid rgba($gray, 0.3);
    border-radius: 8px;
    background: rgba($bg-secondary, 0.7);
    transition: box-shadow 0.2s;
    width: 100%;
    box-sizing: border-box;
    position: relative;
    cursor: pointer;
    user-select: none;

    &:hover,
    &.context-menu-open {
        background: rgba($bg-secondary, 1);
        border: 1px solid rgba($gray, 1);
    }
}

.item-card:hover,
.item-card.context-menu-open {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.item-card.dragging {
    cursor: grabbing;
    opacity: 0.9;
}

.item-card.show-border-top {
    box-shadow: inset 0 3px 0 0 lightblue;
}
.item-card.show-border-bottom {
    box-shadow: inset 0 -3px 0 0 lightblue;
}

.drag-handle {
    cursor: grab;
    margin-right: 4px;

    * {
        pointer-events: none;
    }
}
.drag-handle:active {
    cursor: grabbing;
}

/* Estilos para el ghost arrastrable */
.draggable-ghost {
    transform: rotate(-2deg) !important;
    opacity: 0.95 !important;
    box-shadow: 0 0 10px rgba($primary, 0.5) !important;
    border: 2px dashed rgba($primary, 0.5) !important;
    background: rgba($primary, 0.2) !important;
    transition: transform 0.1s ease-out, box-shadow 0.1s ease-out;
    backdrop-filter: blur(2px) !important;
    font-weight: bold !important;
    position: fixed !important;
    /* Asegurar dimensiones visibles */
    min-width: 100px !important;
    min-height: 40px !important;
    /* Remover width: auto para permitir que el JS fije el ancho original */
    height: auto !important;
    /* Forzar layout */
    display: flex !important;
    align-items: center !important;
    box-sizing: border-box !important;
}

.draggable-ghost::before {
    content: "";
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(45deg, transparent 30%, rgba($primary, 0.3) 50%, transparent 70%);
    border-radius: inherit;
    animation: shimmer 2s infinite;
}

@keyframes shimmer {
    0% {
        transform: translateX(-100%);
    }
    100% {
        transform: translateX(100%);
    }
}

/* Estilos para el ghost cuando está posicionado dinámicamente */
.draggable-ghost.positioned-ghost {
    transform: rotate(0deg) !important;
    animation: none !important;
    border: 2px solid #4caf50 !important;
    background: rgba(76, 175, 80, 0.1) !important;
    box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3) !important;
}

.draggable-ghost.positioned-ghost::before {
    background: linear-gradient(45deg, transparent 30%, rgba(76, 175, 80, 0.4) 50%, transparent 70%) !important;
}

@keyframes pulse {
    0% {
        transform: scale(1);
        opacity: 0.8;
    }
    50% {
        transform: scale(1.05);
        opacity: 1;
    }
    100% {
        transform: scale(1);
        opacity: 0.8;
    }
}

/* Estilos específicos para el ghost de simulación de drag */
.drag-simulation-ghost {
    transform: rotate(-2deg) !important;
    opacity: 0.9 !important;
    box-shadow: 0 8px 25px rgba(255, 165, 0, 0.4) !important;
    border: 3px solid #ff9800 !important;
    background: rgba(255, 152, 0, 0.15) !important;
    animation: pulse-simulation 2s infinite !important;
    position: fixed !important;
}

@keyframes pulse-simulation {
    0% {
        transform: scale(1) rotate(-2deg);
        box-shadow: 0 8px 25px rgba(255, 165, 0, 0.4);
    }
    50% {
        transform: scale(1.02) rotate(-2deg);
        box-shadow: 0 12px 35px rgba(255, 165, 0, 0.6);
    }
    100% {
        transform: scale(1) rotate(-2deg);
        box-shadow: 0 8px 25px rgba(255, 165, 0, 0.4);
    }
}

.priority-cell {
    display: flex;
    align-items: center;
}

.priority-content {
    display: flex;
    align-items: center;
    gap: 6px;
}

.priority-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
}

.state-cell {
    display: flex;
    align-items: center;
}

.state-content {
    display: flex;
    align-items: center;
    gap: 6px;
}

.state-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
}
</style>

<template>
    <div
        class="task-card"
        :data-task-id="task.id"
        :class="[
            dragDropStore.dragTask?.id === task.id ? 'dragging' : '',
            isHighlighted && highlightPosition === 'above' ? 'show-border-top' : '',
            isHighlighted && highlightPosition === 'below' ? 'show-border-bottom' : '',
        ]"
        @click.stop="onEditTask(task)"
        @contextmenu.prevent.stop="onRightClick"
        @dragover.prevent="onDragOver"
        @drop.prevent="onDrop"
    >
        <div class="cols-actions text-left">
            <span class="drag-handle" :draggable="true" @dragstart.stop="onDragStart" @dragend="onDragEnd" @click.stop>
                <v-icon size="24">mdi-drag</v-icon>
            </span>
        </div>

        <div class="item-col cols-order">
            {{ task.order }}
        </div>
        <div class="item-col cols-title text-left">
            <v-icon class="yellow mr-1" size="16">mdi-clipboard-check-outline</v-icon>
            <strong>{{ task.title }}</strong>
        </div>
        <div class="item-col cols-assigned">
            {{ assignedUserName }}
        </div>
        <div class="item-col cols-state state-cell">
            <span class="state-content" v-html="getStateHtml(task.state || STATE_VALUES.TODO)"></span>
        </div>
        <div class="item-col cols-effort">{{ task.estimatedEffort }}-{{ task.actualEffort }}</div>
        <div class="item-col cols-priority priority-cell">
            <span class="priority-content" v-html="getPriorityHtml(task.priority)"></span>
        </div>
    </div>

    <!-- Diálogo de edición de task -->
    <TaskDialog
        v-if="showEditTaskDialog"
        :visible="showEditTaskDialog"
        :item="props.item"
        :existing-task="editingTask"
        @close="closeDialogs"
        @save="onSaveEditTask"
    />
</template>

<script setup lang="ts">
import { useTaskManagement } from "@/composables/useTaskManagement";
import { PRIORITY_OPTIONS } from "@/constants/priorities";
import { STATE_OPTIONS, STATE_VALUES } from "@/constants/states";
import { getUser, saveSprint } from "@/services/firestore";
import { useAuthStore } from "@/stores/auth";
import { useDragDropStore } from "@/stores/dragDrop";
import { useSprintStore } from "@/stores/sprint";
import type { Item, Task } from "@/types";
import { computed, onMounted, ref, watch } from "vue";
import TaskDialog from "./TaskDialog.vue";

const props = defineProps<{
    task: Task;
    item: Item;
}>();

const emit = defineEmits<{
    contextMenuOpened: [taskId: string];
    contextMenuClosed: [];
}>();

const { showEditTaskDialog, editingTask, closeDialogs, openEditTaskDialog, onSaveEditTask } = useTaskManagement();

const getPriorityHtml = (priority: string) => {
    const option = PRIORITY_OPTIONS.find((opt) => opt.value.toLowerCase() === priority.toLowerCase());
    return option ? option.html : priority;
};

const getStateHtml = (state: string | undefined) => {
    if (!state) return "To Do"; // Default fallback
    const option = STATE_OPTIONS.find((opt) => opt.value.toLowerCase() === state.toLowerCase());
    return option ? option.html : state;
};

const sprintStore = useSprintStore();
const authStore = useAuthStore();
const dragDropStore = useDragDropStore();

const assignedUserName = ref("");

const loadAssignedUserName = async () => {
    if (!props.task.assignedUser) {
        assignedUserName.value = "";
        return;
    }

    // Si es el usuario actual, mostrar solo nombre
    if (props.task.assignedUser === authStore.user?.id) {
        assignedUserName.value = authStore.user.name;
        return;
    }

    // Para otros usuarios, obtener datos desde Firestore y mostrar solo nombre
    try {
        const user = await getUser(props.task.assignedUser);
        if (user) {
            assignedUserName.value = user.name;
            return;
        }
    } catch (error) {
        console.warn(`Error al obtener usuario ${props.task.assignedUser}:`, error);
    }

    assignedUserName.value = props.task.assignedUser;
};

// Cargar el nombre cuando el componente se monta o cuando cambia el task
onMounted(() => {
    loadAssignedUserName();
});

// Watch para recargar cuando cambia el assignedUser
watch(
    () => props.task.assignedUser,
    () => {
        loadAssignedUserName();
    },
);

// Computed para determinar si esta task debe mostrar bordes
const isHighlighted = computed(() => {
    return dragDropStore.highlightedTasks.some((highlight) => highlight.taskId === props.task.id);
});

const highlightPosition = computed(() => {
    const highlight = dragDropStore.highlightedTasks.find((h) => h.taskId === props.task.id);
    return highlight?.position || null;
});

const onEditTask = (task: Task) => {
    openEditTaskDialog(task, props.item);
};

const onDragOver = (e: DragEvent) => {
    // Permitir el drop
    e.preventDefault();

    // Actualizar bordes para tasks si estamos arrastrando una task
    if (dragDropStore.dragTask) {
        dragDropStore.updateTaskBorderHighlightsAsync(e.clientX, e.clientY, props.item.tasks);
    }
};

const onDrop = (e: DragEvent) => {
    e.preventDefault();

    if (dragDropStore.dragTask && dragDropStore.dragTask.id !== props.task.id) {
        const draggedTask = dragDropStore.dragTask;
        const sourceItem = dragDropStore.dragTaskParentItem;

        // Determinar si el mouse está en la mitad superior o inferior de la task
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const mouseY = e.clientY;
        const isInUpperHalf = mouseY < rect.top + rect.height / 2;

        // Calcular la posición de inserción
        const targetIndex = props.item.tasks.findIndex((task) => task.id === props.task.id);
        const insertIndex = isInUpperHalf ? targetIndex : targetIndex + 1;

        // Mover la task
        moveTask(draggedTask, sourceItem, insertIndex);

        // Limpiar el estado del drag
        dragDropStore.clearDragStateAsync();
    }
};

const moveTask = (draggedTask: Task, sourceItem: Item | null, insertIndex: number) => {
    const isMovingBetweenItems = sourceItem && sourceItem.id !== props.item.id;

    console.log(`🔄 Moviendo task "${draggedTask.title}" - Entre items: ${isMovingBetweenItems}`);

    if (isMovingBetweenItems) {
        // Remover del item fuente
        if (sourceItem) {
            const originalCount = sourceItem.tasks.length;
            sourceItem.tasks = sourceItem.tasks.filter((task) => task.id !== draggedTask.id);
            sourceItem.tasks.forEach((task, idx) => {
                task.order = idx + 1;
            });
            console.log(`🗑️ Removida de source item. Tasks restantes: ${sourceItem.tasks.length} (era ${originalCount})`);
        }

        // Insertar en el item destino
        props.item.tasks.splice(insertIndex, 0, draggedTask);
        props.item.tasks.forEach((task, idx) => {
            task.order = idx + 1;
        });

        console.log(`✅ Task movida entre items. Target tasks: ${props.item.tasks.map((t) => `"${t.title}"`).join(", ")}`);
    } else {
        // Reordenar dentro del mismo item
        const currentIndex = props.item.tasks.findIndex((task) => task.id === draggedTask.id);
        if (currentIndex !== -1) {
            // Ajustar si el índice actual está antes de la posición de inserción
            let adjustedInsertIndex = insertIndex;
            if (currentIndex < insertIndex) {
                adjustedInsertIndex--;
            }

            console.log(`🔄 Reordenando en mismo item: ${currentIndex} -> ${adjustedInsertIndex}`);

            // Crear nueva lista con la task movida
            const newList = [...props.item.tasks];
            newList.splice(currentIndex, 1);
            newList.splice(adjustedInsertIndex, 0, draggedTask);

            // Actualizar el orden
            newList.forEach((task, idx) => {
                task.order = idx + 1;
            });

            props.item.tasks = newList;
            console.log(`✅ Task reordenada. Tasks: ${props.item.tasks.map((t) => `"${t.title}"`).join(", ")}`);
        }
    }

    // Guardar cambios
    if (sprintStore.currentSprint) saveSprint(sprintStore.currentSprint);
};

const onRightClick = (event: MouseEvent) => {
    event.preventDefault();
    // TODO: Implementar menú contextual para tasks
    emit("contextMenuOpened", props.task.id);
};

const onDragStart = (e: DragEvent) => {
    const card = (e.currentTarget as HTMLElement)?.closest(".task-card") as HTMLElement;

    // dataTransfer: necesario para Firefox/otros
    try {
        e.dataTransfer?.setData("text/plain", String(props.task.id));
        if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    } catch (err) {}

    // Usar el store para manejar el drag con posición inicial
    dragDropStore.startDragTaskAsync(props.task, props.item, e.clientX, e.clientY);

    // Crear ghost usando el store
    requestAnimationFrame(() => {
        dragDropStore.createGhostAsync(card);
    });
};

const onDragEnd = (e: DragEvent) => {
    // Siempre limpiar el estado del drag cuando termina el evento
    dragDropStore.clearDragStateAsync();
};
</script>

<style scoped lang="scss">
@use "@/styles/dashboard-columns.scss" as *;

.task-card {
    color: $text;
    display: flex;
    align-items: center;
    padding: 3px 8px;
    height: 36px;
    border: 1px solid rgba($gray, 0.3);
    border-radius: 8px;
    background: rgba($bg-secondary, 0.2);
    transition: box-shadow 0.2s;
    width: calc(100% - 8px);
    margin-left: 8px;
    box-sizing: border-box;
    position: relative;
    cursor: pointer;

    &:hover {
        background: rgba($bg-secondary, 0.3);
        border: 1px solid rgba($gray, 0.5);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
}

.task-card.show-border-top {
    box-shadow: inset 0 3px 0 0 lightblue;
}
.task-card.show-border-bottom {
    box-shadow: inset 0 -3px 0 0 lightblue;
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

<template>
    <div
        class="task-card"
        :data-task-id="task.id"
        :class="[
            dragDropStore.dragTask?.id === task.id ? 'dragging' : '',
            isHighlighted && highlightPosition === 'above' ? 'show-border-top' : '',
            isHighlighted && highlightPosition === 'below' ? 'show-border-bottom' : '',
        ]"
        @click="onEditTask(task)"
        @contextmenu.prevent.stop="onRightClick"
        @dragover.prevent="onDragOver"
        @drop.prevent="onDrop"
    >
        <div class="cols-actions text-left">
            <span class="drag-handle" :draggable="true" @dragstart.stop="onDragStart" @dragend="onDragEnd" @click.stop>
                <v-icon size="20">mdi-drag</v-icon>
            </span>
        </div>

        <div class="item-col cols-order">
            {{ task.order }}
        </div>
        <div class="item-col cols-title text-left">
            <strong>{{ task.title }}</strong>
        </div>
        <div class="item-col cols-assigned">
            <!-- Sin asignado para tasks -->
        </div>
        <div class="item-col cols-state state-cell">
            <span class="state-content" v-html="getStateHtml(task.state || STATE_VALUES.TODO)"></span>
        </div>
        <div class="item-col cols-effort">{{ task.estimatedEffort }}</div>
        <div class="item-col cols-effort">{{ task.actualEffort }}</div>
        <div class="item-col cols-priority priority-cell">
            <span class="priority-content" v-html="getPriorityHtml(task.priority)"></span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { PRIORITY_OPTIONS } from "@/constants/priorities";
import { STATE_OPTIONS, STATE_VALUES } from "@/constants/states";
import { saveSprint } from "@/services/firestore";
import { useDragDropStore } from "@/stores/dragDrop";
import { useSprintStore } from "@/stores/sprint";
import type { Item, Task } from "@/types";
import { computed } from "vue";

const props = defineProps<{
    task: Task;
    item: Item;
}>();

const emit = defineEmits<{
    editTask: [task: Task];
    contextMenuOpened: [taskId: string];
    contextMenuClosed: [];
}>();

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
const dragDropStore = useDragDropStore();

// Computed para determinar si esta task debe mostrar bordes
const isHighlighted = computed(() => {
    return dragDropStore.highlightedTasks.some((highlight) => highlight.taskId === props.task.id);
});

const highlightPosition = computed(() => {
    const highlight = dragDropStore.highlightedTasks.find((h) => h.taskId === props.task.id);
    return highlight?.position || null;
});

const onEditTask = (task: Task) => {
    emit("editTask", task);
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

// Evento para actualizar posición del ghost y bordes mientras se arrastra
const onDragOver = (e: DragEvent) => {
    // Actualizar posición del ghost siguiendo al mouse
    dragDropStore.updateGhostPositionWithMouseAsync(e.clientX, e.clientY);

    // Actualizar bordes para tasks
    dragDropStore.updateTaskBorderHighlightsAsync(e.clientX, e.clientY, props.item.tasks);
};

// Evento para manejar cuando se suelta una task sobre este componente
const onDrop = (e: DragEvent) => {
    e.preventDefault();

    if (dragDropStore.dragTask && dragDropStore.dragTask.id !== props.task.id) {
        // Determinar si el mouse está en la mitad superior o inferior de la task
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const mouseY = e.clientY;
        const isInUpperHalf = mouseY < rect.top + rect.height / 2;

        // Log específico para cuando se suelta una task
        const draggedTaskTitle = dragDropStore.dragTask?.title || "Task desconocida";
        const targetTaskTitle = props.task.title || "Task desconocida";
        const position = isInUpperHalf ? "arriba" : "abajo";
        console.log(`✅ Task arrastrada "${draggedTaskTitle}" reposicionada ${position} de "${targetTaskTitle}"`);

        // Reordenar tasks dentro del mismo item
        const currentIndex = props.item.tasks.findIndex((task) => task.id === dragDropStore.dragTask!.id);
        const targetIndex = props.item.tasks.findIndex((task) => task.id === props.task.id);

        if (currentIndex !== -1 && targetIndex !== -1) {
            // Calcular la posición de inserción deseada
            let insertIndex = isInUpperHalf ? targetIndex : targetIndex + 1;

            // Ajustar si el índice actual está antes de la posición de inserción
            if (currentIndex < insertIndex) {
                insertIndex--;
            }

            // Crear nueva lista con la task movida
            const newList = [...props.item.tasks];
            newList.splice(currentIndex, 1); // Remover del índice actual
            newList.splice(insertIndex, 0, dragDropStore.dragTask!); // Insertar en nueva posición

            // Actualizar el orden de todas las tasks
            newList.forEach((task, idx) => {
                task.order = idx + 1;
            });

            // Guardar cambios
            props.item.tasks = newList;
            if (sprintStore.currentSprint) saveSprint(sprintStore.currentSprint);
        }

        // Limpiar el estado del drag después del drop
        dragDropStore.clearDragStateAsync();
    }
};
</script>

<style scoped lang="scss">
@import "@/styles/dashboard-columns.scss";

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
    width: 100%;
    box-sizing: border-box;
    position: relative;
    cursor: pointer;

    &:hover {
        background: rgba($bg-secondary, 0.3);
        border: 1px solid rgba($gray, 0.5);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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

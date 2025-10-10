<template>
    <div
        class="item-card"
        :data-item-id="item.id"
        :class="[
            dragDropStore.dragItem?.id === item.id ? 'dragging' : '',
            isHighlighted && highlightPosition === 'above' ? 'show-border-top' : '',
            isHighlighted && highlightPosition === 'below' ? 'show-border-bottom' : '',
        ]"
        @dragover.prevent="onDragOver"
        @drop.prevent="onDrop"
    >
        <div class="item-col cols-2 text-left">
            <span class="drag-handle" :draggable="true" @dragstart.stop="onDragStart" @dragend="onDragEnd">
                <v-icon size="16">mdi-drag</v-icon>
            </span>

            <v-btn icon size="x-small" @click="showTasks = !showTasks" @mousedown.stop>
                <v-icon size="16">{{ showTasks ? "mdi-chevron-up" : "mdi-chevron-down" }}</v-icon>
            </v-btn>
            <v-btn icon size="x-small" @click="showAddTaskDialog = true" @mousedown.stop>
                <v-icon size="16">mdi-plus</v-icon>
            </v-btn>
            <v-btn icon size="x-small" @click="showEditItemDialog = true" @mousedown.stop>
                <v-icon size="16">mdi-pencil</v-icon>
            </v-btn>
        </div>

        <div class="item-col cols-order">
            {{ item.order }}
        </div>
        <div class="item-col cols-3 text-left">
            <strong>{{ item.title }}</strong>
        </div>
        <div class="item-col cols-2">
            {{ assignedUserName }}
        </div>
        <div class="item-col cols-2">{{ item.estimatedEffort }}</div>
        <div class="item-col cols-2">{{ item.actualEffort }}</div>
    </div>

    <v-card-text v-if="showTasks" class="ml-4">
        <div v-for="task in item.tasks" :key="task.id">
            <v-card variant="outlined" class="mb-2 d-flex align-center pa-2">
                <div class="item-col cols-3">
                    {{ task.title }}
                </div>
                <div class="item-col cols-2">
                    {{ task.priority }}
                </div>
                <div class="item-col cols-2">{{ task.estimatedEffort }}</div>
                <div class="item-col cols-2">{{ task.actualEffort }}</div>
                <div class="item-col cols-1">
                    <MyButton @click="onEditTask(task)">
                        <v-icon size="16">mdi-pencil</v-icon>
                    </MyButton>
                </div>
            </v-card>
        </div>
    </v-card-text>

    <AddTaskDialog :visible="showAddTaskDialog" :item="item" @close="showAddTaskDialog = false" @save="onAddTask" />
    <EditItemDialog :visible="showEditItemDialog" :item="item" @close="showEditItemDialog = false" @save="onSaveEditItem" />
    <EditTaskDialog :visible="showEditTaskDialog" :task="editingTask" @close="showEditTaskDialog = false" @save="onSaveEditTask" />
</template>

<script setup lang="ts">
import { saveSprint } from "@/services/firestore";
import { useAuthStore } from "@/stores/auth";
import { useSprintStore } from "@/stores/sprint";
import type { Item, Task } from "@/types";
import { computed, onMounted, ref } from "vue";
import AddTaskDialog from "./AddTaskDialog.vue";
import EditItemDialog from "./EditItemDialog.vue";
import EditTaskDialog from "./EditTaskDialog.vue";

const props = defineProps<{
    item: Item;
    showBorder: boolean;
    borderPosition?: "above" | "below" | null;
}>();

// No necesitamos emits - usaremos el store directamente

const sprintStore = useSprintStore();
const authStore = useAuthStore();
const dragDropStore = useDragDropStore();
const showTasks = ref(false);

// Computed para determinar si este item debe mostrar bordes
const isHighlighted = computed(() => {
    return dragDropStore.highlightedItems.some((highlight) => highlight.itemId === props.item.id);
});

const highlightPosition = computed(() => {
    const highlight = dragDropStore.highlightedItems.find((h) => h.itemId === props.item.id);
    return highlight?.position || null;
});

const assignedUserName = computed(() => {
    if (props.item.assignedUser === authStore.user?.id) {
        return `${authStore.user.name} ${authStore.user.lastName}`;
    }
    return props.item.assignedUser;
});

// Hook para crear simulación de drag al montar el componente
onMounted(() => {
    // Simulación removida completamente
});

const showAddTaskDialog = ref(false);
const showEditItemDialog = ref(false);
const showEditTaskDialog = ref(false);
const editingTask = ref<Task | null>(null);

// Funciones de simulación removidas completamente

const onAddTask = (task: Task) => {
    props.item.tasks.push(task);
    if (sprintStore.currentSprint) saveSprint(sprintStore.currentSprint);
    showAddTaskDialog.value = false;
};

const onTaskReorder = (evt: any) => {
    if (evt.moved) {
        sprintStore.reorderTasks(props.item.id, evt.moved.oldIndex, evt.moved.newIndex);
    }
};

const onTaskMove = (_evt: any, _originalEvent: any) => {
    // Move between items (future)
};

const onSaveEditItem = (data: { title: string; detail: string; priority: string; estimatedEffort: number; actualEffort: number }) => {
    props.item.title = data.title;
    props.item.detail = data.detail;
    props.item.priority = data.priority as "low" | "medium" | "high";
    props.item.estimatedEffort = data.estimatedEffort;
    props.item.actualEffort = data.actualEffort;
    if (sprintStore.currentSprint) saveSprint(sprintStore.currentSprint);
    showEditItemDialog.value = false;
};

const onEditTask = (task: Task) => {
    editingTask.value = task;
    showEditTaskDialog.value = true;
};

const onSaveEditTask = (data: { title: string; detail: string; priority: string; estimatedEffort: number; actualEffort: number }) => {
    if (editingTask.value) {
        editingTask.value.title = data.title;
        editingTask.value.detail = data.detail;
        editingTask.value.priority = data.priority as "low" | "medium" | "high";
        editingTask.value.estimatedEffort = data.estimatedEffort;
        editingTask.value.actualEffort = data.actualEffort;
        if (sprintStore.currentSprint) saveSprint(sprintStore.currentSprint);
    }
    showEditTaskDialog.value = false;
    editingTask.value = null;
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

    // Nota: Los bordes se actualizarán desde el componente padre (DashboardView)
    // para tener acceso a todos los items
};

// Evento para manejar cuando se suelta un item sobre este componente
const onDrop = (e: DragEvent) => {
    e.preventDefault();

    if (dragDropStore.dragItem && dragDropStore.dragItem.id !== props.item.id) {
        console.log(dragDropStore.dragItem.title, dragDropStore.dragItem.order);
        // Log específico para cuando se suelta un item
        const draggedItemTitle = dragDropStore.dragItem?.title || "Item desconocido";
        const targetItemTitle = props.item.title || "Item desconocido";
        console.log(`✅ Item arrastrado reordenado entre "${draggedItemTitle}" y "${targetItemTitle}"`);

        // Usar el sprint store directamente para reordenar
        const currentSprint = sprintStore.currentSprint;
        if (currentSprint) {
            const currentIndex = currentSprint.items.findIndex((item) => item.id === dragDropStore.dragItem!.id);
            const targetIndex = currentSprint.items.findIndex((item) => item.id === props.item.id);

            if (currentIndex !== -1 && targetIndex !== -1) {
                // Crear nueva lista con el item movido
                const newList = [...currentSprint.items];
                newList.splice(currentIndex, 1); // Remover del índice actual
                newList.splice(targetIndex, 0, dragDropStore.dragItem!); // Insertar en nueva posición

                // Actualizar el orden de todos los items
                newList.forEach((it, idx) => {
                    it.order = idx + 1;
                });

                // Guardar cambios
                currentSprint.items = newList;
                saveSprint(currentSprint);
            }
        }

        // Limpiar el estado del drag después del drop
        dragDropStore.clearDragStateAsync();
    }
};

// No necesitamos estas funciones con la nueva implementación
</script>

<style scoped lang="scss">
.item-card {
    display: flex;
    align-items: center;
    padding: 8px;
    margin-bottom: 6px;
    border: 1px solid $primary;
    border-radius: 8px;
    background: $bg-primary;
    cursor: pointer;
    user-select: none;
    transition: box-shadow 0.2s;
    width: 100%;
    box-sizing: border-box;
    position: relative;
}

.item-card:hover {
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

.item-col {
    padding: 0 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cols-order {
    flex: 0 0 90px;
    max-width: 90px;
    text-align: left;
}

.cols-2 {
    flex: 0 0 16.666%;
    max-width: 16.666%;
}

.cols-3 {
    flex: 1;
}

/* Estilos para el ghost arrastrable */
.draggable-ghost {
    transform: rotate(-2deg) !important;
    opacity: 0.95 !important;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3) !important;
    border: 3px dashed #1976d2 !important;
    background: rgba(25, 118, 210, 0.2) !important;
    transition: transform 0.1s ease-out, box-shadow 0.1s ease-out;
    backdrop-filter: blur(2px) !important;
    font-weight: bold !important;
    position: fixed !important;
    /* Asegurar dimensiones visibles */
    min-width: 100px !important;
    min-height: 40px !important;
    width: auto !important;
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
    background: linear-gradient(45deg, transparent 30%, rgba(25, 118, 210, 0.3) 50%, transparent 70%);
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

/* Estilos para el ghost de prueba */
.test-ghost {
    background: linear-gradient(45deg, #ff6b6b, #4ecdc4) !important;
    border: 3px dashed #fff !important;
    box-shadow: 0 0 20px rgba(255, 107, 107, 0.5) !important;
    animation: pulse 1.5s infinite !important;
    font-weight: bold !important;
    font-size: 12px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    color: white !important;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5) !important;
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
</style>

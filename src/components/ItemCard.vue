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
        @click="showEditItemDialog = true"
        @contextmenu.prevent.stop="onRightClick"
        @dragover.prevent="onDragOver"
        @drop.prevent="onDrop"
    >
        <div class="cols-actions text-left">
            <v-btn v-if="item.tasks.length > 0" icon size="x-small" @click.stop="showTasks = !showTasks" @mousedown.stop>
                <v-icon size="16">{{ showTasks ? "mdi-chevron-up" : "mdi-chevron-down" }}</v-icon>
            </v-btn>
            <span class="drag-handle ml-1" :draggable="true" @dragstart.stop="onDragStart" @dragend="onDragEnd" @click.stop>
                <v-icon size="24">mdi-drag</v-icon>
            </span>
        </div>

        <div class="item-col cols-order">
            {{ item.order }}
        </div>
        <div class="item-col cols-title text-left">
            <strong>{{ item.title }}</strong>
        </div>
        <div class="item-col cols-assigned">
            {{ assignedUserName }}
        </div>
        <div class="item-col cols-state state-cell">
            <span class="state-content" v-html="getStateHtml(item.state || STATE_VALUES.TODO)"></span>
        </div>
        <div class="item-col cols-effort">{{ item.estimatedEffort }}</div>
        <div class="item-col cols-effort">{{ item.actualEffort }}</div>
        <div class="item-col cols-priority priority-cell">
            <span class="priority-content" v-html="getPriorityHtml(item.priority)"></span>
        </div>
    </div>

    <div v-if="showTasks">
        <TaskCard v-for="task in item.tasks" :key="task.id" :task="task" :item="item" @editTask="onEditTask" />
    </div>

    <AddTaskDialog :visible="showAddTaskDialog" :item="item" @close="showAddTaskDialog = false" @save="onAddTask" />
    <AddTaskDialog
        v-if="showEditTaskDialog"
        :visible="showEditTaskDialog"
        :item="item"
        :existing-task="editingTask"
        @close="showEditTaskDialog = false"
        @save="onSaveEditTask"
    />
    <AddItemDialog
        v-if="showEditItemDialog"
        :visible="showEditItemDialog"
        :existing-item="item"
        :next-order="item.order"
        @close="showEditItemDialog = false"
        @save="onSaveEditItem"
    />

    <!-- Menú contextual -->
    <ContextMenu :options="contextMenuOptions" ref="contextMenuRef" @close="onContextMenuClosed" />
</template>

<script setup lang="ts">
import { PRIORITY_OPTIONS } from "@/constants/priorities";
import { STATE_OPTIONS, STATE_VALUES } from "@/constants/states";
import { getUser, saveSprint } from "@/services/firestore";
import { useAuthStore } from "@/stores/auth";
import { useDragDropStore } from "@/stores/dragDrop";
import { useSprintStore } from "@/stores/sprint";
import type { Item, Task } from "@/types";
import { computed, onMounted, ref, watch } from "vue";
import AddItemDialog from "./AddItemDialog.vue";
import AddTaskDialog from "./AddTaskDialog.vue";
import ContextMenu from "./ContextMenu.vue";
import TaskCard from "./TaskCard.vue";

const props = defineProps<{
    item: Item;
    showBorder: boolean;
    borderPosition?: "above" | "below" | null;
    isContextMenuOpen?: boolean;
}>();

const emit = defineEmits<{
    contextMenuOpened: [itemId: string];
    contextMenuClosed: [];
}>();

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

const assignedUserName = ref("");

const loadAssignedUserName = async () => {
    if (!props.item.assignedUser) {
        assignedUserName.value = "";
        return;
    }

    // Si es el usuario actual, mostrar nombre completo
    if (props.item.assignedUser === authStore.user?.id) {
        assignedUserName.value = `${authStore.user.name} ${authStore.user.lastName}`;
        return;
    }

    // Para otros usuarios, obtener datos desde Firestore
    try {
        const user = await getUser(props.item.assignedUser);
        if (user) {
            assignedUserName.value = `${user.name} ${user.lastName}`;
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

const showAddTaskDialog = ref(false);
const showEditItemDialog = ref(false);
const showEditTaskDialog = ref(false);
const editingTask = ref<Task | null>(null);

// Menú contextual
const contextMenuRef = ref();
const contextMenuOptions = computed(() => [
    {
        key: "add-task",
        label: "Agregar task",
        icon: "mdi-invoice-list-outline",
        color: "yellow",
        action: () => {
            showAddTaskDialog.value = true;
        },
    },
    {
        key: "delete",
        label: "Eliminar",
        icon: "mdi-trash-can-outline",
        color: "error",
        action: async () => {
            await sprintStore.deleteItem(props.item.id);
        },
    },
]);

const getPriorityHtml = (priority: string) => {
    const option = PRIORITY_OPTIONS.find((opt) => opt.value.toLowerCase() === priority.toLowerCase());
    return option ? option.html : priority;
};

const getStateHtml = (state: string | undefined) => {
    if (!state) return "To Do"; // Default fallback
    const option = STATE_OPTIONS.find((opt) => opt.value.toLowerCase() === state.toLowerCase());
    return option ? option.html : state;
};

// Funciones de simulación removidas completamente

const onAddTask = (task: Task) => {
    // Asignar orden basado en la cantidad actual de tasks
    task.order = props.item.tasks.length + 1;
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
    showEditItemDialog.value = false;
};

const onEditTask = (task: Task) => {
    editingTask.value = task;
    showEditTaskDialog.value = true;
};

const onSaveEditTask = (task: Task) => {
    if (editingTask.value) {
        // Encontrar la task en el array y actualizarla
        const taskIndex = props.item.tasks.findIndex((t) => t.id === editingTask.value!.id);
        if (taskIndex !== -1) {
            props.item.tasks[taskIndex] = task;
            if (sprintStore.currentSprint) saveSprint(sprintStore.currentSprint);
        }
    }
    showEditTaskDialog.value = false;
    editingTask.value = null;
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

// Evento para manejar cuando se suelta un item sobre este componente
const onDrop = (e: DragEvent) => {
    e.preventDefault();

    // Si estamos arrastrando una task
    if (dragDropStore.dragTask) {
        const draggedTask = dragDropStore.dragTask;
        const sourceItem = dragDropStore.dragTaskParentItem;

        // Determinar si el mouse está en la mitad superior o inferior del item
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const mouseY = e.clientY;
        const isInUpperHalf = mouseY < rect.top + rect.height / 2;

        // Si estamos dentro del mismo item, reordenar tasks
        if (sourceItem && sourceItem.id === props.item.id) {
            // Determinar la posición de inserción basada en tasks
            let insertIndex = 0;
            for (let i = 0; i < props.item.tasks.length; i++) {
                const task = props.item.tasks[i];
                if (!task) continue;

                const element = document.querySelector(`[data-task-id="${task.id}"]`) as HTMLElement | null;
                if (element) {
                    const taskRect = element.getBoundingClientRect();
                    if (mouseY < taskRect.top + taskRect.height / 2) {
                        insertIndex = i;
                        break;
                    }
                    insertIndex = i + 1;
                }
            }

            // Reordenar la task dentro del mismo item
            const currentIndex = props.item.tasks.findIndex((task) => task.id === draggedTask.id);
            if (currentIndex !== -1) {
                // Ajustar si el índice actual está antes de la posición de inserción
                if (currentIndex < insertIndex) {
                    insertIndex--;
                }

                // Crear nueva lista con la task movida
                const newList = [...props.item.tasks];
                newList.splice(currentIndex, 1); // Remover del índice actual
                newList.splice(insertIndex, 0, draggedTask); // Insertar en nueva posición

                // Actualizar el orden de todas las tasks
                newList.forEach((task, idx) => {
                    task.order = idx + 1;
                });

                // Guardar cambios
                props.item.tasks = newList;
                if (sprintStore.currentSprint) saveSprint(sprintStore.currentSprint);
            }
        } else {
            // Moviendo task a otro item
            const targetItem = props.item;
            const position = isInUpperHalf ? "above" : "below";

            // Remover la task del item fuente
            if (sourceItem) {
                sourceItem.tasks = sourceItem.tasks.filter((task) => task.id !== draggedTask.id);
                // Reordenar las tasks restantes
                sourceItem.tasks.forEach((task, idx) => {
                    task.order = idx + 1;
                });
            }

            // Agregar la task al item destino
            if (position === "above") {
                targetItem.tasks.unshift(draggedTask);
            } else {
                targetItem.tasks.push(draggedTask);
            }

            // Reordenar las tasks en el item destino
            targetItem.tasks.forEach((task, idx) => {
                task.order = idx + 1;
            });

            // Guardar cambios
            if (sprintStore.currentSprint) saveSprint(sprintStore.currentSprint);
        }

        // Limpiar el estado del drag después del drop
        dragDropStore.clearDragStateAsync();
        return;
    }

    // Lógica original para items
    if (dragDropStore.dragItem && dragDropStore.dragItem.id !== props.item.id) {
        // Determinar si el mouse está en la mitad superior o inferior del item
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const mouseY = e.clientY;
        const isInUpperHalf = mouseY < rect.top + rect.height / 2;

        // Log específico para cuando se suelta un item
        const draggedItemTitle = dragDropStore.dragItem?.title || "Item desconocido";
        const targetItemTitle = props.item.title || "Item desconocido";
        const position = isInUpperHalf ? "arriba" : "abajo";
        console.log(`✅ Item arrastrado "${draggedItemTitle}" reposicionado ${position} de "${targetItemTitle}"`);

        // Usar el sprint store directamente para reordenar
        const currentSprint = sprintStore.currentSprint;
        if (currentSprint) {
            const currentIndex = currentSprint.items.findIndex((item) => item.id === dragDropStore.dragItem!.id);
            const targetIndex = currentSprint.items.findIndex((item) => item.id === props.item.id);

            if (currentIndex !== -1 && targetIndex !== -1) {
                // Calcular la posición de inserción deseada
                let insertIndex = isInUpperHalf ? targetIndex : targetIndex + 1;

                // Ajustar si el índice actual está antes de la posición de inserción
                if (currentIndex < insertIndex) {
                    insertIndex--;
                }

                // Crear nueva lista con el item movido
                const newList = [...currentSprint.items];
                newList.splice(currentIndex, 1); // Remover del índice actual
                newList.splice(insertIndex, 0, dragDropStore.dragItem!); // Insertar en nueva posición

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
@import "@/styles/dashboard-columns.scss";
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

import { saveSprint } from "@/services/firestore";
import { useAuthStore } from "@/stores/auth";
import { useSprintStore } from "@/stores/sprint";
import type { Item, Task } from "@/types";
import { eventBus } from "@/utils/eventBus";
import { readonly, ref } from "vue";
import { useRouter } from "vue-router";
import { useUrlManagement } from "./useUrlManagement";

const showAddTaskDialog = ref(false);
const showEditTaskDialog = ref(false);
const editingTask = ref<Task | null>(null);
const currentItem = ref<Item | null>(null);

export const useTaskManagement = () => {
    const router = useRouter();
    const sprintStore = useSprintStore();
    const authStore = useAuthStore();
    const { setTaskUrl, clearQueryParams } = useUrlManagement(router);

    const openAddTaskDialog = (item: Item) => {
        currentItem.value = item;
        editingTask.value = null;
        showAddTaskDialog.value = true;
        showEditTaskDialog.value = false;
    };

    const openEditTaskDialog = (task: Task, item: Item, openFromUrl: boolean = false) => {
        currentItem.value = item;
        editingTask.value = task;
        showEditTaskDialog.value = true;
        showAddTaskDialog.value = false;
        if (!openFromUrl) setTaskUrl(task.id);
    };

    const closeDialogs = () => {
        showAddTaskDialog.value = false;
        showEditTaskDialog.value = false;
        editingTask.value = null;
        currentItem.value = null;
        clearQueryParams();
    };

    const saveTask = (task: Task) => {
        if (!currentItem.value) return;

        if (editingTask.value) {
            // Editar task existente
            const taskIndex = currentItem.value.tasks.findIndex((t) => t.id === editingTask.value!.id);
            if (taskIndex !== -1) {
                currentItem.value.tasks[taskIndex] = task;
                // Actualizar editingTask para refrescar el diálogo
                editingTask.value = task;

                // Recalcular esfuerzos del item padre si tiene tasks
                if (currentItem.value.tasks.length > 0) {
                    currentItem.value.estimatedEffort = currentItem.value.tasks.reduce((sum, t) => sum + t.estimatedEffort, 0);
                    currentItem.value.actualEffort = currentItem.value.tasks.reduce((sum, t) => sum + t.actualEffort, 0);
                }

                if (sprintStore.currentSprint) {
                    saveSprint(sprintStore.currentSprint);
                }
            }
        } else {
            // Agregar nueva task
            task.order = currentItem.value.tasks.filter(t => t.deletedAt === null).length + 1;
            task.createdBy = authStore.user?.id || "";
            currentItem.value.tasks.push(task);

            // Recalcular esfuerzos del item padre si tiene tasks
            if (currentItem.value.tasks.length > 0) {
                currentItem.value.estimatedEffort = currentItem.value.tasks.reduce((sum, t) => sum + t.estimatedEffort, 0);
                currentItem.value.actualEffort = currentItem.value.tasks.reduce((sum, t) => sum + t.actualEffort, 0);
            }

            if (sprintStore.currentSprint) {
                saveSprint(sprintStore.currentSprint);
            }

            // Emitir evento para expandir el item
            eventBus.newTaskCreated(currentItem.value);
        }

        // No cerrar diálogos para que persistan visibles después de guardar
    };

    const onSaveEditTask = (task: Task) => {
        saveTask(task);
    };

    const deleteTask = (taskId: string, item: Item) => {
        item.tasks = item.tasks.filter((task) => task.id !== taskId);
        // Reordenar las tasks restantes
        item.tasks.forEach((task, idx) => {
            task.order = idx + 1;
        });

        // Recalcular esfuerzos del item si tiene tasks restantes
        if (item.tasks.length > 0) {
            item.estimatedEffort = item.tasks.reduce((sum, task) => sum + task.estimatedEffort, 0);
            item.actualEffort = item.tasks.reduce((sum, task) => sum + task.actualEffort, 0);
        }

        if (sprintStore.currentSprint) {
            saveSprint(sprintStore.currentSprint);
        }
    };

    return {
        showAddTaskDialog: readonly(showAddTaskDialog),
        showEditTaskDialog: readonly(showEditTaskDialog),
        editingTask: readonly(editingTask),
        currentItem: readonly(currentItem),
        openAddTaskDialog,
        openEditTaskDialog,
        closeDialogs,
        saveTask,
        onSaveEditTask,
        deleteTask,
    };
};

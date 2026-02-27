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

    const saveTask = async (task: Task) => {
        if (!currentItem.value) return;

        if (editingTask.value) {
            // Editar task existente - usar updateTask del store para mantener consistencia
            await sprintStore.updateTask(editingTask.value.id, currentItem.value.id, task);
        } else {
            // Agregar nueva task
            // Calcular el orden solo para tasks activas (no eliminadas)
            const activeTasks = currentItem.value.tasks.filter(t => t.deletedAt === null);
            task.order = activeTasks.length + 1;
            task.createdBy = authStore.user?.id || "";
            currentItem.value.tasks.push(task);

            // Usar updateTask para guardar y actualizar el item padre
            await sprintStore.updateTask(task.id, currentItem.value.id, task);

            // Emitir evento para expandir el item
            eventBus.newTaskCreated(currentItem.value);
        }

        // Actualizar editingTask para refrescar el diálogo
        editingTask.value = task;
    };

    const onSaveEditTask = (task: Task) => {
        saveTask(task);
    };

    const deleteTask = (taskId: string, item: Item) => {
        item.tasks = item.tasks.filter((task) => task.id !== taskId);
        // Reordenar solo las tasks activas (no eliminadas)
        const activeTasks = item.tasks.filter((task) => task.deletedAt === null);
        activeTasks.forEach((task, idx) => {
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

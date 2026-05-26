import { saveSprint } from "@/services/firestore";
import { useAuthStore } from "@/stores/auth";
import { useDraftBoardStore, type BoardSource } from "@/stores/draftBoard";
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
const currentBoardSource = ref<BoardSource>("sprint");

export const useTaskManagement = () => {
    const router = useRouter();
    const sprintStore = useSprintStore();
    const draftBoardStore = useDraftBoardStore();
    const authStore = useAuthStore();
    const { setTaskUrl, clearQueryParams } = useUrlManagement(router);

    const openAddTaskDialog = (item: Item, boardSource: BoardSource = "sprint") => {
        currentItem.value = item;
        currentBoardSource.value = boardSource;
        editingTask.value = null;
        showAddTaskDialog.value = true;
        showEditTaskDialog.value = false;
    };

    const openEditTaskDialog = (task: Task, item: Item, openFromUrl: boolean = false, boardSource: BoardSource = "sprint") => {
        currentItem.value = item;
        currentBoardSource.value = boardSource;
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
        currentBoardSource.value = "sprint";
        clearQueryParams();
    };

    const saveTask = async (task: Task) => {
        if (!currentItem.value) return;

        if (currentBoardSource.value === "draft") {
            if (editingTask.value) {
                await draftBoardStore.updateTaskInDraftAsync(editingTask.value.id, currentItem.value.id, task);
            } else {
                const activeTasks = currentItem.value.tasks.filter((t) => t.deletedAt === null);
                task.order = activeTasks.length + 1;
                task.createdBy = authStore.user?.id || "";
                currentItem.value.tasks.push(task);
                await draftBoardStore.updateTaskInDraftAsync(task.id, currentItem.value.id, task);
                if (currentItem.value) eventBus.newTaskCreated(currentItem.value);
            }
            editingTask.value = task;
            return;
        }

        if (editingTask.value) {
            await sprintStore.updateTask(editingTask.value.id, currentItem.value.id, task);
        } else {
            const activeTasks = currentItem.value.tasks.filter((t) => t.deletedAt === null);
            task.order = activeTasks.length + 1;
            task.createdBy = authStore.user?.id || "";
            currentItem.value.tasks.push(task);
            await sprintStore.updateTask(task.id, currentItem.value.id, task);
            if (currentItem.value) eventBus.newTaskCreated(currentItem.value);
        }

        editingTask.value = task;
    };

    const onSaveEditTask = (task: Task) => {
        saveTask(task);
    };

    const deleteTask = (taskId: string, item: Item) => {
        item.tasks = item.tasks.filter((task) => task.id !== taskId);
        const activeTasks = item.tasks.filter((task) => task.deletedAt === null);
        activeTasks.forEach((task, idx) => {
            task.order = idx + 1;
        });

        if (item.tasks.length > 0) {
            item.estimatedEffort = item.tasks.reduce((sum, task) => sum + task.estimatedEffort, 0);
            item.actualEffort = item.tasks.reduce((sum, task) => sum + task.actualEffort, 0);
        }

        if (currentBoardSource.value === "draft") {
            draftBoardStore.persistBoardAsync();
            return;
        }

        if (sprintStore.currentSprint) saveSprint(sprintStore.currentSprint);
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

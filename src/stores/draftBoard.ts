import { STATE_VALUES } from "@/constants/states";
import MyAlerts from "@/plugins/my-alerts";
import { notifyOk } from "@/plugins/my-notification-helper/my-notification-helper";
import { addChange, DRAFT_BOARD_DOC_ID, saveDraftBoard, subscribeToDraftBoard } from "@/services/firestore";
import { useAuthStore } from "@/stores/auth";
import { useLoadingStore } from "@/stores/loading";
import { useSprintStore } from "@/stores/sprint";
import type { DraftBoard, Item, Task } from "@/types";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

export type BoardSource = "sprint" | "draft";

const recalculateActiveOrders = (items: Item[]) => {
    const activeItems = items.filter((item) => item.deletedAt === null);
    activeItems.forEach((item, idx) => {
        item.order = idx + 1;
    });
};

export const useDraftBoardStore = defineStore("draftBoard", () => {
    const loadingStore = useLoadingStore();
    const authStore = useAuthStore();
    const sprintStore = useSprintStore();

    const draftBoard = ref<DraftBoard | null>(null);
    const draftItemsBackup = ref<Item[]>([]);
    let unsubscribe: (() => void) | null = null;

    const draftItems = computed(() => {
        const items = draftBoard.value?.items ?? [];
        return items.filter((item) => item.deletedAt === null).sort((a, b) => a.order - b.order);
    });

    const ensureBoard = (): DraftBoard => {
        if (!draftBoard.value) {
            draftBoard.value = { id: DRAFT_BOARD_DOC_ID, items: [] };
        }
        if (!Array.isArray(draftBoard.value.items)) {
            draftBoard.value.items = [];
        }
        return draftBoard.value;
    };

    const validateDraftItemsBeforeSave = async (board: DraftBoard): Promise<boolean> => {
        const currentItemsCount = draftItemsBackup.value.length;
        const newItemsCount = board.items.length;

        if (currentItemsCount > 0 && newItemsCount === 0 && currentItemsCount >= 1) {
            const html = `
                <p><strong>⚠️ Advertencia de pérdida de datos</strong></p>
                <p>El Draft actualmente tiene ${currentItemsCount} items.</p>
                <p>Estás a punto de guardar 0 items. ¿Esto es correcto?</p>
            `;
            const result = await MyAlerts.confirmAsync("¿Guardar cambios?", html, "warning");
            if (!result) return false;
        }

        draftItemsBackup.value = [...board.items];
        return true;
    };

    const persistBoardAsync = async () => {
        const board = ensureBoard();
        if (!(await validateDraftItemsBeforeSave(board))) return;
        await saveDraftBoard(board);
    };

    const initDraftBoardAsync = async () => {
        if (unsubscribe) return;

        unsubscribe = subscribeToDraftBoard((board) => {
            draftBoard.value = board;
            draftItemsBackup.value = [...board.items];
        });
    };

    const disposeDraftBoardAsync = () => {
        if (!unsubscribe) return;
        unsubscribe();
        unsubscribe = null;
    };

    const findItemInBoard = (itemId: string): Item | undefined => {
        return ensureBoard().items.find((i) => i.id === itemId);
    };

    const updateItemInDraftAsync = async (itemId: string, updatedItem: Partial<Item>) => {
        const item = findItemInBoard(itemId);
        if (!item) return;

        if (updatedItem.projectName !== undefined) {
            item.tasks.forEach((task) => {
                if (!task.projectName || !task.projectName.trim()) {
                    task.projectName = updatedItem.projectName;
                }
            });
        }

        Object.assign(item, updatedItem);
        await persistBoardAsync();
    };

    const updateTaskInDraftAsync = async (taskId: string, itemId: string, updatedTask: Partial<Task>) => {
        const item = findItemInBoard(itemId);
        if (!item) return;

        const taskIndex = item.tasks.findIndex((t) => t.id === taskId);
        if (taskIndex === -1) return;

        const task = item.tasks[taskIndex];
        if (!task) return;

        const oldTaskState = task.state;
        Object.assign(task, updatedTask);

        if (updatedTask.state !== undefined && task.state !== oldTaskState) {
            const userId = authStore.user?.id;
            if (userId) {
                await addChange({
                    associatedId: task.id,
                    associatedType: "task",
                    field: "state",
                    oldValue: oldTaskState,
                    newValue: task.state,
                    userId,
                    createdAt: new Date(),
                });
            }
        }

        await sprintStore.autoUpdateParentItem(item);
        await persistBoardAsync();
    };

    const moveItemToDraftAsync = async (itemId: string) => {
        loadingStore.setLoading(true);
        try {
            const currentSprint = sprintStore.currentSprint;
            if (!currentSprint) throw new Error("Sprint actual no encontrado");

            const itemIndex = currentSprint.items.findIndex((i) => i.id === itemId);
            if (itemIndex === -1) throw new Error("Item no encontrado en el sprint actual");

            const item = currentSprint.items[itemIndex];
            if (!item) throw new Error("Item no encontrado");

            currentSprint.items.splice(itemIndex, 1);
            recalculateActiveOrders(currentSprint.items);
            if (!(await sprintStore.validateSprintItemsBeforeSave(currentSprint))) return;
            await sprintStore.saveCurrentSprintAsync();

            const board = ensureBoard();
            board.items.push(item);
            recalculateActiveOrders(board.items);
            draftItemsBackup.value = [...board.items];
            await persistBoardAsync();

            notifyOk("Item movido", `El item "${item.title}" ha sido movido a Draft`);
        } finally {
            loadingStore.setLoading(false);
        }
    };

    const moveItemFromDraftToSprintAsync = async (itemId: string, targetSprintId: string) => {
        loadingStore.setLoading(true);
        try {
            const board = ensureBoard();
            const itemIndex = board.items.findIndex((i) => i.id === itemId);
            if (itemIndex === -1) throw new Error("Item no encontrado en Draft");

            const item = board.items[itemIndex];
            if (!item) throw new Error("Item no encontrado");

            const targetSprint = sprintStore.sprints.find((s) => s.id === targetSprintId);
            if (!targetSprint) throw new Error("Sprint destino no encontrado");

            board.items.splice(itemIndex, 1);
            recalculateActiveOrders(board.items);
            await persistBoardAsync();

            targetSprint.items.push(item);
            recalculateActiveOrders(targetSprint.items);
            if (!(await sprintStore.validateSprintItemsBeforeSave(targetSprint))) return;
            await sprintStore.saveSprintByIdAsync(targetSprintId);

            notifyOk("Item movido", `El item "${item.title}" ha sido movido a ${targetSprint.titulo}`);
        } finally {
            loadingStore.setLoading(false);
        }
    };

    const reorderDraftItemAsync = async (itemId: string, targetIndex: number) => {
        const board = ensureBoard();
        const activeItems = board.items.filter((item) => item.deletedAt === null);
        const currentIndex = activeItems.findIndex((i) => i.id === itemId);
        if (currentIndex === -1) return;

        const item = activeItems[currentIndex];
        if (!item) return;

        const newActiveList = [...activeItems];
        newActiveList.splice(currentIndex, 1);
        newActiveList.splice(targetIndex, 0, item);
        newActiveList.forEach((it, idx) => {
            it.order = idx + 1;
        });

        const deletedItems = board.items.filter((i) => i.deletedAt !== null);
        board.items = [...newActiveList, ...deletedItems];
        await persistBoardAsync();
    };

    const softDeleteItemInDraftAsync = async (itemId: string) => {
        const item = findItemInBoard(itemId);
        if (!item) return;

        item.deletedAt = new Date();
        recalculateActiveOrders(ensureBoard().items);
        await persistBoardAsync();
    };

    const softDeleteTaskInDraftAsync = async (taskId: string, item: Item) => {
        const taskIndex = item.tasks.findIndex((t) => t.id === taskId);
        if (taskIndex === -1) return;

        item.tasks[taskIndex].deletedAt = new Date();
        const activeTasks = item.tasks.filter((task) => task.deletedAt === null);
        activeTasks.forEach((task, idx) => {
            task.order = idx + 1;
        });

        await sprintStore.autoUpdateParentItem(item);
        await persistBoardAsync();
    };

    const restoreItemInDraftAsync = async (itemId: string) => {
        const item = findItemInBoard(itemId);
        if (!item || item.deletedAt === null) return;

        item.deletedAt = null;
        recalculateActiveOrders(ensureBoard().items);
        await persistBoardAsync();
    };

    const restoreTaskInDraftAsync = async (taskId: string, itemId: string) => {
        const item = findItemInBoard(itemId);
        if (!item) return;

        const taskIndex = item.tasks.findIndex((t) => t.id === taskId);
        if (taskIndex === -1) return;

        const task = item.tasks[taskIndex];
        if (!task || task.deletedAt === null) return;

        task.deletedAt = null;
        const activeTasks = item.tasks.filter((t) => t.deletedAt === null);
        activeTasks.forEach((t, idx) => {
            t.order = idx + 1;
        });

        await sprintStore.autoUpdateParentItem(item);
        await persistBoardAsync();
    };

    const deleteItemInDraftAsync = async (itemId: string) => {
        const board = ensureBoard();
        const index = board.items.findIndex((i) => i.id === itemId);
        if (index === -1) return;

        board.items.splice(index, 1);
        recalculateActiveOrders(board.items);
        await persistBoardAsync();
    };

    const deleteTaskInDraftAsync = async (taskId: string, itemId: string) => {
        const item = findItemInBoard(itemId);
        if (!item) return;

        const taskIndex = item.tasks.findIndex((t) => t.id === taskId);
        if (taskIndex === -1) return;

        item.tasks.splice(taskIndex, 1);
        const activeTasks = item.tasks.filter((task) => task.deletedAt === null);
        activeTasks.forEach((task, idx) => {
            task.order = idx + 1;
        });

        await sprintStore.autoUpdateParentItem(item);
        await persistBoardAsync();
    };

    const duplicateItemInDraftAsync = async (itemId: string, includeTasks: boolean = false) => {
        const originalItem = findItemInBoard(itemId);
        if (!originalItem) return;

        const board = ensureBoard();
        const activeItems = board.items.filter((item) => item.deletedAt === null);
        const maxOrder = activeItems.length > 0 ? Math.max(...activeItems.map((item) => item.order)) : 0;

        const duplicatedItem: Item = {
            id: `item-copy-${Date.now()}`,
            title: `${originalItem.title}`,
            detail: originalItem.detail,
            priority: originalItem.priority,
            state: STATE_VALUES.TODO,
            estimatedEffort: 0,
            actualEffort: 0,
            assignedUser: null,
            order: maxOrder + 1,
            createdAt: new Date(),
            createdBy: authStore.user?.id || "",
            deletedAt: null,
            projectName: originalItem.projectName,
            tasks: includeTasks
                ? originalItem.tasks
                    .filter((t) => t.deletedAt === null)
                    .map((task) => ({
                        id: `task-copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        title: task.title,
                        detail: task.detail,
                        priority: task.priority,
                        state: STATE_VALUES.TODO,
                        estimatedEffort: 0,
                        actualEffort: 0,
                        assignedUser: null,
                        order: task.order,
                        createdAt: new Date(),
                        createdBy: authStore.user?.id || "",
                        deletedAt: null,
                        projectName: task.projectName,
                    }))
                : [],
        };

        board.items.push(duplicatedItem);
        await persistBoardAsync();
    };

    const duplicateTaskInDraftAsync = async (taskId: string, itemId: string) => {
        const item = findItemInBoard(itemId);
        if (!item) return;

        const originalTask = item.tasks.find((t) => t.id === taskId);
        if (!originalTask) return;

        const activeTasks = item.tasks.filter((t) => t.deletedAt === null);
        const maxOrder = activeTasks.length > 0 ? Math.max(...activeTasks.map((task) => task.order)) : 0;

        item.tasks.push({
            id: `task-copy-${Date.now()}`,
            title: `${originalTask.title}`,
            detail: originalTask.detail,
            priority: originalTask.priority,
            state: STATE_VALUES.TODO,
            estimatedEffort: 0,
            actualEffort: 0,
            assignedUser: null,
            order: maxOrder + 1,
            createdAt: new Date(),
            createdBy: authStore.user?.id || "",
            deletedAt: null,
            projectName: originalTask.projectName,
        });

        await sprintStore.autoUpdateParentItem(item);
        await persistBoardAsync();
    };

    const sortTasksByStateInDraftAsync = async (itemId: string) => {
        const item = findItemInBoard(itemId);
        if (!item) return;

        const activeTasks = item.tasks.filter((task) => task.deletedAt === null);
        const stateOrder = ["Done", "Ready For Test", "In Progress", "To Do", "Waiting"];
        const priorityOrder = ["High", "Medium", "Normal"];

        activeTasks.sort((a, b) => {
            const aStateIndex = stateOrder.indexOf(a.state);
            const bStateIndex = stateOrder.indexOf(b.state);
            if (aStateIndex !== bStateIndex) return aStateIndex - bStateIndex;

            const aPriorityIndex = priorityOrder.indexOf(a.priority);
            const bPriorityIndex = priorityOrder.indexOf(b.priority);
            if (aPriorityIndex !== bPriorityIndex) return aPriorityIndex - bPriorityIndex;

            return a.order - b.order;
        });

        activeTasks.forEach((task, index) => {
            task.order = index + 1;
        });

        const deletedTasks = item.tasks.filter((task) => task.deletedAt !== null);
        item.tasks = [...activeTasks, ...deletedTasks];
        await persistBoardAsync();
        notifyOk("Tasks sorted", `Tasks in "${item.title}" have been sorted by state and priority`);
    };

    const copyItemWithTaskSplitInDraftAsync = async (itemId: string) => {
        const originalItem = findItemInBoard(itemId);
        if (!originalItem) return;

        const board = ensureBoard();
        const doneTasks = originalItem.tasks.filter((task) => task.deletedAt === null && task.state === "Done");
        const otherTasks = originalItem.tasks.filter((task) => task.deletedAt === null && task.state !== "Done");

        const originalIndex = board.items.findIndex((i) => i.id === itemId);
        if (originalIndex === -1) return;

        const copiedItem: Item = {
            ...originalItem,
            id: `item-copy-${Date.now()}`,
            title: `${originalItem.title} Copy`,
            order: originalItem.order + 1,
            createdAt: new Date(),
            createdBy: authStore.user?.id || "",
            deletedAt: null,
            tasks: otherTasks.map((task) => ({
                ...task,
                id: `task-copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                createdAt: new Date(),
                createdBy: authStore.user?.id || "",
            })),
        };

        originalItem.tasks = [...originalItem.tasks.filter((t) => t.deletedAt !== null), ...doneTasks];
        originalItem.state = STATE_VALUES.DONE;

        board.items.splice(originalIndex + 1, 0, copiedItem);
        recalculateActiveOrders(board.items);
        await persistBoardAsync();
        notifyOk("Item finalized", `Item "${originalItem.title}" has been finalized in Draft.`);
    };

    return {
        draftBoard,
        draftItems,
        initDraftBoardAsync,
        disposeDraftBoardAsync,
        persistBoardAsync,
        updateItemInDraftAsync,
        updateTaskInDraftAsync,
        moveItemToDraftAsync,
        moveItemFromDraftToSprintAsync,
        reorderDraftItemAsync,
        softDeleteItemInDraftAsync,
        softDeleteTaskInDraftAsync,
        restoreItemInDraftAsync,
        restoreTaskInDraftAsync,
        deleteItemInDraftAsync,
        deleteTaskInDraftAsync,
        duplicateItemInDraftAsync,
        duplicateTaskInDraftAsync,
        sortTasksByStateInDraftAsync,
        copyItemWithTaskSplitInDraftAsync,
        findItemInBoard,
    };
});

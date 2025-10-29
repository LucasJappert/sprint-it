import { PRIORITY_OPTIONS } from "@/constants/priorities";
import { STATE_OPTIONS } from "@/constants/states";
import { SPRINT_TEAM_MEMBERS } from "@/constants/users";
import MyAlerts from "@/plugins/my-alerts";
import { addChange, getUserByUsername } from "@/services/firestore";
import { useAuthStore } from "@/stores/auth";
import { useSprintStore } from "@/stores/sprint";
import type { ChangeHistory, Item, Task } from "@/types";

export interface ContextMenuOption {
    key: string;
    label: string;
    icon?: string;
    color?: string;
    iconStyle?: string;
    action?: () => void;
    submenu?: ContextMenuOption[];
}

export const useContextMenuOptions = () => {
    const sprintStore = useSprintStore();
    const authStore = useAuthStore();

    const saveChange = async (associatedId: string, associatedType: "task" | "item", field: string, oldValue: string, newValue: string) => {
        const userId = authStore.user?.id;
        if (!userId) return;

        const change: Omit<ChangeHistory, "id"> = {
            associatedId,
            associatedType,
            field,
            oldValue,
            newValue,
            userId,
            createdAt: new Date(),
        };

        try {
            await addChange(change);
        } catch (error) {
            console.error("Error saving change:", error);
        }
    };

    const createUserOptions = async (updateFunction: (userId: string) => Promise<void>) => {
        const options = [];
        for (const member of SPRINT_TEAM_MEMBERS) {
            const user = await getUserByUsername(member);
            if (user) {
                options.push({
                    key: `assign-${member}`,
                    label: (user as any).name,
                    icon: "mdi-account",
                    action: async () => {
                        await updateFunction(user.id);
                    },
                });
            }
        }
        return options;
    };

    const createStateOptions = (updateFunction: (state: string) => Promise<void>) => {
        return STATE_OPTIONS.map(state => ({
            key: `state-${state.value}`,
            label: state.name,
            action: async () => {
                await updateFunction(state.value);
            },
        }));
    };

    const createPriorityOptions = (updateFunction: (priority: string) => Promise<void>) => {
        return PRIORITY_OPTIONS.map(priority => ({
            key: `priority-${priority.value}`,
            label: priority.name,
            action: async () => {
                await updateFunction(priority.value);
            },
        }));
    };

    const createTaskContextMenuOptions = async (task: Task, item: Item, deleteTaskFn: (taskId: string, item: Item) => void) => {
        const updateTaskAssignedUser = async (userId: string) => {
            const oldValue = task.assignedUser || "";
            await sprintStore.updateTask(task.id, item.id, { assignedUser: userId });
            await saveChange(task.id, "task", "assignedUser", oldValue, userId);
        };

        const updateTaskState = async (state: string) => {
            const oldValue = task.state;
            await sprintStore.updateTask(task.id, item.id, { state: state as any });
            await saveChange(task.id, "task", "state", oldValue, state);
        };

        const updateTaskPriority = async (priority: string) => {
            const oldValue = task.priority;
            await sprintStore.updateTask(task.id, item.id, { priority: priority as any });
            await saveChange(task.id, "task", "priority", oldValue, priority);
        };

        return [
            {
                key: "reassign",
                label: "Assign to",
                icon: "mdi-account-switch",
                submenu: await createUserOptions(updateTaskAssignedUser),
            },
            {
                key: "change-state",
                label: "Change state",
                icon: "mdi-swap-horizontal",
                submenu: createStateOptions(updateTaskState),
            },
            {
                key: "change-priority",
                label: "Change priority",
                icon: "mdi-flag-variant",
                submenu: createPriorityOptions(updateTaskPriority),
            },
            {
                key: "delete",
                label: "Delete",
                icon: "mdi-trash-can-outline",
                color: "error",
                action: async () => {
                    const confirmed = await MyAlerts.confirmAsync(
                        "Confirmar eliminación",
                        `¿Estás seguro de que quieres eliminar la tarea "${task.title}"?`,
                        "warning",
                    );
                    if (confirmed) {
                        deleteTaskFn(task.id, item);
                    }
                },
            },
        ];
    };

    const createItemContextMenuOptions = async (item: Item, openAddTaskDialogFn: (item: Item) => void) => {
        const updateItemAssignedUser = async (userId: string) => {
            const oldValue = item.assignedUser || "";
            await sprintStore.updateItem(item.id, { assignedUser: userId });
            await saveChange(item.id, "item", "assignedUser", oldValue, userId);
        };

        const updateItemState = async (state: string) => {
            const oldValue = item.state;
            await sprintStore.updateItem(item.id, { state: state as any });
            await saveChange(item.id, "item", "state", oldValue, state);
        };

        const updateItemPriority = async (priority: string) => {
            const oldValue = item.priority;
            await sprintStore.updateItem(item.id, { priority: priority as any });
            await saveChange(item.id, "item", "priority", oldValue, priority);
        };

        const moveItemToSprint = async (targetSprintId: string) => {
            await sprintStore.moveItemToSprint(item.id, targetSprintId);
        };

        const createSprintOptions = () => {
            return sprintStore.sprints
                .filter(sprint => sprint.id !== sprintStore.currentSprintId)
                .map(sprint => ({
                    key: `move-to-${sprint.id}`,
                    label: sprint.titulo,
                    icon: "mdi-swap-horizontal",
                    action: async () => {
                        await moveItemToSprint(sprint.id);
                    },
                }));
        };

        return [
            {
                key: "add-task",
                label: "Add task",
                icon: "mdi-clipboard-check-outline",
                color: "yellow",
                action: () => {
                    openAddTaskDialogFn(item);
                },
            },
            {
                key: "reassign",
                label: "Assign to",
                icon: "mdi-account-switch",
                submenu: await createUserOptions(updateItemAssignedUser),
            },
            {
                key: "change-state",
                label: "Change state",
                icon: "mdi-swap-horizontal",
                submenu: createStateOptions(updateItemState),
            },
            {
                key: "change-priority",
                label: "Change priority",
                icon: "mdi-flag-variant",
                submenu: createPriorityOptions(updateItemPriority),
            },
            {
                key: "move-to-sprint",
                label: "Move to sprint",
                icon: "mdi-arrow-right-bold",
                submenu: createSprintOptions(),
            },
            {
                key: "delete",
                label: "Delete",
                icon: "mdi-trash-can-outline",
                color: "error",
                action: async () => {
                    const confirmed = await MyAlerts.confirmAsync(
                        "Confirmar eliminación",
                        `¿Estás seguro de que quieres eliminar el item "${item.title}" y todas sus tareas?`,
                        "warning",
                    );
                    if (confirmed) {
                        await sprintStore.deleteItem(item.id);
                    }
                },
            },
        ];
    };

    return {
        createTaskContextMenuOptions,
        createItemContextMenuOptions,
    };
};

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

    const createTaskContextMenuOptions = async (task: Task, item: Item, deleteTaskFn: (taskId: string, item: Item) => void, duplicateTaskFn: (taskId: string, itemId: string) => void) => {
        const updateTaskAssignedUser = async (userId: string) => {
            const oldValue = task.assignedUser || "";
            await sprintStore.updateTask(task.id, item.id, { assignedUser: userId });
            await saveChange(task.id, "task", "assignedUser", oldValue, userId);
        };

        const updateTaskState = async (state: string) => {
            const oldValue = task.state;
            const newState = state as any;

            // Si el estado anterior era "To Do" y el nuevo es diferente, asignar el usuario logueado
            const shouldAssignUser = oldValue === "To Do" && newState !== "To Do";
            const updates: any = { state: newState };
            if (shouldAssignUser) {
                updates.assignedUser = authStore.user?.id || null;
            }

            await sprintStore.updateTask(task.id, item.id, updates);

            // Guardar cambios para el estado
            await saveChange(task.id, "task", "state", oldValue, state);

            // Si se asignó usuario, guardar ese cambio también
            if (shouldAssignUser) {
                await saveChange(task.id, "task", "assignedUser", task.assignedUser || "", authStore.user?.id || "");
            }
        };

        const updateTaskPriority = async (priority: string) => {
            const oldValue = task.priority;
            await sprintStore.updateTask(task.id, item.id, { priority: priority as any });
            await saveChange(task.id, "task", "priority", oldValue, priority);
        };

        return [
            {
                key: "duplicate",
                label: "Duplicate Task",
                icon: "mdi-content-copy",
                action: async () => {
                    const confirmed = await MyAlerts.confirmAsync(
                        "Duplicate Task",
                        `Are you sure you want to duplicate the task "${task.title}"?`
                    );
                    if (confirmed) {
                        duplicateTaskFn(task.id, item.id);
                    }
                },
            },
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
                        "Confirm deletion",
                        `Are you sure you want to delete the task "${task.title}"?`,
                        "warning",
                    );
                    if (confirmed) {
                        deleteTaskFn(task.id, item);
                    }
                },
            },
        ];
    };

    const createItemContextMenuOptions = async (item: Item, openAddTaskDialogFn: (item: Item) => void, duplicateItemFn: (itemId: string, includeTasks: boolean) => void) => {
        const updateItemAssignedUser = async (userId: string) => {
            const oldValue = item.assignedUser || "";
            await sprintStore.updateItem(item.id, { assignedUser: userId });
            await saveChange(item.id, "item", "assignedUser", oldValue, userId);
        };

        const updateItemState = async (state: string) => {
            const oldValue = item.state;
            const newState = state as any;

            // Si el estado anterior era "To Do" y el nuevo es diferente, asignar el usuario logueado
            const shouldAssignUser = oldValue === "To Do" && newState !== "To Do";
            const updates: any = { state: newState };
            if (shouldAssignUser) {
                updates.assignedUser = authStore.user?.id || null;
            }

            await sprintStore.updateItem(item.id, updates);

            // Guardar cambios para el estado
            await saveChange(item.id, "item", "state", oldValue, state);

            // Si se asignó usuario, guardar ese cambio también
            if (shouldAssignUser) {
                await saveChange(item.id, "item", "assignedUser", item.assignedUser || "", authStore.user?.id || "");
            }
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
                key: "duplicate",
                label: "Duplicate Item",
                icon: "mdi-content-copy",
                action: async () => {
                    if (item.tasks.length === 0) {
                        // Si no tiene tasks, usar confirmAsync simple
                        const confirmed = await MyAlerts.confirmAsync(
                            "Duplicate Item",
                            `Are you sure you want to duplicate the item "${item.title}"?`
                        );
                        if (confirmed) {
                            duplicateItemFn(item.id, false);
                        }
                    } else {
                        // Si tiene tasks, mostrar opciones
                        const result = await MyAlerts.confirmWithButtonsAsync(
                            "Duplicate Item",
                            `How do you want to duplicate the item "${item.title}"?`,
                            [
                                { text: "Item + Tasks", value: "item-with-tasks" },
                                { text: "Item Only", value: "item-only" },
                            ]
                        );

                        if (result === "item-only") {
                            duplicateItemFn(item.id, false);
                        } else if (result === "item-with-tasks") {
                            duplicateItemFn(item.id, true);
                        }
                    }
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
                        "Confirm deletion",
                        `Are you sure you want to delete the item "${item.title}" and all its tasks?`,
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

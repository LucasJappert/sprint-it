import { PRIORITY_OPTIONS } from "@/constants/priorities";
import { STATE_OPTIONS } from "@/constants/states";
import { SPRINT_TEAM_MEMBERS } from "@/constants/users";
import MyAlerts from "@/plugins/my-alerts";
import { addChange, getUserByUsername } from "@/services/firestore";
import { useAuthStore } from "@/stores/auth";
import { useDraftBoardStore, type BoardSource } from "@/stores/draftBoard";
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
    const draftBoardStore = useDraftBoardStore();
    const authStore = useAuthStore();

    const buildSprintSubmenuOptions = (
        sprintsList: typeof sprintStore.sprints,
        highlightSprintId: string | null,
        onSelect: (sprintId: string) => Promise<void>,
    ) => {
        const currentSprintIndex = highlightSprintId
            ? sprintStore.sprints.findIndex((s) => s.id === highlightSprintId)
            : -1;

        return [...sprintsList]
            .sort((a, b) => new Date(b.fechaDesde).getTime() - new Date(a.fechaDesde).getTime())
            .map((sprint) => {
                const sprintIndex = sprintStore.sprints.findIndex((s) => s.id === sprint.id);
                let labelStyle = "";
                let iconColor = "";

                if (currentSprintIndex !== -1 && sprintIndex === currentSprintIndex + 1) {
                    labelStyle = "color: #19821d;";
                    iconColor = "#19821d";
                } else if (currentSprintIndex !== -1 && sprintIndex === currentSprintIndex - 1) {
                    labelStyle = "color: rgba(255, 235, 59, 0.41);";
                    iconColor = "rgba(255, 235, 59, 0.41)";
                }

                const finalLabel = labelStyle ? `<span style="${labelStyle}">${sprint.titulo}</span>` : sprint.titulo;

                return {
                    key: `move-to-${sprint.id}`,
                    label: finalLabel,
                    icon: "mdi-swap-horizontal",
                    iconStyle: iconColor ? { color: iconColor } : undefined,
                    action: async () => {
                        await onSelect(sprint.id);
                    },
                };
            });
    };

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

    const createTaskContextMenuOptions = async (
        task: Task,
        item: Item,
        duplicateTaskFn: (taskId: string, itemId: string) => void,
        softDeleteTaskFn: (taskId: string, item: Item) => void,
        boardSource: BoardSource = "sprint",
    ) => {
        const isDraft = boardSource === "draft";

        const updateTaskInBoard = async (updates: Partial<Task>) => {
            if (isDraft) {
                await draftBoardStore.updateTaskInDraftAsync(task.id, item.id, updates);
                return;
            }
            await sprintStore.updateTask(task.id, item.id, updates);
        };

        const updateTaskAssignedUser = async (userId: string) => {
            const oldValue = task.assignedUser || "";
            await updateTaskInBoard({ assignedUser: userId });
            await saveChange(task.id, "task", "assignedUser", oldValue, userId);
        };

        const updateTaskState = async (state: string) => {
            const oldValue = task.state;
            const newState = state as Task["state"];

            const shouldAssignUser = oldValue === "To Do" && newState !== "To Do";
            const updates: Partial<Task> = { state: newState };
            if (shouldAssignUser) updates.assignedUser = authStore.user?.id || null;

            await updateTaskInBoard(updates);
            await saveChange(task.id, "task", "state", oldValue, state);

            if (shouldAssignUser) {
                await saveChange(task.id, "task", "assignedUser", task.assignedUser || "", authStore.user?.id || "");
            }
        };

        const updateTaskPriority = async (priority: string) => {
            const oldValue = task.priority;
            await updateTaskInBoard({ priority: priority as Task["priority"] });
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
                        softDeleteTaskFn(task.id, item);
                    }
                },
            },
        ];
    };

    const createItemContextMenuOptions = async (
        item: Item,
        openAddTaskDialogFn: (item: Item) => void,
        duplicateItemFn: (itemId: string, includeTasks: boolean) => void,
        softDeleteItemFn: (itemId: string) => void,
        sortTasksFn: (itemId: string) => void,
        copyItemWithTaskSplitFn: (itemId: string) => void,
        boardSource: BoardSource = "sprint",
    ) => {
        const isDraft = boardSource === "draft";

        const updateItemInBoard = async (updates: Partial<Item>) => {
            if (isDraft) {
                await draftBoardStore.updateItemInDraftAsync(item.id, updates);
                return;
            }
            await sprintStore.updateItem(item.id, updates);
        };

        const updateItemAssignedUser = async (userId: string) => {
            const oldValue = item.assignedUser || "";
            await updateItemInBoard({ assignedUser: userId });
            await saveChange(item.id, "item", "assignedUser", oldValue, userId);
        };

        const updateItemState = async (state: string) => {
            const oldValue = item.state;
            const newState = state as Item["state"];

            const shouldAssignUser = oldValue === "To Do" && newState !== "To Do";
            const updates: Partial<Item> = { state: newState };
            if (shouldAssignUser) updates.assignedUser = authStore.user?.id || null;

            await updateItemInBoard(updates);
            await saveChange(item.id, "item", "state", oldValue, state);

            if (shouldAssignUser) {
                await saveChange(item.id, "item", "assignedUser", item.assignedUser || "", authStore.user?.id || "");
            }
        };

        const updateItemPriority = async (priority: string) => {
            const oldValue = item.priority;
            await updateItemInBoard({ priority: priority as Item["priority"] });
            await saveChange(item.id, "item", "priority", oldValue, priority);
        };

        const createSprintOptions = () => {
            const allSprints = isDraft
                ? [...sprintStore.sprints]
                : sprintStore.sprints.filter((sprint) => sprint.id !== sprintStore.currentSprintId);

            const onSelect = isDraft
                ? (sprintId: string) => draftBoardStore.moveItemFromDraftToSprintAsync(item.id, sprintId)
                : (sprintId: string) => sprintStore.moveItemToSprint(item.id, sprintId);

            return buildSprintSubmenuOptions(allSprints, sprintStore.currentSprintId, onSelect);
        };

        // Verificar condición: al menos 1 task Done y al menos 1 task en otro estado, y al menos 2 tasks totales
        // Solo considerar tareas activas (no eliminadas)
        const activeTasks = item.tasks.filter(task => task.deletedAt === null);
        const hasDoneTasks = activeTasks.some(task => task.state === "Done");
        const hasOtherTasks = activeTasks.some(task => task.state !== "Done");
        const hasAtLeastTwoTasks = activeTasks.length >= 2;
        const shouldShowFinalizeOption = hasDoneTasks && hasOtherTasks && hasAtLeastTwoTasks;

        const menuOptions = [
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
                key: "sort-tasks",
                label: "Sort Tasks",
                icon: "mdi-sort-variant",
                action: () => {
                    sortTasksFn(item.id);
                },
            },
        ];

        // Solo agregar la opción "Finalize Item" si cumple la condición
        if (shouldShowFinalizeOption) {
            menuOptions.push({
                key: "finalize-item",
                label: "Finalize Item",
                icon: "mdi-check-circle-outline",
                color: "success",
                action: async () => {
                    const doneCount = item.tasks.filter(task => task.state === "Done").length;
                    const otherCount = item.tasks.filter(task => task.state !== "Done").length;
                    const confirmed = await MyAlerts.confirmAsync(
                        "Finalize Item",
                        `This will create a copy of "${item.title}" with "${item.title} Copy" as title.<br><br>` +
                        `<strong>Original item</strong> will keep ${doneCount} completed task(s).<br>` +
                        `<strong>Copy</strong> will receive ${otherCount} pending task(s).<br><br>` +
                        `Both items will have their tasks sorted by state and priority.`
                    );
                    if (confirmed) {
                        copyItemWithTaskSplitFn(item.id);
                    }
                },
            });
        }

        // Agregar las opciones restantes
        menuOptions.push(
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
            } as any,
            {
                key: "reassign",
                label: "Assign to",
                icon: "mdi-account-switch",
                submenu: await createUserOptions(updateItemAssignedUser),
            } as any,
            {
                key: "change-state",
                label: "Change state",
                icon: "mdi-swap-horizontal",
                submenu: createStateOptions(updateItemState),
            } as any,
            {
                key: "change-priority",
                label: "Change priority",
                icon: "mdi-flag-variant",
                submenu: createPriorityOptions(updateItemPriority),
            } as any,
            {
                key: "move-to-sprint",
                label: "Move to sprint",
                icon: "mdi-arrow-right-bold",
                submenu: createSprintOptions(),
            } as any,
        );

        if (!isDraft) {
            menuOptions.push({
                key: "move-to-draft",
                label: "Move to draft",
                icon: "mdi-inbox-arrow-down",
                action: async () => {
                    await draftBoardStore.moveItemToDraftAsync(item.id);
                },
            } as ContextMenuOption);
        }

        menuOptions.push(
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
                        softDeleteItemFn(item.id);
                    }
                },
            } as any,
        );

        return menuOptions;
    };

    return {
        createTaskContextMenuOptions,
        createItemContextMenuOptions,
    };
};

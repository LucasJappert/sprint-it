import { getSprint, saveSprint, subscribeToSprint } from "@/services/firestore";
import { useLoadingStore } from "@/stores/loading";
import type { Item, Sprint } from "@/types";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

export const useSprintStore = defineStore("sprint", () => {
    const loadingStore = useLoadingStore();
    const sprints = ref<Sprint[]>([]);
    const currentSprintId = ref<string>("");

    const currentSprint = computed(() =>
        sprints.value.find((s) => s.id === currentSprintId.value)
    );

    const generateSprints = async () => {
        loadingStore.setLoading(true);
        try {
            const now = new Date();
            const currentWeekStart = new Date(now);
            currentWeekStart.setDate(now.getDate() - now.getDay()); // Monday

            const sprintsList: Sprint[] = [];

            // Past sprints (last 4 weeks)
            for (let i = 4; i > 0; i--) {
                const start = new Date(currentWeekStart);
                start.setDate(start.getDate() - i * 14);
                const end = new Date(start);
                end.setDate(end.getDate() + 13);

                const sprintId = `sprint-${i}-past`;
                let sprint = await getSprint(sprintId);
                if (!sprint) {
                    sprint = {
                        id: sprintId,
                        name: `Sprint ${i} (Past)`,
                        startDate: start,
                        endDate: end,
                        items: [],
                    };
                    await saveSprint(sprint);
                }
                sprintsList.push(sprint);
            }

            // Current sprint
            const currentStart = new Date(currentWeekStart);
            const currentEnd = new Date(currentStart);
            currentEnd.setDate(currentEnd.getDate() + 13);

            let currentSprintData = await getSprint("current-sprint");
            if (!currentSprintData) {
                currentSprintData = {
                    id: "current-sprint",
                    name: "Current Sprint",
                    startDate: currentStart,
                    endDate: currentEnd,
                    items: [
                        {
                            id: "default-item",
                            title: "Default Item",
                            detail: "This is a default item",
                            priority: "medium" as const,
                            estimatedEffort: 0,
                            actualEffort: 0,
                            assignedUser: "",
                            tasks: [],
                            order: 0,
                        },
                    ],
                } as Sprint;
                await saveSprint(currentSprintData);
            }
            sprintsList.push(currentSprintData as Sprint);

            // Future sprints (next 4)
            for (let i = 1; i <= 4; i++) {
                const start = new Date(currentWeekStart);
                start.setDate(start.getDate() + i * 14);
                const end = new Date(start);
                end.setDate(end.getDate() + 13);

                const sprintId = `sprint-${i}-future`;
                let sprint = await getSprint(sprintId);
                if (!sprint) {
                    sprint = {
                        id: sprintId,
                        name: `Sprint ${i} (Future)`,
                        startDate: start,
                        endDate: end,
                        items: [],
                    };
                    await saveSprint(sprint);
                }
                sprintsList.push(sprint);
            }

            sprints.value = sprintsList;
            currentSprintId.value = "current-sprint";

            // Subscribe to current sprint changes
            subscribeToSprint("current-sprint", (updatedSprint) => {
                const index = sprints.value.findIndex(s => s.id === updatedSprint.id);
                if (index !== -1) {
                    sprints.value[index] = updatedSprint;
                }
            });
        } finally {
            loadingStore.setLoading(false);
        }
    };

    const addItem = async (item: Item) => {
        loadingStore.setLoading(true);
        try {
            const sprint = sprints.value.find((s) => s.id === currentSprintId.value);
            if (sprint) {
                sprint.items.push(item);
                await saveSprint(sprint);
            }
        } finally {
            loadingStore.setLoading(false);
        }
    };

    const updateItem = (itemId: string, updatedItem: Partial<Item>) => {
        if (currentSprint.value) {
            const index = currentSprint.value.items.findIndex((i) => i.id === itemId);
            if (index !== -1 && currentSprint.value.items[index]) {
                Object.assign(currentSprint.value.items[index], updatedItem);
            }
        }
    };

    const moveTask = (fromItemId: string, toItemId: string, taskId: string, newIndex: number) => {
        const fromItem = currentSprint.value?.items.find((i) => i.id === fromItemId);
        const toItem = currentSprint.value?.items.find((i) => i.id === toItemId);
        if (fromItem && toItem) {
            const taskIndex = fromItem.tasks.findIndex((t) => t.id === taskId);
            if (taskIndex !== -1) {
                const task = fromItem.tasks[taskIndex];
                if (task) {
                    fromItem.tasks.splice(taskIndex, 1);
                    toItem.tasks.splice(newIndex, 0, task);
                }
            }
        }
    };

    const reorderTasks = (itemId: string, oldIndex: number, newIndex: number) => {
        const item = currentSprint.value?.items.find((i) => i.id === itemId);
        if (item && oldIndex >= 0 && oldIndex < item.tasks.length) {
            const task = item.tasks[oldIndex];
            if (task) {
                item.tasks.splice(oldIndex, 1);
                item.tasks.splice(newIndex, 0, task);
            }
        }
    };

    return {
        sprints,
        currentSprintId,
        currentSprint,
        generateSprints,
        addItem,
        updateItem,
        moveTask,
        reorderTasks,
    };
});

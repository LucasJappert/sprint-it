<template>
    <div class="deleted-items-section">
        <!-- Botón para expandir/colapsar la sección -->
        <div class="section-header" @click="toggleExpanded">
            <v-icon size="20" class="mr-2">{{ isExpanded ? "mdi-chevron-down" : "mdi-chevron-right" }}</v-icon>
            <v-icon size="20" class="mr-2 warning">mdi-delete-outline</v-icon>
            <span class="section-title">Deleted Items</span>
            <v-badge v-if="totalDeletedCount > 0" :content="totalDeletedCount" color="error" inline class="ml-2" />
            <span v-if="totalDeletedCount === 0" class="ml-2 no-items-text">(empty)</span>
        </div>

        <!-- Contenido de la sección -->
        <div v-if="isExpanded" class="section-content">
            <!-- Items eliminados del sprint -->
            <div v-if="deletedSprintItems.length > 0" class="deleted-group">
                <div class="group-title">Items (Sprint)</div>
                <div v-for="item in deletedSprintItems" :key="`sprint-${item.id}`" class="deleted-item-card">
                    <div class="deleted-item-header">
                        <div class="item-info">
                            <span class="item-order">#{{ item.order }}</span>
                            <span class="item-title">{{ item.title }}</span>
                            <span v-if="item.projectName" class="item-project">({{ item.projectName }})</span>
                        </div>
                        <div class="item-actions">
                            <v-btn size="x-small" color="success" variant="tonal" @click="onRestoreSprintItem(item)" title="Restore item">
                                <v-icon size="16" left>mdi-restore</v-icon>
                                Restore
                            </v-btn>
                            <v-btn size="x-small" color="error" variant="tonal" @click="onPermanentDeleteSprintItem(item)" title="Permanently delete" class="ml-2">
                                <v-icon size="16" left>mdi-delete-forever</v-icon>
                                Delete
                            </v-btn>
                        </div>
                    </div>
                    <div v-if="getDeletedTasks(item).length > 0" class="deleted-tasks">
                        <div class="task-info" v-for="task in getDeletedTasks(item)" :key="task.id">
                            <v-icon size="14" class="mr-1">mdi-checkbox-blank-outline</v-icon>
                            <span class="task-title">{{ task.title }}</span>
                            <v-chip size="x-small" color="error" variant="tonal" class="ml-2">deleted</v-chip>
                            <v-btn size="x-small" icon variant="text" color="success" @click="onRestoreSprintTask(task, item)" title="Restore task">
                                <v-icon size="14">mdi-restore</v-icon>
                            </v-btn>
                        </div>
                    </div>
                    <div v-else class="no-tasks-text">No deleted tasks</div>
                    <div class="deleted-date">
                        <span class="item-id">#{{ item.id }}</span>
                        <span>Deleted: {{ formatDate(item.deletedAt) }}</span>
                    </div>
                </div>
            </div>

            <!-- Items eliminados del Draft -->
            <div v-if="deletedDraftItems.length > 0" class="deleted-group">
                <div class="group-title">Items (Draft)</div>
                <div v-for="item in deletedDraftItems" :key="`draft-${item.id}`" class="deleted-item-card">
                    <div class="deleted-item-header">
                        <div class="item-info">
                            <v-chip size="x-small" color="primary" variant="tonal" class="mr-2">Draft</v-chip>
                            <span class="item-order">#{{ item.order }}</span>
                            <span class="item-title">{{ item.title }}</span>
                            <span v-if="item.projectName" class="item-project">({{ item.projectName }})</span>
                        </div>
                        <div class="item-actions">
                            <v-btn size="x-small" color="success" variant="tonal" @click="onRestoreDraftItem(item)" title="Restore item">
                                <v-icon size="16" left>mdi-restore</v-icon>
                                Restore
                            </v-btn>
                            <v-btn size="x-small" color="error" variant="tonal" @click="onPermanentDeleteDraftItem(item)" title="Permanently delete" class="ml-2">
                                <v-icon size="16" left>mdi-delete-forever</v-icon>
                                Delete
                            </v-btn>
                        </div>
                    </div>
                    <div v-if="getDeletedTasks(item).length > 0" class="deleted-tasks">
                        <div class="task-info" v-for="task in getDeletedTasks(item)" :key="task.id">
                            <v-icon size="14" class="mr-1">mdi-checkbox-blank-outline</v-icon>
                            <span class="task-title">{{ task.title }}</span>
                            <v-btn size="x-small" icon variant="text" color="success" @click="onRestoreDraftTask(task, item)" title="Restore task">
                                <v-icon size="14">mdi-restore</v-icon>
                            </v-btn>
                        </div>
                    </div>
                    <div class="deleted-date">
                        <span class="item-id">#{{ item.id }}</span>
                        <span>Deleted: {{ formatDate(item.deletedAt) }}</span>
                    </div>
                </div>
            </div>

            <!-- Tareas eliminadas de items activos del sprint -->
            <div v-if="itemsWithDeletedTasks.length > 0" class="deleted-group">
                <div class="group-title">Tasks in Active Items (Sprint)</div>
                <div v-for="itemWithDeleted in itemsWithDeletedTasks" :key="itemWithDeleted.item.id" class="deleted-item-card">
                    <div class="deleted-item-header">
                        <div class="item-info">
                            <span class="item-order">#{{ itemWithDeleted.item.order }}</span>
                            <span class="item-title">{{ itemWithDeleted.item.title }}</span>
                            <span v-if="itemWithDeleted.item.projectName" class="item-project">({{ itemWithDeleted.item.projectName }})</span>
                        </div>
                    </div>
                    <div class="deleted-tasks">
                        <div class="task-info" v-for="task in itemWithDeleted.deletedTasks" :key="task.id">
                            <v-icon size="14" class="mr-1">mdi-checkbox-blank-outline</v-icon>
                            <span class="task-title">{{ task.title }}</span>
                            <v-btn
                                size="x-small"
                                icon
                                variant="text"
                                color="error"
                                @click="onPermanentDeleteSprintTask(task, itemWithDeleted.item)"
                                title="Permanently delete task"
                                class="ml-2"
                            >
                                <v-icon size="14">mdi-delete-forever</v-icon>
                            </v-btn>
                            <v-btn size="x-small" icon variant="text" color="success" @click="onRestoreSprintTask(task, itemWithDeleted.item)" title="Restore task">
                                <v-icon size="14">mdi-restore</v-icon>
                            </v-btn>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tareas eliminadas de items activos del Draft -->
            <div v-if="draftItemsWithDeletedTasks.length > 0" class="deleted-group">
                <div class="group-title">Tasks in Active Items (Draft)</div>
                <div v-for="itemWithDeleted in draftItemsWithDeletedTasks" :key="`draft-task-${itemWithDeleted.item.id}`" class="deleted-item-card">
                    <div class="deleted-item-header">
                        <div class="item-info">
                            <v-chip size="x-small" color="primary" variant="tonal" class="mr-2">Draft</v-chip>
                            <span class="item-order">#{{ itemWithDeleted.item.order }}</span>
                            <span class="item-title">{{ itemWithDeleted.item.title }}</span>
                        </div>
                    </div>
                    <div class="deleted-tasks">
                        <div class="task-info" v-for="task in itemWithDeleted.deletedTasks" :key="task.id">
                            <v-icon size="14" class="mr-1">mdi-checkbox-blank-outline</v-icon>
                            <span class="task-title">{{ task.title }}</span>
                            <v-btn size="x-small" icon variant="text" color="error" @click="onPermanentDeleteDraftTask(task, itemWithDeleted.item)" title="Permanently delete task" class="ml-2">
                                <v-icon size="14">mdi-delete-forever</v-icon>
                            </v-btn>
                            <v-btn size="x-small" icon variant="text" color="success" @click="onRestoreDraftTask(task, itemWithDeleted.item)" title="Restore task">
                                <v-icon size="14">mdi-restore</v-icon>
                            </v-btn>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Mensaje cuando no hay nada eliminado -->
            <div v-if="hasNoDeletedContent" class="empty-message">
                <v-icon size="40" color="grey">mdi-delete-off</v-icon>
                <p>No deleted items or tasks</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import MyAlerts from "@/plugins/my-alerts";
import { notifyOk } from "@/plugins/my-notification-helper/my-notification-helper";
import { useDraftBoardStore } from "@/stores/draftBoard";
import { useSprintStore } from "@/stores/sprint";
import type { Item, Task } from "@/types";
import { computed, ref } from "vue";

const sprintStore = useSprintStore();
const draftBoardStore = useDraftBoardStore();
const isExpanded = ref(false);

const deletedSprintItems = computed((): Item[] => {
    const items = sprintStore.currentSprint?.items ?? [];
    return (items as Item[]).filter((item) => item.deletedAt !== null);
});

const deletedDraftItems = computed((): Item[] => {
    const items = draftBoardStore.draftBoard?.items ?? [];
    return items.filter((item) => item.deletedAt !== null);
});

const itemsWithDeletedTasks = computed((): Array<{ item: Item; deletedTasks: Task[] }> => {
    const items = sprintStore.currentSprint?.items ?? [];
    const result: Array<{ item: Item; deletedTasks: Task[] }> = [];

    for (const item of items as Item[]) {
        if (item.deletedAt !== null) continue;

        const deletedTasks = item.tasks.filter((task) => task.deletedAt !== null);
        if (deletedTasks.length > 0) result.push({ item, deletedTasks });
    }

    return result;
});

const draftItemsWithDeletedTasks = computed((): Array<{ item: Item; deletedTasks: Task[] }> => {
    const items = draftBoardStore.draftBoard?.items ?? [];
    const result: Array<{ item: Item; deletedTasks: Task[] }> = [];

    for (const item of items) {
        if (item.deletedAt !== null) continue;

        const deletedTasks = item.tasks.filter((task) => task.deletedAt !== null);
        if (deletedTasks.length > 0) result.push({ item, deletedTasks });
    }

    return result;
});

const hasNoDeletedContent = computed(
    () =>
        deletedSprintItems.value.length === 0
        && deletedDraftItems.value.length === 0
        && itemsWithDeletedTasks.value.length === 0
        && draftItemsWithDeletedTasks.value.length === 0,
);

const totalDeletedCount = computed((): number => {
    let count = deletedSprintItems.value.length + deletedDraftItems.value.length;
    for (const itemWithDeleted of itemsWithDeletedTasks.value) {
        count += itemWithDeleted.deletedTasks.length;
    }
    for (const itemWithDeleted of draftItemsWithDeletedTasks.value) {
        count += itemWithDeleted.deletedTasks.length;
    }
    return count;
});

// Obtener tareas eliminadas de un item
const getDeletedTasks = (item: Item): Task[] => {
    return item.tasks.filter((task) => task.deletedAt !== null);
};

// Alternar expansión
const toggleExpanded = () => {
    isExpanded.value = !isExpanded.value;
};

// Formatear fecha
const formatDate = (date: Date | null): string => {
    if (!date) return "Unknown";
    return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const onRestoreSprintItem = async (item: Item) => {
    const confirmed = await MyAlerts.confirmAsync(
        "Restore Item",
        `Are you sure you want to restore the item "<strong>${item.title}</strong>"?<br><br>This will make the item visible again in the sprint.`,
        "info",
    );

    if (!confirmed) return;

    await sprintStore.restoreItem(item.id);
    notifyOk("Item restored", `The item "${item.title}" has been restored.`);
};

const onRestoreDraftItem = async (item: Item) => {
    const confirmed = await MyAlerts.confirmAsync(
        "Restore Item",
        `Are you sure you want to restore the item "<strong>${item.title}</strong>"?<br><br>This will make the item visible again in <strong>Draft</strong>.`,
        "info",
    );

    if (!confirmed) return;

    await draftBoardStore.restoreItemInDraftAsync(item.id);
    notifyOk("Item restored", `The item "${item.title}" has been restored to Draft.`);
};

const onPermanentDeleteSprintItem = async (item: Item) => {
    const confirmed = await MyAlerts.confirmAsync(
        "Permanently Delete Item",
        `Are you sure you want to permanently delete the item "<strong>${item.title}</strong>"?<br><br><strong>This action cannot be undone.</strong> All tasks associated with this item will also be permanently deleted.`,
        "error",
    );

    if (!confirmed) return;

    await sprintStore.deleteItem(item.id);
    notifyOk("Item deleted", `The item "${item.title}" has been permanently deleted.`);
};

const onPermanentDeleteDraftItem = async (item: Item) => {
    const confirmed = await MyAlerts.confirmAsync(
        "Permanently Delete Item",
        `Are you sure you want to permanently delete the item "<strong>${item.title}</strong>" from Draft?<br><br><strong>This action cannot be undone.</strong>`,
        "error",
    );

    if (!confirmed) return;

    await draftBoardStore.deleteItemInDraftAsync(item.id);
    notifyOk("Item deleted", `The item "${item.title}" has been permanently deleted.`);
};

const onRestoreSprintTask = async (task: Task, item: Item) => {
    const confirmed = await MyAlerts.confirmAsync(
        "Restore Task",
        `Are you sure you want to restore the task "<strong>${task.title}</strong>"?<br><br>This will make the task visible again in the item "${item.title}".`,
        "info",
    );

    if (!confirmed) return;

    await sprintStore.restoreTask(task.id, item.id);
    notifyOk("Task restored", `The task "${task.title}" has been restored.`);
};

const onRestoreDraftTask = async (task: Task, item: Item) => {
    const confirmed = await MyAlerts.confirmAsync(
        "Restore Task",
        `Are you sure you want to restore the task "<strong>${task.title}</strong>"?<br><br>This will make the task visible again in Draft item "${item.title}".`,
        "info",
    );

    if (!confirmed) return;

    await draftBoardStore.restoreTaskInDraftAsync(task.id, item.id);
    notifyOk("Task restored", `The task "${task.title}" has been restored.`);
};

const onPermanentDeleteSprintTask = async (task: Task, item: Item) => {
    const confirmed = await MyAlerts.confirmAsync(
        "Permanently Delete Task",
        `Are you sure you want to permanently delete the task "<strong>${task.title}</strong>"?<br><br><strong>This action cannot be undone.</strong>`,
        "error",
    );

    if (!confirmed) return;

    await sprintStore.deleteTask(task.id, item.id);
    notifyOk("Task deleted", `The task "${task.title}" has been permanently deleted.`);
};

const onPermanentDeleteDraftTask = async (task: Task, item: Item) => {
    const confirmed = await MyAlerts.confirmAsync(
        "Permanently Delete Task",
        `Are you sure you want to permanently delete the task "<strong>${task.title}</strong>" from Draft?<br><br><strong>This action cannot be undone.</strong>`,
        "error",
    );

    if (!confirmed) return;

    await draftBoardStore.deleteTaskInDraftAsync(task.id, item.id);
    notifyOk("Task deleted", `The task "${task.title}" has been permanently deleted.`);
};
</script>

<style scoped lang="scss">
@use "@/styles/dashboard-columns.scss" as *;

.deleted-items-section {
    width: 100%;
    margin-top: 16px;
    background: rgba(0, 0, 0, 0.03);
    border-radius: 8px;
    overflow: hidden;
}

.section-header {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.05);
    cursor: pointer;
    user-select: none;
    transition: background 0.2s;

    &:hover {
        background: rgba(0, 0, 0, 0.08);
    }
}

.section-title {
    font-weight: 600;
    color: $text;
}

.warning {
    color: #f57c00;
}

.no-items-text {
    color: #9e9e9e;
    font-size: 0.85rem;
}

.section-content {
    padding: 12px;
}

.deleted-group {
    margin-bottom: 16px;

    &:last-child {
        margin-bottom: 0;
    }
}

.group-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: #757575;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.deleted-item-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    padding: 10px;
    margin-bottom: 8px;
    transition: background 0.2s;

    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }
}

.deleted-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

.item-info {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
}

.item-order {
    font-weight: 600;
    color: #757575;
    font-size: 0.85rem;
}

.item-title {
    font-weight: 500;
    color: $text;
}

.item-project {
    font-size: 0.8rem;
    color: #9e9e9e;
}
.item-id {
    font-weight: 600;
    font-size: 0.7rem;
    color: #757575;
}

.item-actions {
    display: flex;
    align-items: center;
}

.deleted-tasks {
    margin-top: 10px;
    padding-left: 8px;
    border-left: 2px solid #ff9800;
}

.task-info {
    display: flex;
    align-items: center;
    padding: 4px 0;
    font-size: 0.85rem;
}

.task-title {
    color: #616161;
}

.no-tasks-text {
    font-size: 0.8rem;
    color: #9e9e9e;
    font-style: italic;
    margin-top: 6px;
}

.deleted-date {
    font-size: 0.75rem;
    color: #9e9e9e;
    margin-top: 8px;
    justify-content: space-between;
    width: 100%;
    display: flex;
}

.empty-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    color: #9e9e9e;

    p {
        margin-top: 8px;
        font-size: 0.9rem;
    }
}
</style>

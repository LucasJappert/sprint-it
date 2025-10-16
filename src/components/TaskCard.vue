<template>
    <div class="task-card" @click="onEditTask(task)">
        <div class="cols-actions text-left">
            <!-- Espacio vacío para mantener alineación -->
        </div>

        <div class="item-col cols-order">
            <!-- Sin orden para tasks -->
        </div>
        <div class="item-col cols-title text-left">
            <strong>{{ task.title }}</strong>
        </div>
        <div class="item-col cols-assigned">
            <!-- Sin asignado para tasks -->
        </div>
        <div class="item-col cols-state state-cell">
            <span class="state-content" v-html="getStateHtml(task.state || STATE_VALUES.TODO)"></span>
        </div>
        <div class="item-col cols-effort">{{ task.estimatedEffort }}</div>
        <div class="item-col cols-effort">{{ task.actualEffort }}</div>
        <div class="item-col cols-priority priority-cell">
            <span class="priority-content" v-html="getPriorityHtml(task.priority)"></span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { PRIORITY_OPTIONS } from "@/constants/priorities";
import { STATE_OPTIONS, STATE_VALUES } from "@/constants/states";
import type { Task } from "@/types";

const props = defineProps<{
    task: Task;
}>();

const emit = defineEmits<{
    editTask: [task: Task];
}>();

const getPriorityHtml = (priority: string) => {
    const option = PRIORITY_OPTIONS.find((opt) => opt.value.toLowerCase() === priority.toLowerCase());
    return option ? option.html : priority;
};

const getStateHtml = (state: string | undefined) => {
    if (!state) return "To Do"; // Default fallback
    const option = STATE_OPTIONS.find((opt) => opt.value.toLowerCase() === state.toLowerCase());
    return option ? option.html : state;
};

const onEditTask = (task: Task) => {
    emit("editTask", task);
};
</script>

<style scoped lang="scss">
@import "@/styles/dashboard-columns.scss";

.task-card {
    color: $text;
    display: flex;
    align-items: center;
    padding: 3px 8px;
    height: 36px;
    border: 1px solid rgba($gray, 0.3);
    border-radius: 8px;
    background: rgba($bg-secondary, 0.2);
    transition: box-shadow 0.2s;
    width: 100%;
    box-sizing: border-box;
    position: relative;
    cursor: pointer;

    &:hover {
        background: rgba($bg-secondary, 0.3);
        border: 1px solid rgba($gray, 0.5);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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

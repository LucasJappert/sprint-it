<template>
    <div
        class="item-card"
        :class="[
            dragItem === item ? 'dragging' : '',
            showBorder && borderPosition === 'above' ? 'show-border-top' : '',
            showBorder && borderPosition === 'below' ? 'show-border-bottom' : '',
        ]"
        @dragenter.prevent="emit('dragenter', item)"
        @dragover.prevent="onDragOver"
        @dragleave="emit('dragleave', item)"
        @drop.prevent.stop="emit('drop', item)"
    >
        <div class="item-col cols-2 text-left">
            <span class="drag-handle" :draggable="true" @dragstart.stop="onDragStart" @dragend="onDragEnd">
                <v-icon size="16">mdi-drag</v-icon>
            </span>

            <v-btn icon size="x-small" @click="showTasks = !showTasks" @mousedown.stop>
                <v-icon size="16">{{ showTasks ? "mdi-chevron-up" : "mdi-chevron-down" }}</v-icon>
            </v-btn>
            <v-btn icon size="x-small" @click="showAddTaskDialog = true" @mousedown.stop>
                <v-icon size="16">mdi-plus</v-icon>
            </v-btn>
            <v-btn icon size="x-small" @click="showEditItemDialog = true" @mousedown.stop>
                <v-icon size="16">mdi-pencil</v-icon>
            </v-btn>
        </div>

        <div class="item-col cols-order">
            {{ item.order }}
        </div>
        <div class="item-col cols-3 text-left">
            <strong>{{ item.title }}</strong>
        </div>
        <div class="item-col cols-2">
            {{ assignedUserName }}
        </div>
        <div class="item-col cols-2">{{ item.estimatedEffort }}</div>
        <div class="item-col cols-2">{{ item.actualEffort }}</div>
    </div>

    <v-card-text v-if="showTasks" class="ml-4">
        <div v-for="task in item.tasks" :key="task.id">
            <v-card variant="outlined" class="mb-2 d-flex align-center pa-2">
                <div class="item-col cols-3">
                    {{ task.title }}
                </div>
                <div class="item-col cols-2">
                    {{ task.priority }}
                </div>
                <div class="item-col cols-2">{{ task.estimatedEffort }}</div>
                <div class="item-col cols-2">{{ task.actualEffort }}</div>
                <div class="item-col cols-1">
                    <MyButton @click="onEditTask(task)">
                        <v-icon size="16">mdi-pencil</v-icon>
                    </MyButton>
                </div>
            </v-card>
        </div>
    </v-card-text>

    <AddTaskDialog :visible="showAddTaskDialog" :item="item" @close="showAddTaskDialog = false" @save="onAddTask" />
    <EditItemDialog :visible="showEditItemDialog" :item="item" @close="showEditItemDialog = false" @save="onSaveEditItem" />
    <EditTaskDialog :visible="showEditTaskDialog" :task="editingTask" @close="showEditTaskDialog = false" @save="onSaveEditTask" />
</template>

<script setup lang="ts">
import { saveSprint } from "@/services/firestore";
import { useAuthStore } from "@/stores/auth";
import { useSprintStore } from "@/stores/sprint";
import type { Item, Task } from "@/types";
import { computed, ref } from "vue";
import AddTaskDialog from "./AddTaskDialog.vue";
import EditItemDialog from "./EditItemDialog.vue";
import EditTaskDialog from "./EditTaskDialog.vue";

const props = defineProps<{
    item: Item;
    dragItem: Item | null;
    showBorder: boolean;
    borderPosition?: "above" | "below" | null;
}>();

const emit = defineEmits<{
    dragstart: [item: Item];
    dragenter: [item: Item];
    dragover: [{ item: Item; position: "above" | "below" }];
    dragleave: [item: Item];
    drop: [item: Item];
}>();

const sprintStore = useSprintStore();
const authStore = useAuthStore();
const showTasks = ref(false);

const assignedUserName = computed(() => {
    if (props.item.assignedUser === authStore.user?.id) {
        return `${authStore.user.name} ${authStore.user.lastName}`;
    }
    return props.item.assignedUser;
});

const showAddTaskDialog = ref(false);
const showEditItemDialog = ref(false);
const showEditTaskDialog = ref(false);
const editingTask = ref<Task | null>(null);

const onAddTask = (task: Task) => {
    props.item.tasks.push(task);
    if (sprintStore.currentSprint) saveSprint(sprintStore.currentSprint);
    showAddTaskDialog.value = false;
};

const onTaskReorder = (evt: any) => {
    if (evt.moved) {
        sprintStore.reorderTasks(props.item.id, evt.moved.oldIndex, evt.moved.newIndex);
    }
};

const onTaskMove = (_evt: any, _originalEvent: any) => {
    // Move between items (future)
};

const onSaveEditItem = (data: { title: string; detail: string; priority: string; estimatedEffort: number; actualEffort: number }) => {
    props.item.title = data.title;
    props.item.detail = data.detail;
    props.item.priority = data.priority as "low" | "medium" | "high";
    props.item.estimatedEffort = data.estimatedEffort;
    props.item.actualEffort = data.actualEffort;
    if (sprintStore.currentSprint) saveSprint(sprintStore.currentSprint);
    showEditItemDialog.value = false;
};

const onEditTask = (task: Task) => {
    editingTask.value = task;
    showEditTaskDialog.value = true;
};

const onSaveEditTask = (data: { title: string; detail: string; priority: string; estimatedEffort: number; actualEffort: number }) => {
    if (editingTask.value) {
        editingTask.value.title = data.title;
        editingTask.value.detail = data.detail;
        editingTask.value.priority = data.priority as "low" | "medium" | "high";
        editingTask.value.estimatedEffort = data.estimatedEffort;
        editingTask.value.actualEffort = data.actualEffort;
        if (sprintStore.currentSprint) saveSprint(sprintStore.currentSprint);
    }
    showEditTaskDialog.value = false;
    editingTask.value = null;
};

const onDragStart = (e: DragEvent) => {
    const card = (e.currentTarget as HTMLElement)?.closest(".item-card");
    console.log("[ItemCard] dragstart", { itemId: props.item.id });

    // dataTransfer: necesario para Firefox/otros
    try {
        e.dataTransfer?.setData("text/plain", String(props.item.id));
        if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    } catch (err) {
        console.warn("[ItemCard] dataTransfer set failed", err);
    }

    // Ghost image
    if (e.dataTransfer && card) {
        const ghost = card.cloneNode(true) as HTMLElement;
        ghost.style.position = "absolute";
        ghost.style.top = "-9999px";
        ghost.style.transform = "scale(0.92)";
        ghost.style.opacity = "0.9";
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 12, 12);
        // limpiar en microtask
        setTimeout(() => {
            try {
                document.body.removeChild(ghost);
            } catch {}
        }, 0);
    }

    emit("dragstart", props.item);
};

const onDragEnd = (e: DragEvent) => {
    console.log("[ItemCard] dragend", { itemId: props.item.id, canceled: e.dataTransfer?.dropEffect === "none" });
};

// decide "above" | "below" según mitad vertical de la card
const onDragOver = (e: DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const middle = rect.top + rect.height / 2;
    const position: "above" | "below" = e.clientY < middle ? "above" : "below";

    emit("dragover", { item: props.item, position });

    console.log("[ItemCard] dragover", {
        overId: props.item.id,
        clientY: e.clientY,
        middle,
        position,
    });
};
</script>

<style scoped lang="scss">
.item-card {
    display: flex;
    align-items: center;
    padding: 4px;
    margin-bottom: 4px;
    border: 1px solid $primary;
    border-radius: 8px;
    background: $bg-primary;
    cursor: pointer;
    user-select: none;
    transition: box-shadow 0.2s;
    width: 100%;
    box-sizing: border-box;
    position: relative;
}

.item-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.item-card.dragging {
    cursor: grabbing;
    opacity: 0.9;
}

.item-card.show-border-top {
    box-shadow: inset 0 3px 0 0 lightblue;
}
.item-card.show-border-bottom {
    box-shadow: inset 0 -3px 0 0 lightblue;
}

.drag-handle {
    cursor: grab;
    margin-right: 4px;

    * {
        pointer-events: none;
    }
}
.drag-handle:active {
    cursor: grabbing;
}

.item-col {
    padding: 0 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cols-order {
    flex: 0 0 90px;
    max-width: 90px;
    text-align: left;
}

.cols-2 {
    flex: 0 0 16.666%;
    max-width: 16.666%;
}

.cols-3 {
    flex: 1;
}
</style>

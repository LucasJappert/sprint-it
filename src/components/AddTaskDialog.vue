<template>
    <MyDialog :visible="visible" @close="handleClose">
        <div class="header">
            <h2>Agregar Tarea</h2>
        </div>
        <div class="body-scroll">
            <MyInput v-model="title" label="Título" @keydown.enter="handleSave" autofocus />
            <MyInput v-model="detail" label="Detalle" />
            <MySelect
                v-model="priority"
                label="Prioridad"
                :options="[
                    { id: 'low', text: 'Baja', name: 'Baja', checked: false },
                    { id: 'medium', text: 'Media', name: 'Media', checked: false },
                    { id: 'high', text: 'Alta', name: 'Alta', checked: false },
                ]"
            />
            <MyInput v-model.number="estimatedEffort" label="Esfuerzo Estimado" type="number" />
            <MyInput v-model.number="actualEffort" label="Esfuerzo Real" type="number" />
        </div>
        <div class="footer">
            <MyButton @click="handleClose">Cancelar</MyButton>
            <MyButton @click="handleSave" color="primary" :disabled="!title.trim()">Agregar</MyButton>
        </div>
    </MyDialog>
</template>

<script setup lang="ts">
import MyButton from "@/components/global/MyButton.vue";
import MyDialog from "@/components/global/MyDialog.vue";
import MyInput from "@/components/global/MyInput.vue";
import MySelect from "@/components/global/MySelect.vue";
import type { Item, Task } from "@/types";
import { ref } from "vue";

const props = defineProps<{
    visible: boolean;
    item: Item;
}>();

const emit = defineEmits<{
    close: [];
    save: [task: Task];
}>();

const title = ref("");
const detail = ref("");
const priority = ref("medium");
const estimatedEffort = ref("0");
const actualEffort = ref("0");

const resetForm = () => {
    title.value = "";
    detail.value = "";
    priority.value = "medium";
    estimatedEffort.value = "0";
    actualEffort.value = "0";
};

const handleSave = () => {
    if (title.value.trim()) {
        const task: Task = {
            id: `task-${Date.now()}`,
            title: title.value.trim(),
            detail: detail.value.trim(),
            priority: priority.value as "low" | "medium" | "high",
            estimatedEffort: parseInt(estimatedEffort.value) || 0,
            actualEffort: parseInt(actualEffort.value) || 0,
            assignedUser: props.item.assignedUser,
        };
        emit("save", task);
        resetForm();
    }
};

const handleClose = () => {
    emit("close");
    resetForm();
};
</script>

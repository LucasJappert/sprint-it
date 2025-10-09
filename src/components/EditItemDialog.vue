<template>
    <MyDialog :visible="visible" @close="handleClose">
        <div class="header">
            <h2>Editar Item</h2>
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
            <MyButton v-if="hasChanges" @click="handleSave" color="primary">Guardar Cambios</MyButton>
        </div>
    </MyDialog>
</template>

<script setup lang="ts">
import MyButton from "@/components/global/MyButton.vue";
import MyDialog from "@/components/global/MyDialog.vue";
import MyInput from "@/components/global/MyInput.vue";
import MySelect from "@/components/global/MySelect.vue";
import type { Item } from "@/types";
import { computed, ref, watch } from "vue";

const props = defineProps<{
    visible: boolean;
    item: Item;
}>();

const emit = defineEmits<{
    close: [];
    save: [data: { title: string; detail: string; priority: string; estimatedEffort: number; actualEffort: number }];
}>();

const title = ref("");
const detail = ref("");
const priority = ref("medium");
const estimatedEffort = ref("0");
const actualEffort = ref("0");

const hasChanges = computed(() => {
    return (
        title.value !== props.item.title ||
        detail.value !== props.item.detail ||
        priority.value !== props.item.priority ||
        estimatedEffort.value !== props.item.estimatedEffort.toString() ||
        actualEffort.value !== props.item.actualEffort.toString()
    );
});

watch(
    () => props.visible,
    (visible) => {
        if (visible) {
            title.value = props.item.title;
            detail.value = props.item.detail;
            priority.value = props.item.priority;
            estimatedEffort.value = props.item.estimatedEffort.toString();
            actualEffort.value = props.item.actualEffort.toString();
        }
    },
);

const handleSave = () => {
    emit("save", {
        title: title.value,
        detail: detail.value,
        priority: priority.value,
        estimatedEffort: parseInt(estimatedEffort.value) || 0,
        actualEffort: parseInt(actualEffort.value) || 0,
    });
};

const handleClose = () => {
    emit("close");
};
</script>

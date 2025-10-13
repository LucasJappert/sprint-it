<template>
    <MyDialog :visible="visible" :min-width="800" @close="$emit('close')">
        <div class="header">
            <h2>Nuevo Item</h2>
        </div>
        <div class="body-scroll">
            <!-- Título ocupando 100% del ancho -->
            <div class="full-width">
                <MyInput v-model="newItem.title" label="Título" @keydown.enter="handleSave" autofocus />
            </div>

            <!-- Campos en una sola fila: persona asignada, prioridad, esfuerzos -->
            <div class="form-row mt-3">
                <div class="field-group assigned-user">
                    <MyInput v-model="newItem.assignedUser" label="Persona Asignada" />
                </div>
                <div class="field-group priority">
                    <MySelect
                        v-model="newItem.priority"
                        label="Prioridad"
                        :options="[
                            { name: 'Baja', checked: false, value: 'low' },
                            { name: 'Media', checked: false, value: 'medium' },
                            { name: 'Alta', checked: false, value: 'high' },
                        ]"
                    />
                </div>
                <div class="field-group estimated-effort">
                    <MyInput v-model.number="newItem.estimatedEffort" label="Esfuerzo" type="number" />
                </div>
                <div class="field-group actual-effort">
                    <MyInput v-model.number="newItem.actualEffort" label="Esf. Real" type="number" />
                </div>
            </div>

            <!-- Detalle en textarea ocupando 100% del ancho -->
            <div class="full-width mt-3">
                <MyTextarea v-model="newItem.detail" label="Detalle" :rows="8" no-resize class="detail-textarea" />
            </div>
        </div>
        <div class="footer">
            <MyButton btn-class="px-2" secondary @click="$emit('close')">Cancelar</MyButton>
            <MyButton btn-class="px-2" @click="handleSave" :disabled="!newItem.title.trim()">Crear Item</MyButton>
        </div>
    </MyDialog>
</template>

<script setup lang="ts">
import MyButton from "@/components/global/MyButton.vue";
import MyDialog from "@/components/global/MyDialog.vue";
import MyInput from "@/components/global/MyInput.vue";
import MySelect from "@/components/global/MySelect.vue";
import MyTextarea from "@/components/global/MyTextarea.vue";
import type { Item } from "@/types";
import { ref } from "vue";

interface Props {
    visible: boolean;
    nextOrder: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    close: [];
    "add-item": [item: Item];
}>();

const newItem = ref({
    title: "",
    detail: "",
    priority: "medium",
    estimatedEffort: "0",
    actualEffort: "0",
    assignedUser: "",
});

const resetForm = () => {
    newItem.value = {
        title: "",
        detail: "",
        priority: "medium",
        estimatedEffort: "0",
        actualEffort: "0",
        assignedUser: "",
    };
};

const handleSave = () => {
    if (newItem.value.title.trim()) {
        const item: Item = {
            id: `item-${Date.now()}`,
            title: newItem.value.title.trim(),
            detail: newItem.value.detail.trim(),
            priority: newItem.value.priority as "low" | "medium" | "high",
            estimatedEffort: parseInt(newItem.value.estimatedEffort) || 0,
            actualEffort: parseInt(newItem.value.actualEffort) || 0,
            assignedUser: newItem.value.assignedUser.trim(),
            tasks: [],
            order: props.nextOrder,
        };
        emit("add-item", item);
        emit("close");
        resetForm();
    }
};
</script>

<style scoped>
.body-scroll {
    padding: 16px;
}

/* Título ocupando 100% del ancho */
.full-width {
    width: 100%;
}

/* Distribución en fila para persona asignada, prioridad y esfuerzos */
.form-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

/* Persona asignada - 35% */
.assigned-user {
    flex: 0 0 35%;
}

/* Prioridad - 35% */
.priority {
    flex: 0 0 30%;
}

/* Esfuerzo estimado - 15% */
.estimated-effort {
    flex: 0 0 15%;
}

/* Esfuerzo real - 15% */
.actual-effort {
    flex: 0 0 15%;
}

/* Textarea para detalle ocupando 100% del ancho */
.detail-textarea {
    width: 100%;
}

.detail-textarea :deep(.v-field) {
    border-radius: 20px !important;
    box-shadow: none !important;
    overflow: visible !important;
}

.detail-textarea :deep(.v-field__input) {
    min-height: 380px !important;
    overflow-y: auto !important;
    padding: 20px 24px !important;
    margin-top: 8px !important;
}

.detail-textarea :deep(textarea) {
    min-height: 380px !important;
    overflow-y: auto !important;
    padding: 0 !important;
    line-height: 1.6 !important;
    margin-top: 4px !important;
}

/* Responsive */
@media (max-width: 768px) {
    .form-row {
        flex-direction: column;
        gap: 16px;
    }

    .field-group {
        flex: 1;
    }

    .assigned-user,
    .priority,
    .estimated-effort,
    .actual-effort {
        flex: 1;
    }
}
</style>

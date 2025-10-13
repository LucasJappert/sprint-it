<template>
    <MyDialog :visible="visible" :min-width="800" @close="$emit('close')">
        <div class="header">
            <h3 class="text-left">{{ isEditing ? "Editar Item" : "Nuevo Item" }}</h3>
        </div>
        <div class="body-scroll">
            <!-- Título ocupando 100% del ancho -->
            <div class="full-width">
                <MyInput v-model="newItem.title" label="Título" @keydown.enter="handleSave" autofocus />
            </div>

            <!-- Campos en una sola fila: persona asignada, prioridad, esfuerzos -->
            <div class="form-row mt-3">
                <div class="field-group assigned-user">
                    <MySelect v-model="newItem.assignedUser" label="Persona Asignada" :options="assignedUserOptions" placeholder="Seleccionar usuario..." />
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
            <MyButton btn-class="px-2" @click="handleSave" :disabled="!newItem.title.trim()">{{ isEditing ? "Guardar Cambios" : "Crear Item" }}</MyButton>
        </div>
    </MyDialog>
</template>

<script setup lang="ts">
import MyButton from "@/components/global/MyButton.vue";
import MyDialog from "@/components/global/MyDialog.vue";
import MyInput from "@/components/global/MyInput.vue";
import MySelect from "@/components/global/MySelect.vue";
import MyTextarea from "@/components/global/MyTextarea.vue";
import { SPRINT_TEAM_MEMBERS } from "@/constants/users";
import { getUserByUsername } from "@/services/firestore";
import { useAuthStore } from "@/stores/auth";
import type { Item } from "@/types";
import { computed, ref, watch } from "vue";

interface Props {
    visible: boolean;
    nextOrder: number;
    existingItem?: Item | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    close: [];
    save: [item: Item];
}>();

const authStore = useAuthStore();

const isEditing = computed(() => !!props.existingItem);

const assignedUserOptions = computed(() => {
    return SPRINT_TEAM_MEMBERS.map((username) => ({
        id: username,
        text: username,
        name: username,
        checked: false,
    }));
});

const newItem = ref({
    title: "",
    detail: "",
    priority: "medium",
    estimatedEffort: "0",
    actualEffort: "0",
    assignedUser: "",
});

const resetForm = () => {
    if (props.existingItem) {
        newItem.value = {
            title: props.existingItem.title,
            detail: props.existingItem.detail,
            priority: props.existingItem.priority,
            estimatedEffort: props.existingItem.estimatedEffort.toString(),
            actualEffort: props.existingItem.actualEffort.toString(),
            assignedUser: props.existingItem.assignedUser || "",
        };
    } else {
        newItem.value = {
            title: "",
            detail: "",
            priority: "medium",
            estimatedEffort: "0",
            actualEffort: "0",
            assignedUser: "",
        };
    }
};

// Watch para resetear el form cuando cambia existingItem
watch(
    () => props.existingItem,
    () => {
        resetForm();
    },
    { immediate: true },
);

const handleSave = async () => {
    if (newItem.value.title.trim()) {
        let assignedUserId = null;

        // Si hay un usuario asignado, obtener su ID desde Firestore
        if (newItem.value.assignedUser.trim()) {
            const user = await getUserByUsername(newItem.value.assignedUser.trim());
            if (user) {
                assignedUserId = user.id;
            } else {
                console.error(`Usuario ${newItem.value.assignedUser} no encontrado en la base de datos`);
                return; // No guardar si el usuario no existe
            }
        }

        const item: Item = {
            id: props.existingItem?.id || `item-${Date.now()}`,
            title: newItem.value.title.trim(),
            detail: newItem.value.detail.trim(),
            priority: newItem.value.priority as "low" | "medium" | "high",
            estimatedEffort: parseInt(newItem.value.estimatedEffort) || 0,
            actualEffort: parseInt(newItem.value.actualEffort) || 0,
            assignedUser: assignedUserId,
            tasks: props.existingItem?.tasks || [],
            order: props.existingItem?.order || props.nextOrder,
        };
        emit("save", item);
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

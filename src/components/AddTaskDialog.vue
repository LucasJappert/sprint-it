<template>
    <MyDialog :visible="visible" :min-width="800" @close="handleClose">
        <div class="header">
            <h3 class="text-left">Nueva Tarea</h3>
        </div>
        <div class="body-scroll">
            <!-- Título ocupando 100% del ancho -->
            <div class="full-width">
                <MyInput v-model="title" label="Título" @keydown.enter="handleSave" autofocus />
            </div>

            <!-- Campos en una sola fila: persona asignada, prioridad, esfuerzos -->
            <div class="form-row mt-3">
                <div class="field-group assigned-user">
                    <MySelect
                        v-model="assignedUser"
                        label="Persona Asignada"
                        :options="assignedUserOptions"
                        placeholder="Seleccionar usuario..."
                        @update:options="onAssignedUserChange"
                    />
                </div>
                <div class="field-group priority">
                    <MySelect v-model="priority" label="Prioridad" :options="priorityOptions" @update:options="onPriorityChange" />
                </div>
                <div class="field-group estimated-effort">
                    <MyInput v-model="estimatedEffort" label="Esfuerzo" type="number" />
                </div>
                <div class="field-group actual-effort">
                    <MyInput v-model="actualEffort" label="Esf. Real" type="number" />
                </div>
            </div>

            <!-- Detalle en textarea ocupando 100% del ancho -->
            <div class="full-width mt-3">
                <MyTextarea v-model="detail" label="Detalle" :rows="8" no-resize class="detail-textarea" />
            </div>
        </div>
        <div class="footer">
            <MyButton btn-class="px-2" secondary @click="handleClose">Cancelar</MyButton>
            <MyButton btn-class="px-2" @click="handleSave" :disabled="!title.trim()">Agregar Tarea</MyButton>
        </div>
    </MyDialog>
</template>

<script setup lang="ts">
import MyButton from "@/components/global/MyButton.vue";
import MyDialog from "@/components/global/MyDialog.vue";
import MyInput from "@/components/global/MyInput.vue";
import MySelect from "@/components/global/MySelect.vue";
import MyTextarea from "@/components/global/MyTextarea.vue";
import { PRIORITY_OPTIONS, PRIORITY_VALUES } from "@/constants/priorities";
import { SPRINT_TEAM_MEMBERS } from "@/constants/users";
import { getUserByUsername } from "@/services/firestore";
import type { Item, Task } from "@/types";
import { onMounted, ref } from "vue";

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
const priority = ref(PRIORITY_VALUES.NORMAL);
const estimatedEffort = ref("");
const actualEffort = ref("");
const assignedUser = ref("");

const assignedUserOptions = ref<{ id: string; text: string; name: string; checked: boolean }[]>([]);

const priorityOptions = ref(
    PRIORITY_OPTIONS.map((option: any) => ({
        ...option,
        checked: false,
    })),
);

const loadAssignedUserOptions = async () => {
    const options = [];
    for (const username of SPRINT_TEAM_MEMBERS) {
        const user = await getUserByUsername(username);
        if (user) {
            options.push({
                id: username,
                text: `${(user as any).name} ${(user as any).lastName}`,
                name: `${(user as any).name} ${(user as any).lastName}`,
                checked: false,
            });
        }
    }
    assignedUserOptions.value = options;
};

onMounted(() => {
    loadAssignedUserOptions();
});

const resetForm = () => {
    title.value = "";
    detail.value = "";
    priority.value = PRIORITY_VALUES.NORMAL;
    estimatedEffort.value = "";
    actualEffort.value = "";
    assignedUser.value = "";

    // Limpiar selección
    assignedUserOptions.value.forEach((option) => {
        option.checked = false;
    });

    // Seleccionar prioridad por defecto (NORMAL)
    priorityOptions.value.forEach((option) => {
        option.checked = option.value === PRIORITY_VALUES.NORMAL;
    });
};

const onAssignedUserChange = (options: any[]) => {
    // Encontrar la opción seleccionada
    const selectedOption = options.find((option: any) => option.checked);
    if (selectedOption) {
        assignedUser.value = selectedOption.id;
    } else {
        assignedUser.value = "";
    }
};

const onPriorityChange = (options: any[]) => {
    // Encontrar la opción seleccionada
    const selectedOption = options.find((option: any) => option.checked);
    if (selectedOption) {
        priority.value = selectedOption.value;
    } else {
        priority.value = PRIORITY_VALUES.NORMAL;
    }
};

const handleSave = async () => {
    if (title.value.trim()) {
        let assignedUserId = null;

        // Si hay un usuario asignado, obtener su ID desde Firestore
        if (assignedUser.value.trim()) {
            const user = await getUserByUsername(assignedUser.value.trim());
            if (user) {
                assignedUserId = user.id;
            } else {
                console.error(`Usuario ${assignedUser.value} no encontrado en la base de datos`);
                return; // No guardar si el usuario no existe
            }
        }

        const task: Task = {
            id: `task-${Date.now()}`,
            title: title.value.trim(),
            detail: detail.value.trim(),
            priority: priority.value,
            estimatedEffort: parseInt(estimatedEffort.value) || 0,
            actualEffort: parseInt(actualEffort.value) || 0,
            assignedUser: assignedUserId,
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

/* Prioridad - 30% */
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

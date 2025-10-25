<template>
    <MyDialog :visible="visible" :min-width="800" @close="handleClose" persistent>
        <div class="header flex-center justify-space-between">
            <h3 class="text-left">
                <v-icon class="yellow mr-1" size="30">mdi-clipboard-check-outline</v-icon>
                {{ isEditing ? "Edit Task" : "New Task" }}
            </h3>
            <v-icon class="close-btn" @click="$emit('close')" :size="24">mdi-close</v-icon>
        </div>
        <div class="body-scroll">
            <!-- Título ocupando 100% del ancho -->
            <div class="full-width">
                <MyInput ref="titleInputRef" v-model="title" label="Title" density="compact" @keydown.enter="handleSave" />
            </div>

            <!-- Campos en una sola fila: persona asignada, estado, esfuerzos, prioridad -->
            <div class="form-row mt-3">
                <div class="field-group assigned-user">
                    <MySelect
                        v-model="assignedUser"
                        label="Assigned Person"
                        :options="assignedUserOptions"
                        placeholder="Select user..."
                        density="compact"
                        @update:options="onAssignedUserChange"
                    />
                </div>
                <div class="field-group state">
                    <MySelect v-model="state" label="State" :options="stateOptions" density="compact" @update:options="onStateChange" />
                </div>
                <div class="field-group estimated-effort">
                    <MyInput v-model="estimatedEffort" label="Effort" type="number" density="compact" />
                </div>
                <div class="field-group actual-effort">
                    <MyInput v-model="actualEffort" label="Real Effort" type="number" density="compact" />
                </div>
                <div class="field-group priority">
                    <MySelect v-model="priority" label="Priority" :options="priorityOptions" density="compact" @update:options="onPriorityChange" />
                </div>
            </div>

            <!-- Detalle en textarea ocupando 100% del ancho -->
            <div class="full-width mt-3">
                <MyRichText v-model="detail" placeholder="Description" density="compact" class="detail-textarea" />
            </div>

            <!-- Comments section -->
            <CommentSection v-if="existingTask" :associated-id="props.existingTask?.id || ''" associated-type="task" @comment-added="handleCommentAdded" />
        </div>
        <div class="footer">
            <MyButton btn-class="px-2" secondary @click="handleClose">Cancel</MyButton>
            <MyButton btn-class="px-2" @click="handleSave" :disabled="!canSave">{{ isEditing ? "Save Changes" : "Add Task" }}</MyButton>
        </div>
    </MyDialog>
</template>

<script setup lang="ts">
import { PRIORITY_OPTIONS, PRIORITY_VALUES } from "@/constants/priorities";
import { STATE_OPTIONS, STATE_VALUES } from "@/constants/states";
import { SPRINT_TEAM_MEMBERS } from "@/constants/users";
import { getUserByUsername, getUsernameById } from "@/services/firestore";
import { useAuthStore } from "@/stores/auth";
import type { Comment, Item, Task } from "@/types";
import { computed, onMounted, ref, watch } from "vue";

const props = defineProps<{
    visible: boolean;
    item: Item;
    existingTask?: Task | null;
}>();

const emit = defineEmits<{
    close: [];
    save: [task: Task];
}>();

const isEditing = computed(() => !!props.existingTask);

const canSave = computed(() => {
    if (!isEditing.value) {
        // Para nuevas tasks: habilitar si hay título
        return title.value.trim() !== "";
    }
    // Para editar: habilitar si hay cambios Y hay título
    return hasChanges.value && title.value.trim() !== "";
});

const hasChanges = computed(() => {
    if (!props.existingTask) return title.value.trim() !== ""; // Para nuevas tasks, habilitar si hay título

    const changes =
        title.value !== props.existingTask.title ||
        detail.value !== props.existingTask.detail ||
        priority.value !== props.existingTask.priority ||
        state.value !== (props.existingTask.state || STATE_VALUES.TODO) ||
        parseInt(estimatedEffort.value) !== props.existingTask.estimatedEffort ||
        parseInt(actualEffort.value) !== props.existingTask.actualEffort ||
        assignedUser.value !== originalAssignedUser.value;

    return changes;
});

const originalAssignedUser = ref("");
const titleInputRef = ref();

const title = ref("");
const detail = ref("");
const priority = ref(PRIORITY_VALUES.NORMAL);
const state = ref(STATE_VALUES.TODO);
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

const stateOptions = ref(
    STATE_OPTIONS.map((option: any) => ({
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
                text: (user as any).name,
                name: (user as any).name,
                checked: false,
            });
        }
    }
    assignedUserOptions.value = options;
};

onMounted(() => {
    loadAssignedUserOptions();
});

const getAssignedUserValue = async (task: Task): Promise<string> => {
    if (!task.assignedUser) return "";

    try {
        const username = await getUsernameById(task.assignedUser);
        if (username && SPRINT_TEAM_MEMBERS.includes(username as any)) {
            return username;
        }
    } catch (error) {
        console.warn(`Error al obtener username para ID ${task.assignedUser}:`, error);
    }

    return "";
};

const setFormValuesFromTask = (task: Task, assignedUserValue: string) => {
    title.value = task.title;
    detail.value = task.detail;
    priority.value = task.priority as any;
    state.value = (task.state || STATE_VALUES.TODO) as any;
    estimatedEffort.value = task.estimatedEffort.toString();
    actualEffort.value = task.actualEffort.toString();
    assignedUser.value = assignedUserValue;
};

const selectAssignedUserOption = (assignedUserValue: string) => {
    if (!assignedUserValue || assignedUserOptions.value.length === 0) return;

    assignedUserOptions.value.forEach((option) => {
        option.checked = option.id === assignedUserValue;
    });
};

const selectPriorityOption = (task: Task) => {
    priorityOptions.value.forEach((option) => {
        option.checked = option.value.toLowerCase() === task.priority.toLowerCase();
    });
};

const selectStateOption = (task: Task) => {
    stateOptions.value.forEach((option) => {
        option.checked = option.value.toLowerCase() === (task.state || STATE_VALUES.TODO).toLowerCase();
    });
};

const resetFormForEditing = async (task: Task) => {
    const assignedUserValue = await getAssignedUserValue(task);
    setFormValuesFromTask(task, assignedUserValue);

    // Esperar a que las opciones estén cargadas si no lo están
    if (assignedUserOptions.value.length === 0) {
        await loadAssignedUserOptions();
    }

    selectAssignedUserOption(assignedUserValue);
    selectPriorityOption(task);
    selectStateOption(task);
};

const resetFormForNew = () => {
    title.value = "";
    detail.value = "";
    priority.value = PRIORITY_VALUES.NORMAL;
    state.value = STATE_VALUES.TODO;
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

    // Seleccionar estado por defecto (TODO)
    stateOptions.value.forEach((option) => {
        option.checked = option.value === STATE_VALUES.TODO;
    });
};

const resetForm = async () => {
    if (!props.existingTask) return resetFormForNew();
    await resetFormForEditing(props.existingTask);
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

const onStateChange = (options: any[]) => {
    // Encontrar la opción seleccionada
    const selectedOption = options.find((option: any) => option.checked);
    if (selectedOption) {
        state.value = selectedOption.value;
    } else {
        state.value = STATE_VALUES.TODO;
    }
};

const authStore = useAuthStore();

const handleCommentAdded = (comment: Comment) => {
    // El comentario ya se guardó en Firestore, no necesitamos actualizar el task local
    // ya que los comentarios ahora se manejan independientemente
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
            id: props.existingTask?.id || `task-${Date.now()}`,
            title: title.value.trim(),
            detail: detail.value.trim(),
            priority: priority.value as any,
            state: state.value as any,
            estimatedEffort: parseInt(estimatedEffort.value) || 0,
            actualEffort: parseInt(actualEffort.value) || 0,
            assignedUser: assignedUserId,
            order: props.existingTask?.order || 0,
        };
        emit("save", task);
        resetForm();
    }
};

const handleClose = () => {
    emit("close");
    resetForm();
};

// Llamar resetForm cuando se abre el diálogo o cambia existingTask
watch(
    () => props.visible,
    async (visible) => {
        if (visible) {
            await resetForm();
            // Usar setTimeout para asegurar que el componente esté completamente renderizado
            // especialmente cuando se abre desde menú contextual
            setTimeout(() => {
                titleInputRef.value?.focus();
            }, 10);
        }
    },
);

watch(
    () => props.existingTask,
    async (newTask, oldTask) => {
        if (props.visible) {
            await resetForm();
        }
    },
    { immediate: true },
);
</script>

<style scoped lang="scss">
/* Título ocupando 100% del ancho */
.full-width {
    width: 100%;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

/* Distribución en fila para persona asignada, prioridad y esfuerzos */
.form-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

/* Persona asignada - 25% */
.assigned-user {
    flex: 0 0 25%;
}

/* Estado - 20% */
.state {
    flex: 0 0 20%;
}

/* Esfuerzo estimado - 15% */
.estimated-effort {
    flex: 0 0 15%;
}

/* Esfuerzo real - 15% */
.actual-effort {
    flex: 0 0 15%;
}

/* Prioridad - 20% */
.priority {
    flex: 0 0 20%;
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
    .state,
    .priority,
    .estimated-effort,
    .actual-effort {
        flex: 1;
    }
}
</style>

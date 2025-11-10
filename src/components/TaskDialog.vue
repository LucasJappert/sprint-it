<template>
    <MyDialog :visible="visible" :min-width="0" @close="handleClose" persistent>
        <div class="header flex-center justify-space-between">
            <div class="flex-center">
                <h3 class="text-left flex-center justify-start">
                    <v-icon class="yellow mr-1" size="30">mdi-clipboard-check-outline</v-icon>
                    {{ isEditing ? "Edit Task" : "New Task" }}
                </h3>
                <v-btn-toggle v-if="isEditing" v-model="viewMode" mandatory class="ml-4 view-mode-toggle">
                    <v-btn value="details" size="small">
                        <v-icon size="16" class="mr-1">mdi-file-document-outline</v-icon>
                        <span class="btn-text">Details</span>
                    </v-btn>
                    <v-btn value="history" size="small">
                        <v-icon size="16" class="mr-1">mdi-history</v-icon>
                        <span class="btn-text">History</span>
                    </v-btn>
                </v-btn-toggle>
            </div>
            <v-icon class="close-btn" @click="$emit('close')" :size="24">mdi-close</v-icon>
        </div>
        <div class="body-scroll">
            <template v-if="viewMode === 'details'">
                <!-- Título ocupando 100% del ancho -->
                <div class="full-width">
                    <MyInput ref="titleInputRef" v-model="title" label="Title" density="compact" @keydown.enter="handleSave" />
                </div>

                <!-- Campos organizados en filas lógicas -->
                <div class="form-section mt-3">
                    <div class="assigned-user">
                        <MySelect
                            v-model="assignedUser"
                            label="Assigned Person"
                            :options="assignedUserOptions"
                            placeholder="Select user..."
                            density="compact"
                            @update:options="onAssignedUserChange"
                        />
                    </div>
                    <div class="state">
                        <MySelect v-model="state" label="State" :options="stateOptions" density="compact" @update:options="onStateChange" />
                    </div>
                    <div class="estimated-effort">
                        <MyInput v-model="estimatedEffort" label="Effort" type="number" density="compact" />
                    </div>
                    <div class="actual-effort">
                        <MyInput v-model="actualEffort" label="Real Effort" type="number" density="compact" />
                    </div>
                    <div class="priority">
                        <MySelect v-model="priority" label="Priority" :options="priorityOptions" density="compact" @update:options="onPriorityChange" />
                    </div>
                </div>

                <!-- Detalle en textarea ocupando 100% del ancho -->
                <div class="full-width mt-3">
                    <MyRichText v-model="detail" placeholder="Description" density="compact" class="detail-textarea" />
                </div>

                <!-- Comments section -->
                <CommentSection v-if="existingTask" ref="" :associated-id="props.existingTask?.id || ''" associated-type="task" />
            </template>

            <template v-else-if="viewMode === 'history'">
                <HistoryView :change-history="changeHistory" :createdAt="existingTask?.createdAt" />
            </template>
        </div>
        <div class="footer">
            <MyButton btn-class="px-2" secondary @click="handleClose">Cancel</MyButton>
            <MyButton btn-class="px-2" @click="handleSave" :disabled="!canSave">{{ isEditing ? "Save Changes" : "Add Task" }}</MyButton>
        </div>
    </MyDialog>
</template>

<script setup lang="ts">
import HistoryView from "@/components/HistoryView.vue";
import { useUrlManagement } from "@/composables/useUrlManagement";
import { PRIORITY_OPTIONS, PRIORITY_VALUES } from "@/constants/priorities";
import { STATE_OPTIONS, STATE_VALUES } from "@/constants/states";
import { SPRINT_TEAM_MEMBERS } from "@/constants/users";
import { addChange, getChangesByAssociatedId, getUserByUsername, getUsernameById } from "@/services/firestore";
import { useAuthStore } from "@/stores/auth";
import type { ChangeHistory, Item, Task } from "@/types";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

// Computed para ancho mínimo responsivo
const mobileMinWidth = computed(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
        return 350; // Ancho más pequeño en móviles
    }
    return 800; // Ancho normal en desktop
});

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
        title.value !== originalTitle.value ||
        detail.value !== originalDetail.value ||
        priority.value !== originalPriority.value ||
        state.value !== originalState.value ||
        parseInt(estimatedEffort.value) !== parseInt(originalEstimatedEffort.value) ||
        parseInt(actualEffort.value) !== parseInt(originalActualEffort.value) ||
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

// Guardar el estado original para comparación
const originalTitle = ref("");
const originalDetail = ref("");
const originalPriority = ref(PRIORITY_VALUES.NORMAL);
const originalState = ref(STATE_VALUES.TODO);
const originalEstimatedEffort = ref("");
const originalActualEffort = ref("");

const assignedUserOptions = ref<{ id: string; text: string; name: string; checked: boolean }[]>([]);

const router = useRouter();
const { clearQueryParams } = useUrlManagement(router);
const viewMode = ref<"details" | "history">("details");
const changeHistory = ref<ChangeHistory[]>([]);

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
    document.addEventListener("keydown", handleKeyDown);
    titleInputRef.value?.focus();
});

const handleKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.key === "s") {
        event.preventDefault();
        if (canSave.value) {
            handleSave();
        }
    }
};

onUnmounted(() => {
    document.removeEventListener("keydown", handleKeyDown);
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

    // Guardar valores originales para comparación
    originalTitle.value = task.title;
    originalDetail.value = task.detail;
    originalPriority.value = task.priority as any;
    originalState.value = (task.state || STATE_VALUES.TODO) as any;
    originalEstimatedEffort.value = task.estimatedEffort.toString();
    originalActualEffort.value = task.actualEffort.toString();
    originalAssignedUser.value = assignedUserValue;
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

const loadChangeHistory = async (taskId: string) => {
    try {
        changeHistory.value = await getChangesByAssociatedId(taskId);
    } catch (error) {
        console.error("Error loading change history:", error);
        changeHistory.value = [];
    }
};

const saveChanges = async (oldTask: Task, newTask: Task) => {
    const userId = useAuthStore().user?.id;

    if (!userId) return;

    const changes: Array<Omit<ChangeHistory, "id">> = [];

    // Comparar campos y crear cambios
    if (oldTask.title !== newTask.title) {
        changes.push({
            associatedId: oldTask.id,
            associatedType: "task",
            field: "title",
            oldValue: oldTask.title,
            newValue: newTask.title,
            userId,
            createdAt: new Date(),
        });
    }

    if (oldTask.detail !== newTask.detail) {
        changes.push({
            associatedId: oldTask.id,
            associatedType: "task",
            field: "detail",
            oldValue: oldTask.detail,
            newValue: newTask.detail,
            userId,
            createdAt: new Date(),
        });
    }

    if (oldTask.priority !== newTask.priority) {
        changes.push({
            associatedId: oldTask.id,
            associatedType: "task",
            field: "priority",
            oldValue: oldTask.priority,
            newValue: newTask.priority,
            userId,
            createdAt: new Date(),
        });
    }

    if (oldTask.state !== newTask.state) {
        changes.push({
            associatedId: oldTask.id,
            associatedType: "task",
            field: "state",
            oldValue: oldTask.state,
            newValue: newTask.state,
            userId,
            createdAt: new Date(),
        });
    }

    if (oldTask.estimatedEffort !== newTask.estimatedEffort) {
        changes.push({
            associatedId: oldTask.id,
            associatedType: "task",
            field: "estimatedEffort",
            oldValue: oldTask.estimatedEffort.toString(),
            newValue: newTask.estimatedEffort.toString(),
            userId,
            createdAt: new Date(),
        });
    }

    if (oldTask.actualEffort !== newTask.actualEffort) {
        changes.push({
            associatedId: oldTask.id,
            associatedType: "task",
            field: "actualEffort",
            oldValue: oldTask.actualEffort.toString(),
            newValue: newTask.actualEffort.toString(),
            userId,
            createdAt: new Date(),
        });
    }

    if (oldTask.assignedUser !== newTask.assignedUser) {
        changes.push({
            associatedId: oldTask.id,
            associatedType: "task",
            field: "assignedUser",
            oldValue: oldTask.assignedUser || "",
            newValue: newTask.assignedUser || "",
            userId,
            createdAt: new Date(),
        });
    }

    // Guardar todos los cambios
    for (const change of changes) {
        try {
            await addChange(change);
        } catch (error) {
            console.error("Error saving change:", error);
        }
    }
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

    // Cargar historial de cambios
    await loadChangeHistory(task.id);
};

const resetFormForNew = () => {
    title.value = "";
    detail.value = "";
    priority.value = PRIORITY_VALUES.NORMAL;
    state.value = STATE_VALUES.TODO;
    estimatedEffort.value = "";
    actualEffort.value = "";
    assignedUser.value = "";

    // Limpiar valores originales
    originalTitle.value = "";
    originalDetail.value = "";
    originalPriority.value = PRIORITY_VALUES.NORMAL;
    originalState.value = STATE_VALUES.TODO;
    originalEstimatedEffort.value = "";
    originalActualEffort.value = "";
    originalAssignedUser.value = "";

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
            createdAt: props.existingTask?.createdAt || new Date(),
        };

        // Guardar cambios si es edición
        if (props.existingTask) {
            await saveChanges(props.existingTask, task);
        }

        emit("save", task);
        emit("close");
    }
};

const handleClose = () => {
    emit("close");
    resetForm();
    clearQueryParams();
};

watch(
    () => props.existingTask,
    async (newTask, oldTask) => {
        if (props.visible) {
            console.log("props.visible", props.visible, newTask, oldTask);
            await resetForm();
        }
    },
    { immediate: true },
);
</script>

<style scoped lang="scss">
@import "@/styles/dialog-form.scss";
</style>

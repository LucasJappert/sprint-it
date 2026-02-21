<template>
    <MyDialog :visible="visible" :min-width="0" @close="handleClose" persistent :pulse="hasPendingChanges">
        <div class="header flex-center justify-space-between">
            <div class="flex-center">
                <h3 class="text-left flex-center justify-start">
                    <v-icon class="blue mr-1" size="30">mdi-clipboard-text</v-icon>
                    {{ isEditing ? "Edit Item" : "New Item" }}
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
                <div class="full-width mt-2 title-row">
                    <div class="title-input">
                        <MyInput ref="titleInputRef" v-model="newItem.title" label="Title" density="compact" @keydown.enter="handleSave" />
                    </div>
                    <v-btn icon size="small" class="copy-btn" @click="handleCopyToClipboard" title="Copy title and description">
                        <v-icon size="18">mdi-content-copy</v-icon>
                    </v-btn>
                </div>
                <!-- Campos organizados en filas lógicas -->
                <div class="form-section mt-3">
                    <div class="assigned-user">
                        <MySelect
                            v-model="newItem.assignedUser"
                            label="Assigned Person"
                            :options="assignedUserOptions"
                            placeholder="Select user..."
                            density="compact"
                            @update:options="onAssignedUserChange"
                        />
                    </div>
                    <div class="state">
                        <MySelect v-model="newItem.state" label="State" :options="stateOptions" density="compact" @update:options="onStateChange" />
                    </div>
                    <div class="estimated-effort">
                        <MyInput v-model="newItem.estimatedEffort" label="Effort" type="number" density="compact" />
                    </div>
                    <div class="actual-effort">
                        <MyInput v-model="newItem.actualEffort" label="Real Effort" type="number" density="compact" />
                    </div>
                    <div class="priority">
                        <MySelect v-model="newItem.priority" label="Priority" :options="priorityOptions" density="compact" @update:options="onPriorityChange" />
                    </div>
                </div>

                <!-- Detalle en textarea ocupando 100% del ancho -->
                <div class="full-width mt-3">
                    <MyRichText v-model="newItem.detail" placeholder="Description" density="compact" class="detail-textarea" />
                </div>

                <!-- Comments section -->
                <CommentSection
                    v-if="existingItem"
                    ref="commentSectionRef"
                    :associated-id="props.existingItem?.id || ''"
                    associated-type="item"
                    @writing-comment="onWritingComment"
                    @editing-comment="onEditingComment"
                />
            </template>

            <template v-else-if="viewMode === 'history'">
                <HistoryView :change-history="changeHistory" :createdAt="existingItem?.createdAt" :createdBy="existingItem?.createdBy" />
            </template>
        </div>
        <div class="footer">
            <MyButton btn-class="px-2" secondary @click="$emit('close')">Cancel</MyButton>
            <MyButton btn-class="px-2" @click="handleSave" :disabled="!canSave">{{ isEditing ? "Save Changes" : "Create Item" }}</MyButton>
        </div>
    </MyDialog>
</template>

<script setup lang="ts">
import HistoryView from "@/components/HistoryView.vue";
import { useClipboard } from "@/composables/useClipboard";
import { PRIORITY_OPTIONS, PRIORITY_VALUES, type PriorityValue } from "@/constants/priorities";
import { STATE_OPTIONS, STATE_VALUES, type StateValue } from "@/constants/states";
import { SPRINT_TEAM_MEMBERS } from "@/constants/users";
import { addChange, getChangesByAssociatedId, getUserByUsername, getUsernameById } from "@/services/firestore";
import { useAuthStore } from "@/stores/auth";
import { useLoadingStore } from "@/stores/loading";
import type { ChangeHistory, Item } from "@/types";
import { computed, onMounted, onUnmounted, ref } from "vue";

interface Props {
    visible: boolean;
    nextOrder: number;
    existingItem?: Item | null;
}

interface NewItemForm {
    title: string;
    detail: string;
    priority: PriorityValue;
    state: StateValue;
    estimatedEffort: string;
    actualEffort: string;
    assignedUser: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    close: [];
    save: [item: Item];
}>();

const loadingStore = useLoadingStore();
const authStore = useAuthStore();
const { copyToClipboardAsync } = useClipboard();

const isEditing = computed(() => !!props.existingItem);

const originalAssignedUser = ref("");
const titleInputRef = ref();
const isWritingComment = ref(false);
const isEditingComment = ref(false);

// Guardar el estado original para comparación
const originalTitle = ref("");
const originalDetail = ref("");
const originalPriority = ref(PRIORITY_VALUES.NORMAL as PriorityValue);
const originalState = ref(STATE_VALUES.TODO as StateValue);
const originalEstimatedEffort = ref("");
const originalActualEffort = ref("");

const hasChanges = computed(() => {
    if (!props.existingItem) return newItem.value.title.trim() !== ""; // Para nuevos items, habilitar si hay título

    const changes =
        newItem.value.title !== originalTitle.value ||
        newItem.value.detail !== originalDetail.value ||
        newItem.value.priority !== originalPriority.value ||
        newItem.value.state !== originalState.value ||
        parseInt(newItem.value.estimatedEffort) !== parseInt(originalEstimatedEffort.value) ||
        parseInt(newItem.value.actualEffort) !== parseInt(originalActualEffort.value) ||
        newItem.value.assignedUser !== originalAssignedUser.value;

    return changes;
});

const canSave = computed(() => {
    if (!isEditing.value) {
        // Para nuevos items: habilitar si hay título
        return newItem.value.title.trim() !== "";
    }
    // Para editar: habilitar si hay cambios Y hay título
    return hasChanges.value && newItem.value.title.trim() !== "";
});

const hasPendingChanges = computed(() => {
    return hasChanges.value || isWritingComment.value || isEditingComment.value;
});

const assignedUserOptions = ref<{ id: string; text: string; name: string; checked: boolean }[]>([]);

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
});

const handleKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.key === "s") {
        event.preventDefault();
        if (canSave.value) return handleSave(false);
    }
};

onMounted(() => {
    document.addEventListener("keydown", handleKeyDown);
    resetForm();
    titleInputRef.value?.focus();
});

onUnmounted(() => {
    document.removeEventListener("keydown", handleKeyDown);
});

const newItem = ref<NewItemForm>({
    title: "",
    detail: "",
    priority: PRIORITY_VALUES.NORMAL,
    state: STATE_VALUES.TODO,
    estimatedEffort: "",
    actualEffort: "",
    assignedUser: "",
});

const resetForm = async () => {
    loadingStore.setLoading(true);
    try {
        if (props.existingItem) {
            // Intentar obtener el username del usuario asignado actual
            let assignedUserValue = "";
            if (props.existingItem.assignedUser) {
                try {
                    const username = await getUsernameById(props.existingItem.assignedUser);
                    if (username && SPRINT_TEAM_MEMBERS.includes(username as any)) {
                        assignedUserValue = username;
                    }
                } catch (error) {
                    console.warn(`Error al obtener username para ID ${props.existingItem.assignedUser}:`, error);
                }
            }

            newItem.value = {
                title: props.existingItem.title,
                detail: props.existingItem.detail,
                priority: props.existingItem.priority,
                state: props.existingItem.state || STATE_VALUES.TODO,
                estimatedEffort: props.existingItem.estimatedEffort.toString(),
                actualEffort: props.existingItem.actualEffort.toString(),
                assignedUser: assignedUserValue,
            };

            // Guardar valores originales para comparación
            originalTitle.value = props.existingItem.title;
            originalDetail.value = props.existingItem.detail;
            originalPriority.value = props.existingItem.priority as PriorityValue;
            originalState.value = (props.existingItem.state || STATE_VALUES.TODO) as StateValue;
            originalEstimatedEffort.value = props.existingItem.estimatedEffort.toString();
            originalActualEffort.value = props.existingItem.actualEffort.toString();
            originalAssignedUser.value = assignedUserValue;

            // Esperar a que las opciones estén cargadas si no lo están
            if (assignedUserOptions.value.length === 0) {
                await loadAssignedUserOptions();
            }

            // Pre-seleccionar la opción correspondiente en assignedUserOptions
            if (assignedUserValue && assignedUserOptions.value.length > 0) {
                assignedUserOptions.value.forEach((option) => {
                    option.checked = option.id === assignedUserValue;
                });
            }

            // Pre-seleccionar la prioridad en las opciones del select
            priorityOptions.value.forEach((option) => {
                option.checked = option.value.toLowerCase() === props.existingItem!.priority.toLowerCase();
            });

            // Pre-seleccionar el estado en las opciones del select
            stateOptions.value.forEach((option) => {
                option.checked = option.value.toLowerCase() === (props.existingItem!.state || STATE_VALUES.TODO).toLowerCase();
            });

            // Cargar historial de cambios
            await loadChangeHistory(props.existingItem.id);
        } else {
            newItem.value = {
                title: "",
                detail: "",
                priority: PRIORITY_VALUES.NORMAL,
                state: STATE_VALUES.TODO,
                estimatedEffort: "",
                actualEffort: "",
                assignedUser: "",
            };

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

            // Seleccionar prioridad por defecto (low)
            priorityOptions.value.forEach((option) => {
                option.checked = option.value === PRIORITY_VALUES.NORMAL;
            });

            // Seleccionar estado por defecto (TODO)
            stateOptions.value.forEach((option) => {
                option.checked = option.value === STATE_VALUES.TODO;
            });
        }
    } finally {
        loadingStore.setLoading(false);
    }
};

const onAssignedUserChange = (options: any[]) => {
    // Encontrar la opción seleccionada
    const selectedOption = options.find((option: any) => option.checked);
    if (selectedOption) {
        newItem.value.assignedUser = selectedOption.id;
    } else {
        newItem.value.assignedUser = "";
    }
};

const onPriorityChange = (options: any[]) => {
    // Encontrar la opción seleccionada
    const selectedOption = options.find((option: any) => option.checked);
    if (selectedOption) {
        newItem.value.priority = selectedOption.value;
    } else {
        newItem.value.priority = PRIORITY_VALUES.MEDIUM;
    }
};

const onStateChange = (options: any[]) => {
    // Encontrar la opción seleccionada
    const selectedOption = options.find((option: any) => option.checked);
    if (selectedOption) {
        newItem.value.state = selectedOption.value;
    } else {
        newItem.value.state = STATE_VALUES.TODO;
    }
};

const loadChangeHistory = async (itemId: string) => {
    try {
        changeHistory.value = await getChangesByAssociatedId(itemId);
    } catch (error) {
        console.error("Error loading change history:", error);
        changeHistory.value = [];
    }
};

const saveChanges = async (oldItem: Item, newItem: Item) => {
    const authStore = useAuthStore();
    const userId = authStore.user?.id;

    if (!userId) return;

    const changes: Array<Omit<ChangeHistory, "id">> = [];

    // Comparar campos y crear cambios
    if (oldItem.title !== newItem.title) {
        changes.push({
            associatedId: oldItem.id,
            associatedType: "item",
            field: "title",
            oldValue: oldItem.title,
            newValue: newItem.title,
            userId,
            createdAt: new Date(),
        });
    }

    if (oldItem.detail !== newItem.detail) {
        changes.push({
            associatedId: oldItem.id,
            associatedType: "item",
            field: "detail",
            oldValue: oldItem.detail,
            newValue: newItem.detail,
            userId,
            createdAt: new Date(),
        });
    }

    if (oldItem.priority !== newItem.priority) {
        changes.push({
            associatedId: oldItem.id,
            associatedType: "item",
            field: "priority",
            oldValue: oldItem.priority,
            newValue: newItem.priority,
            userId,
            createdAt: new Date(),
        });
    }

    if (oldItem.state !== newItem.state) {
        changes.push({
            associatedId: oldItem.id,
            associatedType: "item",
            field: "state",
            oldValue: oldItem.state,
            newValue: newItem.state,
            userId,
            createdAt: new Date(),
        });
    }

    if (oldItem.estimatedEffort !== newItem.estimatedEffort) {
        changes.push({
            associatedId: oldItem.id,
            associatedType: "item",
            field: "estimatedEffort",
            oldValue: oldItem.estimatedEffort.toString(),
            newValue: newItem.estimatedEffort.toString(),
            userId,
            createdAt: new Date(),
        });
    }

    if (oldItem.actualEffort !== newItem.actualEffort) {
        changes.push({
            associatedId: oldItem.id,
            associatedType: "item",
            field: "actualEffort",
            oldValue: oldItem.actualEffort.toString(),
            newValue: newItem.actualEffort.toString(),
            userId,
            createdAt: new Date(),
        });
    }

    if (oldItem.assignedUser !== newItem.assignedUser) {
        changes.push({
            associatedId: oldItem.id,
            associatedType: "item",
            field: "assignedUser",
            oldValue: oldItem.assignedUser || "",
            newValue: newItem.assignedUser || "",
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

const handleSave = async (shouldClose: boolean | MouseEvent = true) => {
    // Si el parámetro es un MouseEvent, obtener el valor de debería cerrar
    const shouldCloseDialog = typeof shouldClose === "boolean" ? shouldClose : true;

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
            priority: newItem.value.priority as PriorityValue,
            state: newItem.value.state as StateValue,
            estimatedEffort: parseInt(newItem.value.estimatedEffort) || 0,
            actualEffort: parseInt(newItem.value.actualEffort) || 0,
            assignedUser: assignedUserId,
            tasks: props.existingItem?.tasks || [],
            order: props.existingItem?.order || props.nextOrder,
            createdAt: props.existingItem?.createdAt || new Date(),
            createdBy: props.existingItem?.createdBy || authStore.user?.id || "",
            deletedAt: props.existingItem?.deletedAt || null,
        };

        // Guardar cambios si es edición
        if (props.existingItem) {
            await saveChanges(props.existingItem, item);
        }

        emit("save", item);
        if (shouldCloseDialog) {
            emit("close");
        }
    }
};
const handleClose = () => {
    emit("close");
    resetForm();
    resetPendingChanges();
};

const onWritingComment = (isWriting: boolean) => {
    isWritingComment.value = isWriting;
};

const onEditingComment = (isEditing: boolean) => {
    isEditingComment.value = isEditing;
};

const resetPendingChanges = () => {
    isWritingComment.value = false;
    isEditingComment.value = false;
};

const handleCopyToClipboard = () => {
    copyToClipboardAsync(newItem.value.title, newItem.value.detail);
};
</script>

<style scoped lang="scss">
@use "@/styles/dialog-form.scss";
</style>

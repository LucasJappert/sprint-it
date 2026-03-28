<script setup lang="ts">
import type { ISelectOption } from "@/components/global/MySelect.vue";
import MySelect from "@/components/global/MySelect.vue";
import { useUserActivity } from "@/composables/useUserActivity";
import { computed, ref, watch } from "vue";

interface Props {
    modelValue: boolean;
}

interface Emits {
    (e: "update:modelValue", value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const showDialog = computed({
    get: () => props.modelValue,
    set: (value) => emit("update:modelValue", value),
});

const userActivity = useUserActivity();
const selectedUserId = ref<string | null>(null);

const userOptions = computed<ISelectOption[]>(() =>
    userActivity.users.value.map((user) => ({
        name: `${user.name} ${user.lastName} (@${user.username})`,
        checked: false,
        value: user.id,
    })),
);

const selectedUserActivity = computed(() => {
    if (!selectedUserId.value) return null;
    return userActivity.getUserActivityById(selectedUserId.value).value;
});

const openDialog = async () => {
    try {
        if (!userActivity.isInitialized.value) {
            console.log("🚀 Inicializando user activity desde el diálogo...");
            await userActivity.initialize();
        }
    } catch (err) {
        console.error("❌ Error opening dialog:", err);
        // En caso de error, mostramos el diálogo de todos modos con un mensaje de error
    }
};

const handleUserSelection = (options: ISelectOption[]) => {
    const selectedOption = options.find((opt) => opt.checked);
    if (selectedOption) {
        selectedUserId.value = selectedOption.value as string;
    } else {
        selectedUserId.value = null;
    }
};

// Watch para depurar el estado de loading
watch(
    () => userActivity.loading.value,
    (newLoading, oldLoading) => {
        console.log(`🔄 Loading state changed: ${oldLoading} → ${newLoading}`);
    },
);

const formatTimestamp = (date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const isToday = today.getTime() === dateDay.getTime();

    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const timeStr = `${hours}:${minutes}`;

    if (isToday) {
        return `Hoy ${timeStr}`;
    }

    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year} ${timeStr}`;
};

const getActivityColor = (action: string) => {
    if (action.includes("estado")) return "#4CAF50";
    if (action.includes("prioridad")) return "#FF9800";
    if (action.includes("esfuerzo")) return "#2196F3";
    if (action.includes("asignación")) return "#9C27B0";
    if (action.includes("agregad")) return "#00BCD4";
    if (action.includes("Editó")) return "#FFC107";
    if (action.includes("Reordenamiento")) return "#607D8B";
    return "#757575";
};

// Abrir diálogo cuando se muestra
const handleDialogShow = async () => {
    if (!userActivity.isInitialized.value) {
        await openDialog();
    }
};
</script>

<template>
    <v-dialog v-model="showDialog" max-width="700" @after-enter="handleDialogShow">
        <v-card>
            <v-card-title class="d-flex align-center pa-4">
                <v-icon class="me-3">mdi-account-clock-outline</v-icon>
                Actividad de Usuarios
            </v-card-title>

            <v-divider></v-divider>

            <v-card-text class="pa-4" style="max-height: 600px; overflow-y: auto">
                <!-- Loading state -->
                <div v-if="userActivity.loading.value" class="d-flex flex-column justify-center align-center" style="min-height: 200px">
                    <v-progress-circular indeterminate color="primary"></v-progress-circular>
                    <div class="mt-3 text-caption">Cargando actividad...</div>
                </div>

                <!-- User selection -->
                <div v-else-if="!selectedUserId" class="user-selection">
                    <h3 class="text-h6 mb-4">Seleccionar Usuario</h3>

                    <MySelect :options="userOptions" placeholder-title="Elegir usuario..." label="Usuario" @update:options="handleUserSelection" />

                    <div v-if="userActivity.error.value" class="mt-4 pa-3 bg-error-lighten-5 rounded">
                        <div class="text-caption text-error">
                            <v-icon size="14" class="me-1">mdi-alert</v-icon>
                            Error: {{ userActivity.error.value }}
                        </div>
                    </div>

                    <div v-if="userActivity.users.value.length === 0 && !userActivity.loading.value" class="mt-4 text-center">
                        <div class="text-caption text-medium-emphasis">No se encontraron usuarios</div>
                    </div>
                </div>

                <!-- User activity details -->
                <div v-else-if="selectedUserId && selectedUserActivity" class="activity-details">
                    <!-- User header -->
                    <div class="d-flex align-center mb-4">
                        <v-btn icon="mdi-arrow-left" variant="text" @click="selectedUserId = null" class="me-3"></v-btn>

                        <v-avatar size="48" class="me-3" color="primary">
                            <v-icon>mdi-account</v-icon>
                        </v-avatar>

                        <div class="flex-grow-1">
                            <div class="text-h6 font-weight-medium">{{ selectedUserActivity?.user?.name }} {{ selectedUserActivity?.user?.lastName }}</div>
                            <div class="text-caption text-medium-emphasis">@{{ selectedUserActivity?.user?.username }}</div>
                        </div>

                        <v-chip :color="(selectedUserActivity?.activities?.length || 0) > 0 ? 'primary' : 'grey'" size="small">
                            {{ selectedUserActivity?.activities?.length || 0 }} actividades
                        </v-chip>
                    </div>

                    <!-- Activities list -->
                    <div v-if="selectedUserActivity?.activities && selectedUserActivity.activities.length > 0" class="activities-list">
                        <div
                            v-for="activity in selectedUserActivity.activities"
                            :key="activity.id"
                            class="activity-item mb-3"
                            :style="{ borderLeftColor: getActivityColor(activity.action) }"
                        >
                            <div class="text-body-2 mb-1">
                                <span class="font-weight-medium">{{ activity.action }}</span>
                                <span class="ms-1">{{ activity.description }}</span>
                            </div>

                            <div class="text-caption text-medium-emphasis">
                                <v-icon size="14" class="me-1">mdi-clock-outline</v-icon>
                                {{ formatTimestamp(activity.timestamp) }}
                                <span class="ms-2">
                                    <v-icon size="14" class="me-1">mdi-sprint</v-icon>
                                    {{ activity.sprintTitle }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- No activities -->
                    <div v-else-if="selectedUserActivity?.activities && selectedUserActivity.activities.length === 0" class="text-center py-8">
                        <v-icon size="64" color="grey-lighten-1" class="mb-3"> mdi-coffee-off-outline </v-icon>
                        <div class="text-h6 text-medium-emphasis mb-2">Sin actividad reciente</div>
                        <div class="text-body-2 text-medium-emphasis">Este usuario no ha tenido actividad en los últimos 7 días</div>
                    </div>
                </div>

                <!-- Error state -->
                <div v-else-if="userActivity.error.value" class="text-center py-8">
                    <v-icon size="64" color="error" class="mb-3"> mdi-alert-circle-outline </v-icon>
                    <div class="text-h6 text-error mb-2">Error al cargar actividad</div>
                    <div class="text-body-2 text-medium-emphasis">
                        {{ userActivity.error.value }}
                    </div>
                </div>
            </v-card-text>

            <v-divider></v-divider>

            <v-card-actions class="pa-4">
                <v-spacer></v-spacer>
                <v-btn @click="showDialog = false"> Cerrar </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<style scoped lang="scss">
.activity-item {
    padding: 12px;
    padding-left: 16px;
    border-radius: 8px;
    background-color: rgba(var(--v-theme-surface-variant), 0.3);
    border: 1px solid rgba(var(--v-theme-outline), 0.2);
    border-left: 4px solid;
    animation: slideIn 0.3s ease;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.activities-list {
    max-height: 500px;
    overflow-y: auto;
}
</style>

<template>
    <v-dialog v-model="isOpen" max-width="600" persistent>
        <v-card class="export-dialog">
            <v-card-title class="d-flex align-center gap-2">
                <v-icon size="24">{{ dialogIcon }}</v-icon>
                <span>{{ dialogTitle }}</span>
            </v-card-title>

            <v-card-text v-if="mode === 'stats'">
                <div class="stats-container">
                    <p class="mb-4">{{ t("stats.description") }}</p>

                    <v-list density="compact" class="stats-list">
                        <v-list-item>
                            <template #prepend>
                                <v-icon color="primary">mdi-counter</v-icon>
                            </template>
                            <v-list-item-title>{{ t("stats.sprints") }}</v-list-item-title>
                            <template #append>
                                <span class="stat-value">{{ stats?.sprintsCount || 0 }}</span>
                            </template>
                        </v-list-item>

                        <v-list-item>
                            <template #prepend>
                                <v-icon color="primary">mdi-format-list-checks</v-icon>
                            </template>
                            <v-list-item-title>{{ t("stats.items") }}</v-list-item-title>
                            <template #append>
                                <span class="stat-value">{{ stats?.itemsCount || 0 }}</span>
                            </template>
                        </v-list-item>

                        <v-list-item>
                            <template #prepend>
                                <v-icon color="primary">mdi-checkbox-marked-outline</v-icon>
                            </template>
                            <v-list-item-title>{{ t("stats.tasks") }}</v-list-item-title>
                            <template #append>
                                <span class="stat-value">{{ stats?.tasksCount || 0 }}</span>
                            </template>
                        </v-list-item>

                        <v-list-item>
                            <template #prepend>
                                <v-icon color="primary">mdi-account-group</v-icon>
                            </template>
                            <v-list-item-title>{{ t("stats.users") }}</v-list-item-title>
                            <template #append>
                                <span class="stat-value">{{ stats?.usersCount || 0 }}</span>
                            </template>
                        </v-list-item>

                        <v-list-item>
                            <template #prepend>
                                <v-icon color="primary">mdi-comment-text-multiple</v-icon>
                            </template>
                            <v-list-item-title>{{ t("stats.comments") }}</v-list-item-title>
                            <template #append>
                                <span class="stat-value">{{ stats?.commentsCount || 0 }}</span>
                            </template>
                        </v-list-item>

                        <v-list-item>
                            <template #prepend>
                                <v-icon color="primary">mdi-paperclip</v-icon>
                            </template>
                            <v-list-item-title>{{ t("stats.attachments") }}</v-list-item-title>
                            <template #append>
                                <span class="stat-value">{{ stats?.attachmentsCount || 0 }}</span>
                            </template>
                        </v-list-item>

                        <v-list-item>
                            <template #prepend>
                                <v-icon color="primary">mdi-image</v-icon>
                            </template>
                            <v-list-item-title>{{ t("stats.images") }}</v-list-item-title>
                            <template #append>
                                <span class="stat-value">{{ (stats?.imagesInDescriptionsCount || 0) + (stats?.imagesInCommentsCount || 0) }}</span>
                            </template>
                        </v-list-item>
                    </v-list>

                    <v-divider class="my-4" />

                    <div class="estimate-info">
                        <div class="estimate-item">
                            <v-icon size="20" class="mr-2">mdi-harddisk</v-icon>
                            <span
                                >{{ t("stats.estimatedSize") }}: <strong>~{{ stats?.estimatedSizeMB?.toFixed(1) || 0 }} MB</strong></span
                            >
                        </div>
                        <div class="estimate-item">
                            <v-icon size="20" class="mr-2">mdi-timer-outline</v-icon>
                            <span
                                >{{ t("stats.estimatedTime") }}: <strong>{{ estimatedTime }}</strong></span
                            >
                        </div>
                    </div>

                    <v-alert type="warning" variant="tonal" density="compact" class="mt-4">
                        {{ t("stats.warning") }}
                    </v-alert>
                </div>
            </v-card-text>

            <v-card-text v-else-if="mode === 'progress'">
                <div class="progress-container">
                    <div class="progress-header">
                        <v-icon size="48" color="primary" class="mb-4">mdi-database-export</v-icon>
                        <p class="progress-stage">{{ progress.currentItem }}</p>
                        <p class="progress-time">{{ elapsedTime }}</p>
                    </div>

                    <v-progress-linear :model-value="progress.progress" color="primary" height="20" rounded striped>
                        <span class="progress-text">{{ progress.progress }}%</span>
                    </v-progress-linear>

                    <div class="progress-stages">
                        <div
                            v-for="stage in stages"
                            :key="stage.key"
                            class="stage-indicator"
                            :class="{ active: isStageActive(stage.key), completed: isStageCompleted(stage.key) }"
                        >
                            <v-icon size="16">{{ isStageCompleted(stage.key) ? "mdi-check" : "mdi-circle-small" }}</v-icon>
                            <span>{{ stage.label }}</span>
                        </div>
                    </div>
                </div>
            </v-card-text>

            <v-card-text v-else-if="mode === 'complete'">
                <div class="complete-container">
                    <v-icon size="64" color="success" class="mb-4">mdi-check-circle</v-icon>
                    <p class="text-h6">{{ t("complete.title") }}</p>
                    <p class="text-body-2 mt-2">{{ t("complete.description") }}</p>
                </div>
            </v-card-text>

            <v-card-text v-else-if="mode === 'error'">
                <div class="error-container">
                    <v-icon size="64" color="error" class="mb-4">mdi-alert-circle</v-icon>
                    <p class="text-h6">{{ t("error.title") }}</p>
                    <p class="text-body-2 mt-2">{{ progress.error || t("error.default") }}</p>
                </div>
            </v-card-text>

            <v-card-actions>
                <v-spacer />
                <v-btn v-if="mode === 'stats'" variant="text" @click="close">
                    {{ t("buttons.cancel") }}
                </v-btn>
                <v-btn v-if="mode === 'stats'" color="primary" variant="flat" :loading="isStarting" @click="startExport">
                    {{ t("buttons.generate") }}
                </v-btn>
                <v-btn v-if="mode === 'complete' || mode === 'error'" color="primary" variant="flat" @click="close">
                    {{ t("buttons.close") }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { notifyOk } from "@/plugins/my-notification-helper/my-notification-helper";
import { exportDatabaseToJson, generateFullBackup, getExportStats, type ExportProgress, type ExportStats } from "@/services/exportService";
import { computed, ref, watch } from "vue";

type DialogMode = "stats" | "progress" | "complete" | "error";

const props = defineProps<{
    modelValue: boolean;
    exportType: "json" | "full";
}>();

const emit = defineEmits<{
    (e: "update:modelValue", value: boolean): void;
}>();

const t = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
        "stats.description": {
            es: "Esta acción exportará:",
        },
        "stats.sprints": {
            es: "Sprints",
        },
        "stats.items": {
            es: "Items",
        },
        "stats.tasks": {
            es: "Tasks",
        },
        "stats.users": {
            es: "Usuarios",
        },
        "stats.comments": {
            es: "Comentarios",
        },
        "stats.attachments": {
            es: "Archivos adjuntos",
        },
        "stats.images": {
            es: "Imágenes en descripciones",
        },
        "stats.estimatedSize": {
            es: "Tamaño estimado",
        },
        "stats.estimatedTime": {
            es: "Tiempo estimado",
        },
        "stats.warning": {
            es: "⚠️ La exportación puede tomar varios minutos dependiendo del volumen de datos.",
        },
        "complete.title": {
            es: "¡Exportación completada!",
        },
        "complete.description": {
            es: "El archivo se ha descargado automáticamente.",
        },
        "error.title": {
            es: "Error en la exportación",
        },
        "error.default": {
            es: "Ha ocurrido un error. Por favor intenta nuevamente.",
        },
        "buttons.cancel": {
            es: "Cancelar",
        },
        "buttons.generate": {
            es: "Generar Respaldo",
        },
        "buttons.close": {
            es: "Cerrar",
        },
    };
    return translations[key]?.["es"] || key;
};

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit("update:modelValue", value),
});

const mode = ref<DialogMode>("stats");
const isStarting = ref(false);
const stats = ref<ExportStats | null>(null);
const progress = ref<ExportProgress>({
    stage: "preparing",
    progress: 0,
    currentItem: "",
});

const abortController = ref<AbortController | null>(null);
const startTime = ref<number>(0);
const elapsedTime = ref<string>("00:00");
let timerInterval: ReturnType<typeof setInterval> | null = null;

const dialogTitle = computed(() => {
    if (props.exportType === "json") return "Exportar JSON";
    if (mode.value === "stats") return "Generar Respaldo Completo";
    if (mode.value === "progress") return "Exportando...";
    if (mode.value === "complete") return "¡Listo!";
    return "Error";
});

const dialogIcon = computed(() => {
    if (props.exportType === "json") return "mdi-file-document";
    if (mode.value === "stats") return "mdi-database-export";
    if (mode.value === "progress") return "mdi-loading mdi-spin";
    if (mode.value === "complete") return "mdi-check-circle";
    return "mdi-alert-circle";
});

const estimatedTime = computed(() => {
    if (!stats.value) return "~1 min";
    const minutes = stats.value.estimatedTimeMinutes || 1;
    if (minutes <= 1) return "~1 min";
    if (minutes <= 2) return "~1-2 min";
    if (minutes <= 5) return "~2-5 min";
    if (minutes <= 10) return "~5-10 min";
    return `~${minutes} min`;
});

const stages = [
    { key: "database", label: "Base de datos" },
    { key: "attachments", label: "Archivos adjuntos" },
    { key: "images", label: "Imágenes" },
    { key: "compressing", label: "Comprimiendo" },
];

const formatElapsedTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const startTimer = () => {
    startTime.value = Date.now();
    elapsedTime.value = "00:00";
    timerInterval = setInterval(() => {
        const elapsed = Date.now() - startTime.value;
        elapsedTime.value = formatElapsedTime(elapsed);
    }, 1000);
};

const stopTimer = () => {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    return startTime.value > 0 ? Date.now() - startTime.value : 0;
};

const isStageActive = (stageKey: string): boolean => {
    const stageOrder = ["preparing", "database", "attachments", "images", "compressing"];
    const currentIndex = stageOrder.indexOf(progress.value.stage);
    const stageIndex = stageOrder.indexOf(stageKey);
    return stageIndex === currentIndex;
};

const isStageCompleted = (stageKey: string): boolean => {
    const stageOrder = ["preparing", "database", "attachments", "images", "compressing"];
    const currentIndex = stageOrder.indexOf(progress.value.stage);
    const stageIndex = stageOrder.indexOf(stageKey);
    return stageIndex < currentIndex;
};

watch(
    () => props.modelValue,
    async (newVal) => {
        if (newVal) {
            mode.value = "stats";
            progress.value = { stage: "preparing", progress: 0, currentItem: "" };
            abortController.value = null;

            if (props.exportType === "full") {
                try {
                    stats.value = await getExportStats();
                } catch (error) {
                    console.error("Error loading stats:", error);
                }
            }
        }
    },
);

const startExport = async () => {
    if (props.exportType === "json") {
        try {
            isStarting.value = true;
            await exportDatabaseToJson();
            notifyOk("Datos exportados correctamente");
            close();
        } catch (error) {
            console.error("Error exporting JSON:", error);
        } finally {
            isStarting.value = false;
        }
        return;
    }

    isStarting.value = true;
    mode.value = "progress";
    abortController.value = new AbortController();
    startTimer();

    try {
        await generateFullBackup((p) => {
            progress.value = p;
            if (p.stage === "complete") {
                mode.value = "complete";
                const totalTime = stopTimer();
                const timeStr = formatElapsedTime(totalTime);
                notifyOk(`Respaldo generado correctamente en ${timeStr}`);
            } else if (p.stage === "error") {
                stopTimer();
                mode.value = "error";
            }
        }, abortController.value.signal);
    } catch (error) {
        console.error("Error generating backup:", error);
        stopTimer();
        mode.value = "error";
    } finally {
        isStarting.value = false;
    }
};

const close = () => {
    if (abortController.value) {
        abortController.value.abort();
    }
    stopTimer();
    isOpen.value = false;
};
</script>

<style scoped lang="scss">
.export-dialog {
    background: #1e1e1e !important;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.stats-container {
    color: #e0e0e0;
}

.stats-list {
    background: transparent !important;
}

.stat-value {
    font-weight: bold;
    color: #4fc3f7;
}

.estimate-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.estimate-item {
    display: flex;
    align-items: center;
    color: #bdbdbd;
}

.progress-container {
    text-align: center;
    padding: 20px 0;
}

.progress-header {
    margin-bottom: 20px;
}

.progress-stage {
    font-size: 1.1rem;
    color: #e0e0e0;
}

.progress-time {
    font-size: 1.5rem;
    font-weight: bold;
    color: #4fc3f7;
    margin-top: 8px;
}

.progress-text {
    color: white;
    font-weight: bold;
}

.progress-stages {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin-top: 20px;
}

.stage-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    color: #757575;

    &.active {
        color: #4fc3f7;
    }

    &.completed {
        color: #66bb6a;
    }
}

.complete-container,
.error-container {
    text-align: center;
    padding: 20px 0;
    color: #e0e0e0;
}
</style>

<template>
    <v-dialog v-model="isOpen" max-width="800" persistent>
        <v-card class="cleanup-dialog">
            <v-card-title class="d-flex align-center gap-2">
                <v-icon size="24">{{ dialogIcon }}</v-icon>
                <span>{{ dialogTitle }}</span>
            </v-card-title>

            <!-- Paso 1: Upload Backup -->
            <v-card-text v-if="currentStep === 'upload'">
                <div class="upload-container">
                    <p class="mb-4">{{ t("upload.description") }}</p>
                    
                    <v-file-input
                        v-model="selectedFile"
                        accept=".zip"
                        :label="t('upload.label')"
                        :loading="isValidating"
                        :disabled="isValidating"
                        prepend-icon="mdi-file-zip"
                        show-size
                        @update:model-value="handleFileChange"
                    />
                    
                    <div v-if="backupValidation" class="validation-result mt-4">
                        <v-alert
                            :type="backupValidation.isValid ? 'success' : 'error'"
                            variant="tonal"
                            density="compact"
                        >
                            <div v-if="backupValidation.isValid">
                                <p class="mb-2">✅ {{ t("upload.valid") }}</p>
                                <div class="validation-summary">
                                    <h4 class="summary-title">{{ t("upload.summary") }}</h4>
                                    <div class="validation-stats">
                                        <div class="stat-item">
                                            <v-icon size="16" color="success">mdi-check-circle</v-icon>
                                            <span><strong>{{ backupValidation.stats?.sprintsCount }}</strong> sprints encontrados</span>
                                        </div>
                                        <div class="stat-item">
                                            <v-icon size="16" color="success">mdi-check-circle</v-icon>
                                            <span><strong>{{ backupValidation.stats?.attachmentsCount }}</strong> adjuntos validados</span>
                                        </div>
                                        <div class="stat-item">
                                            <v-icon size="16" color="success">mdi-check-circle</v-icon>
                                            <span><strong>{{ backupValidation.stats?.imagesCount }}</strong> imágenes detectadas</span>
                                        </div>
                                        <div class="stat-item">
                                            <v-icon size="16" color="success">mdi-check-circle</v-icon>
                                            <span><strong>{{ backupValidation.stats?.commentsCount }}</strong> comentarios encontrados</span>
                                        </div>
                                        <div class="stat-item">
                                            <v-icon size="16" color="success">mdi-check-circle</v-icon>
                                            <span><strong>{{ formatFileSize(backupValidation.stats?.totalSize || 0) }}</strong> tamaño del backup</span>
                                        </div>
                                    </div>
                                    <div class="validation-details mt-3">
                                        <p class="details-title">✨ Estructura validada:</p>
                                        <ul class="details-list">
                                            <li>✅ Carpeta <code>base_de_datos/</code> presente</li>
                                            <li>✅ Archivos JSON requeridos encontrados</li>
                                            <li>✅ Formato JSON válido</li>
                                            <li>✅ Carpetas <code>adjuntos/</code> e <code>imagenes/</code> presentes</li>
                                            <li>✅ Estructura de datos compatible</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            <div v-else>
                                <p>❌ {{ backupValidation.error }}</p>
                            </div>
                        </v-alert>
                    </div>
                </div>
            </v-card-text>

            <!-- Paso 2: Password -->
            <v-card-text v-if="currentStep === 'password'">
                <div class="password-container">
                    <p class="mb-4">{{ t("password.description") }}</p>
                    
                    <v-text-field
                        v-model="password"
                        :label="t('password.label')"
                        type="password"
                        prepend-icon="mdi-lock"
                        @keyup.enter="validatePassword"
                    />
                    
                    <v-alert type="warning" variant="tonal" density="compact" class="mt-4">
                        {{ t("password.warning") }}
                    </v-alert>
                </div>
            </v-card-text>

            <!-- Paso 3: Preview con Loading -->
            <v-card-text v-if="currentStep === 'preview' && verificationProgress.total > 0">
                <div class="verification-loading text-center">
                    <MyLoading 
                        :visible="true" 
                        :message="verificationProgress.current" 
                    />
                    <v-progress-linear
                        :model-value="(verificationProgress.verified / verificationProgress.total) * 100"
                        color="primary"
                        height="8"
                        rounded
                        class="mt-4"
                    />
                </div>
            </v-card-text>
            <v-card-text v-if="currentStep === 'preview'">
                <div class="preview-container">
                    <p class="mb-4">{{ t("preview.description") }}</p>
                    
                    <v-list density="compact" class="preview-list">
                        <v-list-item>
                            <template #prepend>
                                <v-icon color="primary">mdi-folder-multiple</v-icon>
                            </template>
                            <v-list-item-title>{{ t("preview.sprints") }}</v-list-item-title>
                            <template #append>
                                <span class="stat-value">{{ filesToCleanup.length }}</span>
                            </template>
                        </v-list-item>
                        <v-list-item>
                            <template #prepend>
                                <v-icon color="warning">mdi-file-multiple</v-icon>
                            </template>
                            <v-list-item-title>{{ t("preview.totalFiles") }}</v-list-item-title>
                            <template #append>
                                <span class="stat-value">{{ totalFilesToCleanup }}</span>
                            </template>
                        </v-list-item>
                    </v-list>

                    <v-divider class="my-4" />

                    <div class="sprints-breakdown">
                        <h4 class="mb-3">{{ t("preview.breakdown") }}</h4>
                        <v-list density="compact">
                            <v-list-item
                                v-for="sprint in filesToCleanup"
                                :key="sprint.sprintId"
                                :class="{ 'sprint-without-files': sprint.attachments.length === 0 && sprint.imageUrls.length === 0 }"
                            >
                                <template #prepend>
                                    <v-icon 
                                        size="16" 
                                        :color="sprint.attachments.length === 0 && sprint.imageUrls.length === 0 ? 'grey' : 'warning'"
                                    >
                                        {{ sprint.attachments.length === 0 && sprint.imageUrls.length === 0 ? 'mdi-folder-outline' : 'mdi-folder' }}
                                    </v-icon>
                                </template>
                                <v-list-item-title>{{ sprint.sprintTitle }}</v-list-item-title>
                                <template #append>
                                    <span 
                                        class="sprint-stats"
                                        :class="{ 'no-files': sprint.attachments.length === 0 && sprint.imageUrls.length === 0 }"
                                    >
                                        {{ sprint.attachments.length === 0 && sprint.imageUrls.length === 0 
                                            ? 'Sin archivos' 
                                            : `${sprint.attachments.length} adj + ${sprint.imageUrls.length} img` 
                                        }}
                                    </span>
                                </template>
                            </v-list-item>
                        </v-list>
                    </div>

                    <v-alert type="error" variant="tonal" density="compact" class="mt-4">
                        {{ t("preview.warning") }}
                    </v-alert>
                </div>
            </v-card-text>

            <!-- Paso 4: Ejecutando -->
            <v-card-text v-if="currentStep === 'executing'">
                <div class="executing-container text-center">
                    <v-icon size="64" color="primary" class="mb-4">mdi-delete-sweep</v-icon>
                    <p class="text-h6 mb-2">{{ t("executing.title") }}</p>
                    <p class="text-body-2 mb-4">{{ t("executing.description") }}</p>
                    
                    <div class="timer-container mb-4">
                        <v-progress-linear
                            :indeterminate="true"
                            color="primary"
                            height="8"
                            rounded
                            class="mb-2"
                        />
                        <p class="text-body-2 text-medium-emphasis">
                            Tiempo transcurrido: <strong>{{ formatElapsedTime(executionTime) }}</strong>
                        </p>
                        <p class="text-caption text-medium-emphasis">
                            Procesando {{ totalFilesToCleanup }} archivos...
                        </p>
                    </div>
                </div>
            </v-card-text>

            <!-- Paso 5: Completado -->
            <v-card-text v-if="currentStep === 'complete'">
                <div class="success-container text-center">
                    <v-icon size="64" color="success" class="mb-4">mdi-check-circle</v-icon>
                    <p class="text-h6 mb-2">
                        {{ cleanupResult?.totalFilesDeleted && cleanupResult.totalFilesDeleted > 0 
                            ? t("complete.title") 
                            : t("complete.noFilesTitle") }}
                    </p>
                    <p class="text-body-2">
                        {{ cleanupResult?.totalFilesDeleted && cleanupResult.totalFilesDeleted > 0 
                            ? t("complete.description") 
                            : t("complete.noFilesDescription") }}
                    </p>
                    
                    <div v-if="cleanupResult" class="results-summary">
                        <v-list density="compact" class="results-list">
                            <v-list-item>
                                <template #prepend>
                                    <v-icon color="success">mdi-delete</v-icon>
                                </template>
                                <v-list-item-title>{{ t("complete.filesDeleted") }}</v-list-item-title>
                                <template #append>
                                    <span class="stat-value">{{ cleanupResult.totalFilesDeleted }}</span>
                                </template>
                            </v-list-item>

                            <v-list-item>
                                <template #prepend>
                                    <v-icon color="success">mdi-harddisk</v-icon>
                                </template>
                                <v-list-item-title>{{ t("complete.spaceFreed") }}</v-list-item-title>
                                <template #append>
                                    <span class="stat-value">{{ formatFileSize(cleanupResult.totalSizeFreed) }}</span>
                                </template>
                            </v-list-item>
                        </v-list>

                        <v-expansion-panels class="mt-4">
                            <v-expansion-panel>
                                <v-expansion-panel-title>
                                    {{ t("complete.details") }}
                                </v-expansion-panel-title>
                                <v-expansion-panel-text>
                                    <v-list density="compact">
                                        <v-list-item
                                            v-for="stat in cleanupResult.sprintStats"
                                            :key="stat.sprintId"
                                        >
                                            <template #prepend>
                                                <v-icon size="16">mdi-sprint</v-icon>
                                            </template>
                                            <v-list-item-title>{{ stat.sprintTitle }}</v-list-item-title>
                                            <template #append>
                                                <span class="sprint-result">
                                                    {{ stat.attachmentsDeleted }} adj + {{ stat.imagesDeleted }} img
                                                    ({{ formatFileSize(stat.sizeFreed) }})
                                                </span>
                                            </template>
                                        </v-list-item>
                                    </v-list>
                                </v-expansion-panel-text>
                            </v-expansion-panel>
                        </v-expansion-panels>

                        <div v-if="cleanupResult.errors.length > 0" class="mt-4">
                            <v-alert type="warning" variant="tonal" density="compact">
                                <p class="mb-2">{{ t("complete.errors") }}:</p>
                                <ul class="error-list">
                                    <li v-for="error in cleanupResult.errors.slice(0, 3)" :key="error">
                                        {{ error }}
                                    </li>
                                    <li v-if="cleanupResult.errors.length > 3">
                                        ... y {{ cleanupResult.errors.length - 3 }} más
                                    </li>
                                </ul>
                            </v-alert>
                        </div>
                    </div>
                </div>
            </v-card-text>

            <!-- Paso 6: Error -->
            <v-card-text v-if="currentStep === 'error'">
                <div class="error-container text-center">
                    <v-icon size="64" color="error" class="mb-4">mdi-alert-circle</v-icon>
                    <p class="text-h6 mb-2">{{ t("error.title") }}</p>
                    <p class="text-body-2">{{ error || t("error.default") }}</p>
                </div>
            </v-card-text>

            <v-card-actions class="pa-4">
                <v-btn variant="text" @click="close">
                    {{ t("buttons.cancel") }}
                </v-btn>
                <v-spacer />
                <v-btn
                    v-if="currentStep === 'upload' && backupValidation?.isValid"
                    color="primary"
                    variant="flat"
                    @click="currentStep = 'password'"
                >
                    {{ t("buttons.next") }}
                </v-btn>
                <v-btn
                    v-if="currentStep === 'password'"
                    color="primary"
                    variant="flat"
                    :disabled="!canProceedToPreview"
                    @click="validatePassword"
                >
                    {{ t("buttons.continue") }}
                </v-btn>
                <v-btn
                    v-if="currentStep === 'preview'"
                    color="error"
                    variant="flat"
                    :disabled="!canExecuteCleanup"
                    :loading="isExecuting"
                    @click="executeCleanup"
                >
                    {{ t("buttons.execute") }}
                </v-btn>
                <v-btn
                    v-if="currentStep === 'complete' || currentStep === 'error'"
                    color="primary"
                    variant="flat"
                    @click="close"
                >
                    {{ t("buttons.close") }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import MyLoading from "@/components/global/MyLoading.vue";
import { useStorageCleanup } from "@/composables/useStorageCleanup";

const props = defineProps<{
    modelValue: boolean;
}>();

const emit = defineEmits<{
    (e: "update:modelValue", value: boolean): void;
}>();

const {
    currentStep,
    backupValidation,
    password,
    cleanupResult,
    filesToCleanup,
    error,
    isValidating,
    isExecuting,
    canProceedToPreview,
    canExecuteCleanup,
    totalFilesToCleanup,
    executionTime,
    verificationProgress,
    formatElapsedTime,
    reset,
    handleBackupUpload,
    validatePassword,
    executeCleanup,
    formatFileSize,
} = useStorageCleanup();

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit("update:modelValue", value),
});

const selectedFile = ref<File | null>(null);

const dialogTitle = computed(() => {
    const titles = {
        upload: "Paso 1: Validar Backup",
        password: "Paso 2: Verificar Identidad",
        preview: "Paso 3: Revisión de Archivos",
        executing: "Ejecutando Limpieza",
        complete: "✅ Limpieza Completada",
        error: "❌ Error en la Limpieza",
    };
    return titles[currentStep.value] || "Limpieza de Storage";
});

const dialogIcon = computed(() => {
    const icons = {
        upload: "mdi-file-upload",
        password: "mdi-lock",
        preview: "mdi-eye",
        executing: "mdi-loading mdi-spin",
        complete: "mdi-check-circle",
        error: "mdi-alert-circle",
    };
    return icons[currentStep.value] || "mdi-broom";
});

const handleFileChange = (files: File | File[] | null) => {
    const file = Array.isArray(files) ? files[0] : files;
    if (file) {
        handleBackupUpload(file);
    }
};

const close = () => {
    reset();
    selectedFile.value = null;
    isOpen.value = false;
};

// Traducciones
const t = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
        "upload.description": {
            es: "Adjunta un archivo ZIP de backup para validar que sea compatible antes de proceder con la limpieza.",
        },
        "upload.label": {
            es: "Archivo ZIP de Backup",
        },
        "upload.valid": {
            es: "Backup válido y compatible",
        },
        "upload.summary": {
            es: "📋 Resumen de Validación",
        },
        "upload.continue": {
            es: "Continuar a Verificación",
        },
        "password.description": {
            es: "Ingresa la contraseña de seguridad para continuar con el proceso de limpieza.",
        },
        "password.label": {
            es: "Contraseña de Seguridad",
        },
        "password.warning": {
            es: "Esta acción requiere autorización. Solo usuarios autorizados pueden continuar.",
        },
        "preview.description": {
            es: "Se eliminarán los siguientes archivos de los sprints antiguos:",
        },
        "preview.sprints": {
            es: "Sprints afectados",
        },
        "preview.totalFiles": {
            es: "Total de archivos a eliminar",
        },
        "preview.breakdown": {
            es: "Desglose por sprint",
        },
        "preview.warning": {
            es: "⚠️ Esta acción eliminará permanentemente los archivos. No se puede deshacer.",
        },
        "executing.title": {
            es: "Ejecutando Limpieza",
        },
        "executing.description": {
            es: "Eliminando archivos del storage y actualizando la base de datos...",
        },
        "complete.title": {
            es: "¡Limpieza Completada!",
        },
        "complete.noFilesTitle": {
            es: "Sin Archivos para Limpiar",
        },
        "complete.description": {
            es: "Se han eliminado los archivos antiguos del storage correctamente.",
        },
        "complete.noFilesDescription": {
            es: "Los sprints antiguos no contienen archivos adjuntos ni imágenes que necesiten ser eliminados.",
        },
        "complete.filesDeleted": {
            es: "Archivos eliminados",
        },
        "complete.spaceFreed": {
            es: "Espacio liberado",
        },
        "complete.details": {
            es: "Ver detalles por sprint",
        },
        "complete.errors": {
            es: "Errores encontrados",
        },
        "error.title": {
            es: "Error en la Limpieza",
        },
        "error.default": {
            es: "Ha ocurrido un error inesperado. Por favor intenta nuevamente.",
        },
        "buttons.cancel": {
            es: "Cancelar",
        },
        "buttons.next": {
            es: "Siguiente",
        },
        "buttons.continue": {
            es: "Continuar",
        },
        "buttons.execute": {
            es: "Ejecutar Limpieza",
        },
        "buttons.close": {
            es: "Cerrar",
        },
    };
    return translations[key]?.["es"] || key;
};
</script>

<style scoped lang="scss">
.cleanup-dialog {
    background: #1e1e1e !important;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.validation-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 8px;
    margin-top: 8px;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    font-size: 0.9rem;
}

.validation-summary {
    margin-top: 12px;
}

.summary-title {
    font-size: 1rem;
    font-weight: 500;
    margin-bottom: 12px;
    color: #4fc3f7;
}

.validation-details {
    background: rgba(76, 195, 247, 0.1);
    padding: 12px;
    border-radius: 6px;
    border-left: 3px solid #4fc3f7;
}

.details-title {
    font-size: 0.9rem;
    font-weight: 500;
    margin-bottom: 8px;
    color: #4fc3f7;
}

.details-list {
    margin: 0;
    padding-left: 16px;
    list-style: none;
}

.details-list li {
    font-size: 0.8rem;
    margin-bottom: 4px;
    color: #bdbdbd;
}

.details-list code {
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 4px;
    border-radius: 2px;
    font-family: 'Courier New', monospace;
}

.sprint-without-files {
    opacity: 0.7;
}

.sprint-stats.no-files {
    color: #9e9e9e;
    font-style: italic;
}

.stat-value {
    font-weight: bold;
    color: #4fc3f7;
}

.preview-list {
    background: transparent !important;
}

.sprints-breakdown {
    max-height: 300px;
    overflow-y: auto;
}

.sprint-stats,
.sprint-result {
    font-size: 0.8rem;
    color: #bdbdbd;
}

.results-summary {
    text-align: left;
}

.results-list {
    background: transparent !important;
}

.error-list {
    text-align: left;
    margin: 0;
    padding-left: 20px;
}

.error-list li {
    font-size: 0.8rem;
    margin-bottom: 4px;
}
</style>

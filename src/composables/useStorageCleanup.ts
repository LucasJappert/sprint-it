import MyAlerts from "@/plugins/my-alerts";
import { notifyError, notifyOk } from "@/plugins/my-notification-helper/my-notification-helper";
import { executeStorageCleanup, identifyFilesToCleanup, type CleanupResult } from "@/services/storageCleanup";
import { useSprintStore } from "@/stores/sprint";
import { validateBackupZip, type BackupValidationResult } from "@/utils/backupValidator";
import { computed, ref } from "vue";

export type CleanupStep = "upload" | "password" | "preview" | "executing" | "complete" | "error";

export const useStorageCleanup = () => {
    const sprintStore = useSprintStore();
    const currentStep = ref<CleanupStep>("upload");
    const backupFile = ref<File | null>(null);
    const backupValidation = ref<BackupValidationResult | null>(null);
    const password = ref("");
    const isProcessing = ref(false);
    const cleanupResult = ref<CleanupResult | null>(null);
    const filesToCleanup = ref<any[]>([]);
    const error = ref("");
    const executionTime = ref(0);
    const executionTimer = ref<NodeJS.Timeout | null>(null);
    const verificationProgress = ref({
        total: 0,
        verified: 0,
        current: ""
    });

    const isValidating = computed(() => isProcessing.value && currentStep.value === "upload");
    const isExecuting = computed(() => currentStep.value === "executing");
    const canProceedToPassword = computed(() => backupValidation.value?.isValid === true);
    const canProceedToPreview = computed(() => password.value === "Sistemas2023");
    const canExecuteCleanup = computed(() => filesToCleanup.value.length > 0);
    const totalFilesToCleanup = computed(() => {
        return filesToCleanup.value.reduce((total, sprint) => {
            return total + sprint.attachments.length + sprint.imageUrls.length;
        }, 0);
    });

    const reset = () => {
        currentStep.value = "upload";
        backupFile.value = null;
        backupValidation.value = null;
        password.value = "";
        isProcessing.value = false;
        cleanupResult.value = null;
        filesToCleanup.value = [];
        error.value = "";
        executionTime.value = 0;
        if (executionTimer.value) {
            clearInterval(executionTimer.value);
            executionTimer.value = null;
        }
    };

    const startExecutionTimer = () => {
        executionTime.value = 0;
        executionTimer.value = setInterval(() => {
            executionTime.value++;
        }, 1000);
    };

    const stopExecutionTimer = () => {
        if (executionTimer.value) {
            clearInterval(executionTimer.value);
            executionTimer.value = null;
        }
    };

    const formatElapsedTime = (seconds: number): string => {
        if (seconds < 60) {
            return `${seconds}s`;
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    const handleBackupUpload = async (file: File) => {
        if (!file || !file.name.endsWith('.zip')) {
            notifyError("El archivo debe ser un ZIP");
            return;
        }

        backupFile.value = file;
        isProcessing.value = true;
        error.value = "";

        try {
            const validation = await validateBackupZip(file);
            backupValidation.value = validation;

            if (!validation.isValid) {
                error.value = validation.error || "Error desconocido";
                notifyError(error.value);
            }
        } catch (err) {
            error.value = `Error al validar backup: ${err}`;
            notifyError(error.value);
        } finally {
            isProcessing.value = false;
        }
    };

    const validatePassword = () => {
        if (password.value === "Sistemas2023") {
            currentStep.value = "preview";
            loadCleanupPreview();
        } else {
            notifyError("Contraseña incorrecta");
        }
    };

    const loadCleanupPreview = async () => {
        isProcessing.value = true;
        verificationProgress.value = { total: 0, verified: 0, current: "Iniciando verificación..." };
        
        try {
            const files = await identifyFilesToCleanup(sprintStore.currentSprintId, (verified, total) => {
                verificationProgress.value = {
                    total,
                    verified,
                    current: `Verificando imágenes: ${verified}/${total}`
                };
            });
            filesToCleanup.value = files;
            
            // Resetear progreso
            verificationProgress.value = { total: 0, verified: 0, current: "" };
            
            // Verificar si hay archivos para limpiar
            const totalFiles = files.reduce((total, sprint) => {
                return total + sprint.attachments.length + sprint.imageUrls.length;
            }, 0);
            
            if (totalFiles === 0) {
                // No hay archivos para limpiar, ir directamente a paso de "no files"
                currentStep.value = "complete";
                notifyOk("No hay archivos antiguos para limpiar");
            } else {
                currentStep.value = "preview";
            }
        } catch (err) {
            error.value = `Error al cargar preview: ${err}`;
            notifyError(error.value);
        } finally {
            isProcessing.value = false;
        }
    };

    const executeCleanup = async () => {
        const confirmed = await MyAlerts.warmConfirmAsync(
            `<p>¿Estás seguro de eliminar los archivos de los siguientes sprints?</p>
             <p><strong>${filesToCleanup.value.map(f => f.sprintTitle).join(", ")}</strong></p>
             <p>Esta acción no se puede deshacer.</p>`
        );

        if (!confirmed) return;

        currentStep.value = "executing";
        isProcessing.value = true;
        startExecutionTimer();

        try {
            const result = await executeStorageCleanup();
            cleanupResult.value = result;
            currentStep.value = "complete";
            notifyOk("Limpieza completada exitosamente");
        } catch (err) {
            error.value = `Error durante la limpieza: ${err}`;
            currentStep.value = "error";
            notifyError(error.value);
        } finally {
            stopExecutionTimer();
            isProcessing.value = false;
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    return {
        // Estado
        currentStep,
        backupFile,
        backupValidation,
        password,
        isProcessing,
        cleanupResult,
        filesToCleanup,
        error,
        executionTime,
        verificationProgress,

        // Computados
        isValidating,
        isExecuting,
        canProceedToPassword,
        canProceedToPreview,
        canExecuteCleanup,
        totalFilesToCleanup,

        // Acciones
        reset,
        handleBackupUpload,
        validatePassword,
        executeCleanup,
        formatElapsedTime,
        formatFileSize,
    };
};

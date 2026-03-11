import { ATTACHMENT_CONFIG, formatFileSize, isAllowedFileType, isFileSizeValid } from "@/constants/attachments";
import MyAlerts from "@/plugins/my-alerts";
import { notifyError, notifyOk } from "@/plugins/my-notification-helper/my-notification-helper";
import { addAttachment, deleteAttachment as deleteAttachmentFromFirestore, getAttachmentsByAssociatedId } from "@/services/firestore";
import { uploadAttachment } from "@/services/uploads";
import { useAuthStore } from "@/stores/auth";
import type { Attachment } from "@/types";
import { ref } from "vue";

export const useAttachments = () => {
    const attachments = ref<Attachment[]>([]);
    const isUploading = ref(false);
    const isLoading = ref(false);
    const authStore = useAuthStore();

    const loadAttachments = async (associatedId: string): Promise<void> => {
        isLoading.value = true;
        try {
            attachments.value = await getAttachmentsByAssociatedId(associatedId);
            console.log("Loaded attachments for", associatedId, ":", attachments.value.length);
        } catch (error) {
            console.error("Error loading attachments:", error);
            attachments.value = [];
        } finally {
            isLoading.value = false;
        }
    };

    const validateFile = (file: File): { valid: boolean; error?: string; } => {
        if (!isAllowedFileType(file)) {
            return {
                valid: false,
                error: "Tipo de archivo no permitido. Solo se admiten: PDF, Excel, Word, imágenes, ZIP, RAR",
            };
        }
        if (!isFileSizeValid(file)) {
            return { valid: false, error: `El archivo supera el límite de ${formatFileSize(ATTACHMENT_CONFIG.MAX_FILE_SIZE)}` };
        }
        if (attachments.value.length >= ATTACHMENT_CONFIG.MAX_ATTACHMENTS_PER_ITEM) {
            return { valid: false, error: `Solo se pueden adjuntar máximo ${ATTACHMENT_CONFIG.MAX_ATTACHMENTS_PER_ITEM} archivos` };
        }
        return { valid: true };
    };

    const uploadFile = async (file: File, associatedId: string, associatedType: "item" | "task"): Promise<Attachment | null> => {
        const validation = validateFile(file);
        if (!validation.valid) {
            notifyError(validation.error || "Archivo no válido");
            return null;
        }

        isUploading.value = true;
        try {
            const storageUrl = await uploadAttachment(file);
            const userId = authStore.user?.id || "";

            const attachment: Omit<Attachment, "id"> = {
                associatedId,
                associatedType,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                storageUrl,
                uploadedBy: userId,
                uploadedAt: new Date(),
            };

            const id = await addAttachment(attachment);
            console.log("Saved attachment with ID:", id, "for associatedId:", associatedId);
            const newAttachment: Attachment = { ...attachment, id };
            attachments.value.push(newAttachment);
            return newAttachment;
        } catch (error) {
            console.error("Error uploading file:", error);
            notifyError("Error al subir el archivo");
            return null;
        } finally {
            isUploading.value = false;
        }
    };

    const confirmAndUpload = async (file: File, associatedId: string, associatedType: "item" | "task"): Promise<Attachment | null> => {
        // Validar primero antes de mostrar confirmación
        const validation = validateFile(file);
        if (!validation.valid) {
            notifyError(validation.error || "Archivo no válido");
            return null;
        }

        const confirmed = await MyAlerts.warmConfirmAsync(
            `<p>¿Deseas adjuntar el archivo <strong>${file.name}</strong>?</p>
             <p>Tamaño: ${formatFileSize(file.size)}</p>`
        );

        if (!confirmed) return null;
        return uploadFile(file, associatedId, associatedType);
    };

    const handlePaste = async (event: ClipboardEvent, associatedId: string, associatedType: "item" | "task"): Promise<void> => {
        const items = event.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.kind === "file") {
                const file = item.getAsFile();
                if (file) {
                    await confirmAndUpload(file, associatedId, associatedType);
                }
            }
        }
    };

    const handleDrop = async (event: DragEvent, associatedId: string, associatedType: "item" | "task"): Promise<void> => {
        event.preventDefault();
        const files = event.dataTransfer?.files;
        if (!files) return;

        for (const file of Array.from(files)) {
            await confirmAndUpload(file, associatedId, associatedType);
        }
    };

    const handleFileSelect = async (event: Event, associatedId: string, associatedType: "item" | "task"): Promise<void> => {
        const input = event.target as HTMLInputElement;
        const files = input.files;
        if (!files) return;

        for (const file of Array.from(files)) {
            await confirmAndUpload(file, associatedId, associatedType);
        }
        input.value = "";
    };

    const removeAttachment = async (attachmentId: string, attachmentName?: string): Promise<void> => {
        const confirmed = await MyAlerts.warmConfirmAsync(
            `<p>¿Estás seguro de eliminar el archivo <strong>${attachmentName || "este archivo"}</strong>?</p>
             <p>Esta acción no se puede deshacer.</p>`
        );

        if (!confirmed) return;

        try {
            await deleteAttachmentFromFirestore(attachmentId);
            attachments.value = attachments.value.filter((a) => a.id !== attachmentId);
            notifyOk("Archivo eliminado correctamente");
        } catch (error) {
            console.error("Error deleting attachment:", error);
            notifyError("Error al eliminar el archivo");
        }
    };

    const canAddMore = (): boolean => {
        return attachments.value.length < ATTACHMENT_CONFIG.MAX_ATTACHMENTS_PER_ITEM;
    };

    return {
        attachments,
        isUploading,
        isLoading,
        loadAttachments,
        uploadFile,
        confirmAndUpload,
        handlePaste,
        handleDrop,
        handleFileSelect,
        removeAttachment,
        validateFile,
        canAddMore,
    };
};

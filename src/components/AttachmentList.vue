<template>
    <div class="attachment-list">
        <div v-if="attachments.length === 0" class="no-attachments">
            <v-icon size="48" color="grey-lighten-1">mdi-file-attachment-outline</v-icon>
            <p class="text-grey mt-2">No hay archivos adjuntos</p>
        </div>
        <div v-else class="attachments-container">
            <div v-for="attachment in attachments" :key="attachment.id" class="attachment-item my-1">
                <v-icon :color="getIconColor(attachment.fileType)" size="24" class="mr-2">
                    {{ getFileIcon(attachment.fileType) }}
                </v-icon>
                <div class="attachment-info">
                    <span class="attachment-name" :title="attachment.fileName">{{ attachment.fileName }}</span>
                    <span class="attachment-size">({{ formatFileSize(attachment.fileSize) }})</span>
                </div>
                <div class="attachment-actions">
                    <v-btn icon size="small" variant="text" color="info" @click="copyUrl(attachment.storageUrl)" title="Copiar URL">
                        <v-icon size="18">mdi-link</v-icon>
                    </v-btn>
                    <v-btn icon size="small" variant="text" color="green" @click="downloadFile(attachment.storageUrl, attachment.fileName)">
                        <v-icon size="18">mdi-download</v-icon>
                    </v-btn>
                    <v-btn icon size="small" variant="text" color="error" @click="$emit('remove', attachment.id, attachment.fileName)">
                        <v-icon size="18">mdi-delete</v-icon>
                    </v-btn>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { formatFileSize as formatSize } from "@/constants/attachments";
import type { Attachment } from "@/types";

interface Props {
    attachments: Attachment[];
}

defineProps<Props>();

defineEmits<{
    remove: [attachmentId: string, attachmentName?: string];
}>();

const getFileIcon = (fileType: string): string => {
    if (fileType.includes("pdf")) return "mdi-file-pdf-box";
    if (fileType.includes("excel") || fileType.includes("spreadsheet")) return "mdi-file-excel";
    if (fileType.includes("word") || fileType.includes("document")) return "mdi-file-word";
    if (fileType.includes("image")) return "mdi-file-image";
    if (fileType.includes("zip") || fileType.includes("rar") || fileType.includes("compressed")) return "mdi-folder-zip";
    return "mdi-file";
};

const getIconColor = (fileType: string): string => {
    if (fileType.includes("pdf")) return "red";
    if (fileType.includes("excel") || fileType.includes("spreadsheet")) return "green";
    if (fileType.includes("word") || fileType.includes("document")) return "blue";
    if (fileType.includes("image")) return "purple";
    if (fileType.includes("zip") || fileType.includes("rar")) return "orange";
    return "grey";
};

const formatFileSize = (bytes: number): string => {
    return formatSize(bytes);
};

const downloadFile = (url: string, fileName: string): void => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const copyUrl = async (url: string): Promise<void> => {
    try {
        await navigator.clipboard.writeText(url);
    } catch (error) {
        console.error("Error copying to clipboard:", error);
    }
};
</script>

<style scoped lang="scss">
.attachment-list {
    width: 100%;
}

.no-attachments {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    text-align: center;
}

.attachments-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.attachment-item {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
}

.attachment-info {
    flex: 1;
    min-width: 0;
    margin-right: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.attachment-name {
    font-size: 0.875rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 1;
    min-width: 0;
    color: #ffffffcc;
}

.attachment-size {
    font-size: 0.75rem;
    color: rgba(0, 0, 0, 0.6);
    white-space: nowrap;
    flex-shrink: 0;
    color: #ffffff55;
}

.attachment-actions {
    display: flex;
    gap: 4px;
}
</style>

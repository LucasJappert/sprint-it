<template>
    <div class="attachments-section mt-2">
        <AttachmentUploader
            :is-uploading="isUploading"
            :disabled="disabled"
            @file-select="$emit('file-select', $event)"
            @drag-drop="$emit('drag-drop', $event)"
        />
        <AttachmentList :attachments="attachments" @remove="$emit('remove', $event)" class="mt-3" />
    </div>
</template>

<script setup lang="ts">
import AttachmentList from "@/components/AttachmentList.vue";
import AttachmentUploader from "@/components/AttachmentUploader.vue";
import type { Attachment } from "@/types";

interface Props {
    isUploading: boolean;
    disabled: boolean;
    attachments: Attachment[];
}

defineProps<Props>();

defineEmits<{
    "file-select": [files: FileList];
    "drag-drop": [files: FileList];
    remove: [attachmentId: string, attachmentName?: string];
}>();
</script>

<template>
    <div class="attachment-uploader">
        <input ref="fileInput" type="file" :accept="acceptedTypes" multiple style="display: none" @change="onFileSelect" />
        <div
            class="drop-zone"
            :class="{ 'drop-zone-active': isDragOver, 'drop-zone-disabled': disabled }"
            @dragover.prevent="onDragOver"
            @dragleave="onDragLeave"
            @drop.prevent="onDrop"
            @click="openFileSelector"
        >
            <v-icon size="40" color="grey-lighten-1">mdi-cloud-upload</v-icon>
            <p class="mt-2 text-grey-darken-1">Arrastra un archivo aquí o haz clic para seleccionar</p>
            <p class="text-caption text-grey">Máximo {{ maxFiles }} archivos de {{ maxSizeText }}</p>
        </div>
        <v-progress-linear v-if="isUploading" indeterminate color="primary" class="mt-2" />
    </div>
</template>

<script setup lang="ts">
import { ATTACHMENT_CONFIG, formatFileSize } from "@/constants/attachments";
import { computed, ref } from "vue";

interface Props {
    isUploading?: boolean;
    disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    isUploading: false,
    disabled: false,
});

const emit = defineEmits<{
    fileSelect: [files: FileList];
    dragDrop: [files: FileList];
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const isDragOver = ref(false);

const maxFiles = ATTACHMENT_CONFIG.MAX_ATTACHMENTS_PER_ITEM;
const maxSizeText = formatFileSize(ATTACHMENT_CONFIG.MAX_FILE_SIZE);

const acceptedTypes = computed(() => {
    return ATTACHMENT_CONFIG.ALLOWED_EXTENSIONS.join(",");
});

const openFileSelector = (): void => {
    if (props.disabled || props.isUploading) return;
    fileInput.value?.click();
};

const onFileSelect = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
        emit("fileSelect", input.files);
    }
};

const onDragOver = (): void => {
    if (props.disabled || props.isUploading) return;
    isDragOver.value = true;
};

const onDragLeave = (): void => {
    isDragOver.value = false;
};

const onDrop = (event: DragEvent): void => {
    isDragOver.value = false;
    if (props.disabled || props.isUploading) return;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
        emit("dragDrop", files);
    }
};
</script>

<style scoped lang="scss">
.attachment-uploader {
    width: 100%;
}

.drop-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    border: 2px dashed rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    background: rgba(var(--v-theme-primary), 0.1);
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;
    min-height: 120px;

    &:hover:not(.drop-zone-disabled) {
        border-color: rgba(var(--v-theme-primary), 0.5);
        background: rgba(var(--v-theme-primary), 0.05);
    }

    &-active {
        border-color: rgb(var(--v-theme-primary));
        background: rgba(var(--v-theme-primary), 0.1);
    }

    &-disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
}
</style>

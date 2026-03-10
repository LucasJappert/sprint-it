<template>
    <div class="image-preview">
        <img :src="src" :alt="alt" class="preview-image" @click="handleMiddleClick" @auxclick="handleMiddleClick" />

        <div class="action-buttons">
            <button class="action-btn fullscreen-btn" @click.stop="openFullscreen" title="Ver en pantalla completa">
                <v-icon size="18">mdi-fullscreen</v-icon>
            </button>
            <button v-if="showDeleteButton" class="action-btn delete-btn" @click.stop="handleRemove" title="Eliminar imagen">
                <v-icon size="18">mdi-delete-outline</v-icon>
            </button>
        </div>

        <FullScreenImageDialog :visible="fullscreenVisible" :src="src" :alt="alt" @close="fullscreenVisible = false" />
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import FullScreenImageDialog from "./FullScreenImageDialog.vue";

interface Props {
    src: string;
    alt?: string;
    removable?: boolean;
    showDeleteButton?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    alt: "",
    removable: true,
    showDeleteButton: false,
});

const emit = defineEmits<{
    remove: [];
}>();

const fullscreenVisible = ref(false);

const openFullscreen = () => {
    fullscreenVisible.value = true;
};

const handleRemove = () => {
    emit("remove");
};

const handleMiddleClick = (event: MouseEvent) => {
    if (event.button === 1) {
        event.preventDefault();
        window.open(props.src, "_blank");
    }
};
</script>

<style scoped lang="scss">
.image-preview {
    position: relative;
    display: inline-block;
    min-width: 200px;
    min-height: 200px;
    max-width: 800px;
    max-height: 800px;
    margin: 8px 0;
    border-radius: 8px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.1);

    &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
}

.preview-image {
    display: block;
    width: 100%;
    height: auto;
    min-width: 200px;
    min-height: 200px;
    max-width: 800px;
    max-height: 800px;
    object-fit: contain;
    border-radius: 8px;
    cursor: pointer;
}

.action-buttons {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 10;
    display: flex;
    gap: 8px;
}

.action-btn {
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: white;
    transition: all 0.2s ease;

    &:hover {
        transform: scale(1.1);
    }
}

.fullscreen-btn {
    background: rgba(34, 197, 94, 0.8);

    &:hover {
        background: rgba(34, 197, 94, 1);
        border-color: rgba(255, 255, 255, 0.6);
    }
}

.delete-btn {
    background: rgba(239, 68, 68, 0.8);

    &:hover {
        background: rgba(239, 68, 68, 1);
        border-color: rgba(255, 255, 255, 0.6);
    }
}
</style>

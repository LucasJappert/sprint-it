<template>
    <div class="image-preview">
        <img :src="src" :alt="alt" class="preview-image" @click="handleMiddleClick" @auxclick="handleMiddleClick" />

        <div class="action-buttons">
            <v-btn icon size="x-small" @click.stop="openFullscreen" title="Ver pantalla completa">
                <v-icon size="28" class="green">mdi-fullscreen</v-icon>
            </v-btn>
            <v-btn v-if="showDeleteButton" icon size="x-small" @click.stop="handleRemove" title="Eliminar imagen">
                <v-icon size="24" class="danger">mdi-trash-can-outline</v-icon>
            </v-btn>
        </div>

        <FullScreenImageDialog :visible="fullscreenVisible" :src="src" :alt="alt" @close="fullscreenVisible = false" />
    </div>
</template>

<script setup lang="ts">
import MyAlerts from "@/plugins/my-alerts";
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

const handleRemove = async () => {
    const confirmed = await MyAlerts.confirmAsync("Eliminar imagen", "¿Estás seguro de que quieres eliminar esta imagen?", "warning");
    if (confirmed) {
        emit("remove");
    }
};

const handleMiddleClick = (event: MouseEvent) => {
    if (event.button === 1) {
        event.preventDefault();
        window.open(props.src, "_blank");
    }
};
</script>

<style scoped lang="scss">
@use "@/styles/variables";

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

        .action-buttons {
            opacity: 1;
            visibility: visible;
        }
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
    gap: 4px;
    opacity: 0;
    visibility: hidden;
    transition:
        opacity 0.2s ease,
        visibility 0.2s ease;

    @media (hover: none) {
        opacity: 1;
        visibility: visible;
    }
}
</style>

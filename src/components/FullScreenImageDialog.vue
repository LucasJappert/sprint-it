<template>
    <MyDialog :visible="visible" :min-width="0" @close="handleClose" persistent>
        <div class="fullscreen-image-container">
            <button class="close-btn" @click="handleClose" title="Cerrar">
                <v-icon size="24">mdi-close</v-icon>
            </button>
            <img :src="src" :alt="alt" class="fullscreen-image" @load="onImageLoad" />
        </div>
    </MyDialog>
</template>

<script setup lang="ts">
import MyDialog from "@/components/global/MyDialog.vue";

interface Props {
    visible: boolean;
    src: string;
    alt?: string;
}

const props = withDefaults(defineProps<Props>(), {
    alt: "",
});

const emit = defineEmits<{
    close: [];
}>();

const handleClose = () => {
    emit("close");
};

const onImageLoad = () => {
    // Image loaded successfully
};
</script>

<style scoped lang="scss">
.fullscreen-image-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 90vw;
    min-height: 90vh;
    background: rgba(0, 0, 0, 0.95);
    overflow: auto;
}

.close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 100;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: white;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(0, 0, 0, 0.8);
        border-color: rgba(255, 255, 255, 0.4);
    }
}

.fullscreen-image {
    max-width: 95vw;
    max-height: 95vh;
    object-fit: contain;
    border-radius: 4px;
}
</style>

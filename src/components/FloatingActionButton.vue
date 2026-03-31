<script setup lang="ts">
import { computed, ComputedRef, ref } from "vue";

interface Props {
    title: string;
    icon: string;
    gradientColors: [string, string];
    shouldShow: boolean | ComputedRef<boolean>;
    dialogComponent: any;
}

const props = defineProps<Props>();

const showDialog = ref(false);

// Abrir diálogo
const openDialog = () => {
    showDialog.value = true;
};

// Generar gradiente CSS dinámicamente
const gradientStyle = computed(() => ({
    background: `linear-gradient(135deg, ${props.gradientColors[0]} 0%, ${props.gradientColors[1]} 100%) !important`,
}));

// Manejar shouldShow como computed
const isVisible = computed(() => {
    return typeof props.shouldShow === "boolean" ? props.shouldShow : props.shouldShow.value;
});
</script>

<template>
    <div v-if="isVisible" class="floating-wrapper">
        <div class="floating-title">
            <span>
                {{ title }}
            </span>
        </div>
        <VBtn class="floating-btn" :style="gradientStyle" size="large" icon @click="openDialog">
            <VIcon :icon="icon" size="24" />
        </VBtn>
    </div>

    <!-- Componente de diálogo dinámico -->
    <component :is="dialogComponent" v-model="showDialog" />
</template>

<style scoped lang="scss">
.floating-wrapper {
    position: relative;
    transition: transform 0.3s ease;
    transform: translateX(50%);

    &:hover {
        transform: translateX(0);

        .floating-title {
            opacity: 1;
        }
    }
}

.floating-title {
    position: absolute;
    left: -200px;
    top: 50%;
    transform: translateY(-50%);
    color: white;
    text-shadow:
        0 0 3px #000000,
        0 0 3px #000000;
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    opacity: 0;
    transition:
        opacity 0.3s ease,
        visibility 0.3s ease;
    pointer-events: none;
    width: 200px;
    text-align: right;
    span {
        padding: 5px 10px;
        border-radius: 8px 0 0 8px !important;
        background-color: #000000 !important;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    }
}

.floating-btn {
    border-radius: 8px 0 0 8px !important;
    box-shadow: -4px 4px 12px rgba(0, 0, 0, 0.15);
}

// Estilo para el fondo de los diálogos
:deep(.v-dialog .v-card) {
    background-color: rgb(var(--v-theme-surface)) !important;
}

:deep(.v-dialog .v-card-title) {
    background-color: rgb(var(--v-theme-surface)) !important;
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
}
</style>

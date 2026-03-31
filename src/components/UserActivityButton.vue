<script setup lang="ts">
import { useUserActivity } from "@/composables/useUserActivity";
import { computed, ref } from "vue";
import UserActivityDialog from "./UserActivityDialog.vue";

const userActivity = useUserActivity();

const showDialog = ref(false);

// Verificar si el usuario está autenticado
const shouldShowButton = computed(() => userActivity.shouldShowButton);

// Abrir diálogo de actividad de usuarios
const openDialog = async () => {
    showDialog.value = true;
};
</script>

<template>
    <div v-if="shouldShowButton" class="user-activity-floating-wrapper">
        <span class="user-activity-title">Actividad de usuarios</span>
        <VBtn class="user-activity-floating-btn" size="large" icon @click="openDialog">
            <VIcon icon="mdi-account-clock-outline" size="24" />
        </VBtn>
    </div>

    <!-- Diálogo de actividad de usuarios -->
    <UserActivityDialog v-model="showDialog" />
</template>

<style scoped lang="scss">
.user-activity-floating-wrapper {
    position: fixed;
    top: calc(20px + 56px + 10px);
    right: 0;
    z-index: 1000;
    transition: transform 0.3s ease;
    display: flex;
    align-items: center;

    transform: translateX(50%);

    &:has(.user-activity-floating-btn:hover) {
        transform: translateX(0);

        .user-activity-title {
            opacity: 1;
            visibility: visible;
            background-color: #00000050;
            padding: 2px 5px;
            border-radius: 5px 0 0 5px;
        }
    }
}

.user-activity-title {
    color: white;
    text-shadow:
        0 0 5px #000000,
        0 0 5px #000000;
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    margin-right: 0;
    opacity: 0;
    visibility: hidden;
    transition:
        opacity 0.3s ease,
        visibility 0.3s ease;
}

.user-activity-floating-btn {
    border-radius: 8px 0 0 8px !important;
    box-shadow: -4px 4px 12px rgba(0, 0, 0, 0.15);
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
}

// Estilo para el fondo del diálogo de actividad de usuarios
:deep(.v-dialog .v-card) {
    background-color: rgb(var(--v-theme-surface)) !important;
}

:deep(.v-dialog .v-card-title) {
    background-color: rgb(var(--v-theme-surface)) !important;
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
}

// Ocultar en móviles
@media (max-width: 768px) {
    .only-desktop {
        display: none !important;
    }
}
</style>

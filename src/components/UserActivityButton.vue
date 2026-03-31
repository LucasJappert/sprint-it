<script setup lang="ts">
import { useUserActivity } from "@/composables/useUserActivity";
import { computed } from "vue";
import FloatingActionButton from "./FloatingActionButton.vue";
import UserActivityDialog from "./UserActivityDialog.vue";

const userActivity = useUserActivity();

// Verificar si el usuario está autenticado
const shouldShowButton = computed(() => userActivity.shouldShowButton);
</script>

<template>
    <FloatingActionButton
        title="Actividad de usuarios"
        icon="mdi-account-clock-outline"
        :gradientColors="['#6366f1', '#8b5cf6']"
        :shouldShow="shouldShowButton"
        :dialogComponent="UserActivityDialog"
    />
</template>

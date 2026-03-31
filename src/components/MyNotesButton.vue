<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { computed } from "vue";
import FloatingActionButton from "./FloatingActionButton.vue";
import MyNotesDialog from "./MyNotesDialog.vue";

const authStore = useAuthStore();

const shouldShowButton = computed(() => authStore.isAuthenticated);
</script>

<template>
    <FloatingActionButton
        title="Mis Notas"
        icon="mdi-note-text-outline"
        :gradientColors="['#f59e0b', '#f97316']"
        :shouldShow="shouldShowButton"
        :dialogComponent="MyNotesDialog"
    />
</template>

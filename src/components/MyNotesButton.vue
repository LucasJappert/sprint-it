<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { computed, ref } from "vue";
import MyNotesDialog from "./MyNotesDialog.vue";

const authStore = useAuthStore();
const showDialog = ref(false);

const shouldShowButton = computed(() => authStore.isAuthenticated);

const openDialog = () => {
    showDialog.value = true;
};
</script>

<template>
    <div v-if="shouldShowButton" class="notes-floating-wrapper">
        <span class="notes-title">Mis Notas</span>
        <VBtn class="notes-floating-btn" size="large" icon @click="openDialog">
            <VIcon icon="mdi-note-text-outline" size="24" />
        </VBtn>
    </div>

    <MyNotesDialog v-model="showDialog" />
</template>

<style scoped lang="scss">
.notes-floating-wrapper {
    position: relative;
    transition: transform 0.3s ease;
    transform: translateX(50%);

    &:hover {
        transform: translateX(0);

        .notes-title {
            opacity: 1;
            visibility: visible;
        }
    }
}

.notes-title {
    position: absolute;
    left: -210px;
    top: 50%;
    transform: translateY(-50%);
    color: white;
    text-shadow:
        0 0 5px #000000,
        0 0 5px #000000;
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    transition:
        opacity 0.3s ease,
        visibility 0.3s ease;
    pointer-events: none;
    z-index: 1;
    width: 200px;
    text-align: right;
}

.notes-floating-btn {
    border-radius: 8px 0 0 8px !important;
    box-shadow: -4px 4px 12px rgba(0, 0, 0, 0.15);
    background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%) !important;
}
</style>

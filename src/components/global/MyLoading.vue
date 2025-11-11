<template>
    <MyDialog :visible="visible" bg-transparent persistent>
        <div class="full-size flex-center">
            <div class="loading-container">
                <v-progress-linear indeterminate class="primary-light" />
                <p class="text">{{ message || "Cargando..." }}</p>
            </div>
        </div>
    </MyDialog>
</template>

<script setup lang="ts">
import MyDialog from "./MyDialog.vue";

defineProps<{
    visible: boolean;
    message?: string;
}>();
</script>

<style scoped lang="scss">
.loading-container {
    text-align: center;
    padding: 20px;
    background: var(--panel);
    border-radius: 8px;
    width: 600px;
    max-width: 95%;
    border: 1px solid rgba($primary, 0.4);
    box-shadow: 0 0 15px rgba($primary, 0.4);
}

p {
    color: white;
    margin-top: 10px;
    font-weight: 500;
}
</style>

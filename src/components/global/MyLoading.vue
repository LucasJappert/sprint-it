<template>
    <MyDialog :visible="visible" bg-transparent persistent>
        <div class="loading-container">
            <v-progress-linear indeterminate color="primary" />
            <p>{{ message || "Cargando..." }}</p>
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
    min-width: 200px;
}

p {
    color: white;
    margin-top: 10px;
    font-weight: 500;
}
</style>

<script setup lang="ts"></script>

<template>
    <div class="floating-buttons-container">
        <slot />
    </div>
</template>

<style scoped lang="scss">
.floating-buttons-container {
    position: fixed;
    top: 60px;
    right: 0;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>

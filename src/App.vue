<script setup lang="ts">
import MyNotificationsHost from "@/plugins/my-notification-helper/MyNotificationsHost.vue";
import { initPWAUpdater } from "@/plugins/pwa-updater";
import { useLoadingStore } from "@/stores/loading";

const loadingStore = useLoadingStore();

// Initialize PWA updater
initPWAUpdater();
</script>

<template>
    <v-app>
        <router-view />
        <MyLoading :visible="loadingStore.isLoading" />
        <MyNotificationsHost />
        <VersionUpdateNotification />
        <PwaInstallButton />
    </v-app>
</template>

<style>
#app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
}
</style>

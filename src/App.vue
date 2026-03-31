<script setup lang="ts">
import FloatingButtonsContainer from "@/components/FloatingButtonsContainer.vue";
import MyNotesButton from "@/components/MyNotesButton.vue";
import UserActivityButton from "@/components/UserActivityButton.vue";
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
        <FloatingButtonsContainer>
            <MyNotesButton />
            <UserActivityButton />
        </FloatingButtonsContainer>
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

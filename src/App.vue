<script setup lang="ts">
import MyNotificationsHost from "@/plugins/my-notification-helper/MyNotificationsHost.vue";
import { useLoadingStore } from "@/stores/loading";

const loadingStore = useLoadingStore();
</script>

<template>
    <v-app>
        <router-view />
        <MyLoading :visible="loadingStore.isLoading" />
        <MyNotificationsHost />
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

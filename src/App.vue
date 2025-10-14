<script setup lang="ts">
import MyLoading from "@/components/global/MyLoading.vue";
import MyNotificationsHost from "@/plugins/my-notification-helper/MyNotificationsHost.vue";
import { useLoadingStore } from "@/stores/loading";
import { onMounted } from "vue";

const loadingStore = useLoadingStore();

onMounted(() => {});
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

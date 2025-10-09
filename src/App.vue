<script setup lang="ts">
import MyLoading from "@/components/global/MyLoading.vue";
import { useLoadingStore } from "@/stores/loading";
import { useRouter } from "vue-router";

const router = useRouter();
const loadingStore = useLoadingStore();
</script>

<template>
    <v-app>
        <router-view />
        <MyLoading :visible="loadingStore.isLoading" />
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

<template>
    <v-app-bar color="rgba(0, 0, 0, 0.2)" dark height="50">
        <v-spacer />
        <v-menu>
            <template #activator="{ props }">
                <v-avatar v-bind="props" size="40" class="avatar" color="$primary">
                    <span class="avatar-text">{{ authStore.user?.name?.charAt(0).toUpperCase() }}</span>
                </v-avatar>
            </template>
            <div class="menu">
                <div class="menu-item">
                    <span>Hello {{ authStore.user?.name }}!</span>
                </div>
                <div class="menu-item" @click="logout">
                    <v-icon>mdi-logout</v-icon>
                    <span>Logout</span>
                </div>
            </div>
        </v-menu>
    </v-app-bar>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";

const authStore = useAuthStore();
const router = useRouter();

const logout = async () => {
    await authStore.logout();
    router.push("/");
};
</script>

<style scoped lang="scss">
.v-app-bar {
    box-shadow: 0 0 5px #00ffff50 !important;
}
.menu {
    background: $bg-primary;
    border-radius: 4px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
    min-width: 200px;
    padding: 4px 0;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.menu-item {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    cursor: pointer;
    transition: background-color 0.2s;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background-color: rgba(255, 255, 255, 0.04);
    }

    &:active {
        background-color: rgba(255, 255, 255, 0.08);
    }
}

.menu-item .v-icon {
    margin-right: 12px;
    color: $text;
}

.menu-item span {
    font-size: 14px;
    color: $text;
}

.avatar {
    margin-right: 5px;
    border: 2px solid $primary;
    box-shadow: 0 0 5px $primary;
}

.avatar-text {
    color: $primary;
    font-size: 18px;
    font-weight: bold;
}
</style>

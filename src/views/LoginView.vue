<script setup lang="ts">
import MyButton from "@/components/global/MyButton.vue";
import MyInput from "@/components/global/MyInput.vue";
import { notifyError } from "@/plugins/my-notification-helper/my-notification-helper";
import { useAuthStore } from "@/stores/auth";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const authStore = useAuthStore();

const username = ref("");
const password = ref("");
const rememberMe = ref(false);
const showPassword = ref(false);

onMounted(() => {
    authStore.initAuth();
    username.value = authStore.lastUsername;
    rememberMe.value = authStore.rememberMe;
});

const login = async () => {
    try {
        await authStore.login(username.value, password.value, rememberMe.value);
        router.push("/dashboard");
    } catch (err: any) {
        notifyError("Error de autenticación", err.message);
    }
};
</script>

<template>
    <div class="login-container">
        <div class="login-card">
            <div class="login-title">
                <div class="app-name">SPRINT IT</div>
                <div class="tagline">Accelerate Your Projects</div>
            </div>
            <div class="login-content">
                <MyInput v-model="username" label="Username" />
                <div class="password-input-container">
                    <MyInput v-model="password" label="Password" :type="showPassword ? 'text' : 'password'" class="mt-2" />
                    <button type="button" class="password-toggle" @click="showPassword = !showPassword">
                        <v-icon>{{ showPassword ? "mdi-eye-off" : "mdi-eye" }}</v-icon>
                    </button>
                </div>
                <div class="checkbox-container">
                    <input type="checkbox" id="rememberMe" v-model="rememberMe" />
                    <label for="rememberMe">Remember me</label>
                </div>
            </div>
            <div class="login-actions">
                <MyButton @click="login" block>Login</MyButton>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
@import "@/styles/variables.scss";

.login-container {
    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
}

.login-card {
    background: rgba(45, 45, 45, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    padding: 16px;
    max-width: 400px;
    width: 100%;
}

.login-title {
    text-align: center;
    margin-bottom: 24px;
}

.app-name {
    color: $primary;
    font-size: 2.5rem;
    font-weight: 700;
    letter-spacing: 2px;
    margin-bottom: 4px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.tagline {
    color: #ffffff;
    font-size: 1rem;
    font-weight: 300;
    opacity: 0.9;
    letter-spacing: 1px;
}

.login-content {
    color: #ffffff;
    margin-bottom: 16px;
}

.checkbox-container {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    color: #ffffff;
}

.checkbox-container input[type="checkbox"] {
    width: 16px;
    height: 16px;
}

.checkbox-container label {
    font-size: 14px;
    cursor: pointer;
}

.password-input-container {
    position: relative;
    margin-top: 8px;
}

.password-toggle {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    color: $text;
    padding: 4px;
    border-radius: 4px;
    transition: background-color 0.2s;
}

.password-toggle:hover {
    background-color: rgba(255, 255, 255, 0.1);
}

.login-actions {
    display: flex;
    justify-content: center;
}

.login-actions :deep(.my-button) {
    width: 100%;
}
</style>

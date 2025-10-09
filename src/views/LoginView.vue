<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import MyInput from "@/components/global/MyInput.vue";
import MyButton from "@/components/global/MyButton.vue";

const router = useRouter();
const authStore = useAuthStore();

const username = ref("");
const password = ref("");
const rememberMe = ref(false);
const error = ref("");

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
    error.value = err.message;
  }
};
</script>

<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="pa-4">
          <v-card-title class="text-center">Login</v-card-title>
          <v-card-text>
            <MyInput v-model="username" label="Username" />
            <MyInput v-model="password" label="Password" type="password" />
            <v-checkbox v-model="rememberMe" label="Recordarme" class="mt-2" />
            <v-alert v-if="error" type="error" class="mt-2">{{ error }}</v-alert>
          </v-card-text>
          <v-card-actions>
            <MyButton @click="login" color="primary" block>Login</MyButton>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.v-container {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  min-height: 100vh;
}

:deep(.v-card) {
  background: rgba(45, 45, 45, 0.95) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
}

:deep(.v-card-title) {
  color: #ffffff !important;
}

:deep(.v-card-text) {
  color: #ffffff !important;
}
</style>
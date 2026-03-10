import { useAuthStore } from "@/stores/auth";
import DashboardView from "@/views/DashboardView.vue";
import LoginView from "@/views/LoginView.vue";
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: "/",
            name: "login",
            component: LoginView,
            beforeEnter: (_to, _from, next) => {
                const authStore = useAuthStore();
                if (authStore.isAuthenticated) {
                    next("/dashboard");
                } else {
                    next();
                }
            },
        },
        {
            path: "/dashboard",
            name: "dashboard",
            component: DashboardView,
            beforeEnter: (_to, _from, next) => {
                const authStore = useAuthStore();
                if (!authStore.isAuthenticated) {
                    next("/");
                } else {
                    next();
                }
            },
        },
        {
            path: "/changelog",
            name: "changelog",
            component: () => import("@/views/ChangelogView.vue"),
            beforeEnter: (_to, _from, next) => {
                const authStore = useAuthStore();
                if (!authStore.isAuthenticated) {
                    next("/");
                } else {
                    next();
                }
            },
        },
    ],
});

export default router;

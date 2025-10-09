import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import LoginView from "@/views/LoginView.vue";
import DashboardView from "@/views/DashboardView.vue";

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: "/",
			name: "login",
			component: LoginView,
			beforeEnter: (to, from, next) => {
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
			beforeEnter: (to, from, next) => {
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
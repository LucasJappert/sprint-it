import { defineStore } from "pinia";
import { ref } from "vue";
import bcrypt from "bcryptjs";
import { db } from "@/services/firebase";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import type { User } from "@/types";

export const useAuthStore = defineStore("auth", () => {
	const user = ref<User | null>(null);
	const isAuthenticated = ref(false);
	const rememberMe = ref(false);
	const lastUsername = ref("");

	const login = async (username: string, password: string, remember: boolean = false) => {
		try {
			const usersRef = collection(db, "users");
			const q = query(usersRef, where("username", "==", username));
			const querySnapshot = await getDocs(q);

			if (querySnapshot.empty) {
				throw new Error("Usuario no encontrado");
			}

			const userDoc = querySnapshot.docs[0];
			if (!userDoc) {
				throw new Error("Usuario no encontrado");
			}

			const userData = userDoc.data() as User;

			const isPasswordValid = await bcrypt.compare(password, userData.password);
			if (!isPasswordValid) {
				throw new Error("Contraseña incorrecta");
			}

			user.value = { ...userData, id: userDoc.id };
			isAuthenticated.value = true;

			if (remember) {
				localStorage.setItem("user", JSON.stringify(user.value));
				localStorage.setItem("lastUsername", username);
			}
			localStorage.setItem("rememberMe", remember.toString());
		} catch (error) {
			throw error;
		}
	};

	const logout = async () => {
		user.value = null;
		isAuthenticated.value = false;
		localStorage.removeItem("user");
	};

	const initAuth = () => {
		const storedUser = localStorage.getItem("user");
		const storedRememberMe = localStorage.getItem("rememberMe");
		const storedLastUsername = localStorage.getItem("lastUsername");

		if (storedUser) {
			user.value = JSON.parse(storedUser);
			isAuthenticated.value = true;
		}

		if (storedRememberMe) {
			rememberMe.value = storedRememberMe === "true";
		}

		if (storedLastUsername) {
			lastUsername.value = storedLastUsername;
		}
	};

	return {
		user,
		isAuthenticated,
		rememberMe,
		lastUsername,
		login,
		logout,
		initAuth,
	};
});
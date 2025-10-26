import "@mdi/font/css/materialdesignicons.css";
import { createPinia } from "pinia";
import { createApp } from "vue";
import VueApexCharts from "vue3-apexcharts";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi";
import "vuetify/styles";
import "./styles/_my-styles.scss";

import MyAlerts from "@/plugins/my-alerts";
import App from "./App.vue";
import router from "./router/index";

const vuetify = createVuetify({
    theme: {
        defaultTheme: "dark",
        themes: {
            dark: {
                colors: {
                    primary: "#148a22",
                },
            },
        },
    },
    icons: {
        defaultSet: "mdi",
        aliases,
        sets: {
            mdi,
        },
    },
});

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(vuetify);
app.use(VueApexCharts);
app.use(MyAlerts);

// Initialize auth after Pinia is set up
import { useAuthStore } from "@/stores/auth";
const authStore = useAuthStore();
authStore.initAuth();

app.mount("#app");

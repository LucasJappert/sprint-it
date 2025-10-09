import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import vuetify from "vite-plugin-vuetify";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";

export default defineConfig({
    plugins: [
        vue(),
        vuetify({ autoImport: true }),
        AutoImport({
            imports: ["vue"],
            dts: "src/auto-imports.d.ts",
        }),
        Components({
            dirs: ["src/components/global"],
            extensions: ["vue"],
            deep: true,
            dts: "src/components.d.ts",
        }),
    ],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    css: {
        preprocessorOptions: {
            scss: {
                additionalData: `@use "@/styles/variables" as *;`,
            },
        },
    },
});

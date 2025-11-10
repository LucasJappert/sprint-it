import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import vuetify from "vite-plugin-vuetify";

export default defineConfig({
    base: "/",
    publicDir: "public",
    plugins: [
        vue(),
        vuetify({ autoImport: true }),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["images/pwa-192x192.png", "apple-touch-icon.png", "masked-icon.svg"],
            manifest: {
                name: "Sprint It",
                short_name: "SprintIt",
                description: "Application for managing sprints for teams",
                theme_color: "#33c7ff",
                background_color: "#121212",
                display: "standalone",
                orientation: "portrait",
                scope: "/",
                start_url: "/",
                icons: [
                    {
                        src: "images/pwa-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "images/pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                    },
                    {
                        src: "images/pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any maskable",
                    },
                ],
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: "CacheFirst",
                        options: {
                            cacheName: "google-fonts-cache",
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365,
                            },
                        },
                    },
                ],
            },
            devOptions: {
                enabled: true,
            },
        }),
        AutoImport({
            imports: [
                "vue",
                "pinia",
                // Auto-import specific stores
                {
                    from: "@/stores/dragDrop",
                    imports: ["useDragDropStore"]
                }
            ],
            dts: "src/auto-imports.d.ts",
        }),
        Components({
            dirs: ["src/components/global", "src/components"],
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
                additionalData: `@use "@/styles/variables.scss" as *;`,
            },
        },
    },
    optimizeDeps: {
        exclude: ["vuetify"],
        entries: [
            "./src/**/*.vue",
        ],
    },
});

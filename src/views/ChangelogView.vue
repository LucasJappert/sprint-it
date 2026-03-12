<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import changelogContent from "../../changelog.md?raw";
import packageJson from "../../package.json";

const router = useRouter();

const APP_VERSION = packageJson.version as string;

interface ChangeItem {
    category: string;
    title: string;
    description: string;
    subItems: string[];
}

interface ParsedVersion {
    version: string;
    date: string;
    changes: ChangeItem[];
}

const parseChangelog = (content: string): ParsedVersion[] => {
    const lines = content.split("\n");
    const versions: ParsedVersion[] = [];
    let currentVersion: ParsedVersion | null = null;
    let currentCategory = "";
    let currentChange: ChangeItem | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        const versionMatch = trimmedLine.match(/^##\s+v(\d+\.\d+\.\d+)\s*-\s*(\d{4}-\d{2}-\d{2})/);
        if (versionMatch) {
            if (currentVersion) {
                // Guardar cambio actual antes de cambiar de versión
                if (currentChange && (currentChange.title || currentChange.description)) {
                    currentVersion.changes.push({ ...currentChange });
                }
                versions.push(currentVersion);
            }
            currentVersion = {
                version: versionMatch[1],
                date: versionMatch[2],
                changes: [],
            };
            currentCategory = "";
            currentChange = null;
            continue;
        }

        if (!currentVersion) continue;

        const categoryMatch = trimmedLine.match(/^###\s+(.+)$/);
        if (categoryMatch) {
            currentCategory = categoryMatch[1];
            continue;
        }

        if (trimmedLine.includes("Todos los cambios del proyecto")) {
            continue;
        }

        if (trimmedLine === "---" || trimmedLine.startsWith("___")) {
            // Guardar cambio actual antes de saltar separador
            if (currentChange && (currentChange.title || currentChange.description)) {
                currentVersion.changes.push({ ...currentChange });
                currentChange = null;
            }
            continue;
        }

        const isSubItem = /^    -/.test(line);
        const isItem = !isSubItem && (trimmedLine.startsWith("- **") || trimmedLine.startsWith("- "));

        if (isItem) {
            if (currentChange && (currentChange.title || currentChange.description)) {
                currentVersion.changes.push({ ...currentChange });
            }

            let title = "";
            let description = "";

            if (trimmedLine.startsWith("- **")) {
                const match = trimmedLine.match(/^-\s*\*\*(.+?)\*\*:?\s*(.*)$/);
                if (match) {
                    title = match[1];
                    description = match[2] || "";
                }
            } else {
                title = trimmedLine.substring(2).trim();
                description = "";
            }

            currentChange = {
                category: currentCategory,
                title,
                description,
                subItems: [],
            };
        } else if (isSubItem && currentChange) {
            const subItem = line.substring(5).trim();
            currentChange.subItems.push(subItem);
        } else if (currentChange && trimmedLine) {
            currentChange.description += " " + trimmedLine;
        }
    }

    if (currentVersion) {
        if (currentChange && (currentChange.title || currentChange.description)) {
            currentVersion.changes.push({ ...currentChange });
        }
        versions.push(currentVersion);
    }

    return versions;
};

const versions = parseChangelog(changelogContent);
const lastTenVersions = versions.slice(0, 10);

const formatBold = (text: string): string => {
    return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
};

const formatDate = (dateStr: string): string => {
    // Parsear la fecha como fecha local (no UTC) para evitar problemas de zona horaria
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("es-AR", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
};

const getCategoryColor = (category: string): string => {
    if (category.includes("Nuevas")) return "success";
    if (category.includes("Cambios")) return "info";
    if (category.includes("Arreglos") || category.includes("Fix")) return "warning";
    return "primary";
};

onMounted(() => {
    document.title = "Changelog - Sprint It";
});

const goToDashboard = () => {
    router.push("/dashboard");
};
</script>

<template>
    <VContainer class="changelog-container">
        <VRow>
            <VCol cols="12">
                <div class="d-flex align-center justify-space-between mb-6">
                    <div class="d-flex align-center">
                        <v-btn icon variant="text" color="primary" class="mr-2" @click="goToDashboard" title="Volver al Dashboard">
                            <v-icon>mdi-arrow-left</v-icon>
                        </v-btn>
                        <h1 class="text-h4 font-weight-bold">Changelog</h1>
                    </div>
                    <VChip color="primary" variant="flat" size="large" class="version-chip">
                        <v-icon start icon="mdi-tag-outline" class="version-icon" />
                        Versión {{ APP_VERSION }}
                    </VChip>
                </div>

                <div v-for="(item, index) in lastTenVersions" :key="item.version" class="version-block mb-6">
                    <div class="d-flex align-center mb-3">
                        <div class="version-number text-h5 font-weight-bold me-3">v{{ item.version }}</div>
                        <VChip v-if="index === 0" color="success" size="small" variant="flat" class="latest-chip mr-2">Latest</VChip>
                        <v-icon icon="mdi-calendar" size="small" class="mr-1 primary" />
                        <span class="text-caption primary">{{ formatDate(item.date) }}</span>
                    </div>

                    <div v-if="item.changes.length > 0" class="changes-list">
                        <template v-for="(change, changeIndex) in item.changes" :key="changeIndex">
                            <div
                                v-if="
                                    (change.category && changeIndex === 0) || (change.category && item.changes[changeIndex - 1]?.category !== change.category)
                                "
                                class="category-header mb-2 mt-3"
                            >
                                <VChip :color="getCategoryColor(change.category)" size="small" variant="tonal">
                                    {{ change.category }}
                                </VChip>
                            </div>

                            <div class="change-item mb-2">
                                <div class="change-title font-weight-medium text-body-1 mb-1">
                                    <v-icon size="small" class="mr-1" color="primary">mdi-circle-small</v-icon>
                                    <span v-html="formatBold(change.title)" />
                                </div>

                                <div v-if="change.description" class="change-description text-body-2 ms-4 mt-1" v-html="formatBold(change.description)" />

                                <div v-if="change.subItems && change.subItems.length > 0" class="change-subitems ms-8">
                                    <div v-for="(subItem, subIndex) in change.subItems" :key="subIndex" class="sub-item text-body-2">
                                        <v-icon icon="mdi-chevron-right" size="x-small" class="mr-1 flex-shrink-0 mt-1" />
                                        <span v-html="formatBold(subItem)" />
                                    </div>
                                </div>
                            </div>
                        </template>
                    </div>

                    <div v-else class="text-body-2 text-medium-emphasis">Sin cambios documentados.</div>

                    <VDivider v-if="index < lastTenVersions.length - 1" class="mt-4" />
                </div>

                <div v-if="versions.length > 10" class="text-center mt-4">
                    <VAlert type="info" variant="tonal" class="d-inline-block">Y {{ versions.length - 10 }} versiones anteriores...</VAlert>
                </div>
            </VCol>
        </VRow>
    </VContainer>
</template>

<style lang="scss" scoped>
.changelog-container {
    text-align: left;
    color: $text;
    max-width: 900px;
    margin: 0 auto;
    padding: 24px;
}

.version-block {
    position: relative;
    background: rgba($bg-secondary, 0.5);
    border-radius: 12px;
    padding: 16px 20px;
    border: 1px solid rgba($primary, 0.1);
}

.version-number {
    color: $primary !important;
}

.category-header {
    display: flex;
    align-items: center;
}

.change-title {
    display: flex;
    align-items: flex-start;
}

.change-subitems {
    padding-left: 8px;
}

.sub-item {
    display: flex;
    align-items: flex-start;
    color: rgba($text, 0.8);
}

.change-description {
    padding-left: 28px;
    color: rgba($text, 0.7);
}

.text-primary {
    color: $primary !important;
}

.text-medium-emphasis {
    color: rgba($text, 0.6) !important;
}

/* Version chip styling */
.version-chip {
    & * {
        color: #000000 !important;
    }
    background-color: $primary !important;

    .version-icon {
        color: #000000 !important;
    }
}

/* Latest chip styling */
.latest-chip {
    color: #000000 !important;
    background-color: rgb(var(--v-theme-success)) !important;
}
</style>

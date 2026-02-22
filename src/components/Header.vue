<template>
    <v-app-bar dark height="50" :class="{ 'header-hidden': !isVisible }" class="header-transition">
        <div class="header-content">
            <div class="dashboard-header">
                <div class="sprint-container-1">
                    <div style="width: 250px">
                        <MySelect
                            :options="sprintOptions"
                            @update:options="onSprintOptionsChange"
                            @action="onSprintAction"
                            density="compact"
                            :show-clear-selection="false"
                        />
                    </div>
                    <v-tooltip location="bottom" :text="getExportSprintTooltip">
                        <template #activator="{ props }">
                            <v-icon v-bind="props" class="primary" @click="exportSprintAsync" :disabled="!sprintStore.currentSprint">mdi-file-export</v-icon>
                        </template>
                    </v-tooltip>
                </div>
            </div>
            <v-spacer />
            <v-menu>
                <template #activator="{ props }">
                    <v-avatar v-bind="props" size="40" :class="['avatar', 'primary', { pulse: needsBackupPulse }]">
                        <span class="avatar-text">{{ authStore.user?.name?.charAt(0).toUpperCase() }}</span>
                    </v-avatar>
                </template>
                <div class="menu">
                    <div class="menu-item">
                        <span>Hello {{ authStore.user?.name }}!</span>
                    </div>
                    <div class="menu-item" @click="exportData" :title="getExportDataTitle">
                        <v-icon>mdi-download</v-icon>
                        <span>Export Data</span>
                        <v-icon v-if="needsBackupPulse" size="16" class="ml-2 warning" :class="{ pulse: needsBackupPulse }">mdi-alert-circle</v-icon>
                    </div>
                    <div class="menu-item no-border" @click="importItems">
                        <v-icon>mdi-upload</v-icon>
                        <span>Import Data</span>
                    </div>
                    <div class="menu-item" @click="logout">
                        <v-icon>mdi-logout</v-icon>
                        <span>Logout</span>
                    </div>
                    <div class="menu-item version">
                        <span>v{{ appVersion }}</span>
                    </div>
                </div>
            </v-menu>
        </div>
    </v-app-bar>
</template>

<script setup lang="ts">
import { useUrlManagement } from "@/composables/useUrlManagement";
import { STATE_VALUES } from "@/constants/states";
import MyAlerts from "@/plugins/my-alerts";
import {
    exportAllData,
    exportSprintData as exportSprintDataAsync,
    getFilteredSprintData as getFilteredSprintDataAsync,
    getLastBackupDate,
    updateLastBackupDate,
} from "@/services/firestore";
import { useAuthStore } from "@/stores/auth";
import { useSprintStore } from "@/stores/sprint";
import { createFileInput, processImportedItems } from "@/utils/itemImport";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { version as appVersion } from "../../package.json";

// Tipo para las opciones del selector de sprint
interface SprintSelectOption {
    name: string;
    checked: boolean;
    isAction?: boolean;
    value?: string;
    href?: string; // Optional href for link behavior
}

const authStore = useAuthStore();
const sprintStore = useSprintStore();
const router = useRouter();

const isVisible = ref(true);
let lastScrollY = 0;
const needsBackupPulse = ref(false);

const handleScroll = () => {
    const currentScrollY = window.scrollY;
    if (currentScrollY > lastScrollY && currentScrollY > 50) {
        isVisible.value = false;
    } else {
        isVisible.value = true;
    }
    lastScrollY = currentScrollY;
};

const getExportDataTitle = computed(() => {
    if (!needsBackupPulse.value) return "";

    return "Backup your data to stay safe!";
});

const getExportSprintTooltip = computed(() => {
    const sprint = sprintStore.currentSprint;
    if (!sprint) return "Select a sprint first";

    // Contar solo items con al menos una task Done
    const itemsWithDoneTasks = sprint.items.filter((item) => {
        if (item.deletedAt !== null) return false;
        const activeTasks = item.tasks.filter((task) => task.deletedAt === null);
        return activeTasks.some((task) => task.state === STATE_VALUES.DONE);
    });

    // Contar solo tasks Done
    let totalDoneTasks = 0;
    itemsWithDoneTasks.forEach((item) => {
        totalDoneTasks += item.tasks.filter((task) => task.deletedAt === null && task.state === STATE_VALUES.DONE).length;
    });

    return `Export ${sprint.titulo}: ${itemsWithDoneTasks.length} items with ${totalDoneTasks} completed tasks`;
});

onMounted(() => {
    window.addEventListener("scroll", handleScroll);
    checkBackupStatus();
});

onUnmounted(() => {
    window.removeEventListener("scroll", handleScroll);
});

// Selector de sprint
const sprintOptions = computed((): SprintSelectOption[] => {
    const now = new Date();

    // Separar sprint actual de los demás
    const currentSprint = sprintStore.sprints.find((s) => now >= s.fechaDesde && now <= s.fechaHasta);

    const otherSprints = sprintStore.sprints.filter((s) => s.id !== currentSprint?.id);

    // Ordenar los demás sprints por fechaDesde (más reciente primero)
    otherSprints.sort((a, b) => b.fechaDesde.getTime() - a.fechaDesde.getTime());

    // Construir opciones: New Sprint + Sprint Actual (si existe) + Otros sprints ordenados
    const options: SprintSelectOption[] = [
        {
            name: "+ New Sprint",
            checked: false,
            isAction: true,
        },
    ];

    // Agregar sprint actual primero (si existe)
    if (currentSprint) {
        const desde = currentSprint.fechaDesde.toLocaleDateString("es-ES");
        const hasta = currentSprint.fechaHasta.toLocaleDateString("es-ES");
        const datePart = `<span style="font-size: 0.8rem; font-weight: 500; opacity: 0.4;" class="text"> (${desde}-${hasta})</span>`;
        const name = `<span style="font-weight: 500;" class="primary">${currentSprint.titulo}</span> ${datePart}`;

        options.push({
            name,
            checked: currentSprint.id === sprintStore.currentSprintId,
            value: currentSprint.id,
            href: `/dashboard?sprintId=${currentSprint.id}`,
        });
    }

    // Agregar los demás sprints ordenados
    options.push(
        ...otherSprints.map((sprint) => {
            const desde = sprint.fechaDesde.toLocaleDateString("es-ES");
            const hasta = sprint.fechaHasta.toLocaleDateString("es-ES");
            const datePart = `<span style="font-size: 0.8rem; font-weight: 500; opacity: 0.4;" class="text"> (${desde}-${hasta})</span>`;
            const name = `${sprint.titulo} ${datePart}`;

            return {
                name,
                checked: sprint.id === sprintStore.currentSprintId,
                value: sprint.id,
                href: `/dashboard?sprintId=${sprint.id}`,
            };
        }),
    );

    return options;
});

const onSprintOptionsChange = (options: any[]) => {
    const selectedOption = options.find((opt) => opt.checked);
    if (selectedOption) {
        sprintStore.currentSprintId = selectedOption.value;
        // Update URL with selected sprintId
        const { setSprintUrl } = useUrlManagement(router);
        setSprintUrl(selectedOption.value);
    }
};

const onSprintAction = (option: any) => {
    if (option.name === "+ New Sprint") {
        createNewSprint();
    }
};

const createNewSprint = async () => {
    await sprintStore.createNewSprint();
};

const checkBackupStatus = async () => {
    if (!authStore.user?.id) return;

    try {
        const lastBackupDate = await getLastBackupDate(authStore.user.id);
        const today = new Date()
            .toLocaleDateString("es-AR", {
                timeZone: "America/Argentina/Buenos_Aires",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            })
            .split("/")
            .reverse()
            .join("-"); // YYYY-MM-DD format

        needsBackupPulse.value = lastBackupDate !== today;
    } catch (error) {
        console.error("Error checking backup status:", error);
        needsBackupPulse.value = true; // Default to pulse if error
    }
};

const logout = async () => {
    await authStore.logout();
    router.push("/");
};

const exportData = async () => {
    try {
        const data = await exportAllData();
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

        const exportFileDefaultName = `sprint-data-${new Date().toISOString().split("T")[0]}.json`;

        const linkElement = document.createElement("a");
        linkElement.setAttribute("href", dataUri);
        linkElement.setAttribute("download", exportFileDefaultName);
        linkElement.click();

        // Update last backup date in database
        if (authStore.user?.id) {
            await updateLastBackupDate(authStore.user.id);
            await checkBackupStatus(); // Refresh pulse status
        }
    } catch (error) {
        console.error("Error exporting data:", error);
        alert("Error exporting data. Please try again.");
    }
};

const exportSprintAsync = async () => {
    const currentSprint = sprintStore.currentSprint;
    if (!currentSprint) {
        return await MyAlerts.okMessageAsync("No sprint selected", "Please select a sprint first.");
    }

    try {
        // Obtener datos filtrados para mostrar en la confirmación
        const { itemsWithDoneTasksOnly } = await getFilteredSprintDataAsync(currentSprint.id);

        let totalDoneTasks = 0;
        itemsWithDoneTasksOnly.forEach((item) => {
            totalDoneTasks += item.tasks.length;
        });

        // Mostrar confirmación antes de exportar
        const html = `
            <p>${currentSprint.titulo}</p>
            <br>
            <p>Se exportarán:</p>
            <p><strong>Items:</strong> ${itemsWithDoneTasksOnly.length} (con al menos una tarea ${STATE_VALUES.DONE})</p>
            <p><strong>Tareas ${STATE_VALUES.DONE}:</strong> ${totalDoneTasks}</p>
        `;

        const confirmed = await MyAlerts.confirmAsync("Confirmar exportación", html, "info");
        if (!confirmed) return;

        // Exportar datos
        const data = await exportSprintDataAsync(currentSprint.id);
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

        const sprintName = currentSprint.titulo.replace(/\s+/g, "-").toLowerCase();
        const exportFileDefaultName = `${sprintName}-${new Date().toISOString().split("T")[0]}.json`;

        const linkElement = document.createElement("a");
        linkElement.setAttribute("href", dataUri);
        linkElement.setAttribute("download", exportFileDefaultName);
        linkElement.click();
    } catch (error) {
        console.error("Error exporting sprint:", error);
        await MyAlerts.okMessageAsync("Error", `Error exporting sprint: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
};

const importItems = async () => {
    try {
        // Seleccionar archivo
        const file = await createFileInput();
        if (!file) return;

        // Leer y procesar archivo
        const text = await file.text();
        const rawItems: any[] = JSON.parse(text);
        const result = await processImportedItems(rawItems);

        // Obtener info del sprint actual
        const currentSprint = sprintStore.currentSprint;
        const currentItemsCount = currentSprint?.items?.length || 0;

        // Mostrar confirmación
        const html = `
            <p><strong>Importar items al sprint actual</strong></p>
            <p><strong>Sprint actual:</strong> ${currentSprint?.titulo || "N/A"}</p>
            <p><strong>Items actuales:</strong> ${currentItemsCount}</p>
            <br>
            <p><strong>Items a importar:</strong> ${result.totalItems}</p>
            <p><strong>Tasks a importar:</strong> ${result.totalTasks}</p>
            <br>
            <p><strong>⚠️ Importante:</strong> Esta acción <strong>eliminará todos los items actuales</strong> del sprint antes de importar los nuevos.</p>
            <br>
            <p>¿Estás seguro de que deseas continuar?</p>
            <p><em>Los IDs serán regenerados y los valores inválidos serán corregidos.</em></p>
        `;

        const confirmed = await MyAlerts.confirmAsync("Confirmar importación", html, "warning");
        if (!confirmed) return;

        // Limpiar todos los items actuales del sprint
        if (currentSprint?.items) {
            const itemsToDelete = [...currentSprint.items];
            for (const item of itemsToDelete) {
                await sprintStore.deleteItem(item.id);
            }
        }

        // Importar items
        for (const item of result.items) {
            await sprintStore.addItem(item);
        }

        // Mostrar mensaje de éxito
        await MyAlerts.okMessageAsync("Importación exitosa", `Se importaron ${result.totalItems} items con ${result.totalTasks} tasks exitosamente.`);
    } catch (error) {
        console.error("Error importing items:", error);
        await MyAlerts.okMessageAsync(
            "Error de importación",
            `Hubo un error al importar los items: ${error instanceof Error ? error.message : "Error desconocido"}`,
        );
    }
};
</script>

<style scoped lang="scss">
.v-app-bar {
    box-shadow: 0 0 5px #222 !important;
    transition: transform 0.3s ease-in-out;
}

.header-hidden {
    transform: translateY(-100%);
    display: none;
}

.header-transition {
    transition: transform 0.3s ease-in-out;
    background: #111 !important;
}

.header-content {
    display: flex;
    align-items: center;
    width: 100%;
    max-width: 1100px;
    margin: 0 auto;
}

.dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap; /* Allow wrapping on small screens */
}

.sprint-container-1 {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap; /* Allow wrapping on small screens */
    justify-content: start;
}

.sprint-dates {
    font-size: 0.9rem;
    color: $text;
    opacity: 0.8;
    white-space: nowrap;
}

.sprint-actions {
    display: flex;
    gap: 8px;
    margin-left: auto;
}
.menu {
    background: $bg-primary;
    border-radius: 4px;
    box-shadow:
        0 4px 16px rgba(0, 0, 0, 0.3),
        0 0 0 1px rgba(255, 255, 255, 0.1);
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

    &.no-border {
        border-bottom: none;
    }
}

.menu-item .v-icon {
    margin-right: 12px;
    color: $text;
}

.menu-item span {
    font-size: 0.9rem;
    color: $text;
}

@keyframes menu-pulse {
    0% {
        background-color: rgba(255, 152, 0, 0.1);
    }
    50% {
        background-color: rgba(255, 152, 0, 0.2);
    }
    100% {
        background-color: rgba(255, 152, 0, 0.1);
    }
}

@keyframes blink {
    0%,
    50% {
        opacity: 1;
    }
    51%,
    100% {
        opacity: 0.3;
    }
}

.version {
    font-size: 0.7rem;
    opacity: 0.6;
    text-align: center;
    cursor: default;
    padding: 4px 16px;
}

.avatar {
    margin-right: 5px;
    border: 2px solid rgba($primary, 0.5);
    box-shadow: 0 0 5px rgba($primary, 0.5);
    &.pulse {
        border: 2px solid rgba($warning, 0.5);
        box-shadow: 0 0 5px rgba($warning, 0.5);
        .avatar-text {
            color: $warning;
        }
    }
}

.avatar-text {
    color: $primary;
    font-size: 18px;
    font-weight: bold;
}

.pulse {
    animation: pulse 1s infinite;
}

@keyframes pulse {
    0% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
    100% {
        opacity: 1;
    }
}
</style>

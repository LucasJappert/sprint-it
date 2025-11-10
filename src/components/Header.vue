<template>
    <v-app-bar dark height="50" :class="{ 'header-hidden': !isVisible }" class="header-transition">
        <div class="dashboard-header">
            <div class="sprint-container-1">
                <div style="width: 280px">
                    <MySelect
                        :options="sprintOptions"
                        @update:options="onSprintOptionsChange"
                        @action="onSprintAction"
                        density="compact"
                        :show-clear-selection="false"
                    />
                </div>

                <div style="width: 120px">
                    <MyInput
                        v-model="currentSprintDiasHabilesString"
                        type="number"
                        label="Working Days"
                        :min="1"
                        :max="10"
                        @blur="updateDiasHabiles"
                        centered
                        density="compact"
                    />
                </div>
            </div>
        </div>
        <v-spacer />
        <v-menu>
            <template #activator="{ props }">
                <v-avatar v-bind="props" size="40" class="avatar primary">
                    <span class="avatar-text">{{ authStore.user?.name?.charAt(0).toUpperCase() }}</span>
                </v-avatar>
            </template>
            <div class="menu">
                <div class="menu-item">
                    <span>Hello {{ authStore.user?.name }}!</span>
                </div>
                <div class="menu-item" @click="exportData">
                    <v-icon>mdi-download</v-icon>
                    <span>Export Data</span>
                </div>
                <div class="menu-item" @click="importItems">
                    <v-icon>mdi-upload</v-icon>
                    <span>Importar items</span>
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
    </v-app-bar>
</template>

<script setup lang="ts">
import MyAlerts from "@/plugins/my-alerts";
import { exportAllData } from "@/services/firestore";
import { useAuthStore } from "@/stores/auth";
import { useSprintStore } from "@/stores/sprint";
import { createFileInput, processImportedItems } from "@/utils/itemImport";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";

const appVersion = "1.1.6";

const authStore = useAuthStore();
const sprintStore = useSprintStore();
const router = useRouter();

const isVisible = ref(true);
let lastScrollY = 0;

const handleScroll = () => {
    const currentScrollY = window.scrollY;
    if (currentScrollY > lastScrollY && currentScrollY > 50) {
        isVisible.value = false;
    } else {
        isVisible.value = true;
    }
    lastScrollY = currentScrollY;
};

onMounted(() => {
    window.addEventListener("scroll", handleScroll);
});

onUnmounted(() => {
    window.removeEventListener("scroll", handleScroll);
});

// Selector de sprint
const sprintOptions = computed(() => {
    const now = new Date();
    return [
        {
            name: "+ New Sprint",
            checked: false,
            isAction: true,
        },
        ...sprintStore.sprints.map((sprint) => {
            const desde = sprint.fechaDesde.toLocaleDateString("es-ES");
            const hasta = sprint.fechaHasta.toLocaleDateString("es-ES");
            const isCurrent = now >= sprint.fechaDesde && now <= sprint.fechaHasta;
            const datePart = `<span style="font-size: 0.8rem; font-weight: 500; opacity: 0.4;" class="text"> (${desde}-${hasta})</span>`;
            const name = isCurrent ? `<span style="font-weight: 500;" class="primary">${sprint.titulo}</span> ${datePart}` : `${sprint.titulo} ${datePart}`;
            return {
                name,
                checked: sprint.id === sprintStore.currentSprintId,
                value: sprint.id,
            };
        }),
    ];
});

// Días hábiles del sprint actual
const currentSprintDiasHabiles = computed({
    get: () => sprintStore.currentSprint?.diasHabiles || 10,
    set: (value: number) => {
        if (sprintStore.currentSprint) {
            sprintStore.currentSprint.diasHabiles = value;
        }
    },
});

const currentSprintDiasHabilesString = computed({
    get: () => currentSprintDiasHabiles.value.toString(),
    set: (value: string) => {
        const num = parseInt(value);
        if (!isNaN(num)) {
            currentSprintDiasHabiles.value = num;
        }
    },
});

const updateDiasHabiles = async () => {
    await sprintStore.updateSprintDiasHabiles(currentSprintDiasHabiles.value);
};

const onSprintOptionsChange = (options: any[]) => {
    const selectedOption = options.find((opt) => opt.checked);
    if (selectedOption) {
        sprintStore.currentSprintId = selectedOption.value;
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
    } catch (error) {
        console.error("Error exporting data:", error);
        alert("Error exporting data. Please try again.");
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
}

/* Mobile responsive */
@media (max-width: 768px) {
    .v-app-bar {
        width: 100vw; /* Full viewport width on mobile */
        max-width: 100vw;
        box-sizing: border-box;
    }

    .dashboard-header {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
        width: 100%;
        padding: 0 8px; /* Add padding to prevent content from touching edges */
        box-sizing: border-box;
    }

    .sprint-container-1 {
        justify-content: center;
        gap: 4px;
        width: 100%;
    }

    .sprint-container-1 > div {
        flex: 1;
        min-width: 120px;
    }
}

@media (max-width: 480px) {
    .dashboard-header {
        gap: 4px;
        padding: 0 4px;
    }

    .sprint-container-1 {
        gap: 2px;
    }

    .sprint-container-1 > div {
        min-width: 100px;
    }
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
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
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
}

.menu-item .v-icon {
    margin-right: 12px;
    color: $text;
}

.menu-item span {
    font-size: 0.9rem;
    color: $text;
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
}

.avatar-text {
    color: $primary;
    font-size: 18px;
    font-weight: bold;
}
</style>

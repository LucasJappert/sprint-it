<template>
    <v-app-bar color="rgba(0, 0, 0, 0.2)" dark height="50">
        <div class="dashboard-header">
            <div class="sprint-container-1">
                <div style="width: 280px">
                    <MySelect
                        :options="sprintOptions"
                        placeholder-title="Select Sprint"
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
                <v-avatar v-bind="props" size="40" class="avatar" color="$primary">
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
                <div class="menu-item" @click="logout">
                    <v-icon>mdi-logout</v-icon>
                    <span>Logout</span>
                </div>
            </div>
        </v-menu>
    </v-app-bar>
</template>

<script setup lang="ts">
import { exportAllData } from "@/services/firestore";
import { useAuthStore } from "@/stores/auth";
import { useSprintStore } from "@/stores/sprint";
import { computed } from "vue";
import { useRouter } from "vue-router";

const authStore = useAuthStore();
const sprintStore = useSprintStore();
const router = useRouter();

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
            const name = isCurrent
                ? `<span style="font-weight: 500;" class="primary-light">${sprint.titulo}</span> ${datePart}`
                : `${sprint.titulo} ${datePart}`;
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
</script>

<style scoped lang="scss">
.v-app-bar {
    box-shadow: 0 0 5px #00ffff50 !important;
}

.dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
}

.sprint-container-1 {
    display: flex;
    gap: 8px;
    align-items: center;
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
    font-size: 14px;
    color: $text;
}

.avatar {
    margin-right: 5px;
    border: 2px solid $primary;
    box-shadow: 0 0 5px $primary;
}

.avatar-text {
    color: $primary;
    font-size: 18px;
    font-weight: bold;
}
</style>

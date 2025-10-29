<template>
    <div class="user-progress-chart">
        <h3 class="chart-title">Progreso de Usuarios en el Sprint</h3>

        <!-- Información de capacidad total -->
        <div class="capacity-info">
            <h4>Capacidad Total del Sprint: {{ debugValues.totalCapacity }} horas</h4>
        </div>

        <!-- Información por usuario -->
        <div class="user-info">
            <h4>Horas Acumuladas por Usuario:</h4>
            <div v-for="(hours, userId) in debugValues.userTotals" :key="userId" class="user-item">
                <span class="user-name">{{ getUserDisplayNameSync(userId) || userId }}: </span>
                <span class="user-hours">{{ hours }} horas</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { getUser } from "@/services/firestore";
import { useSprintStore } from "@/stores/sprint";
import { computed, ref, watch } from "vue";

// Colores para usuarios (mismos que CommentSection)
const AUTHOR_COLORS = ["#33c7ffaa", "#3a9962aa"];

const getUserColor = (userId: string): string => {
    const index = userId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % AUTHOR_COLORS.length;
    return AUTHOR_COLORS[index]!;
};

const sprintStore = useSprintStore();

// Cache de usernames para evitar múltiples llamadas a Firestore
const usernameCache = ref<Record<string, string>>({});

// Calcular días hábiles del sprint actual
const sprintDays = computed(() => {
    if (!sprintStore.currentSprint) return [];
    const days = [];
    const startDate = new Date(sprintStore.currentSprint.fechaDesde);
    const endDate = new Date(sprintStore.currentSprint.fechaHasta);
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        // Solo días hábiles (lunes a viernes)
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
            days.push(currentDate.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }));
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return days.slice(0, sprintStore.currentSprint.diasHabiles);
});

// Función para obtener nombre completo desde cache o Firestore
const getUserDisplayName = async (userId: string): Promise<string> => {
    if (usernameCache.value[userId]) {
        return usernameCache.value[userId];
    }

    try {
        const user = await getUser(userId);
        if (user && user.name && user.lastName) {
            const displayName = `${user.name} ${user.lastName}`;
            usernameCache.value[userId] = displayName;
            return displayName;
        }
    } catch (error) {
        console.warn(`Error getting user display name for ${userId}:`, error);
    }

    return userId; // Fallback al ID si no se puede obtener el nombre
};

// Función síncrona para obtener nombre desde cache (para template)
const getUserDisplayNameSync = (userId: string): string => {
    return usernameCache.value[userId] || userId;
};

// Calcular totales por usuario
const userTotals = computed(() => {
    if (!sprintStore.currentSprint) return {};

    const users: Record<string, number> = {};
    const items = sprintStore.currentSprint.items;

    // Procesar items y tasks para calcular totales por usuario
    items.forEach((item) => {
        // Procesar el esfuerzo del item si no tiene tasks y está asignado a un usuario
        if (item.tasks.length === 0 && item.assignedUser) {
            // Usar el ID directamente por ahora, luego resolveremos los usernames
            if (!users[item.assignedUser]) users[item.assignedUser] = 0;
            users[item.assignedUser]! += item.actualEffort;
        }

        // Procesar las tasks del item (independientemente de si el item tiene usuario asignado)
        item.tasks.forEach((task) => {
            if (task.assignedUser) {
                // Usar el ID directamente por ahora, luego resolveremos los usernames
                if (!users[task.assignedUser]) users[task.assignedUser] = 0;
                users[task.assignedUser]! += task.actualEffort;
            }
        });
    });

    return users;
});

// Calcular valores para debug
const debugValues = computed(() => {
    const totalCapacity = sprintDays.value.length * 8; // 8 horas por día hábil
    // console.log("=== DEBUG Valores del Gráfico ===");
    // console.log("Días hábiles del sprint:", sprintDays.value.length);
    // console.log("Capacidad total disponible:", totalCapacity, "horas");
    // console.log("Totales por usuario:", userTotals.value);
    return { totalCapacity, userTotals: userTotals.value };
});

// Calcular el día actual del sprint
const currentSprintDay = computed(() => {
    if (!sprintStore.currentSprint) return 0;

    const today = new Date();
    const sprintStart = new Date(sprintStore.currentSprint.fechaDesde);
    const sprintEnd = new Date(sprintStore.currentSprint.fechaHasta);

    // Si hoy es antes del inicio del sprint, usar el primer día
    if (today < sprintStart) {
        return 0;
    }

    // Si hoy es después del fin del sprint, usar el último día
    if (today > sprintEnd) {
        return sprintDays.value.length - 1;
    }

    // Contar días hábiles desde el inicio hasta hoy
    let dayIndex = 0;
    const currentDate = new Date(sprintStart);

    while (currentDate <= today && dayIndex < sprintDays.value.length) {
        // Solo contar días hábiles (lunes a viernes)
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
            dayIndex++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return Math.min(dayIndex - 1, sprintDays.value.length - 1);
});

// Estado reactivo para las series del gráfico
const chartSeries = ref<any[]>([]);

// Función para actualizar las series cuando cambien los datos
const updateChartSeries = async () => {
    const series = [];
    const dayCount = sprintDays.value.length;

    // Línea ideal: esfuerzo total disponible (8h por día, acumulado)
    const idealLine = sprintDays.value.map((_, index) => (index + 1) * 8);
    series.push({
        name: "Capacidad Total Disponible",
        data: idealLine,
        color: "#9E9E9E",
        dashArray: 5,
    });

    // Datos por usuario: puntos en el día actual con total acumulado real
    for (const userId of Object.keys(userTotals.value)) {
        const totalEffort = userTotals.value[userId];

        if (totalEffort === undefined) {
            continue;
        }

        // Obtener el nombre completo real
        const username = await getUserDisplayName(userId);
        const userColor = getUserColor(userId);

        // Crear array con null para todos los días, excepto el día actual
        const dataPoints = Array(dayCount).fill(null);
        dataPoints[currentSprintDay.value] = totalEffort;

        series.push({
            name: `${username} - Real`,
            data: dataPoints,
            color: userColor,
        });
    }

    chartSeries.value = series;
};

// Actualizar series cuando cambien los datos
watch([userTotals, sprintDays, currentSprintDay], updateChartSeries, { immediate: true });

// Mapa de usernames a nombres reales
const userNameMap: Record<string, string> = {
    ljappert: "Lucas",
    srotschy: "Seba",
};

// Opciones del gráfico para ApexCharts
const chartOptions = computed(() => ({
    chart: {
        type: "line",
        height: 400,
        background: "transparent",
        animations: {
            enabled: false, // Deshabilitar animaciones para mejor rendimiento
        },
    },
    markers: {
        size: 8,
        colors: undefined,
        strokeColors: "#fff",
        strokeWidth: 3,
        strokeOpacity: 1,
        strokeDashArray: 0,
        fillOpacity: 1,
        discrete: [],
        shape: "circle",
        radius: 2,
        offsetX: 0,
        offsetY: 0,
        onClick: undefined,
        onDblClick: undefined,
        showNullDataPoints: true,
        hover: {
            size: 10,
            sizeOffset: 3,
        },
    },
    xaxis: {
        categories: sprintDays.value,
        title: {
            text: "Días del Sprint",
            style: {
                color: "#ffffff",
            },
        },
        labels: {
            style: {
                colors: "#ffffff",
            },
        },
        axisBorder: {
            color: "#333333",
        },
        axisTicks: {
            color: "#333333",
        },
    },
    yaxis: {
        title: {
            text: "Horas",
            style: {
                color: "#ffffff",
            },
        },
        labels: {
            style: {
                colors: "#ffffff",
            },
        },
    },
    legend: {
        position: "top",
        labels: {
            colors: "#ffffff",
        },
    },
    grid: {
        borderColor: "#333333",
        xaxis: {
            lines: {
                show: true,
            },
        },
        yaxis: {
            lines: {
                show: true,
            },
        },
    },
    tooltip: {
        theme: "dark",
    },
}));
</script>

<style scoped lang="scss">
.user-progress-chart {
    padding: 20px;
    background: #1e1e1e;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    margin-top: 20px;
}

.chart-title {
    margin-bottom: 20px;
    color: #ffffff;
    font-size: 1.2em;
    font-weight: bold;
}
</style>

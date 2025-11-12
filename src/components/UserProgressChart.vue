<template>
    <div class="user-progress-chart">
        <h3 class="chart-title">User Progress in the Sprint</h3>

        <!-- Total capacity information -->
        <div class="capacity-info">
            <h4>Total Sprint Capacity: {{ debugValues.totalCapacity }} hours</h4>
        </div>

        <!-- User information -->
        <div class="user-info">
            <h4>Accumulated Hours per User:</h4>
            <div v-for="(hours, userId) in debugValues.userTotals" :key="userId" class="user-item">
                <span class="user-name">{{ userDisplayNames[userId] || userId }}: </span>
                <span class="user-hours">{{ hours }} hours</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { getUserDisplayNameAsync } from "@/services/firestore";
import { useSprintStore } from "@/stores/sprint";
import { computed, ref, watch } from "vue";

// Colors for users (same as CommentSection)
const AUTHOR_COLORS = ["#1bc0fcaa", "#1ea958aa"];

const getUserColor = (userId: string): string => {
    const index = userId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % AUTHOR_COLORS.length;
    return AUTHOR_COLORS[index]!;
};

const sprintStore = useSprintStore();

// Display names for users in the UI
const userDisplayNames = ref<Record<string, string>>({});

// Calculate current sprint working days based on workingDays array
const sprintDays = computed(() => {
    if (!sprintStore.currentSprint) return [];

    const workingDays = sprintStore.currentSprint.workingDays;
    const days = [];
    const startDate = new Date(sprintStore.currentSprint.fechaDesde);
    const currentDate = new Date(startDate);

    // Generate day labels for the 10 days of the sprint
    for (let i = 0; i < 10; i++) {
        if (workingDays[i]) {
            days.push(currentDate.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }));
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
});

// Calculate totals per user
const userTotals = computed(() => {
    if (!sprintStore.currentSprint) return {};

    const users: Record<string, number> = {};
    // Filter non-deleted items
    const items = sprintStore.currentSprint.items.filter((item) => item.deletedAt === null);

    // Process items and tasks to calculate totals per user
    items.forEach((item) => {
        // Process item effort if it has no tasks and is assigned to a user
        if (item.tasks.length === 0 && item.assignedUser) {
            // Use ID directly for now, we'll resolve usernames later
            if (!users[item.assignedUser]) users[item.assignedUser] = 0;
            users[item.assignedUser]! += item.actualEffort;
        }

        // Process item tasks (regardless of whether the item has an assigned user)
        // Filter non-deleted tasks
        item.tasks
            .filter((task) => task.deletedAt === null)
            .forEach((task) => {
                if (task.assignedUser) {
                    // Use ID directly for now, we'll resolve usernames later
                    if (!users[task.assignedUser]) users[task.assignedUser] = 0;
                    users[task.assignedUser]! += task.actualEffort;
                }
            });
    });

    return users;
});

// Calculate values for debug
const debugValues = computed(() => {
    const totalCapacity = sprintDays.value.length * 8; // 8 hours per working day
    // console.log("=== DEBUG Chart Values ===");
    // console.log("Sprint working days:", sprintDays.value.length);
    // console.log("Total available capacity:", totalCapacity, "hours");
    // console.log("Totals per user:", userTotals.value);
    return { totalCapacity, userTotals: userTotals.value };
});

// Calculate current sprint day based on workingDays
const currentSprintDay = computed(() => {
    if (!sprintStore.currentSprint) return 0;

    const today = new Date();
    const sprintStart = new Date(sprintStore.currentSprint.fechaDesde);
    const workingDays = sprintStore.currentSprint.workingDays;

    // If today is before sprint start, use first working day
    if (today < sprintStart) {
        return 0;
    }

    // Count working days from start to today
    let workingDayIndex = 0;
    const currentDate = new Date(sprintStart);

    for (let i = 0; i < 10; i++) {
        if (currentDate <= today && workingDays[i]) {
            workingDayIndex++;
        } else if (currentDate > today) {
            break;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return Math.min(workingDayIndex - 1, sprintDays.value.length - 1);
});

// Reactive state for chart series
const chartSeries = ref<any[]>([]);

// Function to update series when data changes
const updateChartSeries = async () => {
    const series = [];
    const dayCount = sprintDays.value.length;

    // Ideal line: total available effort (8h per day, accumulated)
    const idealLine = sprintDays.value.map((_, index) => (index + 1) * 8);
    series.push({
        name: "Total Available Capacity",
        data: idealLine,
        color: "#9E9E9E",
        dashArray: 5,
    });

    // User data: points on current day with actual accumulated total
    for (const userId of Object.keys(userTotals.value)) {
        const totalEffort = userTotals.value[userId];

        if (totalEffort === undefined) {
            continue;
        }

        // Get the real full name
        const username = await getUserDisplayNameAsync(userId);
        userDisplayNames.value[userId] = username; // Update for template
        const userColor = getUserColor(userId);

        // Create array with null for all days, except current day
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

// Update series when data changes
watch([userTotals, sprintDays, currentSprintDay], updateChartSeries, { immediate: true });

// Chart options for ApexCharts
const chartOptions = computed(() => ({
    chart: {
        type: "line",
        height: 400,
        background: "transparent",
        animations: {
            enabled: false, // Disable animations for better performance
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
            text: "Sprint Days",
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
            text: "Hours",
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
    overflow-x: auto; /* Enable horizontal scrolling on mobile */
    -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
}

.chart-title {
    margin-bottom: 20px;
    color: #ffffff;
    font-size: 1.2em;
    font-weight: bold;
}

/* Mobile responsive */
@media (max-width: 768px) {
    .user-progress-chart {
        padding: 16px;
        margin-top: 16px;
    }

    .chart-title {
        font-size: 1.1em;
        margin-bottom: 16px;
    }
}

@media (max-width: 480px) {
    .user-progress-chart {
        padding: 12px;
        margin-top: 12px;
    }

    .chart-title {
        font-size: 1em;
        margin-bottom: 12px;
    }
}
</style>

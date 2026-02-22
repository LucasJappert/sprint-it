<template>
    <div v-if="hasEffortData" class="project-effort-chart">
        <h3 class="chart-title">Effort by Project</h3>

        <apexchart type="bar" height="300" :options="chartOptions" :series="chartSeries" />
    </div>
</template>

<script setup lang="ts">
import { useProjectName } from "@/composables/useProjectName";
import { useSprintStore } from "@/stores/sprint";
import { computed } from "vue";

const sprintStore = useSprintStore();
const { getProjectColor } = useProjectName();

// Check if there's effort data to display
const hasEffortData = computed(() => {
    const efforts = projectEfforts.value;
    return Object.keys(efforts).length > 0;
});

// Calculate effort by project from current sprint
const projectEfforts = computed(() => {
    if (!sprintStore.currentSprint) return {};

    const efforts: Record<string, number> = {};
    const items = sprintStore.currentSprint.items.filter((item) => item.deletedAt === null);

    items.forEach((item) => {
        // Get project name from item or use default
        const projectName = item.projectName || "Unassigned";

        // If item has tasks, use only tasks' effort (not the item's effort)
        if (item.tasks.length > 0) {
            const activeTasks = item.tasks.filter((task) => task.deletedAt === null);
            activeTasks.forEach((task) => {
                const taskProjectName = task.projectName || projectName;
                if (!efforts[taskProjectName]) efforts[taskProjectName] = 0;
                efforts[taskProjectName]! += task.actualEffort;
            });
            return;
        }

        // If item has no tasks, use item's effort directly
        if (!efforts[projectName]) efforts[projectName] = 0;
        efforts[projectName]! += item.actualEffort;
    });

    // Filter out projects with 0 effort
    const filteredEfforts: Record<string, number> = {};
    Object.entries(efforts).forEach(([project, effort]) => {
        if (effort > 0) {
            filteredEfforts[project] = effort;
        }
    });

    return filteredEfforts;
});

// Prepare chart series data
const chartSeries = computed(() => {
    const efforts = projectEfforts.value;
    const sortedProjects = Object.keys(efforts).sort((a, b) => {
        const effortA = efforts[a] || 0;
        const effortB = efforts[b] || 0;
        return effortB - effortA; // Sort descending by effort
    });

    return [
        {
            name: "Actual Effort (hours)",
            data: sortedProjects.map((project) => ({
                x: project,
                y: efforts[project] || 0,
                fillColor: getProjectColor(project),
            })),
        },
    ];
});

// Chart configuration
const chartOptions = computed(() => {
    const projectNames = Object.keys(projectEfforts.value);
    const colors = projectNames.map((project) => getProjectColor(project));

    return {
        chart: {
            type: "bar",
            toolbar: {
                show: false,
            },
            background: "transparent",
            fontFamily: "inherit",
        },
        plotOptions: {
            bar: {
                horizontal: true,
                borderRadius: 4,
                dataLabels: {
                    position: "top",
                },
            },
        },
        legend: {
            show: false,
        },
        colors: colors,
        dataLabels: {
            enabled: true,
            offsetX: 30,
            style: {
                fontSize: "12px",
                colors: ["#fff"],
            },
            formatter: (val: number): string => {
                return val > 0 ? `${val}h` : "";
            },
        },
        xaxis: {
            categories: Object.keys(projectEfforts.value).sort((a, b) => {
                const effortA = projectEfforts.value[a] || 0;
                const effortB = projectEfforts.value[b] || 0;
                return effortB - effortA;
            }),
            labels: {
                style: {
                    colors: "#9ca3af",
                },
            },
            title: {
                text: "Hours",
                style: {
                    color: "#9ca3af",
                },
            },
        },
        yaxis: {
            labels: {
                style: {
                    colors: Object.keys(projectEfforts.value).map(() => "#e5e7eb"),
                    fontSize: "12px",
                },
            },
        },
        grid: {
            borderColor: "#374151",
            strokeDashArray: 4,
        },
        tooltip: {
            theme: "dark",
            y: {
                formatter: (val: number): string => {
                    return `${val} hours`;
                },
            },
        },
        title: {
            text: undefined,
        },
        subtitle: {
            text: undefined,
        },
    };
});
</script>

<style scoped lang="scss">
.project-effort-chart {
    width: 100%;
    padding: 20px;
    background: #1e1e1e;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    margin-top: 16px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
}

.chart-title {
    margin-bottom: 16px;
    color: #ffffff;
    font-size: 1.2em;
    font-weight: bold;
}
</style>

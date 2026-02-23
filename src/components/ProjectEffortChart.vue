<template>
    <div v-if="hasEffortData" class="project-effort-chart">
        <h3 class="chart-title">Effort by Project</h3>

        <!-- Barra de porcentajes horizontal -->
        <div class="percentage-bar-container mt-1">
            <div class="percentage-bar">
                <template v-for="project in projectPercentages" :key="project.name">
                    <div
                        class="percentage-segment"
                        :style="{
                            width: project.percentage + '%',
                            backgroundColor: project.color,
                        }"
                        :title="`${project.name}: ${project.percentage.toFixed(1)}% (${project.effort}h)`"
                    >
                        <span class="percentage-tooltip"> {{ project.name }}: {{ project.percentage.toFixed(1) }}% ({{ project.effort }}h) </span>
                    </div>
                </template>
            </div>
        </div>

        <apexchart type="bar" height="200" :options="chartOptions" :series="chartSeries" />
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

// Sorted projects by effort (descending) - DRY: extracted for reuse in series and xaxis
const sortedProjects = computed(() => {
    const efforts = projectEfforts.value;
    return Object.keys(efforts).sort((a, b) => {
        const effortA = efforts[a] || 0;
        const effortB = efforts[b] || 0;
        return effortB - effortA;
    });
});

// Calculate total effort and percentages for each project
const projectPercentages = computed(() => {
    const efforts = projectEfforts.value;
    const projects = sortedProjects.value;

    if (projects.length === 0) return [];

    const total = Object.values(efforts).reduce((sum, effort) => sum + effort, 0);

    if (total === 0) return [];

    return projects.map((project) => ({
        name: project,
        effort: efforts[project] || 0,
        percentage: ((efforts[project] || 0) / total) * 100,
        color: getProjectColor(project),
    }));
});

// Prepare chart series data
const chartSeries = computed(() => {
    const sorted = sortedProjects.value;
    const efforts = projectEfforts.value;

    return [
        {
            name: "Actual Effort (hours)",
            data: sorted.map((project) => ({
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
        // Note: colors are set via fillColor in each data point
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
            categories: sortedProjects.value,
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
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
}

.chart-title {
    color: #ffffff;
    font-size: 1.2em;
    font-weight: bold;
}
.percentage-bar {
    display: flex;
    width: 100%;
    height: 14px;
    border-radius: 4px;
    overflow: hidden;
    box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.5);
    border: 1px solid #333;
}

.percentage-segment {
    position: relative;
    height: 100%;
    cursor: pointer;
    transition: opacity 0.2s ease;
    box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.3);

    &:not(:last-child) {
        border-right: 2px solid #000;
    }

    &:hover {
        opacity: 0.85;

        .percentage-tooltip {
            visibility: visible;
            opacity: 1;
        }
    }
}

.percentage-tooltip {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: #fff;
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    visibility: hidden;
    opacity: 0;
    transition:
        opacity 0.2s ease,
        visibility 0.2s ease;
    z-index: 10;
    pointer-events: none;

    &::after {
        content: "";
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 5px solid transparent;
        border-top-color: rgba(0, 0, 0, 0.9);
    }
}
</style>

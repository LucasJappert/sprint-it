<template>
    <div class="user-progress-chart">
        <h3 class="chart-title">User Progress in the Sprint</h3>

        <!-- Sprint information -->
        <div class="sprint-info">
            <div class="info-item">
                <span class="label">Working Days:</span>
                <span class="value">{{ sprintDays.length }} / 10</span>
            </div>
            <div class="info-item">
                <span class="label">Current Day:</span>
                <span class="value">{{ elapsedWorkingDays }} / {{ sprintDays.length }}</span>
            </div>
            <div class="info-item">
                <span class="label">Expected Hours/Day:</span>
                <span class="value">8h</span>
            </div>
        </div>

        <!-- Progress bars per user -->
        <div class="progress-container mt-2">
            <div v-for="(progress, userId) in userProgress" :key="userId" class="user-progress-item">
                <div class="user-header">
                    <span class="user-name">{{ userDisplayNames[userId] || userId }}</span>
                </div>

                <div class="progress-bar-container">
                    <!-- Total sprint capacity (gray background) -->
                    <div class="progress-total" :style="{ width: '100%' }"></div>

                    <!-- Actual user hours (blue) -->
                    <div
                        class="progress-actual"
                        :style="{ width: progress.actualPercentage + '%' }"
                        :class="{
                            'over-target': progress.actual > progress.expected,
                            'on-target': progress.actual <= progress.expected,
                        }"
                    ></div>

                    <!-- Expected progress indicator line (vertical black line) -->
                    <div class="progress-expected-line" :style="{ left: progress.expectedPercentage + '%' }"></div>
                </div>

                <div class="progress-info">
                    <span class="progress-text">{{ progress.actual }}h / {{ progress.expected }}h / {{ progress.total }}h</span>
                    <span class="progress-percentage">{{ Math.round(progress.actualPercentage) }}%</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { getUserDisplayNameAsync } from "@/services/firestore";
import { useSprintStore } from "@/stores/sprint";
import { computed, ref, watch } from "vue";

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

// Calculate elapsed working days up to today (excluding holidays)
const elapsedWorkingDays = computed(() => {
    if (!sprintStore.currentSprint) return 0;

    const workingDays = sprintStore.currentSprint.workingDays;
    const today = new Date();
    const sprintStart = new Date(sprintStore.currentSprint.fechaDesde);

    let count = 0;
    const currentDate = new Date(sprintStart);

    for (let i = 0; i < 10; i++) {
        if (currentDate <= today && workingDays[i]) {
            count++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
});

// Calculate total sprint capacity (all working days * 8 hours)
const totalSprintHours = computed(() => {
    return sprintDays.value.length * 8; // 8 hours per working day
});

// Calculate expected hours per user up to current day
const expectedHoursPerUser = computed(() => {
    const hoursPerDay = 8; // Assuming 8 hours per working day
    return elapsedWorkingDays.value * hoursPerDay;
});

// Calculate progress per user with 3-layer information
const userProgress = computed(() => {
    const result: Record<
        string,
        {
            actual: number;
            expected: number;
            total: number;
            actualPercentage: number;
            expectedPercentage: number;
        }
    > = {};

    for (const [userId, actualHours] of Object.entries(userTotals.value)) {
        const expected = expectedHoursPerUser.value;
        const total = totalSprintHours.value;

        result[userId] = {
            actual: actualHours,
            expected,
            total,
            actualPercentage: total > 0 ? (actualHours / total) * 100 : 0,
            expectedPercentage: total > 0 ? (expected / total) * 100 : 0,
        };
    }

    return result;
});

// Update user display names when userTotals changes
watch(
    userTotals,
    async (newTotals) => {
        for (const userId of Object.keys(newTotals)) {
            if (!userDisplayNames.value[userId]) {
                try {
                    const username = await getUserDisplayNameAsync(userId);
                    userDisplayNames.value[userId] = username;
                } catch (error) {
                    userDisplayNames.value[userId] = userId; // Fallback to ID
                }
            }
        }
    },
    { immediate: true },
);
</script>

<style scoped lang="scss">
@use "sass:color";

.user-progress-chart {
    width: 100%;
    padding: 20px;
    background: #1e1e1e;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    overflow-x: auto; /* Enable horizontal scrolling on mobile */
    -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
}

.chart-title {
    margin-bottom: 20px;
    color: #ffffff;
    font-size: 1.2em;
    font-weight: bold;
}

.sprint-info {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
}

.info-item {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .label {
        font-size: 0.9em;
        color: $text;
        opacity: 0.7;
    }

    .value {
        font-size: 1.1em;
        color: #ffffff;
        font-weight: 500;
    }
}

.progress-container {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.user-progress-item {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 10px 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.user-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .user-name {
        font-weight: 500;
        color: #ffffff;
    }

    .progress-text {
        font-size: 0.9em;
        color: $text;
        opacity: 0.8;
    }
}

.progress-bar-container {
    position: relative;
    height: 24px;
    background: rgba(128, 128, 128, 0.2); /* Gray background for total sprint capacity */
    border-radius: 12px;
}

.progress-total {
    position: absolute;
    height: 100%;
    background: rgba(128, 128, 128, 0.3); /* Gray for total capacity */
    border-radius: 12px;
}

.progress-expected-line {
    position: absolute;
    top: -5px; /* Extend 3px above */
    bottom: -5px; /* Extend 3px below */
    width: 4px; /* 2px wide */
    background: #00000090; /* Black color */
    z-index: 10; /* Ensure it appears above other elements */
}

.progress-actual {
    position: absolute;
    height: 100%;
    border-radius: 12px;
    transition: width 0.3s ease;

    &.over-target {
        background: linear-gradient(90deg, #4caf50 0%, #45a049 100%); /* Green for over target */
    }

    &.on-target {
        background: linear-gradient(90deg, $primary 0%, color.adjust($primary, $lightness: 10%) 100%); /* Blue for on target */
    }
}

.progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .progress-text {
        font-size: 0.9em;
        color: $text;
        opacity: 0.8;
    }

    .progress-percentage {
        font-size: 0.9em;
        color: $text;
        opacity: 0.8;
        font-weight: 500;
    }
}

/* Mobile responsive */
@media (max-width: 768px) {
    .user-progress-chart {
        padding: 16px;
    }

    .chart-title {
        font-size: 1.1em;
        margin-bottom: 16px;
    }

    .sprint-info {
        gap: 16px;
    }

    .user-progress-item {
        padding: 12px;
    }

    .progress-bar-container {
        height: 20px;
    }
}

@media (max-width: 480px) {
    .user-progress-chart {
        padding: 12px;
    }

    .chart-title {
        font-size: 1em;
        margin-bottom: 12px;
    }

    .sprint-info {
        flex-direction: column;
        gap: 12px;
    }

    .user-progress-item {
        padding: 10px;
    }

    .progress-bar-container {
        height: 18px;
    }
}
</style>

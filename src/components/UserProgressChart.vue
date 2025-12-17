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
            <!-- Total sprint progress bar -->
            <div class="user-progress-item total-progress-item">
                <div class="user-header">
                    <span class="user-name">Total Sprint Progress</span>
                </div>

                <div class="progress-bar-container">
                    <!-- Total sprint capacity (gray background) -->
                    <div class="progress-total" :style="{ width: '100%' }"></div>

                    <!-- Actual total hours -->
                    <div
                        class="progress-actual"
                        :style="{ width: totalProgress.actualPercentage + '%' }"
                        :class="{
                            'over-target': totalProgress.actual >= totalProgress.expected,
                            'on-target': totalProgress.actual < totalProgress.expected,
                        }"
                    ></div>

                    <!-- Expected progress indicator line -->
                    <div class="progress-expected-line" :style="{ left: totalProgress.expectedPercentage + '%' }"></div>
                </div>

                <div class="progress-info">
                    <span class="progress-text">{{ totalProgress.actual }}h / {{ totalProgress.expected }}h / {{ totalProgress.total }}h</span>
                    <span class="progress-percentage">{{ Math.round(totalProgress.actualPercentage) }}%</span>
                </div>
            </div>

            <div v-for="(progress, userId) in userProgress" :key="userId" class="user-progress-item">
                <div class="user-header">
                    <span class="user-name">{{ userDisplayNames[userId] || userId }}</span>
                    <UserWorkingDaysToggles :user-id="userId" :working-days="getUserWorkingDays(userId)" @update="updateUserWorkingDays(userId, $event)" />
                </div>

                <div class="progress-bar-container">
                    <!-- Total sprint capacity (gray background) -->
                    <div class="progress-total" :style="{ width: '100%' }"></div>

                    <!-- Actual user hours (blue) -->
                    <div
                        class="progress-actual"
                        :style="{ width: progress.actualPercentage + '%' }"
                        :class="{
                            'over-target': progress.actual >= progress.expected,
                            'on-target': progress.actual < progress.expected,
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
import UserWorkingDaysToggles from "@/components/UserWorkingDaysToggles.vue";
import { getUserDisplayNameAsync } from "@/services/firestore";
import { useSprintStore } from "@/stores/sprint";
import { computed, ref, watch } from "vue";

const sprintStore = useSprintStore();

// Display names for users in the UI
const userDisplayNames = ref<Record<string, string>>({});

// Get user working days, defaulting to global working days if not set
const getUserWorkingDays = (userId: string): boolean[] => {
    if (!sprintStore.currentSprint) return Array(10).fill(true);
    return sprintStore.currentSprint.userWorkingDays[userId] || [...sprintStore.currentSprint.workingDays];
};

// Update user working days
const updateUserWorkingDays = async (userId: string, workingDays: boolean[]) => {
    await sprintStore.updateUserWorkingDays(userId, workingDays);
};

// Calculate current sprint working days dates (based on workingDays toggles)
const sprintDays = computed(() => {
    if (!sprintStore.currentSprint) return [];

    const days = [];
    const startDate = new Date(sprintStore.currentSprint.fechaDesde);
    const currentDate = new Date(startDate);
    let dayIndex = 0;

    // Collect dates for the working days that are active in the sprint period
    while (dayIndex < 10) {
        const dayOfWeek = currentDate.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            // Lunes a viernes - check if this working day is active
            if (sprintStore.currentSprint.workingDays[dayIndex]) {
                days.push(currentDate.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }));
            }
            dayIndex++;
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

// Calculate elapsed working days up to today (count of active working days passed)
const elapsedWorkingDays = computed(() => {
    if (!sprintStore.currentSprint) return 0;

    const today = new Date();
    const sprintStart = new Date(sprintStore.currentSprint.fechaDesde);

    let count = 0;
    const currentDate = new Date(sprintStart);
    let dayIndex = 0;

    while (currentDate <= today && dayIndex < 10) {
        const dayOfWeek = currentDate.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            // Lunes a viernes - check if this working day is active
            if (sprintStore.currentSprint.workingDays[dayIndex]) {
                count++;
            }
            dayIndex++;
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
        const userWorkingDays = getUserWorkingDays(userId);
        const userElapsedDays = calculateElapsedWorkingDaysForUser(userWorkingDays);
        const userTotalDays = userWorkingDays.filter((day) => day).length;
        const expected = userElapsedDays * 8;
        const total = userTotalDays * 8;

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

// Helper function to calculate elapsed working days for a specific user
const calculateElapsedWorkingDaysForUser = (userWorkingDays: boolean[]): number => {
    if (!sprintStore.currentSprint) return 0;

    const today = new Date();
    const sprintStart = new Date(sprintStore.currentSprint.fechaDesde);

    let count = 0;
    const currentDate = new Date(sprintStart);
    let dayIndex = 0;

    while (currentDate <= today && dayIndex < 10) {
        const dayOfWeek = currentDate.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            // Lunes a viernes - check if this working day is active for the user
            if (userWorkingDays[dayIndex]) {
                count++;
            }
            dayIndex++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
};

// Calculate total sprint progress
const totalProgress = computed(() => {
    const totalActual = Object.values(userTotals.value).reduce((sum, val) => sum + val, 0);
    let totalExpected = 0;
    let totalTotal = 0;

    for (const userId of Object.keys(userTotals.value)) {
        const userWorkingDays = getUserWorkingDays(userId);
        const userElapsedDays = calculateElapsedWorkingDaysForUser(userWorkingDays);
        const userTotalDays = userWorkingDays.filter((day) => day).length;
        totalExpected += userElapsedDays * 8;
        totalTotal += userTotalDays * 8;
    }

    return {
        actual: totalActual,
        expected: totalExpected,
        total: totalTotal,
        actualPercentage: totalTotal > 0 ? (totalActual / totalTotal) * 100 : 0,
        expectedPercentage: totalTotal > 0 ? (totalExpected / totalTotal) * 100 : 0,
    };
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
    height: 5px;
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
</style>

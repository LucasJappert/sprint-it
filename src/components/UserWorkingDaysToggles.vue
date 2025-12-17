<template>
    <div class="user-working-days-toggles">
        <div class="toggles-container">
            <div
                v-for="(isWorking, index) in workingDays"
                :key="index"
                class="day-toggle"
                :class="{
                    active: isWorking,
                    inactive: !isWorking,
                    'current-day': index === currentDayIndex,
                }"
                @click="toggleDay(index)"
                :title="getDayTooltip(index)"
            >
                {{ index + 1 }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useSprintStore } from "@/stores/sprint";
import { computed } from "vue";

interface Props {
    userId: string;
    workingDays: boolean[];
    onToggle?: (index: number) => void;
}

const props = withDefaults(defineProps<Props>(), {
    workingDays: () => Array(10).fill(true),
    onToggle: undefined,
});

const emit = defineEmits<{
    toggle: [index: number];
    update: [workingDays: boolean[]];
}>();

const sprintStore = useSprintStore();

// Calculate elapsed working days up to today (count of weekdays passed)
const elapsedWorkingDays = computed(() => {
    if (!sprintStore.currentSprint) return 0;

    const today = new Date();
    const sprintStart = new Date(sprintStore.currentSprint.fechaDesde);

    let count = 0;
    const currentDate = new Date(sprintStart);

    while (currentDate <= today && count < 10) {
        const dayOfWeek = currentDate.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            // Lunes a viernes
            count++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
});

// Calculate which working day is active (0-based index of the current working day)
const currentDayIndex = computed(() => {
    return elapsedWorkingDays.value - 1;
});

const toggleDay = (index: number) => {
    const newWorkingDays = [...props.workingDays];
    newWorkingDays[index] = !newWorkingDays[index];
    emit("update", newWorkingDays);
    emit("toggle", index);
    props.onToggle?.(index);
};

const getDayTooltip = (index: number) => {
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Day 8", "Day 9", "Day 10"];
    const status = props.workingDays[index] ? "Working Day" : "Holiday";
    return `Day ${index + 1} (${dayNames[index] || `Day ${index + 1}`}) - ${status}`;
};
</script>

<style scoped lang="scss">
@use "sass:color";
.user-working-days-toggles {
    display: flex;
    flex-direction: column;
    align-items: center;
    border-radius: 8px;
    width: 100%;
}

.toggles-container {
    display: flex;
    gap: 2px;
    justify-content: center;
    width: 100%;
}

.day-toggle {
    width: 10%;
    max-width: 30px;
    height: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 1px;
    cursor: pointer;
    font-size: 0.6rem;
    font-weight: bold;
    transition: all 0.2s ease;
    border: 1px solid transparent;
    user-select: none;

    &.active {
        background: rgba($primary, 0.4);
        color: black;
        border-color: rgba($primary, 0.4);

        &:hover {
            background: color.adjust($primary, $lightness: 5%);
            border-color: color.adjust($primary, $lightness: -15%);
            transform: scale(1.05);
        }
    }

    &.inactive {
        background: rgba(128, 128, 128, 0.3) !important;
        color: $text !important;
        border-color: rgba(128, 128, 128, 0.4) !important;

        &:hover {
            background: rgba(128, 128, 128, 0.4);
            border-color: rgba(128, 128, 128, 0.5);
            transform: scale(1.05);
        }
    }

    &.current-day {
        background: $primary;
        color: black;
        border-color: color.adjust($primary, $lightness: -10%);

        &:hover {
            background: color.adjust($primary, $lightness: 5%);
            border-color: color.adjust($primary, $lightness: -15%);
            transform: scale(1.05);
        }
    }

    &:active {
        transform: scale(0.95);
    }
}

/* Mobile responsive */
@media (max-width: $mobile-resolution) {
    .user-working-days-toggles {
        padding: 4px;
    }

    .toggles-container {
        gap: 1px;
    }

    .day-toggle {
        font-size: 0.6rem;
    }
}
</style>

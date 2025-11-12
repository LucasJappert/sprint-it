<template>
    <div class="working-days-toggles">
        <div class="toggles-container">
            <div
                v-for="(isWorking, index) in workingDays"
                :key="index"
                class="day-toggle"
                :class="{ active: isWorking, inactive: !isWorking }"
                @click="toggleDay(index)"
                :title="getDayTooltip(index)"
            >
                {{ index + 1 }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Props {
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
.working-days-toggles {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 8px;
    width: 100%;
}

.toggles-container {
    display: flex;
    gap: 4px;
    justify-content: center;
    width: 100%;
}

.day-toggle {
    width: 10%;
    max-width: 50px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 2px;
    cursor: pointer;
    font-size: 0.7rem;
    font-weight: bold;
    transition: all 0.2s ease;
    border: 1px solid transparent;
    user-select: none;

    &.active {
        background: $primary;
        color: white;
        border-color: color.adjust($primary, $lightness: -10%);

        &:hover {
            background: color.adjust($primary, $lightness: 5%);
            border-color: color.adjust($primary, $lightness: -15%);
            transform: scale(1.05);
        }
    }

    &.inactive {
        background: rgba(128, 128, 128, 0.2);
        color: rgba(255, 255, 255, 0.5);
        border-color: rgba(128, 128, 128, 0.3);

        &:hover {
            background: rgba(128, 128, 128, 0.3);
            border-color: rgba(128, 128, 128, 0.4);
            transform: scale(1.05);
        }
    }

    &:active {
        transform: scale(0.95);
    }
}

/* Mobile responsive */
@media (max-width: $mobile-resolution) {
    .working-days-toggles {
        padding: 6px;
    }

    .toggles-container {
        gap: 2px;
    }

    .day-toggle {
        font-size: 0.7rem;
    }
}
</style>

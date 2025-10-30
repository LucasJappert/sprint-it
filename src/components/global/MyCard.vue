<template>
    <div class="my-card" :class="accentClass">
        <slot />
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { AccentColor } from "../../types";
const props = withDefaults(defineProps<{ accent?: AccentColor }>(), { accent: 'primary' });
const accentClass = computed(() => {
    switch (props.accent) {
        case 'blue': return 'accent-blue';
        case 'gray': return 'accent-gray';
        case 'green': return 'accent-green';
        case 'light-green': return 'accent-light-green';
        case 'light-yellow': return 'accent-light-yellow';
        default: return '';
    }
});
</script>

<style scoped lang="scss">
.my-card {
    // box-shadow: 1px 1px 5px #00000050;
    border-radius: 10px;
    padding: 10px;
    background: rgba($primary, 0.05);
    // box-shadow: 5px 5px 10px rgba($gray1, 0.3);
    border: 1px solid rgba($primary, 0.4);
    // overflow: hidden;
}

.my-card.accent-blue {
    background: rgba($blue, 0.06);
    border-color: rgba($blue, 0.45);
}

.my-card.accent-gray {
    background: rgba($gray, 0.06);
    border-color: rgba($gray, 0.45);
}

.my-card.accent-green {
    background: rgba($green, 0.06);
    border-color: rgba($green, 0.45);
}

.my-card.accent-light-green {
    background: rgba($greenLight, 0.06);
    border-color: rgba($greenLight, 0.45);
}
.my-card.accent-light-yellow {
    background: rgba($yellowLight, 0.06);
    border-color: rgba($yellowLight, 0.45);
}

/* Special glow variant: respect accent color */
.my-card.special-card {
    box-shadow: 0 0 12px 2px $primary, 0 0 28px 8px rgba($primary, 0.45), 0 0 56px 16px rgba($primary, 0.25);
}
.my-card.special-card.accent-blue {
    box-shadow: 0 0 12px 2px $blue, 0 0 28px 8px rgba($blue, 0.45), 0 0 56px 16px rgba($blue, 0.25);
}
.my-card.special-card.accent-gray {
    box-shadow: 0 0 12px 2px $gray, 0 0 28px 8px rgba($gray, 0.45), 0 0 56px 16px rgba($gray, 0.25);
}
.my-card.special-card.accent-green {
    box-shadow: 0 0 12px 2px $green, 0 0 28px 8px rgba($green, 0.45), 0 0 56px 16px rgba($green, 0.25);
}
.my-card.special-card.accent-light-green {
    box-shadow: 0 0 12px 2px $greenLight, 0 0 28px 8px rgba($greenLight, 0.45), 0 0 56px 16px rgba($greenLight, 0.25);
}
.my-card.special-card.accent-light-yellow {
    box-shadow: 0 0 12px 2px $yellowLight, 0 0 28px 8px rgba($yellowLight, 0.45), 0 0 56px 16px rgba($yellowLight, 0.25);
}

/* Headings inside slotted content should inherit accent color */
.my-card :deep(h3) {
    color: $primary !important;
}
.my-card.accent-blue :deep(h3) {
    color: $blue !important;
}
.my-card.accent-gray :deep(h3) {
    color: $gray !important;
}
.my-card.accent-green :deep(h3) {
    color: $green !important;
}
.my-card.accent-light-green :deep(h3) {
    color: $greenLight !important;
}
.my-card.accent-light-yellow :deep(h3) {
    color: $yellowLight !important;
}
</style>

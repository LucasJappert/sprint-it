<template>
    <v-btn class="my-button" :class="classes" :style="btnStyle" v-bind="$attrs" :disabled="disabled" @click.stop="onClick">
        <v-icon v-if="icon" :size="iconSize">{{ icon }}</v-icon>
        <slot>
            <span v-if="text">
                <span v-if="icon" class="ml-1"></span>
                {{ text }}
            </span>
        </slot>
    </v-btn>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { AccentColor } from "../../types";
const props = withDefaults(
    defineProps<{
        text?: string;
        icon?: string | null;
        btnClass?: string; // clases extra opcionales
        iconSize?: number | string;
        minWidth?: number | string;
        disabled?: boolean;
        secondary?: boolean;
        danger?: boolean;
        accent?: AccentColor;
    }>(),
    {
        text: "",
        icon: null,
        btnClass: "",
        iconSize: 20,
        disabled: false,
        secondary: false,
        danger: false,
        accent: "primary",
    },
);

const emit = defineEmits<{
    (e: "click", ev: MouseEvent): void;
}>();

const onClick = (e: MouseEvent) => emit("click", e);

const toUnit = (v?: number | string) => {
    if (v === undefined || v === null || v === "") return undefined;
    return typeof v === "number" ? `${v}px` : v;
};

const btnStyle = computed(() => {
    const mw = toUnit(props.minWidth);
    return mw ? { minWidth: mw } : undefined;
});

// Aplica colorClass, btnClass y flags condicionales
const classes = computed(() => [
    props.btnClass,
    {
        secondary: props.secondary,
        danger: props.danger,
        "accent-blue": props.accent === "blue",
        "accent-gray": props.accent === "gray",
        "accent-green": props.accent === "green",
        "accent-light-green": props.accent === "light-green",
        "accent-light-yellow": props.accent === "light-yellow",
    },
]);
</script>

<style scoped lang="scss">
.my-button {
    width: auto;
    min-width: auto !important;
    padding: 0 5px;
    border: 1px solid $primary;
    color: $primary;
    background-color: rgba($primary, 0.08);
    border-radius: 30px;
    // min-width: auto !important;
    /* Variante secundaria: gris medio (no tan apagado como disabled) */
    &.v-btn {
        text-transform: none;
    }
    &.secondary {
        background-color: rgba(255, 255, 255, 0.08) !important; // gris suave sobre fondo oscuro
        border: 1px solid rgba(255, 255, 255, 0.18) !important;
        color: $gray1 !important;

        :deep(.v-icon) {
            color: rgba(255, 255, 255, 0.92) !important;
            opacity: 0.9;
        }

        /* Hover / Active (solo cuando NO está disabled) */
        &:hover:not(.v-btn--disabled) {
            background-color: rgba(255, 255, 255, 0.12) !important;
            border-color: rgba(255, 255, 255, 0.28) !important;
        }
        &:active:not(.v-btn--disabled) {
            background-color: rgba(255, 255, 255, 0.16) !important;
            border-color: rgba(255, 255, 255, 0.32) !important;
        }

        /* Focus */
        &:focus-visible {
            box-shadow: 0 0 0 1px rgba($primary, 0.35) inset !important;
            outline: none;
        }
    }

    &.danger {
        background-color: rgba($danger, 0.08) !important;
        border: 1px solid rgba($danger, 0.18) !important;
        color: rgba($danger, 0.92) !important;
        /* Hover / Active (solo cuando NO está disabled) */
        &:hover:not(.v-btn--disabled) {
            background-color: rgba($danger, 0.12) !important;
            border-color: rgba($danger, 0.28) !important;
        }
        &:active:not(.v-btn--disabled) {
            background-color: rgba($danger, 0.16) !important;
            border-color: rgba($danger, 0.32) !important;
        }
    }

    /* 👇 Dejamos el estado disabled al final para que gane si coincide con .secondary */
    &.v-btn--disabled {
        background-color: rgba($primary, 0.15) !important;
        border: 1px solid rgba($primary, 0.15) !important;
        color: rgba($primary, 0.35) !important;
    }
}

/* Accent blue variant (celeste) */
.my-button.accent-blue {
    border-color: $blue !important;
    color: $blue !important;
    background-color: rgba($blue, 0.08) !important;

    &.v-btn--disabled {
        background-color: rgba($blue, 0.15) !important;
        border-color: rgba($blue, 0.15) !important;
        color: rgba($blue, 0.35) !important;
    }
}

/* Accent gray variant */
.my-button.accent-gray {
    border-color: $gray !important;
    color: $gray !important;
    background-color: rgba($gray, 0.08) !important;

    &.v-btn--disabled {
        background-color: rgba($gray, 0.15) !important;
        border-color: rgba($gray, 0.15) !important;
        color: rgba($gray, 0.35) !important;
    }
}

/* Accent green variant */
.my-button.accent-green {
    border-color: $green !important;
    color: $green !important;
    background-color: rgba($green, 0.08) !important;

    &.v-btn--disabled {
        background-color: rgba($green, 0.15) !important;
        border-color: rgba($green, 0.15) !important;
        color: rgba($green, 0.35) !important;
    }
}

/* Accent light-green variant */
.my-button.accent-light-green {
    border-color: $greenLight !important;
    color: $greenLight !important;
    background-color: rgba($greenLight, 0.08) !important;

    &.v-btn--disabled {
        background-color: rgba($greenLight, 0.15) !important;
        border-color: rgba($greenLight, 0.15) !important;
        color: rgba($greenLight, 0.35) !important;
    }
}

/* Accent light-yellow variant */
.my-button.accent-light-yellow {
    border-color: $yellowLight !important;
    color: $yellowLight !important;
    background-color: rgba($yellowLight, 0.08) !important;

    &.v-btn--disabled {
        background-color: rgba($yellowLight, 0.15) !important;
        border-color: rgba($yellowLight, 0.15) !important;
        color: rgba($yellowLight, 0.35) !important;
    }
}
</style>

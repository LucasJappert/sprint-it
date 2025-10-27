<template>
    <v-dialog v-model="open" :max-width="maxWidth" :persistent="persistent" scrim="rgba(0,0,0,0.5)">
        <v-card class="alert-card" :aria-labelledby="titleId" :aria-describedby="bodyId" role="dialog">
            <v-card-title class="justify-center pt-6" v-if="!hideIcon && icon && iconName">
                <slot name="icon">
                    <div class="icon-wrapper">
                        <v-icon :color="iconColor" size="56">{{ iconName }}</v-icon>
                    </div>
                </slot>
            </v-card-title>

            <v-card-text class="text-center pt-3 px-6">
                <h3 class="title" :id="titleId">{{ title }}</h3>

                <div class="mt-2 body" :id="bodyId">
                    <slot>
                        <div v-if="html" v-html="html" />
                        <div v-else-if="text">{{ text }}</div>
                    </slot>
                </div>
            </v-card-text>

            <v-card-actions class="px-6 pb-5" :class="actionsClass">
                <!-- Cancel (left) -->
                <MyButton
                    v-if="showCancel"
                    :text="cancelText"
                    :class="buttonClasses?.cancel"
                    :secondary="true"
                    v-bind="{ minWidth: 60, ...cancelBtnProps }"
                    @click="onCancel"
                />

                <v-spacer />

                <!-- Confirm (right) -->
                <MyButton :text="confirmText" :class="buttonClasses?.confirm" v-bind="{ minWidth: 60, ...confirmBtnProps }" @click="onConfirm" />
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";

const props = withDefaults(
    defineProps<{
        modelValue: boolean;
        title?: string;
        text?: string;
        html?: string;
        icon?: "success" | "info" | "warning" | "error" | "none";
        hideIcon?: boolean;
        showCancel?: boolean;
        confirmText?: string;
        cancelText?: string;
        buttonClasses?: { confirm?: string; cancel?: string };
        persistent?: boolean;
        maxWidth?: number | string;
        actionsClass?: string;

        /** Passthrough props to MyButton (confirm/cancel) */
        confirmBtnProps?: Record<string, any>;
        cancelBtnProps?: Record<string, any>;
    }>(),
    {
        title: "ATENCIÓN",
        text: "",
        html: "",
        icon: "info",
        hideIcon: false,
        showCancel: true,
        confirmText: "SI",
        cancelText: "NO",
        buttonClasses: () => ({}),
        persistent: true,
        maxWidth: 440,
        actionsClass: "",
        confirmBtnProps: () => ({ color: "my-green-button1", colorClass: "my-green-button1" }),
        cancelBtnProps: () => ({ secondary: true }),
    },
);

const emit = defineEmits<{
    (e: "update:modelValue", val: boolean): void;
    (e: "confirm"): void;
    (e: "cancel"): void;
}>();

const open = computed({
    get: () => props.modelValue,
    set: (v) => emit("update:modelValue", v),
});

const iconsMap = {
    success: "mdi-check-circle-outline",
    info: "mdi-information-outline",
    warning: "mdi-alert-circle-outline",
    error: "mdi-close-circle-outline",
    none: "",
} as const;

const colorsMap = {
    success: "success",
    info: "info",
    warning: "warning",
    error: "error",
    none: "",
} as const;

const iconName = computed(() => iconsMap[props.icon ?? "info"]);
const iconColor = computed(() => colorsMap[props.icon ?? "info"]);

const onCancel = (): void => {
    open.value = false;
    emit("cancel");
};
const onConfirm = (): void => {
    open.value = false;
    emit("confirm");
};

const uid = Math.random().toString(36).slice(2);
const titleId = `alert-title-${uid}`;
const bodyId = `alert-body-${uid}`;

const handleKeydown = (event: KeyboardEvent) => {
    if (!open.value) return;

    if (event.key === "Enter") {
        event.preventDefault();
        onConfirm();
    } else if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
    }
};

onMounted(() => {
    document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
    document.removeEventListener("keydown", handleKeydown);
});
</script>

<style scoped lang="scss">
.alert-card {
    background: rgba($bg-primary, 1);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 16px;
    backdrop-filter: blur(2px);
}

.icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
}

.title {
    color: #e9f0f0;
    font-size: 1rem;
    margin: 0;
}
.body {
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.95rem;
}
</style>

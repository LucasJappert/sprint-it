<template>
    <div v-if="visible" class="my-dialog-overlay" @mousedown.self="closeDialog">
        <div class="my-dialog" :class="{ 'full-size': fullSize, 'bg-transparent': bgTransparent }" :style="myDialogStyles">
            <div :class="{ 'slot-container': hasMinWidth }">
                <slot />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";

const emit = defineEmits<{
    (e: "close"): void;
}>();

const props = withDefaults(
    defineProps<{
        visible: boolean;
        myDialogStyles?: string;
        minWidth?: string | number;
        fullSize?: boolean;
        bgTransparent?: boolean;
        persistent?: boolean;
    }>(),
    {
        myDialogStyles: "",
        minWidth: "900px",
        fullSize: false,
        bgTransparent: false,
        persistent: false,
    },
);

const hasMinWidth = computed(() => !!props.minWidth);

const formattedMinWidth = computed(() => {
    if (typeof props.minWidth === "number") {
        return `${props.minWidth}px`;
    }
    return props.minWidth;
});

const closeDialog = () => {
    if (props.persistent) return console.log("Cant close persistent dialog");
    emit("close");
};

const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key == "Escape" || event.key == "Esc") return emit("close");
    const stack = (window as any).myDialogStack || [];
    if (stack[stack.length - 1] !== dialogInstance) return;
    // if (event.key !== "Enter" && event.key !== "Space" && event.key !== "ArrowUp" && event.key !== "ArrowDown") {
    //     console.log("key", event.key);
    //     closeDialog();
    // }
};

const dialogInstance = {}; // dummy reference to track this instance

onMounted(() => {
    const w = window as any;
    if (!w.myDialogStack) w.myDialogStack = [];
    w.myDialogStack.push(dialogInstance);
    document.addEventListener("keydown", handleKeyDown);
});

onBeforeUnmount(() => {
    const w = window as any;
    document.removeEventListener("keydown", handleKeyDown);
    const idx = w.myDialogStack?.indexOf(dialogInstance);
    if (idx !== -1) w.myDialogStack.splice(idx, 1);
});
</script>

<style scoped lang="scss">
$bg-primary: var(--panel) !default;
$mobile-resolution: 600px !default;
.my-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
}

:global(html:has(.my-dialog-overlay)) {
    overflow: hidden !important;
}

.full-size {
    max-width: 98vw !important;
    max-height: 98vh !important;
    width: 98vw !important;
    height: 98vh !important;
}

.my-dialog {
    background-color: $bg-primary;
    border-radius: 8px;
    width: 1000px;
    min-width: v-bind("formattedMinWidth");
    max-width: 90%;
    box-shadow: 0 2px 10px #000000cc;

    &.bg-transparent {
        background: transparent !important;
    }

    &::-webkit-scrollbar {
        width: 10px;
        height: 10px;
    }

    section {
        max-height: 60vh;
        overflow-y: auto;

        ::-webkit-scrollbar {
            width: 10px;
            height: 10px;
        }

        @media (max-height: 400px) {
            max-height: 40vh;
        }
    }

    :deep(.header) {
        padding: 14px 16px;
        background: $bg-secondary;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 14px 14px 0 0;
    }
    :deep(.body-scroll) {
        padding: 16px;
        max-height: 80vh;
        overflow-y: auto;
    }
    :deep(.footer) {
        padding: 12px 16px 16px;
        background: $bg-secondary;
        border-top: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 0 0 14px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    @media (max-width: 768px) {
        min-width: auto;
        width: 96%;
        max-width: 96%;
        max-height: 96vh;
    }

    @media (max-width: 480px) {
        width: 98%;
        max-width: 98%;
        max-height: 98vh;
    }
}

.slot-container {
    @media (max-width: $mobile-resolution) {
        min-width: auto; /* Allow flexible width on mobile */
    }
}
</style>

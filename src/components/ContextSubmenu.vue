<template>
    <Teleport to="body">
        <div
            v-if="isVisible"
            class="context-submenu"
            :style="{ left: positionX + 'px', top: positionY + 'px' }"
            @click.stop
            @mouseenter="onMouseEnter"
            @mouseleave="onMouseLeave"
        >
            <div v-for="option in options" :key="option.key" class="context-menu-item" @click="onOptionClick(option)">
                <i
                    v-if="option.icon"
                    class="v-icon notranslate mdi context-menu-icon"
                    :class="option.icon.startsWith('mdi-') ? option.icon : ''"
                    :style="option.iconStyle || { color: option.color || 'var(--text)' }"
                >
                    {{ !option.icon.startsWith("mdi-") ? option.icon : "" }}
                </i>
                <span class="context-menu-text" v-html="option.label"></span>
            </div>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { ref } from "vue";

export interface ContextMenuOption {
    key: string;
    label: string;
    icon?: string;
    color?: string;
    iconStyle?: string;
    action?: () => void;
}

const props = defineProps<{
    options: ContextMenuOption[];
}>();

const emit = defineEmits<{
    optionSelected: [option: ContextMenuOption];
    close: [];
    mouseEnter: [];
    mouseLeave: [];
}>();

const isVisible = ref(false);
const positionX = ref(0);
const positionY = ref(0);

const show = (x: number, y: number) => {
    positionX.value = x;
    positionY.value = y;
    isVisible.value = true;

    // Agregar listener para cerrar submenu al hacer click fuera
    document.addEventListener("mousedown", closeOnClickOutside, { once: true });
};

const hide = () => {
    isVisible.value = false;
    emit("close");
};

const onOptionClick = (option: ContextMenuOption) => {
    emit("optionSelected", option);
    hide();
};

const onMouseEnter = () => {
    emit("mouseEnter");
};

const onMouseLeave = () => {
    emit("mouseLeave");
};

const closeOnClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    // Solo cerrar si el click no fue dentro del submenu
    if (!target.closest(".context-submenu")) {
        hide();
    }
};

// Exponer métodos para uso externo
defineExpose({
    show,
    hide,
});
</script>

<style scoped lang="scss">
.context-submenu {
    position: fixed;
    background: $bg-primary;
    border-radius: 4px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
    min-width: 120px;
    padding: 4px 0;
    border: 1px solid rgba(255, 255, 255, 0.1);
    z-index: 1001;
}

.context-menu-item {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    cursor: pointer;
    transition: background-color 0.2s;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background-color: rgba(255, 255, 255, 0.04);
    }

    &:active {
        background-color: rgba(255, 255, 255, 0.08);
    }
}

.context-menu-icon {
    font-size: 16px;
    margin-right: 12px;
    color: $text;
}

.context-menu-text {
    font-size: 14px;
    color: $text;
    flex: 1;
}
</style>

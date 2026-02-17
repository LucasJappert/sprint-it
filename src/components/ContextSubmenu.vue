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
    // Calcular posición ajustada para mantener el submenu dentro de la pantalla
    const submenuWidth = 170; // min-width del submenu
    const submenuHeight = props.options.length * 40 + 8; // aproximado: items * altura + padding

    let adjustedX = x;
    let adjustedY = y;

    // Ajustar horizontalmente si se sale por la derecha
    if (x + submenuWidth > window.innerWidth) {
        adjustedX = window.innerWidth - submenuWidth - 10; // margen de 10px
    }

    // Ajustar verticalmente si se sale por abajo
    if (y + submenuHeight > window.innerHeight) {
        adjustedY = window.innerHeight - submenuHeight - 10; // mostrar arriba
    }

    // Ajustar verticalmente si se sale por arriba (y < 0)
    if (adjustedY < 10) {
        adjustedY = 10;
    }

    positionX.value = Math.max(10, adjustedX); // mínimo margen izquierdo
    positionY.value = Math.max(10, adjustedY); // mínimo margen superior
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
    box-shadow:
        0 4px 16px rgba(0, 0, 0, 0.3),
        0 0 0 1px rgba(255, 255, 255, 0.1);
    min-width: 180px;
    max-height: 300px;
    padding: 4px 0;
    border: 1px solid rgba(255, 255, 255, 0.1);
    z-index: 1001;
    overflow-y: auto;

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
    }
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

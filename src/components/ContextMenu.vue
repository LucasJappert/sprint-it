<template>
    <Teleport to="body">
        <div v-if="isVisible" class="context-menu" :style="{ left: positionX + 'px', top: positionY + 'px' }" @click.stop>
            <div v-for="option in options" :key="option.key" class="context-menu-item" @click="onOptionClick(option)">
                <v-icon v-if="option.icon" size="16" class="context-menu-icon" :class="option.color">{{ option.icon }}</v-icon>
                <span class="context-menu-text">{{ option.label }}</span>
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
    action: () => void;
}

const props = defineProps<{
    options: ContextMenuOption[];
}>();

const emit = defineEmits<{
    close: [];
}>();

const isVisible = ref(false);
const positionX = ref(0);
const positionY = ref(0);

const show = async (x: number, y: number) => {
    // Calcular posición ajustada para mantener el menú dentro de la pantalla
    const menuWidth = 120; // min-width del menú
    const menuHeight = props.options.length * 40 + 8; // aproximado: items * altura + padding

    let adjustedX = x;
    let adjustedY = y;

    // Ajustar horizontalmente si se sale por la derecha
    if (x + menuWidth > window.innerWidth) {
        adjustedX = window.innerWidth - menuWidth - 10; // margen de 10px
    }

    // Ajustar verticalmente si se sale por abajo
    if (y + menuHeight > window.innerHeight) {
        adjustedY = y - menuHeight - 10; // mostrar arriba del cursor
    }

    positionX.value = Math.max(10, adjustedX); // mínimo margen izquierdo
    positionY.value = Math.max(10, adjustedY); // mínimo margen superior
    isVisible.value = true;

    // Agregar listener para cerrar menú al hacer click fuera
    await nextTick();
    document.addEventListener("mousedown", closeOnClickOutside, { once: true });
};

const hide = () => {
    isVisible.value = false;
    emit("close");
    // Limpiar el estado del item con menú contextual abierto
    // Esto se maneja desde el componente padre
};

const onOptionClick = (option: ContextMenuOption) => {
    option.action();
    hide();
};

const closeOnClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    // Solo cerrar si el click no fue dentro del menú
    if (!target.closest(".context-menu")) {
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
.context-menu {
    position: fixed;
    background: $bg-primary;
    border-radius: 4px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
    min-width: 120px;
    padding: 4px 0;
    border: 1px solid rgba(255, 255, 255, 0.1);
    z-index: 1000;
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
    margin-right: 12px;
    color: $text;
}

.context-menu-text {
    font-size: 14px;
    color: $text;
}
</style>

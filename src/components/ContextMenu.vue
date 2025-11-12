<template>
    <Teleport to="body">
        <div v-if="isVisible" class="context-menu" :style="{ left: positionX + 'px', top: positionY + 'px' }" @click.stop>
            <div
                v-for="option in options"
                :key="option.key"
                class="context-menu-item"
                @click="onOptionClick(option)"
                @mouseenter="onOptionMouseEnter(option)"
                @mouseleave="onOptionMouseLeave(option)"
            >
                <v-icon v-if="option.icon" size="16" class="context-menu-icon" :class="option.color">{{ option.icon }}</v-icon>
                <span class="context-menu-text">{{ option.label }}</span>
                <v-icon v-if="option.submenu" size="16" class="context-menu-arrow">mdi-chevron-right</v-icon>
            </div>
        </div>

        <!-- Submenu -->
        <ContextSubmenu
            ref="submenuRef"
            :options="currentSubmenuOptions"
            @option-selected="onSubmenuOptionSelected"
            @close="onSubmenuClosed"
            @mouse-enter="onSubmenuMouseEnter"
            @mouse-leave="onSubmenuMouseLeave"
        />
    </Teleport>
</template>

<script setup lang="ts">
import { nextTick, ref } from "vue";
import ContextSubmenu from "./ContextSubmenu.vue";

export interface ContextMenuOption {
    key: string;
    label: string;
    icon?: string;
    color?: string;
    iconStyle?: string;
    action?: () => void;
    submenu?: ContextMenuOption[];
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
const submenuRef = ref();
const currentSubmenuOptions = ref<ContextMenuOption[]>([]);

const show = async (x: number, y: number) => {
    // Calcular posición ajustada para mantener el menú dentro de la pantalla
    const menuWidth = 170; // min-width del menú (incrementado para texto largo)
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
    closeCurrentSubmenu();
    emit("close");
    // Limpiar el estado del item con menú contextual abierto
    // Esto se maneja desde el componente padre
};

const onOptionClick = (option: ContextMenuOption) => {
    // Solo ejecutar acciones para opciones sin submenu
    if (!option.submenu && option.action) {
        option.action();
        hide();
    }
};

const onOptionMouseEnter = (option: ContextMenuOption) => {
    if (option.submenu) {
        showSubmenu(option);
    } else {
        // Si la opción no tiene submenu, cerrar cualquier submenu abierto
        closeCurrentSubmenu();
    }
};

const onOptionMouseLeave = (option: ContextMenuOption) => {
    // Para opciones con submenu, mantener abierto mientras el mouse esté sobre el submenu
    if (option.submenu) {
        // No hacer nada aquí - el submenu se controla desde onSubmenuMouseLeave
        return;
    }
};

const onSubmenuOptionSelected = (option: ContextMenuOption) => {
    if (option.action) {
        option.action();
        hide();
    }
};

const onSubmenuClosed = () => {
    // El submenu se cerró, no necesitamos hacer nada especial aquí
};

const onSubmenuMouseEnter = () => {
    // El mouse entró al submenu, cancelar cualquier cierre pendiente
};

const onSubmenuMouseLeave = () => {
    // El mouse salió del submenu, cerrar después de un pequeño delay
    // Solo cerrar si tampoco estamos sobre el menú principal
    setTimeout(() => {
        if (!isMouseOverMenu() && !isMouseOverSubmenu()) {
            closeCurrentSubmenu();
        }
    }, 150); // Mayor delay para permitir movimiento del mouse
};

const isMouseOverSubmenu = () => {
    // Verificar si el mouse está sobre el submenu
    const submenuElement = document.querySelector(".context-submenu");
    return submenuElement && submenuElement.matches(":hover");
};

const isMouseOverMenu = () => {
    // Verificar si el mouse está sobre el menú principal
    const menuElement = document.querySelector(".context-menu");
    return menuElement && menuElement.matches(":hover");
};

const closeOnClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    // Solo cerrar si el click no fue dentro del menú
    if (!target.closest(".context-menu") && !target.closest(".context-submenu")) {
        hide();
    }
};

const closeCurrentSubmenu = () => {
    if (submenuRef.value) {
        submenuRef.value.hide();
    }
};

const showSubmenu = (option: ContextMenuOption) => {
    if (!option.submenu) return;

    // Cerrar submenu anterior si existe
    closeCurrentSubmenu();

    // Calcular posición del submenu centrado verticalmente con la opción
    const menuElement = document.querySelector(".context-menu") as HTMLElement;
    const menuItems = document.querySelectorAll(".context-menu-item");

    if (menuElement && submenuRef.value && menuItems.length > 0) {
        const rect = menuElement.getBoundingClientRect();
        const submenuWidth = 170;

        // Decidir si mostrar a la derecha o izquierda del menú principal
        let submenuX: number;
        if (rect.right + submenuWidth <= window.innerWidth) {
            submenuX = rect.right; // Mostrar a la derecha
        } else {
            submenuX = rect.left - submenuWidth; // Mostrar a la izquierda
        }

        // Encontrar el índice de la opción actual para calcular la posición vertical
        let optionIndex = -1;
        menuItems.forEach((item, index) => {
            const textElement = item.querySelector(".context-menu-text");
            if (textElement && textElement.textContent === option.label) {
                optionIndex = index;
            }
        });

        // Calcular la posición Y centrada con la opción
        // Cada item del menú mide aproximadamente 40px de alto
        const itemHeight = 40;
        let submenuY = rect.top + optionIndex * itemHeight;

        // Ajustar la posición Y del submenu si se sale por abajo
        const submenuHeight = option.submenu.length * 40 + 8;
        if (submenuY + submenuHeight > window.innerHeight) {
            submenuY = window.innerHeight - submenuHeight - 10;
        }
        if (submenuY < 10) {
            submenuY = 10;
        }

        // Configurar opciones del submenu
        currentSubmenuOptions.value = option.submenu;

        // Mostrar el submenu
        submenuRef.value.show(submenuX, submenuY);
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
    min-width: 180px;
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
    flex: 1;
}

.context-menu-arrow {
    margin-left: auto;
    color: $text;
    opacity: 0.6;
}
</style>

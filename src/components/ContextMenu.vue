<template>
    <Teleport to="body">
        <div v-if="isVisible" class="context-menu" :style="{ left: positionX + 'px', top: positionY + 'px' }" @click.stop>
            <div v-for="option in options" :key="option.key" class="context-menu-item" @click="onOptionClick(option)">
                <v-icon v-if="option.icon" size="16" class="context-menu-icon" :class="option.color">{{ option.icon }}</v-icon>
                <span class="context-menu-text">{{ option.label }}</span>
                <v-icon v-if="option.submenu" size="16" class="context-menu-arrow">mdi-chevron-right</v-icon>
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
const currentSubmenu = ref<HTMLElement | null>(null);

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
    closeCurrentSubmenu();
    emit("close");
    // Limpiar el estado del item con menú contextual abierto
    // Esto se maneja desde el componente padre
};

const onOptionClick = (option: ContextMenuOption) => {
    if (option.submenu) {
        // Si tiene submenu, mostrarlo
        showSubmenu(option);
    } else if (option.action) {
        // Si tiene acción, ejecutarla
        option.action();
        hide();
    }
};

const closeOnClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    // Solo cerrar si el click no fue dentro del menú
    if (!target.closest(".context-menu") && !target.closest(".context-submenu")) {
        hide();
    }
};

const closeCurrentSubmenu = () => {
    if (currentSubmenu.value && document.body.contains(currentSubmenu.value)) {
        document.body.removeChild(currentSubmenu.value);
        currentSubmenu.value = null;
    }
};

const showSubmenu = (option: ContextMenuOption) => {
    if (!option.submenu) return;

    // Calcular posición del submenu (a la derecha del menú actual)
    const menuElement = document.querySelector(".context-menu") as HTMLElement;
    if (menuElement) {
        const rect = menuElement.getBoundingClientRect();
        const submenuX = rect.right + 5; // 5px de separación
        const submenuY = rect.top;

        // Crear instancia temporal del submenu
        const submenu = document.createElement("div");
        submenu.className = "context-submenu";
        submenu.style.position = "fixed";
        submenu.style.left = submenuX + "px";
        submenu.style.top = submenuY + "px";
        submenu.style.background = "var(--bg-primary)";
        submenu.style.borderRadius = "4px";
        submenu.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.3)";
        submenu.style.minWidth = "120px";
        submenu.style.padding = "4px 0";
        submenu.style.border = "1px solid rgba(255, 255, 255, 0.1)";
        submenu.style.zIndex = "1001";

        option.submenu.forEach((subOption) => {
            const item = document.createElement("div");
            item.className = "context-menu-item";
            item.style.display = "flex";
            item.style.alignItems = "center";
            item.style.padding = "8px 16px";
            item.style.cursor = "pointer";
            item.style.transition = "background-color 0.2s";
            item.style.borderBottom = "1px solid rgba(255, 255, 255, 0.1)";

            if (subOption.icon) {
                const icon = document.createElement("i");
                icon.className = "v-icon notranslate mdi";
                icon.style.fontSize = "16px";
                icon.style.marginRight = "12px";
                icon.style.color = subOption.color || "var(--text)";
                // Para iconos de Material Design, necesitamos usar el formato correcto
                if (subOption.icon.startsWith("mdi-")) {
                    icon.classList.add(subOption.icon);
                } else {
                    icon.textContent = subOption.icon;
                }
                item.appendChild(icon);
            }

            const span = document.createElement("span");
            span.style.fontSize = "14px";
            span.style.color = "var(--text)";
            span.textContent = subOption.label;
            item.appendChild(span);

            item.addEventListener("click", () => {
                if (subOption.action) {
                    subOption.action();
                    hide();
                }
            });

            item.addEventListener("mouseenter", () => {
                item.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
            });

            item.addEventListener("mouseleave", () => {
                item.style.backgroundColor = "";
            });

            submenu.appendChild(item);
        });

        // Agregar al body
        document.body.appendChild(submenu);
        currentSubmenu.value = submenu;

        // Cerrar submenu al hacer click fuera
        const handleClickOutside = (e: MouseEvent) => {
            if (!submenu.contains(e.target as Node)) {
                closeCurrentSubmenu();
                document.removeEventListener("mousedown", handleClickOutside);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
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
    flex: 1;
}

.context-menu-arrow {
    margin-left: auto;
    color: $text;
    opacity: 0.6;
}
</style>

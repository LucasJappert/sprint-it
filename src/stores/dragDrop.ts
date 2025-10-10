import type { Item } from "@/types";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

export const useDragDropStore = defineStore("dragDrop", () => {
    // Estado del drag
    const dragItem = ref<Item | null>(null);
    const hoverItem = ref<Item | null>(null);
    const hoverPosition = ref<"above" | "below" | null>(null);

    // Estado del ghost
    const ghostElement = ref<HTMLElement | null>(null);

    // Computed para facilitar acceso
    const isDragging = computed(() => dragItem.value !== null);
    const hasHover = computed(() => hoverItem.value !== null);

    // Función para iniciar drag
    const startDragAsync = (item: Item) => {
        dragItem.value = item;
    };

    // Función para establecer hover
    const setHoverAsync = (item: Item | null, position: "above" | "below" | null = null) => {
        hoverItem.value = item;
        hoverPosition.value = position;
    };

    // Función para limpiar estado del drag
    const clearDragStateAsync = () => {
        dragItem.value = null;
        hoverItem.value = null;
        hoverPosition.value = null;
        removeGhostAsync();
    };

    // Función para crear el elemento ghost
    const createGhostAsync = (sourceElement: HTMLElement) => {
        // Remover ghost existente
        removeGhostAsync();

        // Crear nuevo ghost
        ghostElement.value = sourceElement.cloneNode(true) as HTMLElement;
        ghostElement.value.classList.add("draggable-ghost");
        ghostElement.value.style.position = "fixed";
        ghostElement.value.style.pointerEvents = "none";
        ghostElement.value.style.zIndex = "9999";
        ghostElement.value.style.transform = "rotate(-2deg)";
        ghostElement.value.style.opacity = "0.95";

        // Forzar dimensiones específicas del elemento original
        const originalRect = sourceElement.getBoundingClientRect();
        ghostElement.value.style.width = originalRect.width + "px";
        ghostElement.value.style.height = originalRect.height + "px";
        ghostElement.value.style.minWidth = originalRect.width + "px";
        ghostElement.value.style.minHeight = originalRect.height + "px";

        // Agregar el ghost al DOM
        document.body.appendChild(ghostElement.value);

        console.log("[DRAG_STORE] Ghost creado:", {
            x: ghostElement.value.getBoundingClientRect().left,
            y: ghostElement.value.getBoundingClientRect().top,
            width: ghostElement.value.getBoundingClientRect().width,
            height: ghostElement.value.getBoundingClientRect().height,
        });
    };

    // Función para actualizar posición del ghost
    const updateGhostPositionAsync = (x: number, y: number) => {
        if (ghostElement.value) {
            ghostElement.value.style.left = x + "px";
            ghostElement.value.style.top = y + "px";

            console.log("[DRAG_STORE] Ghost posicionado:", { x, y });
        }
    };

    // Función para posicionar ghost basado en hover state
    const positionGhostForHoverAsync = () => {
        if (!ghostElement.value || !hoverItem.value || !hoverPosition.value || !dragItem.value) {
            return;
        }

        // Si el hover está sobre el mismo item que se está arrastrando
        if (hoverItem.value.id === dragItem.value.id) {
            const targetElement = document.querySelector(`[data-item-id="${hoverItem.value.id}"]`) as HTMLElement;
            if (targetElement) {
                const rect = targetElement.getBoundingClientRect();
                updateGhostPositionAsync(rect.left + 10, rect.top - 10);
                ghostElement.value.classList.remove("positioned-ghost");
            }
        } else {
            // Si el hover está sobre otro item, posicionar en ubicación de inserción
            const targetElement = document.querySelector(`[data-item-id="${hoverItem.value.id}"]`) as HTMLElement;

            if (targetElement) {
                const rect = targetElement.getBoundingClientRect();
                const ghostHeight = ghostElement.value.offsetHeight || 40;
                const margin = 6;

                if (hoverPosition.value === "above") {
                    updateGhostPositionAsync(rect.left, rect.top - ghostHeight - margin);
                } else {
                    updateGhostPositionAsync(rect.left, rect.bottom + margin);
                }

                ghostElement.value.classList.add("positioned-ghost");
            }
        }
    };

    // Función para remover el ghost
    const removeGhostAsync = () => {
        if (ghostElement.value) {
            document.body.removeChild(ghostElement.value);
            ghostElement.value = null;
            console.log("[DRAG_STORE] Ghost removido");
        }
    };

    return {
        // Estado
        dragItem,
        hoverItem,
        hoverPosition,
        ghostElement,

        // Computed
        isDragging,
        hasHover,

        // Funciones
        startDragAsync,
        setHoverAsync,
        clearDragStateAsync,
        createGhostAsync,
        updateGhostPositionAsync,
        positionGhostForHoverAsync,
        removeGhostAsync,
    };
});

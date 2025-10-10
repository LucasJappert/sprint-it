import type { Item } from "@/types";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

export const useDragDropStore = defineStore("dragDrop", () => {
    // Estado del drag
    const dragItem = ref<Item | null>(null);

    // Estado del ghost
    const ghostElement = ref<HTMLElement | null>(null);

    // Estado para resaltar bordes de items
    const highlightedItems = ref<{ itemId: string; position: "above" | "below"; }[]>([]);

    // Estado para umbral mínimo antes de pintar bordes
    const dragStartPosition = ref<{ x: number; y: number; } | null>(null);
    const DRAG_THRESHOLD = 3; // píxeles mínimos antes de activar bordes

    // Computed para facilitar acceso
    const isDragging = computed(() => dragItem.value !== null);

    // Función para iniciar drag
    const startDragAsync = (item: Item, startX: number, startY: number) => {
        dragItem.value = item;
        dragStartPosition.value = { x: startX, y: startY };
    };

    // Función para limpiar estado del drag
    const clearDragStateAsync = () => {
        dragItem.value = null;
        dragStartPosition.value = null;
        highlightedItems.value = [];
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

    // Función para actualizar posición del ghost siguiendo al mouse
    const updateGhostPositionWithMouseAsync = (mouseX: number, mouseY: number) => {
        if (ghostElement.value) {
            updateGhostPositionAsync(mouseX, mouseY);
            console.log("[DRAG_STORE] Ghost position - top:", mouseY);
        }
    };

    // Función para determinar qué items deben mostrar bordes basado en posición del mouse
    const updateBorderHighlightsAsync = (mouseX: number, mouseY: number, allItems: Item[]) => {
        if (!dragItem.value) {
            highlightedItems.value = [];
            return;
        }

        const newHighlights: { itemId: string; position: "above" | "below"; }[] = [];

        // Encontrar la posición donde se insertaría el item basado en mouseY
        let insertIndex = 0;
        for (let i = 0; i < allItems.length; i++) {
            const item = allItems[i];
            if (!item) continue;

            const element = document.querySelector(`[data-item-id="${item.id}"]`) as HTMLElement | null;
            if (element) {
                const rect = element.getBoundingClientRect();
                if (mouseY < rect.top + rect.height / 2) {
                    insertIndex = i;
                    break;
                }
                insertIndex = i + 1;
            }
        }

        // Si hay items antes de la posición de inserción, pintar borde inferior del item anterior
        if (insertIndex > 0) {
            const prevItem = allItems[insertIndex - 1];
            if (prevItem && prevItem.id !== dragItem.value.id) {
                newHighlights.push({ itemId: prevItem.id, position: "below" });
            }
        }

        // Si hay items después de la posición de inserción, pintar borde superior del item siguiente
        if (insertIndex < allItems.length) {
            const nextItem = allItems[insertIndex];
            if (nextItem && nextItem.id !== dragItem.value.id) {
                newHighlights.push({ itemId: nextItem.id, position: "above" });
            }
        }

        highlightedItems.value = newHighlights;

        // Log de títulos de items que están entre medio
        if (newHighlights.length > 0) {
            const highlightedTitles = newHighlights.map(highlight => {
                const item = allItems.find(i => i.id === highlight.itemId);
                return item?.title;
            }).filter(Boolean);

            console.log("[DRAG_STORE] Items entre medio:", highlightedTitles);
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
        ghostElement,
        highlightedItems,

        // Computed
        isDragging,

        // Funciones
        startDragAsync,
        clearDragStateAsync,
        createGhostAsync,
        updateGhostPositionAsync,
        updateGhostPositionWithMouseAsync,
        updateBorderHighlightsAsync,
        removeGhostAsync,
    };
});

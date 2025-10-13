<template>
    <div class="dashboard">
        <!-- Header con selector de sprint y controles -->
        <div class="dashboard-header">
            <div class="sprint-selector">
                <MySelect
                    :options="sprintOptions"
                    :model-value="sprintStore.currentSprintId"
                    placeholder="Seleccionar Sprint"
                    @update:model-value="onSprintChange"
                />
            </div>

            <div class="dashboard-actions">
                <MyButton @click="showAddItemDialog = true">
                    <v-icon left>mdi-plus</v-icon>
                    Nuevo Item
                </MyButton>
            </div>
        </div>

        <!-- Lista de items -->
        <div class="board" @dragover="onItemDragOver" @drop="onBoardDrop">
            <div class="list">
                <ItemCard
                    v-for="it in items"
                    :key="it.id"
                    :item="it"
                    :showBorder="dragDropStore.highlightedItems.some((h) => h.itemId === it.id)"
                    :borderPosition="dragDropStore.highlightedItems.find((h) => h.itemId === it.id)?.position || null"
                />
            </div>
        </div>

        <!-- Diálogo para agregar nuevo item -->
        <AddItemDialog :visible="showAddItemDialog" :next-order="items.length + 1" @close="showAddItemDialog = false" @save="onAddItem" />
    </div>
</template>

<script setup lang="ts">
import AddItemDialog from "@/components/AddItemDialog.vue";
import MyButton from "@/components/global/MyButton.vue";
import ItemCard from "@/components/ItemCard.vue";
import { saveSprint } from "@/services/firestore";
import { useDragDropStore } from "@/stores/dragDrop";
import { useSprintStore } from "@/stores/sprint";
import type { Item } from "@/types";
import { computed, onMounted, ref } from "vue";

const sprintStore = useSprintStore();
const dragDropStore = useDragDropStore();

// Suponiendo que currentSprint.items existe y es reactivo
const items = computed<Item[]>(() => sprintStore.currentSprint?.items ?? []);

// Logs de debug removidos para simplificar la lógica

// Asegurar que los sprints estén generados
onMounted(async () => {
    if (sprintStore.sprints.length === 0) {
        await sprintStore.generateSprints();
    }
});

// Selector de sprint
const sprintOptions = computed(() =>
    sprintStore.sprints.map((sprint) => ({
        name: sprint.name,
        checked: sprint.id === sprintStore.currentSprintId,
        value: sprint.id,
    })),
);

const onSprintChange = (sprintId: string) => {
    sprintStore.currentSprintId = sprintId;
};

// Crear nuevo item
const showAddItemDialog = ref(false);

const onAddItem = async (item: Item) => {
    await sprintStore.addItem(item);
};

// Usar el store para el estado del drag & drop

const onItemDragStart = (item: Item) => {
    // Nota: Las coordenadas iniciales se pasan desde ItemCard
    // El store ya fue iniciado desde ItemCard con las coordenadas correctas
};

const onItemDragOver = (e: DragEvent) => {
    // Actualizar posición del ghost siguiendo al mouse
    dragDropStore.updateGhostPositionWithMouseAsync(e.clientX, e.clientY);

    // Actualizar bordes basado en posición del mouse (solo si superó el umbral)
    dragDropStore.updateBorderHighlightsAsync(e.clientX, e.clientY, items.value);
};

const reorder = (source: Item, target: Item, position: "above" | "below") => {
    const list = items.value;
    const from = list.findIndex((i) => i.id === source.id);
    let to = list.findIndex((i) => i.id === target.id);
    if (from === -1 || to === -1) return;

    if (position === "below") to += 1;

    const toAdjusted = to > from ? to - 1 : to;

    const moved = list.splice(from, 1)[0];
    if (moved === undefined) return;
    list.splice(toAdjusted, 0, moved);

    // Reasignar order determinista
    list.forEach((it, idx) => (it.order = idx + 1));

    if (sprintStore.currentSprint) saveSprint(sprintStore.currentSprint);
};

const onItemDrop = (target: Item) => {
    if (dragDropStore.dragItem && dragDropStore.dragItem.id !== target.id) {
        // Encontrar la posición basada en el target item
        const targetIndex = items.value.findIndex((item) => item.id === target.id);
        if (targetIndex !== -1) {
            reorder(dragDropStore.dragItem, target, "below");
        }
    }
    dragDropStore.clearDragStateAsync();
};

const onBoardDrop = (e: DragEvent) => {
    if (dragDropStore.dragItem) {
        // Calcular la posición de inserción basada en donde se soltó el mouse
        const insertIndex = calculateInsertIndex(e.clientY, items.value);

        if (insertIndex !== -1 && insertIndex !== items.value.findIndex((item) => item.id === dragDropStore.dragItem!.id)) {
            // Mover el item a la nueva posición
            moveItemToPosition(dragDropStore.dragItem, insertIndex);
        }
    }

    // Limpiar el estado del drag
    dragDropStore.clearDragStateAsync();
};

const calculateInsertIndex = (mouseY: number, allItems: Item[]): number => {
    for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        if (!item) continue;

        const element = document.querySelector(`[data-item-id="${item.id}"]`) as HTMLElement | null;
        if (element) {
            const rect = element.getBoundingClientRect();
            if (mouseY < rect.top + rect.height / 2) {
                return i;
            }
        }
    }
    return allItems.length;
};

const moveItemToPosition = (item: Item, targetIndex: number) => {
    const currentIndex = items.value.findIndex((i) => i.id === item.id);
    if (currentIndex === -1) return;

    // Crear nueva lista con el item movido
    const newList = [...items.value];
    newList.splice(currentIndex, 1); // Remover del índice actual
    newList.splice(targetIndex, 0, item); // Insertar en nueva posición

    // Actualizar el orden de todos los items
    newList.forEach((it, idx) => {
        it.order = idx + 1;
    });

    // Guardar cambios usando la mutación directa y saveSprint
    if (sprintStore.currentSprint) {
        sprintStore.currentSprint.items = newList;
        saveSprint(sprintStore.currentSprint);
    }
};
</script>

<style scoped>
.dashboard {
    padding: 16px;
}

.dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    gap: 16px;
}

.sprint-selector {
    min-width: 250px;
}

.dashboard-actions {
    display: flex;
    gap: 8px;
}

.board {
    padding: 8px;
}

.list {
    display: flex;
    flex-direction: column;
}

/* Responsive */
@media (max-width: 768px) {
    .dashboard-header {
        flex-direction: column;
        align-items: stretch;
    }

    .sprint-selector {
        min-width: auto;
    }
}
</style>

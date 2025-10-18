<template>
    <Header />
    <div class="dashboard">
        <!-- Header con selector de sprint y controles -->
        <div class="dashboard-header">
            <div class="sprint-container-1">
                <div style="width: 150px">
                    <MySelect :options="sprintOptions" placeholder-title="Seleccionar Sprint" @update:options="onSprintOptionsChange" density="compact" />
                </div>

                <div style="width: 120px">
                    <MyInput
                        v-model="currentSprintDiasHabilesString"
                        type="number"
                        label="Días hábiles"
                        :min="1"
                        :max="10"
                        @blur="updateDiasHabiles"
                        centered
                        density="compact"
                    />
                </div>

                <div class="sprint-dates">({{ currentSprintDates }})</div>
            </div>

            <div class="sprint-actions">
                <MyButton @click="createNewSprint" variant="outlined">
                    <v-icon left>mdi-plus</v-icon>
                    Nuevo Sprint
                </MyButton>
            </div>
        </div>

        <!-- Botón para agregar nuevo item -->
        <div class="board-header">
            <MyButton @click="showAddItemDialog = true">
                <v-icon left>mdi-plus</v-icon>
                Nuevo Item
            </MyButton>
        </div>

        <!-- Lista de items -->
        <div class="board" @dragover="onItemDragOver" @drop="onBoardDrop">
            <!-- Cabecera de columnas -->
            <div class="header-row">
                <div class="item-col cols-actions text-left">
                    <!-- Espacio para drag handle y botones -->
                </div>
                <div class="item-col cols-order flex-center">#</div>
                <div class="item-col cols-title text-left">Título</div>
                <div class="item-col cols-assigned">Asignado</div>
                <div class="item-col cols-state">Estado</div>
                <div class="item-col cols-effort flex-center" title="Estimado/Real">Esfuerzos</div>
                <div class="item-col cols-priority">Prioridad</div>
            </div>

            <div class="list">
                <ItemCard
                    v-for="it in items"
                    :key="it.id"
                    :item="it"
                    :showBorder="dragDropStore.highlightedItems.some((h) => h.itemId === it.id)"
                    :borderPosition="dragDropStore.highlightedItems.find((h) => h.itemId === it.id)?.position || null"
                    :isContextMenuOpen="contextMenuItemId === it.id"
                    @contextMenuOpened="onContextMenuOpened"
                    @contextMenuClosed="onContextMenuClosed"
                />
            </div>
        </div>

        <!-- Diálogo para agregar nuevo item -->
        <ItemDialog :visible="showAddItemDialog" :next-order="items.length + 1" @close="showAddItemDialog = false" @save="onAddItem" />
    </div>
</template>

<script setup lang="ts">
import MyButton from "@/components/global/MyButton.vue";
import Header from "@/components/Header.vue";
import ItemCard from "@/components/ItemCard.vue";
import ItemDialog from "@/components/ItemDialog.vue";
import { saveSprint } from "@/services/firestore";
import { useDragDropStore } from "@/stores/dragDrop";
import { useSprintStore } from "@/stores/sprint";
import type { Item } from "@/types";
import { computed, onMounted, ref } from "vue";

const sprintStore = useSprintStore();
const dragDropStore = useDragDropStore();

// Estado para controlar qué item tiene el menú contextual abierto
const contextMenuItemId = ref<string | null>(null);

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
        name: sprint.titulo,
        checked: sprint.id === sprintStore.currentSprintId,
        value: sprint.id,
    })),
);

// Días hábiles del sprint actual
const currentSprintDiasHabiles = computed({
    get: () => sprintStore.currentSprint?.diasHabiles || 10,
    set: (value: number) => {
        if (sprintStore.currentSprint) {
            sprintStore.currentSprint.diasHabiles = value;
        }
    },
});

// Fechas del sprint actual formateadas
const currentSprintDates = computed(() => {
    if (!sprintStore.currentSprint) return "";
    const desde = sprintStore.currentSprint.fechaDesde.toLocaleDateString("es-ES");
    const hasta = sprintStore.currentSprint.fechaHasta.toLocaleDateString("es-ES");
    return `${desde} - ${hasta}`;
});

const currentSprintDiasHabilesString = computed({
    get: () => currentSprintDiasHabiles.value.toString(),
    set: (value: string) => {
        const num = parseInt(value);
        if (!isNaN(num)) {
            currentSprintDiasHabiles.value = num;
        }
    },
});

const updateDiasHabiles = async () => {
    await sprintStore.updateSprintDiasHabiles(currentSprintDiasHabiles.value);
};

const onSprintOptionsChange = (options: any[]) => {
    const selectedOption = options.find((opt) => opt.checked);
    if (selectedOption) {
        sprintStore.currentSprintId = selectedOption.value;
    }
};

const createNewSprint = async () => {
    await sprintStore.createNewSprint();
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

const onContextMenuOpened = (itemId: string) => {
    contextMenuItemId.value = itemId;
};

// Limpiar el estado cuando se cierra el menú contextual
const onContextMenuClosed = () => {
    contextMenuItemId.value = null;
};
</script>

<style scoped lang="scss">
@import "@/styles/dashboard-columns.scss";
.dashboard {
    padding: 6px;
    padding-top: 66px; /* Adjusted for 50px header + 16px padding */
    font-size: 12px;
}

.dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    gap: 16px;
}

.sprint-container-1 {
    display: flex;
    gap: 8px;
    align-items: center;
}

.sprint-dates {
    font-size: 0.9rem;
    color: $text;
    opacity: 0.8;
    white-space: nowrap;
}

.sprint-actions {
    display: flex;
    gap: 8px;
    margin-left: auto;
}

.board-header {
    margin-bottom: 16px;
    display: flex;
    justify-content: flex-start;
}

.board {
    padding: 8px;
}

.header-row {
    display: flex;
    align-items: center;
    padding: 8px;
    background: #00000020;
    border-bottom: 1px solid rgba($primary, 0.3);
    border-radius: 8px 8px 0 0;
    font-weight: bold;
    color: $text;
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
}
</style>

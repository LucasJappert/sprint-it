<script setup lang="ts">
import MyButton from "@/components/global/MyButton.vue";
import MyDialog from "@/components/global/MyDialog.vue";
import MyInput from "@/components/global/MyInput.vue";
import MySelect from "@/components/global/MySelect.vue";
import ItemCard from "@/components/ItemCard.vue";
import { saveSprint } from "@/services/firestore";
import { useSprintStore } from "@/stores/sprint";
import type { Item } from "@/types";
import { computed, onMounted, ref, watch } from "vue";

const sprintStore = useSprintStore();

// Suponiendo que currentSprint.items existe y es reactivo
const items = computed<Item[]>(() => sprintStore.currentSprint?.items ?? []);

// Debug: agregar logging para ver el estado del store
watch(
    () => sprintStore.currentSprint,
    (newSprint) => {
        console.log("[DEBUG] currentSprint cambió:", {
            id: newSprint?.id,
            itemsCount: newSprint?.items.length ?? 0,
            items: newSprint?.items.map((i) => ({ id: i.id, title: i.title })) ?? [],
        });
    },
    { immediate: true },
);

watch(
    items,
    (newItems) => {
        console.log("[DEBUG] items cambió:", {
            count: newItems.length,
            items: newItems.map((i) => ({ id: i.id, title: i.title })),
        });
    },
    { immediate: true },
);

// Asegurar que los sprints estén generados
onMounted(async () => {
    if (sprintStore.sprints.length === 0) {
        console.log("[DEBUG] Generando sprints en onMounted");
        await sprintStore.generateSprints();
    } else {
        console.log("[DEBUG] Sprints ya existen:", sprintStore.sprints.length);
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

// Datos del formulario para nuevo item
const newItem = ref({
    title: "",
    detail: "",
    priority: "medium",
    estimatedEffort: "0",
    actualEffort: "0",
});

const resetNewItemForm = () => {
    newItem.value = {
        title: "",
        detail: "",
        priority: "medium",
        estimatedEffort: "0",
        actualEffort: "0",
    };
};

const handleSaveItem = async () => {
    if (newItem.value.title.trim()) {
        const item: Item = {
            id: `item-${Date.now()}`,
            title: newItem.value.title.trim(),
            detail: newItem.value.detail.trim(),
            priority: newItem.value.priority as "low" | "medium" | "high",
            estimatedEffort: parseInt(newItem.value.estimatedEffort) || 0,
            actualEffort: parseInt(newItem.value.actualEffort) || 0,
            assignedUser: "",
            tasks: [],
            order: items.value.length + 1,
        };

        await sprintStore.addItem(item);
        showAddItemDialog.value = false;
        resetNewItemForm();
    }
};

const onAddItem = async (itemData: { title: string; detail: string; priority: string; estimatedEffort: number; actualEffort: number }) => {
    const newItemData: Item = {
        id: `item-${Date.now()}`,
        title: itemData.title,
        detail: itemData.detail,
        priority: itemData.priority as "low" | "medium" | "high",
        estimatedEffort: itemData.estimatedEffort,
        actualEffort: itemData.actualEffort,
        assignedUser: "",
        tasks: [],
        order: items.value.length + 1,
    };

    await sprintStore.addItem(newItemData);
    showAddItemDialog.value = false;
};

const dragItem = ref<Item | null>(null);
const hoverItem = ref<Item | null>(null);
const hoverPosition = ref<"above" | "below" | null>(null);

const onItemDragStart = (item: Item) => {
    console.log("[PARENT] dragstart", { id: item.id, title: item.title });
    // deferir para no mutar DOM en el mismo tick
    requestAnimationFrame(() => {
        dragItem.value = item;
    });
};

const onItemDragEnter = (item: Item) => {
    hoverItem.value = item;
    console.log("[PARENT] dragenter", { overId: item.id, title: item.title });
};

const onItemDragOver = (payload: { item: Item; position: "above" | "below" }) => {
    hoverItem.value = payload.item;
    hoverPosition.value = payload.position;
    console.log("[PARENT] dragover", {
        overId: payload.item.id,
        title: payload.item.title,
        position: payload.position,
    });
};

const onItemDragLeave = (item: Item) => {
    console.log("[PARENT] dragleave", { id: item.id });
    // no limpiamos estado aún; puede reentrar a otro ítem
};

const reorder = (source: Item, target: Item, position: "above" | "below") => {
    const list = items.value;
    const from = list.findIndex((i) => i.id === source.id);
    let to = list.findIndex((i) => i.id === target.id);
    if (from === -1 || to === -1) return;

    if (position === "below") to += 1;

    const toAdjusted = to > from ? to - 1 : to;

    console.group("[PARENT] reorder");
    console.table(list.map((i) => ({ id: i.id, order: i.order, title: i.title })));
    console.log("from:", from, "to:", to, "toAdjusted:", toAdjusted);

    const moved = list.splice(from, 1)[0];
    if (moved === undefined) return;
    list.splice(toAdjusted, 0, moved);

    // Reasignar order determinista
    list.forEach((it, idx) => (it.order = idx + 1));

    console.table(list.map((i) => ({ id: i.id, order: i.order, title: i.title })));
    console.groupEnd();

    if (sprintStore.currentSprint) saveSprint(sprintStore.currentSprint);
};

const onItemDrop = (target: Item) => {
    console.log("[PARENT] drop", {
        source: dragItem.value?.id,
        target: target.id,
        position: hoverPosition.value,
    });

    if (dragItem.value && hoverPosition.value && dragItem.value.id !== target.id) {
        reorder(dragItem.value, target, hoverPosition.value);
    }
    cleanupDragState();
};

const cleanupDragState = () => {
    console.log("[PARENT] cleanup drag state");
    dragItem.value = null;
    hoverItem.value = null;
    hoverPosition.value = null;
};

// Observabilidad del estado
watch([dragItem, hoverItem, hoverPosition], ([d, h, p]) => {
    console.log("[PARENT] state", {
        dragItem: d?.id ?? null,
        hoverItem: h?.id ?? null,
        hoverPosition: p ?? null,
    });
});
</script>

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
        <div class="board">
            <div class="list">
                <ItemCard
                    v-for="it in items"
                    :key="it.id"
                    :item="it"
                    :dragItem="dragItem"
                    :showBorder="hoverItem?.id === it.id"
                    :borderPosition="hoverItem?.id === it.id ? hoverPosition : null"
                    @dragstart="onItemDragStart"
                    @dragenter="onItemDragEnter"
                    @dragover="onItemDragOver"
                    @dragleave="onItemDragLeave"
                    @drop="onItemDrop"
                />
            </div>
        </div>

        <!-- Diálogo para agregar nuevo item -->
        <MyDialog :visible="showAddItemDialog" @close="showAddItemDialog = false">
            <div class="header">
                <h2>Nuevo Item</h2>
            </div>
            <div class="body-scroll">
                <MyInput v-model="newItem.title" label="Título" @keydown.enter="handleSaveItem" autofocus />
                <MyInput v-model="newItem.detail" label="Detalle" />
                <MySelect
                    v-model="newItem.priority"
                    label="Prioridad"
                    :options="[
                        { name: 'Baja', checked: false, value: 'low' },
                        { name: 'Media', checked: false, value: 'medium' },
                        { name: 'Alta', checked: false, value: 'high' },
                    ]"
                />
                <MyInput v-model.number="newItem.estimatedEffort" label="Esfuerzo Estimado" type="number" />
                <MyInput v-model.number="newItem.actualEffort" label="Esfuerzo Real" type="number" />
            </div>
            <div class="footer">
                <MyButton @click="showAddItemDialog = false">Cancelar</MyButton>
                <MyButton @click="handleSaveItem" color="primary" :disabled="!newItem.title.trim()">Crear Item</MyButton>
            </div>
        </MyDialog>
    </div>
</template>

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

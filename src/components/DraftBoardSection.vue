<template>
    <div class="draft-board-section">
        <div class="section-header" @click="toggleExpanded">
            <v-icon size="20" class="mr-2">{{ isExpanded ? "mdi-chevron-down" : "mdi-chevron-right" }}</v-icon>
            <v-icon size="20" class="mr-2 primary">mdi-inbox</v-icon>
            <span class="section-title">Draft</span>
            <v-badge v-if="draftBoardStore.draftItems.length > 0" :content="draftBoardStore.draftItems.length" color="primary" inline class="ml-2" />
            <span v-if="draftBoardStore.draftItems.length === 0" class="ml-2 no-items-text">(empty)</span>
        </div>

        <div v-if="isExpanded" class="section-content draft-board" @dragover="onDraftDragOver" @drop="onDraftBoardDrop">
            <div class="dashboard-container">
                <div class="header-row">
                    <div class="item-col cols-actions text-left"></div>
                    <div class="item-col cols-order flex-center">#</div>
                    <div class="item-col cols-assigned"><span class="ellipsis" title="Assigned">Assigned</span></div>
                    <div class="item-col cols-title text-left">Title</div>
                    <div class="item-col cols-effort flex-center" title="Estimated/Real">Efforts</div>
                    <div class="item-col cols-project">Project</div>
                </div>

                <ItemCard
                    v-for="it in draftBoardStore.draftItems"
                    :key="it.id"
                    :item="it"
                    board-source="draft"
                    :show-border="dragDropStore.highlightedItems.some((h) => h.itemId === it.id)"
                    :border-position="dragDropStore.highlightedItems.find((h) => h.itemId === it.id)?.position || null"
                    :is-context-menu-open="contextMenuItemId === it.id"
                    :is-expanded="expandedItems.has(it.id)"
                    @context-menu-opened="onContextMenuOpened"
                    @context-menu-closed="onContextMenuClosed"
                    @task-received="onTaskReceived"
                    @toggle-expanded="onToggleExpanded"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import ItemCard from "@/components/ItemCard.vue";
import { useDragDropStore } from "@/stores/dragDrop";
import { useDraftBoardStore } from "@/stores/draftBoard";
import type { Item } from "@/types";
import { onMounted, ref } from "vue";

const DRAFT_EXPANDED_KEY = "draft-section-expanded";

const draftBoardStore = useDraftBoardStore();
const dragDropStore = useDragDropStore();

const isExpanded = ref(localStorage.getItem(DRAFT_EXPANDED_KEY) === "true");
const contextMenuItemId = ref<string | null>(null);
const expandedItems = ref<Set<string>>(new Set());

const toggleExpanded = () => {
    isExpanded.value = !isExpanded.value;
    localStorage.setItem(DRAFT_EXPANDED_KEY, String(isExpanded.value));
};

const onContextMenuOpened = (itemId: string) => {
    contextMenuItemId.value = itemId;
};

const onContextMenuClosed = () => {
    contextMenuItemId.value = null;
};

const onToggleExpanded = (itemId: string) => {
    if (expandedItems.value.has(itemId)) {
        expandedItems.value.delete(itemId);
        return;
    }
    expandedItems.value.add(itemId);
};

const onTaskReceived = (itemId: string) => {
    expandedItems.value.add(itemId);
};

const calculateInsertIndex = (mouseY: number, allItems: Item[]): number => {
    for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        if (!item) continue;

        const element = document.querySelector(`.draft-board [data-item-id="${item.id}"]`) as HTMLElement | null;
        if (!element) continue;

        const rect = element.getBoundingClientRect();
        if (mouseY < rect.top + rect.height / 2) return i;
    }
    return allItems.length;
};

const onDraftDragOver = (e: DragEvent) => {
    if (dragDropStore.dragBoardSource !== "draft" || !dragDropStore.dragItem) return;

    dragDropStore.updateGhostPositionWithMouseAsync(e.clientX, e.clientY);
    dragDropStore.updateBorderHighlightsAsync(e.clientX, e.clientY, draftBoardStore.draftItems);
};

const onDraftBoardDrop = async (e: DragEvent) => {
    if (dragDropStore.dragBoardSource !== "draft" || !dragDropStore.dragItem) return;

    const insertIndex = calculateInsertIndex(e.clientY, draftBoardStore.draftItems);
    const currentIndex = draftBoardStore.draftItems.findIndex((item) => item.id === dragDropStore.dragItem!.id);

    if (currentIndex !== -1 && insertIndex !== currentIndex) {
        await draftBoardStore.reorderDraftItemAsync(dragDropStore.dragItem.id, insertIndex);
    }

    dragDropStore.clearDragStateAsync();
};

onMounted(async () => {
    await draftBoardStore.initDraftBoardAsync();
});
</script>

<style scoped lang="scss">
@use "@/styles/dashboard-columns.scss" as *;
@use "@/styles/variables" as *;

.draft-board-section {
    width: 100%;
    margin-top: 12px;
    background: rgba($primary, 0.06);
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid rgba($primary, 0.15);
}

.section-header {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    background: rgba($primary, 0.1);
    cursor: pointer;
    user-select: none;
    transition: background 0.2s;
    width: 100%;

    &:hover {
        background: rgba($primary, 0.14);
    }
}

.section-title {
    font-weight: 600;
    color: $text;
}

.no-items-text {
    color: #9e9e9e;
    font-size: 0.85rem;
}

.section-content {
    padding: 8px 0 12px;
}

.header-row {
    display: flex;
    align-items: center;
    padding: 4px 8px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #9e9e9e;
    text-transform: uppercase;
}
</style>

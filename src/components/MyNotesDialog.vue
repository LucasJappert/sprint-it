<script setup lang="ts">
import MyButton from "@/components/global/MyButton.vue";
import MyDialog from "@/components/global/MyDialog.vue";
import MyRichText from "@/components/global/MyRichText.vue";
import { useNotes } from "@/composables/useNotes";
import type { Note } from "@/types";
import { computed, onMounted, ref, watch } from "vue";
import MyNoteEditDialog from "./MyNoteEditDialog.vue";

interface Props {
    modelValue: boolean;
}

interface Emits {
    (e: "update:modelValue", value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const showDialog = computed({
    get: () => props.modelValue,
    set: (value) => emit("update:modelValue", value),
});

const notes = useNotes();
const editingNote = ref<Note | null>(null);
const showEditDialog = ref(false);

const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const getNotePreview = (content: string): string => {
    const div = document.createElement("div");
    div.innerHTML = content;
    const text = div.textContent || div.innerText || "";
    return text.trim();
};

const handleSaveNote = async () => {
    await notes.saveNoteAsync(notes.draftContent.value);
};

const handleEditNote = (note: Note) => {
    editingNote.value = note;
    showEditDialog.value = true;
};

const handleDeleteNote = async (noteId: string) => {
    await notes.deleteNoteAsync(noteId);
};

const closeDialog = () => {
    showDialog.value = false;
};

watch(showDialog, async (isOpen) => {
    if (isOpen) {
        await notes.loadDraftAsync();
        await notes.loadNotesAsync();
    }
});

onMounted(async () => {
    if (showDialog.value) {
        await notes.loadDraftAsync();
        await notes.loadNotesAsync();
    }
});
</script>

<template>
    <MyDialog :visible="showDialog" :min-width="'98vw'" my-dialog-styles="width: 98vw; height: 98vh; max-width: 98vw; max-height: 98vh;" @close="closeDialog">
        <div class="notes-dialog-container">
            <div class="header">
                <div class="dialog-title">
                    <VIcon icon="mdi-note-text-outline" class="mr-2" />
                    Mis Notas
                </div>
                <VIcon class="close-btn" @click="closeDialog" :size="24">mdi-close</VIcon>
            </div>

            <div class="notes-content">
                <div class="draft-editor-wrapper">
                    <MyRichText v-model="notes.draftContent.value" placeholder="Escribí tu nota aquí..." :show-toolbar="true" />
                    <MyButton
                        class="save-btn"
                        accent="blue"
                        @click="handleSaveNote"
                        :disabled="!notes.draftContent.value || notes.draftContent.value === '<p></p>'"
                    >
                        <VIcon icon="mdi-content-save" class="mr-1" size="18" />
                        Guardar Nota
                    </MyButton>
                </div>

                <div class="notes-list-section">
                    <div class="section-title">Notas Guardadas ({{ notes.notes.value.length }})</div>
                    <div class="notes-list">
                        <div v-if="notes.loading.value" class="loading-state">
                            <VProgressCircular indeterminate color="primary" />
                            <p>Cargando notas...</p>
                        </div>

                        <div v-else-if="notes.notes.value.length === 0" class="empty-state">
                            <VIcon icon="mdi-note-off-outline" size="64" color="grey" />
                            <p>No tenés notas guardadas</p>
                        </div>

                        <div v-else class="notes-grid">
                            <div v-for="(note, index) in notes.notes.value" :key="note.id" class="note-card">
                                <div class="note-header">
                                    <span class="note-date">{{ formatDate(note.createdAt) }}</span>
                                    <span class="note-id">Nota {{ notes.notes.value.length - index }}</span>
                                </div>
                                <div class="note-preview">{{ getNotePreview(note.content) }}</div>
                                <div class="note-actions">
                                    <div class="action-btn delete-btn" @click="handleDeleteNote(note.id)">
                                        <VIcon icon="mdi-delete" size="18" />
                                        <span>Eliminar</span>
                                    </div>
                                    <div class="action-btn edit-btn" @click="handleEditNote(note)">
                                        <VIcon icon="mdi-pencil" size="18" />
                                        <span>Ver/Editar</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </MyDialog>

    <MyNoteEditDialog v-if="editingNote" v-model="showEditDialog" :note="editingNote" @saved="notes.loadNotesAsync()" />
</template>

<style scoped lang="scss">
.notes-dialog-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: rgb(var(--v-theme-surface));
}

.header {
    padding: 16px 20px;
    background-color: rgb(var(--v-theme-surface-variant));
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.dialog-title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 500;
    display: flex;
    align-items: center;
}

.close-btn {
    cursor: pointer;
    transition: opacity 0.2s;

    &:hover {
        opacity: 0.7;
    }
}

.notes-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    padding: 10px;
    gap: 20px;
}

.section-title {
    margin: 0 0 12px 0;
    font-size: 1rem;
    font-weight: 500;
}

.draft-editor-wrapper {
    position: relative;
    flex: 0 0 70%;
    display: flex;
    flex-direction: column;
    border-radius: 8px;
    padding: 0;
    background-color: transparent;
    min-height: 0;

    :deep(.my-richtext) {
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    :deep(.editor-container) {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
    }

    :deep(.editor-content) {
        flex: 1;
        max-height: none !important;
        overflow-y: auto;
    }

    :deep(.ProseMirror) {
        min-height: 100%;
    }
}

.save-btn {
    position: absolute;
    bottom: 5px;
    right: 0px;
    z-index: 10;
}

.notes-list-section {
    flex: 0 0 30%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.notes-list {
    flex: 1;
    overflow-y: auto;
    padding-right: 8px;

    &::-webkit-scrollbar {
        width: 8px;
    }

    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 4px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }
}

.loading-state,
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    gap: 16px;
    color: rgba(255, 255, 255, 0.6);
}

.notes-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
}

.note-card {
    background-color: transparent;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 300px;
    transition: all 0.2s;

    &:hover {
        border: 1px solid rgba(255, 255, 255, 0.3);
        cursor: pointer;
    }
}

.note-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.7);
}

.note-date {
    font-weight: 500;
}

.note-id {
    color: rgba(255, 255, 255, 0.5);
}

.note-preview {
    flex: 1;
    font-size: 0.9rem;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: rgba(255, 255, 255, 0.9);
}

.note-actions {
    display: flex;
    gap: 12px;
    justify-content: space-between;
    align-items: center;
}

.action-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: opacity 0.2s;

    &:hover {
        opacity: 0.7;
    }
}

.delete-btn {
    color: #ef4444;
}

.edit-btn {
    color: #22c55e;
}

@media (max-width: 768px) {
    .notes-content {
        flex-direction: column;
        padding: 5px;
    }

    .draft-section,
    .notes-list-section {
        flex: 1;
    }

    .notes-grid {
        flex-direction: column;
    }

    .note-card {
        width: 100%;
        max-width: 100%;
    }
}
</style>

import MyAlerts from "@/plugins/my-alerts";
import { addNote, clearDraft, deleteNote, getDraft, getNotesByUserId, saveDraft, updateNote } from "@/services/firestore";
import { useAuthStore } from "@/stores/auth";
import type { Note } from "@/types";
import { ref, watch } from "vue";

const notes = ref<Note[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const draftContent = ref("");
let autoSaveTimeout: NodeJS.Timeout | null = null;

export const useNotes = () => {
    const authStore = useAuthStore();

    const loadNotesAsync = async () => {
        if (!authStore.user?.id) return;

        loading.value = true;
        error.value = null;

        try {
            notes.value = await getNotesByUserId(authStore.user.id);
        } catch (err) {
            error.value = "Error al cargar las notas";
            console.error("Error loading notes:", err);
        } finally {
            loading.value = false;
        }
    };

    const loadDraftAsync = async () => {
        if (!authStore.user?.id) return;

        try {
            const draft = await getDraft(authStore.user.id);
            if (draft) {
                draftContent.value = draft.content;
            }
        } catch (err) {
            console.error("Error loading draft:", err);
        }
    };

    const saveNoteAsync = async (content: string) => {
        if (!authStore.user?.id) return;
        if (!content.trim() || content === "<p></p>") return;

        loading.value = true;
        error.value = null;

        try {
            const now = new Date();
            await addNote({
                userId: authStore.user.id,
                content,
                createdAt: now,
                updatedAt: now,
                deletedAt: null,
            });

            await clearDraft(authStore.user.id);
            draftContent.value = "";

            await loadNotesAsync();
        } catch (err) {
            error.value = "Error al guardar la nota";
            console.error("Error saving note:", err);
        } finally {
            loading.value = false;
        }
    };

    const deleteNoteAsync = async (noteId: string) => {
        if (!authStore.user?.id) return;

        const confirmed = await MyAlerts.confirmAsync("Confirmar eliminación", "¿Estás seguro de que querés borrar esta nota?", "warning");
        if (!confirmed) return;

        loading.value = true;
        error.value = null;

        try {
            await deleteNote(noteId);
            await loadNotesAsync();
        } catch (err) {
            error.value = "Error al eliminar la nota";
            console.error("Error deleting note:", err);
        } finally {
            loading.value = false;
        }
    };

    const updateNoteAsync = async (noteId: string, content: string) => {
        if (!authStore.user?.id) return;
        if (!content.trim() || content === "<p></p>") return;

        loading.value = true;
        error.value = null;

        try {
            await updateNote(noteId, {
                content,
                updatedAt: new Date(),
            });

            await loadNotesAsync();
        } catch (err) {
            error.value = "Error al actualizar la nota";
            console.error("Error updating note:", err);
        } finally {
            loading.value = false;
        }
    };

    const autoSaveDraft = async (content: string) => {
        if (!authStore.user?.id) return;

        try {
            await saveDraft(authStore.user.id, content);
        } catch (err) {
            console.error("Error auto-saving draft:", err);
        }
    };

    watch(draftContent, (newContent) => {
        if (autoSaveTimeout) {
            clearTimeout(autoSaveTimeout);
        }

        autoSaveTimeout = setTimeout(() => {
            autoSaveDraft(newContent);
        }, 5000);
    });

    return {
        notes,
        loading,
        error,
        draftContent,
        loadNotesAsync,
        loadDraftAsync,
        saveNoteAsync,
        deleteNoteAsync,
        updateNoteAsync,
    };
};

<script setup lang="ts">
import MyDialog from "@/components/global/MyDialog.vue";
import MyRichText from "@/components/global/MyRichText.vue";
import { useNotes } from "@/composables/useNotes";
import type { Note } from "@/types";
import { computed, ref, watch } from "vue";

interface Props {
    modelValue: boolean;
    note: Note;
}

interface Emits {
    (e: "update:modelValue", value: boolean): void;
    (e: "saved"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const showDialog = computed({
    get: () => props.modelValue,
    set: (value) => emit("update:modelValue", value),
});

const notes = useNotes();
const editContent = ref("");

const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const handleSave = async () => {
    await notes.updateNoteAsync(props.note.id, editContent.value);
    emit("saved");
    showDialog.value = false;
};

const handleCancel = () => {
    showDialog.value = false;
};

watch(
    () => props.note,
    (newNote) => {
        if (newNote) {
            editContent.value = newNote.content;
        }
    },
    { immediate: true },
);
</script>

<template>
    <MyDialog :visible="showDialog" :min-width="'800px'" @close="handleCancel">
        <div class="edit-note-dialog">
            <div class="header">
                <div>
                    <div class="dialog-title">
                        <VIcon icon="mdi-pencil" class="mr-2" />
                        Editar Nota
                    </div>
                    <p class="note-meta">Creada: {{ formatDate(note.createdAt) }}</p>
                </div>
                <VIcon class="close-btn" @click="handleCancel" :size="24">mdi-close</VIcon>
            </div>

            <div class="body-scroll">
                <MyRichText v-model="editContent" placeholder="Contenido de la nota..." :show-toolbar="true" />
            </div>

            <div class="footer">
                <MyButton btn-class="px-2" secondary @click="handleCancel">Cancelar</MyButton>
                <MyButton btn-class="px-2" @click="handleSave" :disabled="!editContent || editContent === '<p></p>'">Guardar Cambios</MyButton>
            </div>
        </div>
    </MyDialog>
</template>

<style scoped lang="scss">
.edit-note-dialog {
    display: flex;
    flex-direction: column;
    min-height: 500px;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.dialog-title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 500;
    display: flex;
    align-items: center;
}

.note-meta {
    margin: 4px 0 0 0;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.6);
}

.close-btn {
    cursor: pointer;
    transition: opacity 0.2s;

    &:hover {
        opacity: 0.7;
    }
}

.body-scroll {
    min-height: 300px;
}
</style>

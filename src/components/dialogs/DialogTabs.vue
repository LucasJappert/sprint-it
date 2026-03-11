<template>
    <v-tabs v-if="showTabs" v-model="localValue" class="ml-4 view-mode-tabs" density="compact">
        <v-tab value="details">
            <v-icon size="16" class="mr-1">mdi-file-document-outline</v-icon>
            <span class="btn-text">Details</span>
        </v-tab>
        <v-tab value="attachments">
            <v-icon size="16" class="mr-1">mdi-paperclip</v-icon>
            <span class="btn-text">Attachments</span>
        </v-tab>
        <v-tab value="history">
            <v-icon size="16" class="mr-1">mdi-history</v-icon>
            <span class="btn-text">History</span>
        </v-tab>
    </v-tabs>
</template>

<script setup lang="ts">
import type { DialogViewMode } from "@/composables/useDialogViewMode";
import { computed } from "vue";

interface Props {
    modelValue: DialogViewMode;
    showTabs: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    "update:modelValue": [value: DialogViewMode];
}>();

const localValue = computed({
    get: () => props.modelValue,
    set: (value: DialogViewMode) => emit("update:modelValue", value),
});
</script>

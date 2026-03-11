<template>
    <HistoryView :change-history="changeHistory" :created-at="createdAt" :created-by="createdBy" />
</template>

<script setup lang="ts">
import HistoryView from "@/components/HistoryView.vue";
import type { ChangeHistory } from "@/types";

interface Props {
    changeHistory: ChangeHistory[];
    createdAt?: Date;
    createdBy?: string;
}

defineProps<Props>();
</script>

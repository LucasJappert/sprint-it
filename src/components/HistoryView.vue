<template>
    <div class="history-section">
        <h4 class="mb-3">Change History</h4>
        <div v-if="changeHistory.length === 0" class="no-history">
            <v-icon size="48" color="grey">mdi-history</v-icon>
            <p class="mt-2 text-grey">No changes recorded yet</p>
        </div>
        <div v-else class="history-list">
            <div v-for="change in changeHistory" :key="change.id" class="history-item">
                <div class="history-header">
                    <div>
                        <v-icon size="16" class="mr-1">mdi-pencil</v-icon>
                        <span class="field-name">{{ formatFieldName(change.field) }}</span>
                    </div>
                    <div>
                        <span class="user-name">{{ userNames[change.userId] || "Unknown" }}</span
                        >| <span class="change-date ml-1">{{ formatDate(change.createdAt) }}</span>
                    </div>
                </div>
                <div class="change-details">
                    <div class="old-value"><strong>From:</strong> {{ change.oldValue || "(empty)" }}</div>
                    <div class="new-value"><strong>To:</strong> {{ change.newValue || "(empty)" }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { getUserByUsername, getUsernameById } from "@/services/firestore";
import type { ChangeHistory } from "@/types";
import { ref, watch } from "vue";

interface Props {
    changeHistory: ChangeHistory[];
}

const props = defineProps<Props>();

const userNames = ref<Record<string, string>>({});

const loadUserNames = async () => {
    const userIds = [...new Set(props.changeHistory.map((c: ChangeHistory) => c.userId))];
    const names: Record<string, string> = {};
    for (const userId of userIds) {
        try {
            const username = await getUsernameById(userId as string);
            if (username) {
                const user = await getUserByUsername(username);
                names[userId as string] = (user as any)?.name || username;
            } else {
                names[userId as string] = "Unknown";
            }
        } catch (error) {
            console.warn(`Error loading user name for ${userId}:`, error);
            names[userId as string] = "Unknown";
        }
    }
    userNames.value = names;
};

watch(() => props.changeHistory, loadUserNames, { immediate: true });

const formatFieldName = (field: string): string => {
    const fieldNames: Record<string, string> = {
        title: "Title",
        detail: "Description",
        priority: "Priority",
        state: "State",
        estimatedEffort: "Estimated Effort",
        actualEffort: "Actual Effort",
        assignedUser: "Assigned User",
    };
    return fieldNames[field] || field;
};

const formatDate = (date: Date): string => {
    return date.toLocaleString("es-AR", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};
</script>

<style scoped>
.history-section {
    padding: 16px;
}

.no-history {
    text-align: center;
    padding: 40px 20px;
    color: #666;
}

.history-list {
    max-height: 400px;
    overflow-y: auto;
}

.history-item {
    border: 1px solid #424242;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 8px;
    background: #1e1e1e;
    color: #ffffff;
}

.history-header {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    font-size: 14px;
    color: #cccccc;
    justify-content: space-between;
}

.user-name {
    font-weight: 500;
    color: #ffffff;
    margin-right: 8px;
}

.field-name {
    font-weight: 500;
    color: #ffffff;
}

.change-date {
    margin-left: auto;
    font-size: 12px;
}

.change-details {
    font-size: 13px;
}

.old-value,
.new-value {
    margin-bottom: 4px;
}

.old-value {
    color: #ef5350;
}

.new-value {
    color: #4caf50;
}
</style>

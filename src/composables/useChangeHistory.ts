import { addChange, getChangesByAssociatedId } from "@/services/firestore";
import type { ChangeHistory } from "@/types";
import { ref } from "vue";

interface UseChangeHistoryOptions {
    associatedType: "item" | "task";
}

interface FormFields {
    title: string;
    detail: string;
    priority: string;
    state: string;
    estimatedEffort: string | number;
    actualEffort: string | number;
    assignedUser: string | null;
    projectName: string;
}

export const useChangeHistory = (_options: UseChangeHistoryOptions) => {
    const changeHistory = ref<ChangeHistory[]>([]);

    const loadChangeHistory = async (associatedId: string): Promise<void> => {
        try {
            changeHistory.value = await getChangesByAssociatedId(associatedId);
        } catch (error) {
            console.error("Error loading change history:", error);
            changeHistory.value = [];
        }
    };

    const saveChanges = async (
        oldItem: FormFields & { id: string; },
        newItem: FormFields & { id: string; },
        userId: string,
    ): Promise<void> => {
        const changes: Array<Omit<ChangeHistory, "id">> = [];

        if (oldItem.title !== newItem.title) {
            changes.push({
                associatedId: oldItem.id,
                associatedType: _options.associatedType,
                field: "title",
                oldValue: oldItem.title,
                newValue: newItem.title,
                userId,
                createdAt: new Date(),
            });
        }

        if (oldItem.detail !== newItem.detail) {
            changes.push({
                associatedId: oldItem.id,
                associatedType: _options.associatedType,
                field: "detail",
                oldValue: oldItem.detail,
                newValue: newItem.detail,
                userId,
                createdAt: new Date(),
            });
        }

        if (oldItem.priority !== newItem.priority) {
            changes.push({
                associatedId: oldItem.id,
                associatedType: _options.associatedType,
                field: "priority",
                oldValue: oldItem.priority,
                newValue: newItem.priority,
                userId,
                createdAt: new Date(),
            });
        }

        if (oldItem.state !== newItem.state) {
            changes.push({
                associatedId: oldItem.id,
                associatedType: _options.associatedType,
                field: "state",
                oldValue: oldItem.state,
                newValue: newItem.state,
                userId,
                createdAt: new Date(),
            });
        }

        if (parseInt(oldItem.estimatedEffort.toString()) !== parseInt(newItem.estimatedEffort.toString())) {
            changes.push({
                associatedId: oldItem.id,
                associatedType: _options.associatedType,
                field: "estimatedEffort",
                oldValue: oldItem.estimatedEffort.toString(),
                newValue: newItem.estimatedEffort.toString(),
                userId,
                createdAt: new Date(),
            });
        }

        if (parseInt(oldItem.actualEffort.toString()) !== parseInt(newItem.actualEffort.toString())) {
            changes.push({
                associatedId: oldItem.id,
                associatedType: _options.associatedType,
                field: "actualEffort",
                oldValue: oldItem.actualEffort.toString(),
                newValue: newItem.actualEffort.toString(),
                userId,
                createdAt: new Date(),
            });
        }

        if (oldItem.assignedUser !== newItem.assignedUser) {
            changes.push({
                associatedId: oldItem.id,
                associatedType: _options.associatedType,
                field: "assignedUser",
                oldValue: oldItem.assignedUser || "",
                newValue: newItem.assignedUser || "",
                userId,
                createdAt: new Date(),
            });
        }

        if ((oldItem.projectName || "") !== (newItem.projectName || "")) {
            changes.push({
                associatedId: oldItem.id,
                associatedType: _options.associatedType,
                field: "projectName",
                oldValue: oldItem.projectName || "",
                newValue: newItem.projectName || "",
                userId,
                createdAt: new Date(),
            });
        }

        for (const change of changes) {
            try {
                await addChange(change);
            } catch (error) {
                console.error("Error saving change:", error);
            }
        }
    };

    return {
        changeHistory,
        loadChangeHistory,
        saveChanges,
    };
};

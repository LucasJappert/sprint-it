import { computed, ref } from "vue";

interface UseChangeTrackingOptions {
    isEditing: boolean;
}

export const useChangeTracking = (options: UseChangeTrackingOptions) => {
    const showCloseConfirmation = ref(false);
    const isWritingComment = ref(false);
    const isEditingComment = ref(false);

    const hasPendingChanges = computed(() => {
        if (!options.isEditing) return false;
        return true; // This should be combined with hasChanges from the parent
    });

    const shouldShowCloseConfirmation = computed(() => {
        if (!options.isEditing) return false;
        return hasPendingChanges.value;
    });

    const onWritingComment = (isWriting: boolean): void => {
        isWritingComment.value = isWriting;
    };

    const onEditingComment = (isEditing: boolean): void => {
        isEditingComment.value = isEditing;
    };

    const resetPendingChanges = (): void => {
        isWritingComment.value = false;
        isEditingComment.value = false;
    };

    const handleClose = (
        hasPending: boolean,
        emit: () => void,
        resetForm: () => void,
    ): void => {
        if (hasPending && shouldShowCloseConfirmation.value) {
            showCloseConfirmation.value = true;
            return;
        }
        emit();
        resetForm();
        resetPendingChanges();
    };

    const handleConfirmClose = (
        action: "save" | "discard",
        hasPending: boolean,
        emit: () => void,
        resetForm: () => void,
    ): void => {
        showCloseConfirmation.value = false;
        if (action === "save") {
            // Parent handles the save
        }
        emit();
        resetForm();
        resetPendingChanges();
    };

    const handleCancelClose = (): void => {
        showCloseConfirmation.value = false;
    };

    return {
        showCloseConfirmation,
        isWritingComment,
        isEditingComment,
        hasPendingChanges,
        shouldShowCloseConfirmation,
        onWritingComment,
        onEditingComment,
        resetPendingChanges,
        handleClose,
        handleConfirmClose,
        handleCancelClose,
    };
};

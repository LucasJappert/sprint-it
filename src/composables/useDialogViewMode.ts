import { ref } from "vue";

export type DialogViewMode = "details" | "attachments" | "history";

export const useDialogViewMode = () => {
    const viewMode = ref<DialogViewMode>("details");

    const resetViewMode = (): void => {
        viewMode.value = "details";
    };

    const setViewMode = (mode: DialogViewMode): void => {
        viewMode.value = mode;
    };

    return {
        viewMode,
        resetViewMode,
        setViewMode,
    };
};

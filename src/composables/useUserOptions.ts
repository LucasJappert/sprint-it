import { SPRINT_TEAM_MEMBERS } from "@/constants/users";
import { getUserByUsername } from "@/services/firestore";
import type { User } from "@/types";
import { ref } from "vue";

export interface UserOption {
    id: string;
    text: string;
    name: string;
    checked: boolean;
}

export const useUserOptions = () => {
    const assignedUserOptions = ref<UserOption[]>([]);

    const loadAssignedUserOptions = async (): Promise<void> => {
        const options: UserOption[] = [];
        for (const username of SPRINT_TEAM_MEMBERS) {
            const user = await getUserByUsername(username);
            if (user) {
                const userData = user as unknown as User;
                options.push({
                    id: username,
                    text: userData.name,
                    name: userData.name,
                    checked: false,
                });
            }
        }
        assignedUserOptions.value = options;
    };

    const onAssignedUserChange = (
        options: UserOption[],
        callback: (value: string) => void,
    ): void => {
        const selectedOption = options.find((option: UserOption) => option.checked);
        if (selectedOption) {
            callback(selectedOption.id);
            return;
        }
        callback("");
    };

    const selectAssignedUserOption = (assignedUserValue: string): void => {
        if (!assignedUserValue || assignedUserOptions.value.length === 0) return;

        assignedUserOptions.value.forEach((option) => {
            option.checked = option.id === assignedUserValue;
        });
    };

    return {
        assignedUserOptions,
        loadAssignedUserOptions,
        onAssignedUserChange,
        selectAssignedUserOption,
    };
};

const LOW_COLOR = "#4caf50";
const MEDIUM_COLOR = "#ff9800";
const HIGH_COLOR = "#f44336";

const NORMAL_NAME = "Normal";
const MEDIUM_NAME = "Medium";
const HIGH_NAME = "High";

const PRIORITY_NAMES = [NORMAL_NAME, MEDIUM_NAME, HIGH_NAME] as const;
export type PriorityValue = typeof PRIORITY_NAMES[number];

export const PRIORITY_VALUES = {
    NORMAL: NORMAL_NAME,
    MEDIUM: MEDIUM_NAME,
    HIGH: HIGH_NAME,
} as const;

export interface PriorityOption {
    name: string;
    value: PriorityValue;
    color: string;
    html: string;
}

export const PRIORITY_OPTIONS: PriorityOption[] = [
    {
        name: NORMAL_NAME,
        value: NORMAL_NAME,
        color: LOW_COLOR,
        html: `<span style="display: flex; align-items: center; gap: 6px;"><i class="v-icon notranslate mdi mdi-flag" style="font-size: 16px; color: ${LOW_COLOR};"></i>${NORMAL_NAME}</span>`,
    },
    {
        name: MEDIUM_NAME,
        value: MEDIUM_NAME,
        color: MEDIUM_COLOR,
        html: `<span style="display: flex; align-items: center; gap: 6px;"><i class="v-icon notranslate mdi mdi-flag" style="font-size: 16px; color: ${MEDIUM_COLOR};"></i>${MEDIUM_NAME}</span>`,
    },
    {
        name: HIGH_NAME,
        value: HIGH_NAME,
        color: HIGH_COLOR,
        html: `<span style="display: flex; align-items: center; gap: 6px;"><i class="v-icon notranslate mdi mdi-flag" style="font-size: 16px; color: ${HIGH_COLOR};"></i>${HIGH_NAME}</span>`,
    },
];

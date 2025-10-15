const LOW_COLOR = "#4caf50";
const MEDIUM_COLOR = "#ff9800";
const HIGH_COLOR = "#f44336";

const LOW_NAME = "Normal";
const MEDIUM_NAME = "Medium";
const HIGH_NAME = "High";

const PRIORITY_NAMES = [LOW_NAME, MEDIUM_NAME, HIGH_NAME] as const;
export type PriorityValue = typeof PRIORITY_NAMES[number];

export const PRIORITY_VALUES = {
    LOW: LOW_NAME,
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
        name: LOW_NAME,
        value: LOW_NAME,
        color: LOW_COLOR,
        html: `<span style="display: flex; align-items: center; gap: 6px;"><span style="width: 10px; height: 10px; border-radius: 50%; background-color: ${LOW_COLOR}; flex-shrink: 0;"></span>${LOW_NAME}</span>`,
    },
    {
        name: MEDIUM_NAME,
        value: MEDIUM_NAME,
        color: MEDIUM_COLOR,
        html: `<span style="display: flex; align-items: center; gap: 6px;"><span style="width: 10px; height: 10px; border-radius: 50%; background-color: ${MEDIUM_COLOR}; flex-shrink: 0;"></span>${MEDIUM_NAME}</span>`,
    },
    {
        name: HIGH_NAME,
        value: HIGH_NAME,
        color: HIGH_COLOR,
        html: `<span style="display: flex; align-items: center; gap: 6px;"><span style="width: 10px; height: 10px; border-radius: 50%; background-color: ${HIGH_COLOR}; flex-shrink: 0;"></span>${HIGH_NAME}</span>`,
    },
];

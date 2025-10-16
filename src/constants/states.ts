const TODO_COLOR = "#bdbdbdff";
const IN_PROGRESS_COLOR = "#3096fbff";
const WAITING_COLOR = "#b151b3ff";
const READY_FOR_TEST_COLOR = "#eeff00ff";
const DONE_COLOR = "#269b2cff";

const TODO_NAME = "To Do";
const IN_PROGRESS_NAME = "In Progress";
const WAITING_NAME = "Waiting";
const READY_FOR_TEST_NAME = "Ready For Test";
const DONE_NAME = "Done";

const STATE_NAMES = [TODO_NAME, IN_PROGRESS_NAME, WAITING_NAME, READY_FOR_TEST_NAME, DONE_NAME] as const;
export type StateValue = typeof STATE_NAMES[number];

export const STATE_VALUES = {
    TODO: TODO_NAME,
    IN_PROGRESS: IN_PROGRESS_NAME,
    WAITING: WAITING_NAME,
    READY_FOR_TEST: READY_FOR_TEST_NAME,
    DONE: DONE_NAME,
} as const;

export interface StateOption {
    name: string;
    value: StateValue;
    color: string;
    html: string;
}

export const STATE_OPTIONS: StateOption[] = [
    {
        name: TODO_NAME,
        value: TODO_NAME,
        color: TODO_COLOR,
        html: `<span style="display: flex; align-items: center; gap: 6px;"><span style="width: 10px; height: 10px; border-radius: 50%; background-color: ${TODO_COLOR}; flex-shrink: 0;"></span>${TODO_NAME}</span>`,
    },
    {
        name: IN_PROGRESS_NAME,
        value: IN_PROGRESS_NAME,
        color: IN_PROGRESS_COLOR,
        html: `<span style="display: flex; align-items: center; gap: 6px;"><span style="width: 10px; height: 10px; border-radius: 50%; background-color: ${IN_PROGRESS_COLOR}; flex-shrink: 0;"></span>${IN_PROGRESS_NAME}</span>`,
    },
    {
        name: WAITING_NAME,
        value: WAITING_NAME,
        color: WAITING_COLOR,
        html: `<span style="display: flex; align-items: center; gap: 6px;"><span style="width: 10px; height: 10px; border-radius: 50%; background-color: ${WAITING_COLOR}; flex-shrink: 0;"></span>${WAITING_NAME}</span>`,
    },
    {
        name: READY_FOR_TEST_NAME,
        value: READY_FOR_TEST_NAME,
        color: READY_FOR_TEST_COLOR,
        html: `<span style="display: flex; align-items: center; gap: 6px;"><span style="width: 10px; height: 10px; border-radius: 50%; background-color: ${READY_FOR_TEST_COLOR}; flex-shrink: 0;"></span>${READY_FOR_TEST_NAME}</span>`,
    },
    {
        name: DONE_NAME,
        value: DONE_NAME,
        color: DONE_COLOR,
        html: `<span style="display: flex; align-items: center; gap: 6px;"><span style="width: 10px; height: 10px; border-radius: 50%; background-color: ${DONE_COLOR}; flex-shrink: 0;"></span>${DONE_NAME}</span>`,
    },
];

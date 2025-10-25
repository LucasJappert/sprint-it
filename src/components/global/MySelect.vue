<template>
    <div class="my-select-wrapper no-select" :class="accentClass">
        <div
            ref="rootRef"
            class="my-select-field text-left"
            :class="{ expanded, 'has-value': hasValue }"
            :style="fieldInlineStyle"
            @click="toggle"
            role="combobox"
            :aria-expanded="expanded"
        >
            <span class="floating-label" :class="{ 'is-active': expanded || hasValue }">
                {{ labelText }}
            </span>

            <div class="content">
                <template v-if="multiselect">
                    <div class="chips-container" v-if="selectedOptions.length">
                        <v-chip v-for="(opt, idx) in selectedOptions" :key="idx" class="chip" variant="flat" size="small">
                            <span class="chip-label" :title="opt.name">{{ opt.name }}</span>
                        </v-chip>
                    </div>
                </template>
                <template v-else>
                    <span class="selected-single" :title="selectedLabel">
                        <span v-if="selectedOptions[0]?.html" v-html="selectedOptions[0].html"></span>
                        <span v-else>{{ hasValue ? selectedLabel : "" }}</span>
                    </span>
                </template>
            </div>

            <v-btn
                v-if="showClearSelection && internalOptions.length > 0 && hasValue && props.minSelected === 0"
                class="clear-selection-btn"
                icon
                @click.stop="clearSelection"
            >
                <v-icon size="16">mdi-close</v-icon>
            </v-btn>

            <v-icon class="icon">{{ expanded ? "mdi-chevron-up" : "mdi-chevron-down" }}</v-icon>
        </div>

        <Teleport to="body">
            <transition name="fade">
                <div v-show="expanded" ref="dropdownRef" :style="dropdownStyle" class="dropdown-body text-left" :class="[accentClass, $attrs.class]">
                    <div
                        v-for="(option, index) in internalOptions"
                        :key="option.name || index"
                        class="dropdown-item"
                        :class="{ selected: option.checked }"
                        @click="onOptionClick(index)"
                        :title="option.name"
                    >
                        <span class="dropdown-item-content">
                            <span v-if="option.html" v-html="option.html"></span>
                            <span v-else>
                                <span v-if="option.color" class="priority-dot" :style="{ backgroundColor: option.color }"></span>
                                {{ option.name }}
                            </span>
                        </span>
                    </div>
                </div>
            </transition>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { AccentColor } from "../../types";
// Local fallback for ISelectOption
export interface ISelectOption {
    name: string;
    checked: boolean;
    color?: string;
    html?: string;
    [key: string]: any;
}

const props = withDefaults(
    defineProps<{
        options: ISelectOption[];
        multiselect?: boolean;
        placeholderTitle?: string;
        label?: string;
        showClearSelection?: boolean;
        height?: string | number | null;
        fitParentHeight?: boolean;
        maxFieldHeight?: string | number;
        minSelected?: number; // nuevo: mínimo seleccionado requerido (para multiselect)
        density?: "default" | "compact";
        accent?: AccentColor;
    }>(),
    {
        multiselect: false,
        placeholderTitle: "",
        showClearSelection: true,
        height: null,
        fitParentHeight: false,
        maxFieldHeight: 50,
        minSelected: 0,
        density: "default",
        accent: "gray",
    },
);

const emit = defineEmits<{
    (e: "update:options", value: ISelectOption[]): void;
}>();

const rootRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null); // Ref for the dropdown
const expanded = ref(false);
const internalOptions = ref<ISelectOption[]>(props.options.map((o) => ({ ...o })));

const accentClass = computed(() => `accent-${props.accent || "primary"}`);
// Garantiza mínimo seleccionado
const ensureMinSelected = () => {
    if (!props.multiselect || props.minSelected <= 0) return;
    let count = internalOptions.value.filter((o) => o.checked).length;
    if (count >= props.minSelected) return;

    for (const opt of internalOptions.value) {
        if (!opt.checked) {
            opt.checked = true;
            count++;
            if (count >= props.minSelected) break;
        }
    }
    // Si todas estaban en false y minSelected > 0, activa la primera
    if (internalOptions.value.length > 0 && internalOptions.value.every((o) => !o.checked)) {
        const firstOption = internalOptions.value[0];
        if (firstOption) {
            firstOption.checked = true;
        }
    }
};
ensureMinSelected();

const labelText = computed(() => props.label || props.placeholderTitle);
const selectedOptions = computed(() => internalOptions.value.filter((opt) => opt.checked));
const selectedLabel = computed(() => {
    const sel = selectedOptions.value;
    if (sel.length === 0) return "";
    if (props.multiselect) return sel.map((o) => o.name).join(", ");
    return sel[0]?.name || "";
});
const hasValue = computed(() => selectedOptions.value.length > 0);

/** Inline style for height control */
const toUnit = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return undefined;
    return typeof v === "number" ? `${v}px` : v;
};
const fieldInlineStyle = computed(() => {
    const heightByDensity = props.density === "compact" ? "32px" : "48px";
    const maxHeightByDensity = props.density === "compact" ? "34px" : "50px";
    const height = props.fitParentHeight ? "100%" : toUnit(props.height) || heightByDensity;
    const maxHeight = toUnit(props.maxFieldHeight) || maxHeightByDensity;
    return {
        "--field-height": height,
        "--field-max-height": maxHeight,
    } as Record<string, string>;
});

/** Dropdown positioning logic */
const dropdownStyle = ref({});

const updateDropdownPosition = () => {
    if (rootRef.value && expanded.value) {
        const rect = rootRef.value.getBoundingClientRect();
        dropdownStyle.value = {
            position: "fixed",
            top: `${rect.bottom}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
        };
    }
};

watch(expanded, (isExpanded) => {
    if (isExpanded) {
        nextTick(() => {
            updateDropdownPosition();
        });
    }
});

/** Modified click outside logic */
const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Node;
    const isOutside = rootRef.value && !rootRef.value.contains(target) && dropdownRef.value && !dropdownRef.value.contains(target);

    if (isOutside) {
        expanded.value = false;
    }
};

const toggle = () => {
    expanded.value = !expanded.value;
};

const onOptionClick = (index: number) => {
    if (!props.multiselect) {
        expanded.value = false;
        internalOptions.value.forEach((opt, i) => (opt.checked = i === index));
    } else {
        const opt = internalOptions.value[index];
        if (!opt) return; // Safety check

        const selectedCount = internalOptions.value.filter((o) => o.checked).length;

        // No permitir apagar la última requerida
        if (opt.checked && props.minSelected > 0 && selectedCount <= props.minSelected) {
            return;
        }
        opt.checked = !opt.checked;
        ensureMinSelected();
        // Ensure reactive updates propagate to the dropdown list
        internalOptions.value = internalOptions.value.map((o) => ({ ...o }));
    }
    emit("update:options", internalOptions.value);
};

const clearSelection = () => {
    // Si hay mínimo requerido, no permitir limpiar todo
    if (props.multiselect && props.minSelected > 0) return;
    internalOptions.value = internalOptions.value.map((opt) => ({ ...opt, checked: false }));
    emit("update:options", internalOptions.value);
};

onMounted(() => {
    document.addEventListener("click", handleClickOutside);
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true); // Use capture phase for better detection
});

onBeforeUnmount(() => {
    document.removeEventListener("click", handleClickOutside);
    window.removeEventListener("resize", updateDropdownPosition);
    window.removeEventListener("scroll", updateDropdownPosition, true);
});

watch(
    () => props.options,
    (newVal) => {
        internalOptions.value = newVal.map((opt) => ({ ...opt }));
        ensureMinSelected();
    },
    { deep: true },
);
</script>

<style scoped lang="scss">
$radius: 18px;

/* Wrapper anchors the absolute dropdown */
.my-select-wrapper {
    /* Default accent (primary) via CSS variables */
    --sel: #{$gray};
    --sel-01: #{rgba($gray, 0.1)};
    --sel-02: #{rgba($gray, 0.2)};
    --sel-03: #{rgba($gray, 0.3)};
    --sel-035: #{rgba($gray, 0.35)};
    --sel-038: #{rgba($gray, 0.38)};
    position: relative;
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
}

/* Field styled like MyInput */
.my-select-field {
    height: var(--field-height);
    max-height: var(--field-max-height);
    position: relative;
    display: flex;
    align-items: center;
    border: 1px solid rgba($gray, 0.3) !important;
    border-radius: $radius;
    padding: 6px 40px 6px 14px;
    color: var(--sel);
    cursor: pointer;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    border-color: var(--sel-03);

    &.expanded {
        box-shadow: 0 0 0 1px var(--sel-035) inset;
    }

    .content {
        width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--sel);
        display: flex;
        align-items: center;
    }
    .selected-single {
        display: inline-block;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #ffffffbb !important;
    }
    .icon {
        position: absolute;
        right: 10px;
        font-size: 1.2rem;
        color: var(--sel) !important; /* stronger tone */
        border: none;
        background: transparent;
    }
    .clear-selection-btn {
        position: absolute;
        right: 34px;
        width: 24px;
        height: 24px;
        justify-content: center;
        padding: 0;
        color: var(--sel);
        background-color: transparent;
        z-index: 2;
    }
    :deep(.clear-selection-btn .v-icon) {
        color: var(--sel) !important;
    }
}

/* Floating label */
.floating-label {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    transition: all 0.18s ease;
    opacity: 1;
    font-weight: 300;
    font-size: 1rem;
    color: rgba($text, 0.8);

    &.is-active {
        transform: none;
        top: -10px;
        border-radius: $radius;
        background-color: $bg-primary;
        padding: 0 6px;
        font-size: 0.6rem;
        color: $text;
    }
}

/* Multiselect chips */
.chips-container {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow: hidden;
    white-space: nowrap;

    :deep(.v-chip) {
        background-color: transparent !important;
        color: white !important;
        height: 26px;
        border: 1px solid var(--sel-01) !important;
    }
    .chip-label {
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}

/* Dropdown style (now positioned via JS) */
.dropdown-body {
    background-color: $bg-primary;
    border: 1px solid var(--sel-035);
    border-radius: $radius;
    max-height: 230px;
    overflow-y: auto;
    padding: 6px 0;
    z-index: 9999; /* High z-index to ensure visibility */
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.dropdown-item {
    padding: 8px 14px;
    color: $text;
    background-color: $bg-primary;
    cursor: pointer;
    transition: background-color 0.15s ease;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;

    &:hover {
        background-color: var(--sel-02) !important;
    }
    &.selected {
        background-color: var(--sel-038);
    }
}

.dropdown-item-content {
    display: flex;
    align-items: center;
    gap: 8px;
}

.priority-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
}

/* Provide accent variables for teleported dropdown as well */
.dropdown-body.accent-primary {
    --sel: #{$gray};
    --sel-01: #{rgba($gray, 0.1)};
    --sel-02: #{rgba($gray, 0.2)};
    --sel-03: #{rgba($gray, 0.3)};
    --sel-035: #{rgba($gray, 0.35)};
    --sel-038: #{rgba($gray, 0.38)};
}
.dropdown-body.accent-blue {
    --sel: #{$blue};
    --sel-01: #{rgba($blue, 0.1)};
    --sel-02: #{rgba($blue, 0.2)};
    --sel-03: #{rgba($blue, 0.3)};
    --sel-035: #{rgba($blue, 0.35)};
    --sel-038: #{rgba($blue, 0.38)};
}
.dropdown-body.accent-gray {
    --sel: #{$gray};
    --sel-01: #{rgba($gray, 0.1)};
    --sel-02: #{rgba($gray, 0.2)};
    --sel-03: #{rgba($gray, 0.3)};
    --sel-035: #{rgba($gray, 0.35)};
    --sel-038: #{rgba($gray, 0.38)};
}
.dropdown-body.accent-green {
    --sel: #{$green};
    --sel-01: #{rgba($green, 0.1)};
    --sel-02: #{rgba($green, 0.2)};
    --sel-03: #{rgba($green, 0.3)};
    --sel-035: #{rgba($green, 0.35)};
    --sel-038: #{rgba($green, 0.38)};
}
.dropdown-body.accent-light-yellow {
    --sel: #{$yellowLight};
    --sel-01: #{rgba($yellowLight, 0.1)};
    --sel-02: #{rgba($yellowLight, 0.2)};
    --sel-03: #{rgba($yellowLight, 0.3)};
    --sel-035: #{rgba($yellowLight, 0.35)};
    --sel-038: #{rgba($yellowLight, 0.38)};
}
.dropdown-body.accent-light-green {
    --sel: #{$greenLight};
    --sel-01: #{rgba($greenLight, 0.1)};
    --sel-02: #{rgba($greenLight, 0.2)};
    --sel-03: #{rgba($greenLight, 0.3)};
    --sel-035: #{rgba($greenLight, 0.35)};
    --sel-038: #{rgba($greenLight, 0.38)};
}

/* Accent variants: set CSS variables using SCSS colors */
.my-select-wrapper.accent-primary {
    --sel: #{$gray};
    --sel-01: #{rgba($gray, 0.1)};
    --sel-02: #{rgba($gray, 0.2)};
    --sel-03: #{rgba($gray, 0.3)};
    --sel-035: #{rgba($gray, 0.35)};
    --sel-038: #{rgba($gray, 0.38)};
}
.my-select-wrapper.accent-blue {
    --sel: #{$blue};
    --sel-01: #{rgba($blue, 0.1)};
    --sel-02: #{rgba($blue, 0.2)};
    --sel-03: #{rgba($blue, 0.3)};
    --sel-035: #{rgba($blue, 0.35)};
    --sel-038: #{rgba($blue, 0.38)};
}
.my-select-wrapper.accent-gray {
    --sel: #{$gray};
    --sel-01: #{rgba($gray, 0.1)};
    --sel-02: #{rgba($gray, 0.2)};
    --sel-03: #{rgba($gray, 0.3)};
    --sel-035: #{rgba($gray, 0.35)};
    --sel-038: #{rgba($gray, 0.38)};
}
.my-select-wrapper.accent-green {
    --sel: #{$green};
    --sel-01: #{rgba($green, 0.1)};
    --sel-02: #{rgba($green, 0.2)};
    --sel-03: #{rgba($green, 0.3)};
    --sel-035: #{rgba($green, 0.35)};
    --sel-038: #{rgba($green, 0.38)};
}
.my-select-wrapper.accent-light-green {
    --sel: #{$greenLight};
    --sel-01: #{rgba($greenLight, 0.1)};
    --sel-02: #{rgba($greenLight, 0.2)};
    --sel-03: #{rgba($greenLight, 0.3)};
    --sel-035: #{rgba($greenLight, 0.35)};
    --sel-038: #{rgba($greenLight, 0.38)};
}
.my-select-wrapper.accent-light-yellow {
    --sel: #{$yellowLight};
    --sel-01: #{rgba($yellowLight, 0.1)};
    --sel-02: #{rgba($yellowLight, 0.2)};
    --sel-03: #{rgba($yellowLight, 0.3)};
    --sel-035: #{rgba($yellowLight, 0.35)};
    --sel-038: #{rgba($yellowLight, 0.38)};
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.12s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>

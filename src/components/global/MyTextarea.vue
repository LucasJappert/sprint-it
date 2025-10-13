<template>
    <v-textarea
        ref="fieldRef"
        :class="['my-textarea', accentClass]"
        v-bind="$attrs"
        v-model="internalModelValue"
        :label="placeholder"
        :name="internalName"
        :autocomplete="autoCompleteAttr"
        :autocapitalize="autoCapAttr"
        :autocorrect="autoCorrectAttr"
        :spellcheck="spellcheckAttr"
        :clearable="clearable"
        :disabled="disabled"
        :maxlength="maxlength"
        :density="density"
        :readonly="readonlyUntilFocus"
        :rows="rows"
        :auto-grow="autoGrow"
        :no-resize="noResize"
        variant="solo"
        flat
        hide-details
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeydown"
    />
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import type { AccentColor } from "../../types";

const props = withDefaults(
    defineProps<{
        modelValue: string | null;
        placeholder?: string;
        name?: string;
        autocomplete?: string;
        clearable?: boolean;
        disabled?: boolean;
        maxlength?: number;
        density?: "default" | "comfortable" | "compact";
        rows?: number | string;
        autoGrow?: boolean;
        noResize?: boolean;

        // Autocomplete
        preventBrowserAutocomplete?: boolean;
        aggressiveAutocompleteBlock?: boolean;

        centered?: boolean;
        accent?: AccentColor;
    }>(),
    {
        modelValue: "",
        placeholder: "",
        clearable: false,
        disabled: false,
        density: "default",
        rows: 5,
        autoGrow: false,
        noResize: false,

        preventBrowserAutocomplete: true,
        aggressiveAutocompleteBlock: false,

        centered: false,
        accent: "primary",
    },
);

const emit = defineEmits<{
    (e: "update:modelValue", v: string): void;
    (e: "focus"): void;
    (e: "blur"): void;
}>();

const accentClass = computed(() => `accent-${props.accent || "primary"}`);

/* ========================
   v-model
======================= */
const internalModelValue = computed({
    get: () => props.modelValue ?? "",
    set: (v: string) => emit("update:modelValue", v),
});

/* ========================
   Expose focus helpers to parent
======================= */
const fieldRef = ref<any>(null);
const getNativeTextarea = (): HTMLTextAreaElement | null => {
    const r = fieldRef.value as any;
    if (!r) return null;
    const el: HTMLElement | null = r.$el ?? null;
    return el ? (el.querySelector("textarea") as HTMLTextAreaElement | null) : null;
};

const focus = async () => {
    await nextTick();
    const r = fieldRef.value as any;
    if (r && typeof r.focus === "function") {
        r.focus();
        return;
    }
    getNativeTextarea()?.focus();
};

const select = async () => {
    await nextTick();
    const textarea = getNativeTextarea();
    if (textarea) {
        try {
            textarea.select();
        } catch {}
    }
};

const blur = async () => {
    await nextTick();
    const r = fieldRef.value as any;
    if (r && typeof r.blur === "function") {
        r.blur();
        return;
    }
    getNativeTextarea()?.blur();
};

defineExpose({ focus, select, blur });

/* ========================
   Anti-autocomplete
======================= */
const uid = Math.random().toString(36).slice(2);
const internalName = computed(() => (props.name ? props.name : props.preventBrowserAutocomplete ? `_mta_${uid}` : undefined));
const autoCompleteAttr = computed(() => {
    if (props.autocomplete !== undefined) return props.autocomplete;
    return props.preventBrowserAutocomplete ? "off" : "on";
});
const autoCapAttr = computed(() => (props.preventBrowserAutocomplete ? "off" : "none"));
const autoCorrectAttr = computed(() => (props.preventBrowserAutocomplete ? "off" : "on"));
const spellcheckAttr = computed(() => (props.preventBrowserAutocomplete ? false : true));

const unlocked = ref(false);
const readonlyUntilFocus = computed(() => props.preventBrowserAutocomplete && props.aggressiveAutocompleteBlock && !unlocked.value);

const handleFocus = async () => {
    if (props.preventBrowserAutocomplete && props.aggressiveAutocompleteBlock && !unlocked.value) {
        unlocked.value = true;
        await nextTick();
    }
    emit("focus");
};

const handleBlur = () => {
    if (props.preventBrowserAutocomplete && props.aggressiveAutocompleteBlock) unlocked.value = false;
    emit("blur");
};

/* ========================
   Handlers teclado
======================= */
const CONTROL_KEYS = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "Tab", "Enter"];
const isCtrlCmdCombo = (e: KeyboardEvent) => (e.ctrlKey || e.metaKey) && ["a", "c", "v", "x", "z", "y"].includes(e.key.toLowerCase());

const handleKeydown = (e: KeyboardEvent) => {
    if (CONTROL_KEYS.includes(e.key) || isCtrlCmdCombo(e)) return;
};

const getTextAlignValue = computed(() => (props.centered ? "center" : "left"));
const getMinHeightvalue = computed(() => {
    if (props.density === "compact") return "32px";
    if (props.density === "comfortable") return "46px";
    return "48px";
});
</script>

<style lang="scss" scoped>
.my-textarea {
    /* Default accent variables */
    --sel: #{$primary};
    --sel-01: #{rgba($primary, 0.1)};
    --sel-02: #{rgba($primary, 0.2)};
    --sel-03: #{rgba($primary, 0.3)};
    --sel-035: #{rgba($primary, 0.35)};
    --sel-038: #{rgba($primary, 0.38)};

    :deep(textarea) {
        border: none !important;
        background: transparent !important;
        resize: none !important; /* Bloquea el resize del usuario */
        padding: 16px 10px !important;
        // line-height: 1.6 !important;
        // margin-top: 8px !important;
        min-height: 100% !important;
    }

    :deep(.v-field) {
        background-color: transparent !important;
        border: 1px solid var(--sel-03) !important;
        border-radius: 18px !important;
        color: #ffffffbb !important;
        box-shadow: none !important;
        overflow: visible !important;
    }

    :deep(.v-field--focused) {
        border-color: var(--sel) !important;
        box-shadow: 0 0 0 1px var(--sel-035) inset !important;
    }

    :deep(.v-field__input) {
        min-height: v-bind("getMinHeightvalue") !important;
        text-align: v-bind("getTextAlignValue") !important;
        padding-top: 16px !important;
        padding-bottom: 16px !important;
        overflow: visible !important;
    }

    :deep(.v-label) {
        color: rgba($gray, 0.3) !important;
        font-weight: 600;
    }

    :deep(.v-field-label--floating) {
        opacity: 1 !important;
        top: -10px !important;
        background-color: $bg-primary;
        border-radius: 20px;
        padding: 0 6px;
        font-size: 0.7rem;
        color: $gray !important;
    }

    :deep(.v-field__overlay),
    :deep(.v-field__outline),
    :deep(.v-field__loader) {
        display: none !important;
    }

    :deep(.v-icon) {
        color: var(--sel) !important;
        opacity: 0.85;
    }
}

/* Accent overrides */
.my-textarea.accent-primary {
    --sel: #{$primary};
    --sel-01: #{rgba($primary, 0.1)};
    --sel-02: #{rgba($primary, 0.2)};
    --sel-03: #{rgba($primary, 0.3)};
    --sel-035: #{rgba($primary, 0.35)};
    --sel-038: #{rgba($primary, 0.38)};
}
</style>

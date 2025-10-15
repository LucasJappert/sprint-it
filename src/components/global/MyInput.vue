<template>
    <v-text-field
        ref="fieldRef"
        :class="['my-input', accentClass]"
        v-bind="$attrs"
        v-model="internalModelValue"
        :type="actualType"
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
        :inputmode="inputModeAttr"
        :pattern="patternAttr"
        :step="stepAttr"
        variant="solo"
        flat
        hide-details
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeydown"
        @paste="handlePaste"
    />
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
/* ========================
   Props & Emits
======================== */
import type { AccentColor } from "../../types";
const props = withDefaults(
    defineProps<{
        modelValue: string | null;
        placeholder?: string;
        type?: string; // "text" | "number" | "password"...
        name?: string;
        autocomplete?: string;
        clearable?: boolean;
        disabled?: boolean;
        maxlength?: number;
        density?: "default" | "comfortable" | "compact";

        // Autocomplete
        preventBrowserAutocomplete?: boolean;
        aggressiveAutocompleteBlock?: boolean;

        // Numéricas (si type === "number")
        numberAllowDecimal?: boolean;
        numberAllowNegative?: boolean;
        decimalSeparator?: "." | ",";
        numberFormatThousands?: boolean; // inserta separador de miles al mostrar

        centered?: boolean;
        accent?: AccentColor;
    }>(),
    {
        modelValue: "",
        placeholder: "",
        type: "text",
        clearable: false,
        disabled: false,
        density: "default",

        preventBrowserAutocomplete: true,
        aggressiveAutocompleteBlock: false,

        numberAllowDecimal: true,
        numberAllowNegative: false,
        decimalSeparator: ",", // coma por defecto
        numberFormatThousands: true,

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
   Config numérica
======================== */
const isNumber = computed(() => props.type === "number");
const sep = computed(() => (props.decimalSeparator === "," ? "," : "."));
const altSep = computed(() => (sep.value === "." ? "," : "."));
const thousandSep = computed(() => (sep.value === "," ? "." : ","));

// type real: si usamos coma, el <input type="number"> del browser la bloquea
const actualType = computed(() => (isNumber.value && sep.value === "," ? "text" : props.type));
const inputModeAttr = computed(() => (isNumber.value ? (props.numberAllowDecimal ? "decimal" : "numeric") : undefined));
const patternAttr = computed(() => {
    if (!isNumber.value) return undefined;
    return props.numberAllowDecimal ? (sep.value === "," ? "^-?\\d*(,\\d*)?$" : "^-?\\d*(\\.\\d*)?$") : "^-?\\d*$";
});
const stepAttr = computed(() => (isNumber.value ? (props.numberAllowDecimal ? "any" : "1") : undefined));

/* ========================
   v-model (saneado)
======================== */
const internalModelValue = computed({
    get: () => {
        const base = isNumber.value ? sanitizeNumber(props.modelValue ?? "") : props.modelValue ?? "";
        if (!isNumber.value) return base;
        return props.numberFormatThousands ? formatThousands(base) : base;
    },
    set: (v: string) => {
        // quitar separadores de miles antes de sanear
        const cleaned = isNumber.value ? v.split(thousandSep.value).join("") : v;
        emit("update:modelValue", isNumber.value ? sanitizeNumber(cleaned) : v);
    },
});

/* ========================
   Expose focus/select helpers to parent
======================== */
const fieldRef = ref<any>(null);
const getNativeInput = (): HTMLInputElement | null => {
    const r = fieldRef.value as any;
    if (!r) return null;
    // Vuetify v-text-field: try public focus or fallback to querying input
    const el: HTMLElement | null = r.$el ?? null;
    return el ? (el.querySelector("input") as HTMLInputElement | null) : null;
};
const focus = async () => {
    await nextTick();
    const r = fieldRef.value as any;
    if (r && typeof r.focus === "function") {
        r.focus();
        return;
    }
    getNativeInput()?.focus();
};
const select = async () => {
    await nextTick();
    const input = getNativeInput();
    if (input) {
        try {
            input.select();
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
    getNativeInput()?.blur();
};

defineExpose({ focus, select, blur });

/* ========================
   Anti-autocomplete
======================== */
const uid = Math.random().toString(36).slice(2);
const internalName = computed(() => (props.name ? props.name : props.preventBrowserAutocomplete ? `_mi_${uid}` : undefined));
const autoCompleteAttr = computed(() => {
    if (props.autocomplete !== undefined) return props.autocomplete;
    if (props.type === "password") return "new-password";
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
   Helpers sanitización
======================== */
const replAll = (s: string, from: string, to: string) => (from === to ? s : s.split(from).join(to));
const allowedRegex = computed(() => new RegExp(`[^0-9\\${sep.value}-]`, "g"));

const sanitizeNumber = (raw: string): string => {
    if (!isNumber.value) return raw;
    if (raw === "") return "";

    // 1) punto→coma (o coma→punto), normaliza al separador activo
    let s = replAll(raw, altSep.value, sep.value);

    // 2) filtra todo lo que no sea dígitos, separador activo o '-'
    s = s.replace(allowedRegex.value, "");

    // 3) separador decimal (sólo uno permitido)
    if (!props.numberAllowDecimal) {
        s = replAll(s, sep.value, "");
    } else {
        const first = s.indexOf(sep.value);
        if (first !== -1) {
            const before = s.slice(0, first + 1);
            const after = s.slice(first + 1);
            s = before + replAll(after, sep.value, ""); // quita separadores repetidos
        }
    }

    // 4) signo negativo (opcional, único y sólo al inicio)
    if (!props.numberAllowNegative) {
        s = s.replace(/-/g, "");
    } else {
        const hadMinusAtStart = raw.trim().startsWith("-");
        s = s.replace(/-/g, "");
        if (hadMinusAtStart) s = "-" + s;
    }
    return s;
};

// Inserta separador de miles en la parte entera, preserva signo y separador decimal activo
const formatThousands = (s: string): string => {
    if (!isNumber.value || !s) return s;
    let sign = "";
    let t = s;
    if (t.startsWith("-")) {
        sign = "-";
        t = t.slice(1);
    }
    const idx = t.indexOf(sep.value);
    const hasDec = idx !== -1;
    const intPart = (hasDec ? t.slice(0, idx) : t) || "";
    const decPart = hasDec ? t.slice(idx + 1) : "";
    // quita cualquier separador de miles previo por si vino del modelo
    const plainInt = intPart.replace(/[^0-9]/g, "");
    const withThousands = plainInt.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep.value);
    return sign + (hasDec ? withThousands + sep.value + decPart : withThousands);
};

/* ========================
   Handlers teclado/pegado
======================== */
const CONTROL_KEYS = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "Tab", "Enter"];
const isCtrlCmdCombo = (e: KeyboardEvent) => (e.ctrlKey || e.metaKey) && ["a", "c", "v", "x", "z", "y"].includes(e.key.toLowerCase());

const selectionReplacesExistingSep = (el: HTMLInputElement, sepIdx: number) => {
    const { selectionStart, selectionEnd } = el;
    return selectionStart != null && selectionEnd != null && selectionStart <= sepIdx && sepIdx < selectionEnd;
};

const handleKeydown = (e: KeyboardEvent) => {
    if (!isNumber.value) return;

    const el = e.target as HTMLInputElement | null;
    const k = e.key;

    if (CONTROL_KEYS.includes(k) || isCtrlCmdCombo(e)) return;
    if (/^\d$/.test(k)) return; // dígitos

    // separadores: aceptamos ambos (sep y altSep) para que '.' → ',' funcione
    if (props.numberAllowDecimal && (k === sep.value || k === altSep.value)) {
        if (el) {
            const v = el.value;
            const idxActive = v.indexOf(sep.value);
            const idxAlt = v.indexOf(altSep.value);
            const hasAnySep = idxActive !== -1 || idxAlt !== -1;

            if (hasAnySep) {
                const idx = idxActive !== -1 ? idxActive : idxAlt;
                if (!selectionReplacesExistingSep(el, idx)) e.preventDefault();
            }
        }
        return;
    }

    // negativo sólo al inicio
    if (props.numberAllowNegative && k === "-") {
        if (!el) return;
        if (el.selectionStart !== 0 || el.value.startsWith("-")) e.preventDefault();
        return;
    }

    e.preventDefault(); // lo demás no entra
};

const handlePaste = (e: ClipboardEvent) => {
    if (!isNumber.value) return;
    const el = e.target as HTMLInputElement | null;
    if (!el) return;

    const pasted = e.clipboardData?.getData("text") ?? "";
    const before = el.value.slice(0, el.selectionStart ?? el.value.length);
    const after = el.value.slice(el.selectionEnd ?? el.value.length);
    const next = sanitizeNumber(before + pasted + after);

    e.preventDefault();
    emit("update:modelValue", next);
};

const getTextAlignValue = computed(() => (props.centered ? "center" : "left"));
const getMinHeightvalue = computed(() => {
    if (props.density === "compact") return "32px";
    if (props.density === "comfortable") return "46px";
    return "48px";
});
</script>

<style lang="scss" scoped>
$bg-primary: var(--panel) !default;
/* Igual que tu versión */
.my-input {
    /* Default accent variables */
    --sel: #{$primary};
    --sel-01: #{rgba($primary, 0.1)};
    --sel-02: #{rgba($primary, 0.2)};
    --sel-03: #{rgba($primary, 0.3)};
    --sel-035: #{rgba($primary, 0.35)};
    --sel-038: #{rgba($primary, 0.38)};
    :deep(input) {
        border: none !important;
        background: transparent !important;
    }
    :deep(.v-field) {
        background-color: transparent !important;
        border: 1px solid var(--sel-03) !important;
        border-radius: 18px !important;
        color: #ffffffbb !important;
        width: 100% !important;
    }
    :deep(.v-field--focused) {
        border-color: var(--sel) !important;
        box-shadow: 0 0 0 1px var(--sel-035) inset !important;
    }
    :deep(.v-field__input) {
        min-height: v-bind("getMinHeightvalue") !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        text-align: v-bind("getTextAlignValue") !important;
    }
    :deep(.v-label) {
        color: $text;
        font-weight: 300;
    }
    :deep(.v-field-label--floating) {
        opacity: 1 !important;
        top: -10px !important;
        border-radius: 20px;
        padding: 0 6px;
        background-color: $bg-primary;
        padding: 0 6px;
        font-size: 0.6rem;
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
    :deep(input:-webkit-autofill),
    :deep(input:-webkit-autofill:hover),
    :deep(input:-webkit-autofill:focus) {
        -webkit-text-fill-color: white !important;
        -webkit-box-shadow: 0 0 0px 1000px $bg-primary inset !important;
        box-shadow: 0 0 0px 1000px $bg-primary inset !important;
        caret-color: white !important;
    }
}

/* Accent overrides */
.my-input.accent-primary {
    --sel: #{$primary};
    --sel-01: #{rgba($primary, 0.1)};
    --sel-02: #{rgba($primary, 0.2)};
    --sel-03: #{rgba($primary, 0.3)};
    --sel-035: #{rgba($primary, 0.35)};
    --sel-038: #{rgba($primary, 0.38)};
}
.my-input.accent-blue {
    --sel: #{$blue};
    --sel-01: #{rgba($blue, 0.1)};
    --sel-02: #{rgba($blue, 0.2)};
    --sel-03: #{rgba($blue, 0.3)};
    --sel-035: #{rgba($blue, 0.35)};
    --sel-038: #{rgba($blue, 0.38)};
}
.my-input.accent-gray {
    --sel: #{$gray};
    --sel-01: #{rgba($gray, 0.1)};
    --sel-02: #{rgba($gray, 0.2)};
    --sel-03: #{rgba($gray, 0.3)};
    --sel-035: #{rgba($gray, 0.35)};
    --sel-038: #{rgba($gray, 0.38)};
}
.my-input.accent-green {
    --sel: #{$green};
    --sel-01: #{rgba($green, 0.1)};
    --sel-02: #{rgba($green, 0.2)};
    --sel-03: #{rgba($green, 0.3)};
    --sel-035: #{rgba($green, 0.35)};
    --sel-038: #{rgba($green, 0.38)};
}
.my-input.accent-light-green {
    --sel: #{$greenLight};
    --sel-01: #{rgba($greenLight, 0.1)};
    --sel-02: #{rgba($greenLight, 0.2)};
    --sel-03: #{rgba($greenLight, 0.3)};
    --sel-035: #{rgba($greenLight, 0.35)};
    --sel-038: #{rgba($greenLight, 0.38)};
}
.my-input.accent-light-yellow {
    --sel: #{$yellowLight};
    --sel-01: #{rgba($yellowLight, 0.1)};
    --sel-02: #{rgba($yellowLight, 0.2)};
    --sel-03: #{rgba($yellowLight, 0.3)};
    --sel-035: #{rgba($yellowLight, 0.35)};
    --sel-038: #{rgba($yellowLight, 0.38)};
}
</style>

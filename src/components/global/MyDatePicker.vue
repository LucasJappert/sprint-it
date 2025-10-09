<template>
    <div class="my-date-wrapper" :class="accentClass">
        <v-menu v-model="menu" :close-on-content-click="false" transition="scale-transition" offset-y :content-class="['my-date-menu', accentClass]">
            <template #activator="{ props }">
                <div class="my-date-activator" v-bind="props">
                    <MyInput
                        v-model="displayText"
                        :placeholder="label"
                        :clearable="false"
                        :density="density"
                        readonly
                        :class="{ 'is-required': required }"
                        :accent="accent"
                    />
                    <v-btn v-if="clearable && displayText" class="date-clear-btn" icon variant="elevated" type="button" @click.stop="onClear">
                        <v-icon size="16">mdi-close</v-icon>
                    </v-btn>
                </div>
            </template>

            <v-card :class="['my-date-card', accentClass]" elevation="8">
                <v-date-picker
                    v-model="pickerValue"
                    :multiple="isRange ? 'range' : false"
                    :min="min"
                    :max="max"
                    show-adjacent-months
                    @update:model-value="onPick"
                />
                <v-divider class="my-divider" />
                <div class="actions-row">
                    <MyButton secondary icon="mdi-broom" text="Limpiar" @click="onClear" />
          <MyButton :accent="accent" icon="mdi-check" text="Aceptar" @click="onDone" />
                </div>
            </v-card>
        </v-menu>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

type Mode = "single" | "range";
type Dateish = string | Date;
type ModelValue = string | string[];
import type { AccentColor } from "../../types";

const props = withDefaults(
    defineProps<{
        mode?: Mode;
        modelValue?: ModelValue;
        label?: string;
        clearable?: boolean;
        min?: string;
        max?: string;
        closeOnSelect?: boolean;
        locale?: string;
        emitPartialOnDone?: boolean;
        required?: boolean;
        density?: "default" | "compact";
    accent?: AccentColor;
    }>(),
    {
        mode: "single",
        modelValue: "",
        label: "Select date",
        clearable: true,
        closeOnSelect: true,
        locale: "es-AR",
        emitPartialOnDone: false,
        required: true,
        density: "compact",
        accent: "primary",
    },
);

const emit = defineEmits<{
    (e: "update:modelValue", value: string | string[]): void;
    (e: "selected", value: string | string[]): void;
}>();

const isRange = computed(() => props.mode === "range");
const menu = ref(false);
const accentClass = computed(() => `accent-${props.accent || "primary"}`);

// v-date-picker model
const pickerValue = ref<Dateish | Dateish[] | null>(isRange.value ? [] : null);
const isoEndpoints = ref<string[]>([]);
const displayText = ref("");

// helpers
const normalizeISO = (input?: string | null): string => {
    if (!input) return "";
    const s = String(input).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
        const [d, m, y] = s.split("/").map(Number);
        const dt = new Date(y, m - 1, d);
        if (Number.isNaN(dt.getTime())) return "";
        const mm = String(m).padStart(2, "0");
        const dd = String(d).padStart(2, "0");
        return `${y}-${mm}-${dd}`;
    }
    return "";
};
const toISO = (v: Dateish): string =>
    typeof v === "string"
        ? normalizeISO(v)
        : normalizeISO(`${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`);
const endpointsFromVal = (val: Dateish | Dateish[] | null): string[] => {
    if (!val) return [];
    const arr = Array.isArray(val) ? val : [val];
    const iso = [...new Set(arr.map(toISO))].filter(Boolean) as string[];
    if (iso.length <= 1) return iso;
    const sorted = [...iso].sort();
    return [sorted[0], sorted[sorted.length - 1]];
};
const expandRangeInclusive = (startISO: string, endISO: string): string[] => {
    const a = normalizeISO(startISO);
    const b = normalizeISO(endISO);
    if (!a || !b) return [];
    const [s, e] = [a, b].sort();
    const start = new Date(`${s}T00:00:00`);
    const end = new Date(`${e}T00:00:00`);
    const out: string[] = [];
    for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) out.push(toISO(cur));
    return out;
};
const fmt = computed(() => new Intl.DateTimeFormat(props.locale, { day: "2-digit", month: "2-digit", year: "numeric" }));
const toLocal = (isoRaw: string): string => {
    const iso = normalizeISO(isoRaw);
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    return fmt.value.format(new Date(y, m - 1, d));
};
const updateDisplay = () => {
    const [aRaw, bRaw] = isoEndpoints.value;
    const a = normalizeISO(aRaw);
    const b = normalizeISO(bRaw);
    if (!a) {
        displayText.value = "";
        return;
    }
    if (!isRange.value || !b) {
        displayText.value = toLocal(a);
        return;
    }
    displayText.value = `${toLocal(a)} - ${toLocal(b)}`;
};

// interactions
const onPick = (val: Dateish | Dateish[] | null) => {
    if (!isRange.value) {
        const raw = Array.isArray(val) ? val[0] ?? null : val;
        const picked = raw ? toISO(raw as Dateish) : "";
        isoEndpoints.value = picked ? [picked] : [];
        pickerValue.value = picked || null;
        emit("update:modelValue", picked);
        updateDisplay();
        if (props.closeOnSelect && picked) {
            menu.value = false;
            emit("selected", picked);
        }
        return;
    }
    const endpoints = endpointsFromVal(val);
    isoEndpoints.value = endpoints;
    let expanded: string[] = [];
    if (endpoints.length === 2) expanded = expandRangeInclusive(endpoints[0], endpoints[1]);
    else if (endpoints.length === 1) expanded = [endpoints[0]];
    pickerValue.value = expanded;
    emit("update:modelValue", [...expanded]);
    updateDisplay();
};
const onClear = () => {
    pickerValue.value = isRange.value ? [] : null;
    isoEndpoints.value = [];
    emit("update:modelValue", isRange.value ? [] : "");
    displayText.value = "";
};
const onDone = () => {
    if (!isRange.value) {
        emit("selected", isoEndpoints.value[0] ?? "");
        menu.value = false;
        return;
    }
    if (isoEndpoints.value.length === 2) emit("selected", expandRangeInclusive(isoEndpoints.value[0], isoEndpoints.value[1]));
    else if (props.emitPartialOnDone && isoEndpoints.value.length === 1) emit("selected", [isoEndpoints.value[0]]);
    else emit("selected", []);
    menu.value = false;
};

watch(
    () => props.modelValue,
    (v) => {
        if (!isRange.value) {
            const asString = Array.isArray(v) ? v[0] ?? "" : v ?? "";
            const val = normalizeISO(asString);
            isoEndpoints.value = val ? [val] : [];
            pickerValue.value = val || null;
            updateDisplay();
            return;
        }
        const arr = Array.isArray(v) ? (v as string[]) : [];
        const endpoints = endpointsFromVal(arr);
        isoEndpoints.value = endpoints;
        let expanded: string[] = [];
        if (endpoints.length === 2) expanded = expandRangeInclusive(endpoints[0], endpoints[1]);
        else if (endpoints.length === 1) expanded = [endpoints[0]];
        pickerValue.value = expanded;
        updateDisplay();
    },
    { immediate: true },
);
</script>

<style lang="scss" scoped>
/* Activator */
.my-date-activator {
    position: relative;
    :deep(.v-field__input) {
        padding-right: 35px !important;
    }
}
.date-clear-btn {
    position: absolute;
    top: 50%;
    right: 8px;
    transform: translateY(-50%);
    background: transparent !important;
    color: var(--sel) !important;
    min-width: 28px;
    width: 28px;
    height: 28px;
    padding: 0;
    :deep(.v-icon) {
        color: var(--sel) !important;
        opacity: 0.95;
    }
}

/* Menu container */
.my-date-menu {
    width: auto !important;
    min-width: unset !important;
    max-width: max-content !important;
    display: inline-block !important;
    background-color: transparent !important;
}

/* Accent variables for menu (teleported) */
.my-date-card.accent-primary {
    --sel: #{$primary};
    --sel-02: #{rgba($primary, 0.18)};
    --sel-035: #{rgba($primary, 0.5)};
}

.my-date-card.accent-blue {
    --sel: #{$blue};
    --sel-02: #{rgba($blue, 0.18)};
    --sel-035: #{rgba($blue, 0.5)};
}

.my-date-card.accent-gray {
    --sel: #{$gray};
    --sel-02: #{rgba($gray, 0.18)};
    --sel-035: #{rgba($gray, 0.5)};
}

.my-date-card.accent-green {
    --sel: #{$green};
    --sel-02: #{rgba($green, 0.18)};
    --sel-035: #{rgba($green, 0.5)};
}

.my-date-card.accent-light-yellow {
    --sel: #{$yellowLight};
    --sel-02: #{rgba($yellowLight, 0.18)};
    --sel-035: #{rgba($yellowLight, 0.5)};
}

.my-date-card.accent-light-green {
    --sel: #{$greenLight};
    --sel-02: #{rgba($greenLight, 0.18)};
    --sel-035: #{rgba($greenLight, 0.5)};
}

/* Card + calendar colors use CSS vars */
.my-date-card {
    background-color: $bg-primary !important;
    color: white;
    width: auto !important;
    max-width: max-content !important;
    :deep(.v-sheet) {
        background-color: transparent !important;
        color: inherit !important;
    }
    :deep(.v-date-picker) {
        background-color: transparent !important;
        color: var(--sel, #{$primary}) !important;
    }
    :deep(.v-picker-title),
    :deep(.v-picker__header) {
        display: none !important;
    }
    :deep(.v-date-picker-month__day .v-btn) {
        color: #ffffffcc !important;
    }
    :deep(.v-date-picker-month__day .v-btn:hover) {
        background-color: var(--sel-02, #{rgba($primary, 0.18)}) !important;
    }
    :deep(.v-date-picker-month__day--current .v-btn) {
        box-shadow: inset 0 0 0 1px var(--sel-035, #{rgba($primary, 0.5)}) !important;
    }
    :deep(.v-date-picker-month__day--selected .v-btn) {
        background-color: var(--sel, #{$primary}) !important;
        color: $bg-primary !important;
    }
    :deep(.v-date-picker-month__day--in-range .v-btn),
    :deep(.v-date-picker-date--in-range .v-btn) {
        background-color: var(--sel-02, #{rgba($primary, 0.18)}) !important;
        color: #fff !important;
    }
    :deep(.v-date-picker-month__day--adjacent .v-btn) {
        color: rgba(255, 255, 255, 0.45) !important;
    }
    .actions-row {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding: 12px;
        :deep(.my-button) {
            min-width: 110px;
        }
    }
    .my-divider {
        opacity: 0.2;
        border-color: var(--sel, #{$primary});
    }
}

/* Required ring */
:deep(.is-required.my-input .v-field) {
    border: 1px dashed var(--sel-035) !important;
}
:deep(.is-required.my-input .v-field.v-field--focused) {
    border-style: solid !important;
    border-color: var(--sel) !important;
    box-shadow: 0 0 0 1px var(--sel-035) inset !important;
}
:deep(.is-required.my-input .v-label)::after {
    content: " *";
    color: var(--sel);
    font-weight: 700;
}

/* Accent for clear icon (activator wrapper) */
.my-date-wrapper.accent-primary .date-clear-btn :deep(.v-icon) {
    color: $primary !important;
}
.my-date-wrapper.accent-blue .date-clear-btn :deep(.v-icon) {
    color: $blue !important;
}
.my-date-wrapper.accent-gray .date-clear-btn :deep(.v-icon) {
    color: $gray !important;
}
.my-date-wrapper.accent-green .date-clear-btn :deep(.v-icon) {
    color: $green !important;
}
</style>

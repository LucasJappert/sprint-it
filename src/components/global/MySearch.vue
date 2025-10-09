<!-- MySearch.vue -->
<template>
    <div
        ref="rootRef"
        class="my-search custom-bg-and-border1"
        :class="[accentClass, { 'is-compact': compact && !isExpanded, 'is-expanded': isExpanded }]"
        :style="fieldInlineStyle"
        @click="onContainerClick"
    >
        <div class="my-search__field" :class="{ 'is-disabled': disabled }" role="combobox" :aria-expanded="showDropdown" :aria-controls="dropdownId">
            <input
                ref="inputRef"
                class="my-search__input"
                type="text"
                :name="name"
                :value="modelValue"
                :disabled="disabled"
                :spellcheck="props.spellcheck"
                autocomplete="off"
                autocapitalize="none"
                autocorrect="off"
                placeholder=" "
                @click.stop="onClick"
                @blur="onBlur"
                @input="onInput"
                @keydown="onKeydown"
                aria-label="Search"
                aria-autocomplete="list"
                :aria-activedescendant="activeDescId"
            />

            <!-- Botón limpiar -->
            <v-btn v-if="(modelValue ?? '').length > 0 && !disabled" class="my-search__clear-btn" icon @click.stop="clearInput">
                <v-icon size="16">mdi-close</v-icon>
            </v-btn>

            <!-- Label flotante -->
            <label class="my-search__label" :class="{ 'is-floated': hasValue }">
                {{ label }}
            </label>

            <!-- Icono lupa (visual) -->
            <v-icon class="my-search__icon gray" size="24">mdi-magnify</v-icon>
        </div>

        <!-- Sugerencias -->
        <div v-show="showDropdown" class="my-search__dropdown" role="listbox" :id="dropdownId">
            <div
                v-for="(opt, idx) in visibleSuggestions"
                :key="opt.item.id"
                class="my-search__item"
                :class="{ active: idx === activeIndex }"
                :id="optionId(idx)"
                role="option"
                @pointerdown.prevent.stop="selectSuggestion(opt.item)"
            >
                <span v-if="!highlight" class="sugg-text">{{ opt.item.text }}</span>
                <span v-else class="sugg-text" v-html="opt.marked"></span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";

/** Item type */
export interface SearchItem {
    id: string | number;
    text: string;
}

// Reemplazá tu options?: string[] por items SearchItem[]
import type { AccentColor } from "../../types";
const props = withDefaults(
    defineProps<{
        modelValue?: string;
        label?: string;
        disabled?: boolean;
        autofocus?: boolean;
        name?: string;
        compact?: boolean;
        showSuggestions?: boolean;

        // autocomplete con items
        options?: SearchItem[];
        maxResults?: number;
        minChars?: number;
        caseSensitive?: boolean;
        matchFromStart?: boolean;
        highlight?: boolean;

        // ðŸ§  cerrar dropdown cuando se selecciona
        closeOnSelect?: boolean;
        compactAfterSelect?: boolean;
        clearOnSelect?: boolean;
        // Altura opcional para alinear con selects
        height?: string | number | null;
        fitParentHeight?: boolean;
        density?: "default" | "compact";
        accent?: AccentColor;

        spellcheck?: boolean;
    }>(),
    {
        modelValue: "",
        label: "Buscar lote",
        disabled: false,
        autofocus: false,
        compact: false,
        showSuggestions: true,

        options: () => [],
        maxResults: 10,
        minChars: 1,
        caseSensitive: false,
        matchFromStart: false,
        highlight: true,

        closeOnSelect: true,
        compactAfterSelect: false,
        clearOnSelect: false,
        height: null,
        fitParentHeight: false,
        density: "default",
        accent: "primary",
        spellcheck: false,
    },
);

const emit = defineEmits<{
    (e: "update:modelValue", value: string): void;
    (e: "text-change", value: string): void;
    (e: "enter", value: string): void;
    (e: "select", value: SearchItem): void; // <-- emite el item completo
}>();

const isDropdownOpen = ref(false);
const accentClass = computed(() => `accent-${props.accent || "primary"}`);
// Inline style (height)
const toUnit = (v: string | number | null | undefined) => (v === null || v === undefined ? undefined : typeof v === "number" ? `${v}px` : v);
const fieldInlineStyle = computed(() => {
    const heightByDensity = props.density === "compact" ? "32px" : "48px";
    const height = props.fitParentHeight ? "100%" : toUnit(props.height) || heightByDensity;
    return { height } as Record<string, string>;
});
const uid = Math.random().toString(36).slice(2);
const dropdownId = `mysearch-dd-${uid}`;
const optionId = (i: number) => `mysearch-opt-${uid}-${i}`;
const rootRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const isFocused = ref(false);

// expandido si NO es compacto, o si es compacto y está interactuando/lleno
const isExpanded = ref<boolean>(!props.compact || (props.modelValue ?? "").length > 0);
const hasValue = computed<boolean>(() => (props.modelValue ?? "").length > 0);

// --- Filtering helpers
const escapeHtml = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const buildMarked = (text: string, query: string): string => {
    if (!query) return escapeHtml(text);
    const t = props.caseSensitive ? text : text.toLowerCase();
    const q = props.caseSensitive ? query : query.toLowerCase();

    const idx = props.matchFromStart ? (t.startsWith(q) ? 0 : -1) : t.indexOf(q);
    if (idx < 0) return escapeHtml(text);

    const start = escapeHtml(text.slice(0, idx));
    const mid = escapeHtml(text.slice(idx, idx + query.length));
    const end = escapeHtml(text.slice(idx + query.length));
    return `${start}<mark>${mid}</mark>${end}`;
};

// Filtra por item.text
const filteredSuggestions = computed<SearchItem[]>(() => {
    const q = (props.modelValue ?? "").trim();
    if (q.length < props.minChars) {
        return props.options.slice(0, props.maxResults);
    }

    const norm = (s: string): string => (props.caseSensitive ? s : s.toLowerCase());
    const nq = norm(q);

    const predicate = props.matchFromStart ? (it: SearchItem) => norm(it.text).startsWith(nq) : (it: SearchItem) => norm(it.text).includes(nq);

    const out: SearchItem[] = [];
    for (const it of props.options) {
        if (predicate(it)) out.push(it);
        if (out.length >= props.maxResults) break;
    }
    return out;
});

// Mapea a { item, marked }
const visibleSuggestions = computed(() =>
    filteredSuggestions.value.map((item) => ({
        item,
        marked: props.highlight ? buildMarked(item.text, props.modelValue ?? "") : item.text,
    })),
);

// Dropdown state
const activeIndex = ref<number>(-1);
const activeDescId = computed<string | undefined>(() => (activeIndex.value >= 0 ? optionId(activeIndex.value) : undefined));

const showDropdown = computed<boolean>(() => {
    if (!props.showSuggestions) return false;
    if (!isExpanded.value) return false;
    if (!isDropdownOpen.value) return false; // <- nuevo
    return visibleSuggestions.value.length > 0;
});

watch(showDropdown, (open) => {
    activeIndex.value = open ? 0 : -1;
});

// --- Events
const onInput = (e: Event): void => {
    const val = (e.target as HTMLInputElement).value;
    emit("update:modelValue", val);
    emit("text-change", val);
    isDropdownOpen.value = true;
};

const onKeydown = (e: KeyboardEvent): void => {
    if (!showDropdown.value) {
        if (e.key === "Enter") emit("enter", (e.target as HTMLInputElement).value);
        return;
    }

    if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = activeIndex.value + 1;
        activeIndex.value = next >= visibleSuggestions.value.length ? 0 : next;
        return;
    }

    if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = activeIndex.value - 1;
        activeIndex.value = prev < 0 ? visibleSuggestions.value.length - 1 : prev;
        return;
    }

    if (e.key === "Enter") {
        e.preventDefault();
        const opt = visibleSuggestions.value[activeIndex.value];
        if (opt) selectSuggestion(opt.item);
        return;
    }

    if (e.key === "Escape") {
        e.preventDefault();
        activeIndex.value = -1;
        isDropdownOpen.value = false; // <- cierra
        return;
    }
};

const onClick = (): void => {
    isFocused.value = true;
    if (props.compact) expand();
    // Mostrar sugerencias incluso vacío (luego visibleSuggestions limita a top N)
    isDropdownOpen.value = true;
};

const onBlur = (): void => {
    isFocused.value = false;
};

const onContainerClick = (): void => {
    if (props.compact && !isExpanded.value && !props.disabled) {
        expand();
        requestAnimationFrame(() => inputRef.value?.focus());
    }
};

const expand = (): void => {
    isExpanded.value = true;
};

// Al seleccionar, cerramos
const selectSuggestion = (item: SearchItem): void => {
    const nextValue = props.clearOnSelect ? "" : item.text;

    emit("update:modelValue", nextValue);
    emit("text-change", nextValue);
    emit("select", item);

    if (props.compact && props.compactAfterSelect) {
        isDropdownOpen.value = false;
        isExpanded.value = false;
        isFocused.value = false;
        return;
    }

    isDropdownOpen.value = !props.closeOnSelect;
};

// Limpiar input
const clearInput = (): void => {
    emit("update:modelValue", "");
    emit("text-change", "");
};

// Click afuera para cerrar dropdown / colapsar si corresponde
const onDocPointerDown = (ev: PointerEvent): void => {
    const root = rootRef.value;
    if (!root) return;
    if (root.contains(ev.target as Node)) return; // click adentro  no hacer nada

    // siempre cerrá el listado
    isDropdownOpen.value = false;

    // si está en modo compacto, colapsá a "botón de lupa"
    if (props.compact) {
        isExpanded.value = false;
        inputRef.value?.blur();
    }
};

onMounted((): void => {
    if (props.autofocus && inputRef.value) {
        expand();
        inputRef.value.focus();
    }
    document.addEventListener("pointerdown", onDocPointerDown);
});

onBeforeUnmount((): void => {
    document.removeEventListener("pointerdown", onDocPointerDown);
});
</script>

<style scoped lang="scss">
/* se mantienen exactamente tus estilos */
.my-search {
    --sel: #{$primary};
    --sel-01: #{rgba($primary, 0.1)};
    --sel-02: #{rgba($primary, 0.2)};
    --sel-03: #{rgba($primary, 0.3)};
    --sel-035: #{rgba($primary, 0.35)};
    --sel-038: #{rgba($primary, 0.38)};
    width: 100%;
    height: 100%;
    display: block;
    transition: all 0.1s ease;
    cursor: pointer;
    position: relative; /* para posicionar el dropdown */
    color: var(--sel);
}

/* Campo */
.my-search__field {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    height: 100%;
}

.my-search__input {
    width: 100%;
    box-sizing: border-box;
    height: 100%;
    padding: 0 64px 0 10px; /* espacio para clear + icono */
    font-size: 1rem;
    background: transparent;
    outline: none;
    border: 1px solid rgba($gray, 0.3) !important;
    border-radius: 18px !important;
}

.my-search__input:focus {
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.06);
}

.my-search__label {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    padding: 0 10px;
    color: #ffffff80;
    pointer-events: none;
    background: transparent;
}

/* Ocultar label en tu UX actual */
.my-search__label.is-floated {
    display: none;
}

/* Ícono lupa */
.my-search__icon {
    position: absolute;
    right: 12px;
    pointer-events: none;
}

/* Botón limpiar */
.my-search__clear-btn {
    position: absolute;
    right: 36px;
    width: 24px;
    height: 24px;
    padding: 0;
    min-width: 24px;
    background: transparent;
}
.my-search__clear-btn :deep(.v-icon) {
    color: var(--sel) !important;
}

/* Dropdown de sugerencias (match con tu MySelect) */
.my-search__dropdown {
    position: absolute;
    left: 0;
    right: 0;
    top: calc(100% + 6px);
    background-color: $bg-transparent;
    border: 1px solid var(--sel-035);
    border-radius: 20px;
    max-height: 320px;
    overflow-y: auto;
    z-index: 10;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.my-search__item {
    font-size: 1rem;
    text-align: left;
    cursor: pointer;
    user-select: none;
    padding: 6px 14px;
    transition: all 0.2s ease;
    width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    &:hover {
        background-color: var(--sel-02) !important;
    }

    &.active {
        background-color: inherit;
    }
}
/* Accent variants */
.my-search.accent-primary {
    --sel: #{$primary};
    --sel-01: #{rgba($primary, 0.1)};
    --sel-02: #{rgba($primary, 0.2)};
    --sel-03: #{rgba($primary, 0.3)};
    --sel-035: #{rgba($primary, 0.35)};
    --sel-038: #{rgba($primary, 0.38)};
}
.my-search.accent-blue {
    --sel: #{$blue};
    --sel-01: #{rgba($blue, 0.1)};
    --sel-02: #{rgba($blue, 0.2)};
    --sel-03: #{rgba($blue, 0.3)};
    --sel-035: #{rgba($blue, 0.35)};
    --sel-038: #{rgba($blue, 0.38)};
}
.my-search.accent-gray {
    --sel: #{$gray};
    --sel-01: #{rgba($gray, 0.1)};
    --sel-02: #{rgba($gray, 0.2)};
    --sel-03: #{rgba($gray, 0.3)};
    --sel-035: #{rgba($gray, 0.35)};
    --sel-038: #{rgba($gray, 0.38)};
}
.my-search.accent-green {
    --sel: #{$green};
    --sel-01: #{rgba($green, 0.1)};
    --sel-02: #{rgba($green, 0.2)};
    --sel-03: #{rgba($green, 0.3)};
    --sel-035: #{rgba($green, 0.35)};
    --sel-038: #{rgba($green, 0.38)};
}
.my-search.accent-light-green {
    --sel: #{$greenLight};
    --sel-01: #{rgba($greenLight, 0.1)};
    --sel-02: #{rgba($greenLight, 0.2)};
    --sel-03: #{rgba($greenLight, 0.3)};
    --sel-035: #{rgba($greenLight, 0.35)};
    --sel-038: #{rgba($greenLight, 0.38)};
}
.my-search.accent-light-yellow {
    --sel: #{$yellowLight};
    --sel-01: #{rgba($yellowLight, 0.1)};
    --sel-02: #{rgba($yellowLight, 0.2)};
    --sel-03: #{rgba($yellowLight, 0.3)};
    --sel-035: #{rgba($yellowLight, 0.35)};
    --sel-038: #{rgba($yellowLight, 0.38)};
}

/* Modo compacto */
.is-compact {
    width: 40px !important;
}
.is-compact:not(.is-expanded) .my-search__input {
    width: 0;
    padding: 0;
    opacity: 0;
    pointer-events: none;
}
.is-compact:not(.is-expanded) .my-search__label {
    display: none;
}
.is-compact:not(.is-expanded) .my-search__icon {
    position: static;
    margin: 0 auto;
    pointer-events: none;
}
.is-compact.is-expanded .my-search__field {
    width: 100%;
}
.is-compact.is-expanded .my-search__input {
    width: 100%;
    padding: 0 64px 0 10px;
    opacity: 1;
    pointer-events: auto;
}
.is-compact.is-expanded .my-search__icon {
    position: absolute;
    right: 12px;
}

.is-disabled .my-search__input {
    background: transparent;
    cursor: not-allowed;
}
</style>
<style lang="scss">
mark {
    background: #00000040 !important; // verde (Tailwind "green-600")
    color: inherit !important; // texto blanco
    padding: 0 1px;
    border-radius: 2px;
    pointer-events: none; // ðŸ‘ˆ el click pasa al div padre
    user-select: none; // opcional: evita selección de texto al click
}
</style>

<template>
    <div class="project-selector-wrapper" ref="rootRef">
        <div
            class="project-selector-field text-left"
            :class="{ focused: isFocused, 'has-value': hasValue }"
            @click="handleFieldClick"
            role="combobox"
            :aria-expanded="isOpen"
        >
            <span class="floating-label" :class="{ 'is-active': isFocused || hasValue }">
                {{ label }}
            </span>

            <input
                ref="inputRef"
                v-model="searchText"
                type="text"
                class="project-input"
                :placeholder="''"
                @focus="handleFocus"
                @blur="handleBlur"
                @keydown="handleKeydown"
            />

            <v-btn v-if="hasValue && showClear" class="clear-btn" icon size="x-small" @mousedown.prevent="clearSelection">
                <v-icon size="14">mdi-close</v-icon>
            </v-btn>
        </div>

        <Teleport to="body">
            <transition name="fade">
                <div v-show="isOpen && hasOptions" ref="dropdownRef" class="project-dropdown" :style="dropdownStyle">
                    <div
                        v-for="(project, index) in filteredProjects"
                        :key="project"
                        class="project-option"
                        :class="{ selected: selectedIndex === index, highlighted: highlightedIndex === index }"
                        @mousedown.prevent="selectProject(project)"
                        @mouseenter="highlightedIndex = index"
                        @mouseleave="highlightedIndex = -1"
                    >
                        {{ project }}
                    </div>

                    <div v-if="filteredProjects.length === 0 && searchText.trim()" class="no-results">Escribir para crear: "{{ searchText.trim() }}"</div>
                </div>
            </transition>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { useProjectName } from "@/composables/useProjectName";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

interface Props {
    modelValue?: string;
    label?: string;
    showClear?: boolean;
    density?: "default" | "compact";
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: "",
    label: "Project",
    showClear: true,
    density: "default",
});

const emit = defineEmits<{
    "update:modelValue": [value: string];
}>();

const { filterProjects } = useProjectName();

const rootRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

const searchText = ref(props.modelValue);
const isFocused = ref(false);
const isOpen = ref(false);
const highlightedIndex = ref(-1);
const selectedIndex = ref(-1);

const hasValue = computed(() => !!searchText.value.trim());

const hasOptions = computed(() => {
    const options = filteredProjects.value;
    if (options.length === 0) return false;
    // If there's only one option and it matches exactly with search text, don't show dropdown
    if (options.length === 1 && options[0].toLowerCase() === searchText.value.trim().toLowerCase()) {
        return false;
    }
    return true;
});

const filteredProjects = computed(() => filterProjects(searchText.value));

const fieldHeight = computed(() => {
    if (props.density === "compact") return "32px";
    return "48px";
});

const dropdownStyle = ref<Record<string, string>>({});

const updateDropdownPosition = () => {
    if (rootRef.value && isOpen.value) {
        const rect = rootRef.value.getBoundingClientRect();
        dropdownStyle.value = {
            position: "fixed",
            top: `${rect.bottom + 4}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            "max-height": "250px",
            "overflow-y": "auto",
        };
    }
};

const handleFocus = () => {
    isFocused.value = true;
    isOpen.value = true;
    highlightedIndex.value = -1;
    nextTick(() => {
        updateDropdownPosition();
    });
};

const handleBlur = () => {
    // Emit value on blur to ensure changes are captured
    emit("update:modelValue", searchText.value || "");

    // Delay closing to allow click on options
    setTimeout(() => {
        // No cerrar si el documento no tiene foco (ej: usuario hizo clic en dev tools)
        if (!document.hasFocus()) return;

        if (!dropdownRef.value?.contains(document.activeElement)) {
            isFocused.value = false;
            isOpen.value = false;
            highlightedIndex.value = -1;
        }
    }, 150);
};

const handleFieldClick = () => {
    if (!isFocused.value) {
        inputRef.value?.focus();
    }
};

const handleKeydown = (event: KeyboardEvent) => {
    if (!isOpen.value) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            isOpen.value = true;
            updateDropdownPosition();
            return;
        }
        return;
    }

    switch (event.key) {
        case "ArrowDown":
            event.preventDefault();
            highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredProjects.value.length - 1);
            selectedIndex.value = highlightedIndex.value;
            scrollToHighlighted();
            break;
        case "ArrowUp":
            event.preventDefault();
            highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0);
            selectedIndex.value = highlightedIndex.value;
            scrollToHighlighted();
            break;
        case "Enter":
            event.preventDefault();
            if (highlightedIndex.value >= 0 && filteredProjects.value[highlightedIndex.value]) {
                selectProject(filteredProjects.value[highlightedIndex.value]);
            } else if (searchText.value.trim()) {
                // Allow custom input
                confirmSelection();
            }
            break;
        case "Escape":
            isOpen.value = false;
            highlightedIndex.value = -1;
            break;
        case "Tab":
            isOpen.value = false;
            highlightedIndex.value = -1;
            break;
    }
};

const scrollToHighlighted = () => {
    if (dropdownRef.value && highlightedIndex.value >= 0) {
        const options = dropdownRef.value.querySelectorAll(".project-option");
        const highlighted = options[highlightedIndex.value];
        if (highlighted) {
            highlighted.scrollIntoView({ block: "nearest" });
        }
    }
};

const selectProject = (project: string) => {
    searchText.value = project;
    emit("update:modelValue", project);
    isOpen.value = false;
    isFocused.value = false;
    highlightedIndex.value = -1;
};

const confirmSelection = () => {
    const value = searchText.value.trim();
    if (value) {
        emit("update:modelValue", value);
    }
    isOpen.value = false;
    isFocused.value = false;
    highlightedIndex.value = -1;
};

const clearSelection = () => {
    searchText.value = "";
    emit("update:modelValue", "");
    highlightedIndex.value = -1;
    // Keep focus and dropdown open after clearing
    isOpen.value = true;
    isFocused.value = true;
    nextTick(() => {
        inputRef.value?.focus();
        updateDropdownPosition();
    });
};

watch(
    () => props.modelValue,
    (newVal) => {
        searchText.value = newVal || "";
    },
);

// Emit value while typing for real-time change detection
watch(searchText, (newVal) => {
    if (isFocused.value) {
        emit("update:modelValue", newVal || "");
    }
});

watch(isFocused, (focused) => {
    if (focused) {
        nextTick(() => {
            updateDropdownPosition();
        });
    }
});

onMounted(() => {
    document.addEventListener("click", handleClickOutside);
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);
});

onBeforeUnmount(() => {
    document.removeEventListener("click", handleClickOutside);
    window.removeEventListener("resize", updateDropdownPosition);
    window.removeEventListener("scroll", updateDropdownPosition, true);
});

const handleClickOutside = (event: MouseEvent) => {
    // No cerrar si el documento no tiene foco (ej: usuario hizo clic en dev tools)
    if (!document.hasFocus()) return;

    const target = event.target as Node;
    const isOutside = rootRef.value && !rootRef.value.contains(target) && dropdownRef.value && !dropdownRef.value.contains(target);

    if (isOutside) {
        isOpen.value = false;
        isFocused.value = false;
        highlightedIndex.value = -1;
    }
};
</script>

<style scoped lang="scss">
$radius: 18px;
$gray: #666666;

.project-selector-wrapper {
    position: relative;
    width: 100%;
}

.project-selector-field {
    height: v-bind(fieldHeight);
    position: relative;
    display: flex;
    align-items: center;
    border: 1px solid rgba($gray, 0.3) !important;
    border-radius: $radius;
    padding: 6px 36px 6px 14px;
    color: var(--sel);
    cursor: pointer;
    transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease;

    &.focused {
        box-shadow: 0 0 0 1px rgba($gray, 0.35) inset;
        border-color: rgba($gray, 0.38) !important;
    }

    &:hover:not(.focused) {
        border-color: rgba($gray, 0.5) !important;
    }
}

.project-input {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    color: #ffffffbb;
    padding: 0;

    &::placeholder {
        color: transparent;
    }
}

.floating-label {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    transition: all 0.18s ease;
    opacity: 1;
    font-weight: 300;
    color: $text;

    &.is-active {
        transform: none;
        top: -10px;
        border-radius: $radius;
        background-color: #1e1e1e;
        padding: 0 6px;
        font-size: 0.6rem;
        color: #ffffffbb;
    }
}

.clear-btn {
    position: absolute;
    right: 8px;
    width: 24px;
    height: 24px;
    justify-content: center;
    padding: 0;
    color: rgba($gray, 0.8) !important;
    background-color: transparent;
    z-index: 2;
}

.project-dropdown {
    background-color: #1e1e1e;
    border: 1px solid rgba($gray, 0.35);
    border-radius: $radius;
    max-height: 250px;
    overflow-y: auto;
    padding: 4px 0;
    z-index: 9999;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.project-option {
    padding: 8px 8px;
    font-size: 0.9rem;
    color: #ffffffbb;
    cursor: pointer;
    transition: background-color 0.15s ease;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;

    &:hover,
    &.highlighted {
        background-color: rgba($gray, 0.2) !important;
    }

    &.selected {
        background-color: rgba($gray, 0.38);
    }
}

.no-results {
    padding: 10px 14px;
    color: rgba($gray, 0.6);
    font-style: italic;
    font-size: 0.9rem;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.12s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>

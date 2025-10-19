<template>
    <div :class="['my-richtext', accentClass, densityClass, { disabled }]">
        <div class="toolbar" v-if="showToolbar">
            <button type="button" class="btn" @click="cmd('bold')" :class="{ active: isActive('bold') }">
                <strong>B</strong>
            </button>
            <button type="button" class="btn" @click="cmd('underline')" :class="{ active: isActive('underline') }">
                <u>U</u>
            </button>
        </div>

        <EditorContent
            @dragover.prevent
            @drop.prevent="handleDrop"
            :editor="editor"
            class="editor-content"
            :aria-label="placeholder"
            :data-placeholder="placeholder"
        />
    </div>
</template>

<script setup lang="ts">
import ResizableImage from "@/extensions/ResizableImage"; // <— el nuestro
import { supabaseUploader as defaultUploader } from "@/utils/supabaseUploader";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/vue-3";
// @ts-ignore community package may not include types
import { computed, onBeforeUnmount, onMounted, watch } from "vue";

type Accent = "primary" | "success" | "warning" | "danger" | "info";
type Density = "default" | "comfortable" | "compact";

interface Props {
    modelValue: string | null;
    placeholder?: string;
    disabled?: boolean;
    density?: Density;
    showToolbar?: boolean;
    accent?: Accent;
    uploader?: (file: File) => Promise<string>;
    maxImageSizeMB?: number;
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: "",
    placeholder: "Write here… paste or drop images",
    disabled: false,
    density: "default",
    showToolbar: true,
    accent: "primary",
    maxImageSizeMB: 10,
});

const emit = defineEmits<{
    (e: "update:modelValue", v: string): void;
    (e: "focus"): void;
    (e: "blur"): void;
}>();

const accentClass = computed(() => `accent-${props.accent}`);
const densityClass = computed(() => `density-${props.density}`);

const getInitialContent = (): string => props.modelValue || "";

const editor = useEditor({
    editable: !props.disabled,
    content: getInitialContent(),
    extensions: [
        StarterKit, // sin configure({ history })
        ResizableImage, // usa el NodeView de Vue
    ],
    onUpdate: ({ editor }) => emit("update:modelValue", editor.getHTML()),
    onFocus: () => emit("focus"),
    onBlur: () => emit("blur"),
});

watch(
    () => props.modelValue,
    (html) => {
        if (!editor.value) return;
        const incoming = html || "";
        const current = editor.value.getHTML();
        if (incoming === current) return;
        editor.value.commands.setContent(incoming, { emitUpdate: false });
    },
);

watch(
    () => props.disabled,
    (d) => editor.value?.setEditable(!d),
);

onMounted(() => {
    editor.value?.view.dom.addEventListener("paste", onPaste, { passive: false });
});

onBeforeUnmount(() => editor.value?.destroy());

const isActive = (name: string) => editor.value?.isActive(name) ?? false;

const cmd = (action: "bold" | "underline") => {
    if (!editor.value) return;
    const chain = editor.value.chain().focus();
    if (action === "bold") chain.toggleBold().run();
    if (action === "underline") chain.toggleUnderline().run();
};

const insertImage = (src: string) => {
    if (!editor.value) return;
    // podés fijar un ancho inicial, ej. 60%:
    editor.value.chain().focus().setImage({ src, alt: "" }).run();
};

const tooLarge = (file: File) => file.size > (props.maxImageSizeMB || 10) * 1024 * 1024;

const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (tooLarge(file)) return;
    const up = props.uploader || defaultUploader;
    const url = await up(file);
    insertImage(url);
};

const onPaste = async (e: ClipboardEvent) => {
    if (!e.clipboardData) return;
    const items = Array.from(e.clipboardData.items).filter((i) => i.type.startsWith("image/"));
    if (items.length === 0) return;
    e.preventDefault();
    for (const it of items) {
        const f = it.getAsFile();
        if (f) await handleFile(f);
    }
};

const handleDrop = async (e: DragEvent) => {
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length === 0) return;
    for (const f of files) await handleFile(f);
};
</script>

<style scoped lang="scss">
.my-richtext {
    --sel: #5aa7ff;
    --sel-02: rgba(90, 167, 255, 0.2);
    --border: rgba(180, 200, 220, 0.3);
    --text: #ffffffcc;

    display: flex;
    flex-direction: column;
    text-align: left;
    gap: 8px;

    &.disabled {
        opacity: 0.6;
        pointer-events: none;
    }

    .toolbar {
        display: flex;
        gap: 8px;
        align-items: center;
        .btn {
            border: 1px solid var(--border);
            background: transparent;
            color: var(--text);
            padding: 6px 10px;
            border-radius: 10px;
            cursor: pointer;
            &.active {
                box-shadow: 0 0 0 1px var(--sel) inset;
            }
        }
    }

    .field-shell {
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 20px 24px;
        min-height: 380px;
        box-shadow: none;
        overflow: visible;
        margin-top: 8px; /* match MyTextarea */
    }

    .editor-content {
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 20px 24px;
        min-height: 380px;
        box-shadow: none;
        overflow: visible;
        margin-top: 8px; /* match MyTextarea */
        // padding: 12px;
        line-height: 1.6;
        overflow-y: auto;
        :deep(.ProseMirror-focused) {
            outline: none;
        }
    }

    .editor-content:empty::before {
        content: attr(data-placeholder);
        color: rgba(255, 255, 255, 0.3);
        pointer-events: none;
    }

    /* resize handles (from ResizableImage) */
    .img-resize-handle {
        width: 10px;
        height: 10px;
        border: 1px solid var(--sel);
        background: var(--sel-02);
        border-radius: 2px;
    }

    &.density-compact .field-shell {
        padding: 8px 10px;
        min-height: 100px;
    }
    &.density-comfortable .field-shell {
        padding: 10px 12px;
        min-height: 120px;
    }

    &.accent-primary {
        --sel: #5aa7ff;
    }
    &.accent-success {
        --sel: #22c55e;
    }
    &.accent-warning {
        --sel: #eab308;
    }
    &.accent-danger {
        --sel: #ef4444;
    }
    &.accent-info {
        --sel: #06b6d4;
    }
}
</style>

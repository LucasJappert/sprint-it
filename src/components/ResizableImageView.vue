<template>
    <node-view-wrapper class="resizable-image">
        <div class="img-wrap" :style="styleWrap" :class="{ selected }" @click="toggleSelection">
            <img :src="node.attrs.src" :alt="node.attrs.alt || ''" :style="styleImg" draggable="false" />
            <span v-if="selected" class="handle bottom-right" @mousedown="startDragBottomRight" />
        </div>
    </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { computed, onBeforeUnmount, ref } from "vue";

const props = defineProps(nodeViewProps);

const selected = ref(false);

const styleWrap = computed(() => {
    const styles: Record<string, string> = {};
    const w = props.node.attrs.width;
    if (w) styles.width = `${w}%`;
    return styles;
});

const styleImg = computed(() => {
    return {}; // Mantener altura automática
});

let dragging = false;
let startX = 0;
let startWidth = 0;
let currentWrap: HTMLElement | null = null;

const toggleSelection = () => {
    selected.value = !selected.value;
};

const onMouseMove = (e: MouseEvent) => {
    if (!dragging || !currentWrap) return;

    const deltaX = e.clientX - startX;

    let newWidth = Math.max(30, startWidth + deltaX);

    const parent = currentWrap.parentElement as HTMLElement | null;
    if (!parent) return;

    const parentWidth = parent.clientWidth || 1;
    let widthPercent = Math.round((newWidth / parentWidth) * 100);
    if (widthPercent < 10) widthPercent = 10;
    if (widthPercent > 100) widthPercent = 100;

    props.updateAttributes({ width: widthPercent });
    // Forzar actualización visual inmediata
    currentWrap.style.width = `${widthPercent}%`;
};

const onMouseUp = () => {
    dragging = false;
    currentWrap = null;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    // Mantener selección después del drag
};

const startDragBottomRight = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const wrap = (e.target as HTMLElement).closest(".img-wrap") as HTMLElement | null;
    if (!wrap) return;
    dragging = true;
    startX = e.clientX;
    startWidth = wrap.clientWidth;
    currentWrap = wrap;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
};

onBeforeUnmount(() => onMouseUp());
</script>

<style scoped>
.resizable-image .img-wrap {
    position: relative;
    display: inline-block;
    max-width: 100%;
    &.selected {
        box-shadow: 0 0 2px red;
    }
}
.resizable-image img {
    display: block;
    max-width: 100%;
    height: auto;
    user-select: none;
}
.resizable-image .handle {
    position: absolute;
    width: 8px;
    height: 8px;
    border: 1px solid red;
    background: red;
}
.resizable-image .handle.bottom-right {
    bottom: -6px;
    right: -6px;
    cursor: se-resize;
}
</style>

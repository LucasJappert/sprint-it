<template>
    <node-view-wrapper class="image-link">
        <a :href="node.attrs.src" target="_blank" rel="noopener noreferrer" class="image-link-anchor">
            {{ node.attrs.src }}
        </a>
    </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";

const props = defineProps(nodeViewProps);
</script>

<style scoped>
.image-link {
    display: inline-block;
    margin: 4px 0;
}

.image-link-anchor {
    color: #5aa7ff;
    text-decoration: underline;
    font-family: monospace;
    font-size: 1rem;
    word-break: break-all;
}

.image-link-anchor:hover {
    color: #3b82f6;
}
</style>

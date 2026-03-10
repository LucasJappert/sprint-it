<template>
    <node-view-wrapper class="image-link">
        <ImagePreview :src="node.attrs.src" :alt="node.attrs.alt || ''" :show-delete-button="true" @remove="handleRemove" />
    </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import ImagePreview from "./ImagePreview.vue";

const props = defineProps(nodeViewProps);

const handleRemove = () => {
    props.deleteNode();
};
</script>

<style scoped>
.image-link {
    display: inline-block;
    margin: 4px 0;
}
</style>

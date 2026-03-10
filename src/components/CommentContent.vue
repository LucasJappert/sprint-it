<template>
    <div class="comment-content">
        <template v-for="(part, index) in parsedContent" :key="index">
            <p v-if="part.type === 'text'" v-html="part.content"></p>
            <ImagePreview v-else-if="part.type === 'image'" :src="part.src || ''" :alt="part.alt || ''" />
        </template>
    </div>
</template>

<script setup lang="ts">
import ImagePreview from "./ImagePreview.vue";

interface ParsedPart {
    type: "text" | "image";
    content?: string;
    src?: string;
    alt?: string;
}

interface Props {
    html: string;
}

const props = defineProps<Props>();

const parsedContent = computed<ParsedPart[]>(() => {
    const parts: ParsedPart[] = [];
    let remaining = props.html;

    // Regex to match img tags - handles various formats
    const imgRegex = /<img[^>]*src="([^"]*)"[^>]*>|<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>|<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>/g;

    let lastIndex = 0;
    let match;

    while ((match = imgRegex.exec(remaining)) !== null) {
        // Add text before the image
        if (match.index > lastIndex) {
            const textBefore = remaining.slice(lastIndex, match.index);
            if (textBefore.trim()) {
                parts.push({
                    type: "text",
                    content: textBefore.replace(/\n/g, "<br>"),
                });
            }
        }

        // Add the image - handle different capture group positions
        const src = match[1] || match[2] || match[5] || "";
        const alt = match[3] || match[4] || "";
        if (src) {
            parts.push({
                type: "image",
                src,
                alt,
            });
        }

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < remaining.length) {
        const textAfter = remaining.slice(lastIndex);
        if (textAfter.trim()) {
            parts.push({
                type: "text",
                content: textAfter.replace(/\n/g, "<br>"),
            });
        }
    }

    return parts.length > 0 ? parts : [{ type: "text", content: remaining.replace(/\n/g, "<br>") }];
});
</script>

<style scoped lang="scss">
.comment-content {
    color: #ffffffcc;
    line-height: 1.5;
}

.comment-content :deep(p) {
    margin: 0;
}

.comment-content :deep(p + p) {
    margin-top: 8px;
}
</style>

<template>
    <div class="comments-section text-left">
        <div class="comments-title">Comments</div>
        <MySeparator class="my-2" />

        <!-- Add comment section -->
        <div class="add-comment">
            <MyRichText
                v-model="newCommentContent"
                placeholder="Write a comment..."
                density="compact"
                :height="'80px'"
                @keydown.enter.exact.prevent="addComment"
            />
            <div class="add-comment-actions">
                <MyButton @click="addComment" :disabled="!newCommentContent.trim()" secondary> Add Comment </MyButton>
            </div>
        </div>

        <!-- Comments list -->
        <div class="comments-list" v-if="comments.length > 0">
            <div v-for="comment in sortedComments" :key="comment.id" class="comment-item">
                <div class="comment-header">
                    <span class="comment-author">{{ getAuthorName(comment.author) }}</span>
                    <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
                </div>
                <div class="comment-content" v-html="comment.content"></div>
            </div>
        </div>

        <!-- No comments message -->
        <div v-else class="no-comments">No comments yet.</div>
    </div>
</template>

<script setup lang="ts">
import { getUser } from "@/services/firestore";
import { useAuthStore } from "@/stores/auth";
import type { Comment } from "@/types";
import { computed, ref } from "vue";

interface Props {
    comments: Comment[];
}

interface Emits {
    (e: "add-comment", content: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const authStore = useAuthStore();
const newCommentContent = ref("");

const sortedComments = computed(() => [...props.comments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

const addComment = () => {
    if (newCommentContent.value.trim()) {
        emit("add-comment", newCommentContent.value.trim());
        newCommentContent.value = "";
    }
};

const getAuthorName = async (authorId: string): Promise<string> => {
    try {
        const user = await getUser(authorId);
        return user ? `${user.name} ${user.lastName}` : "Unknown User";
    } catch (error) {
        console.warn(`Error getting author name for ${authorId}:`, error);
        return "Unknown User";
    }
};

const formatDate = (date: Date): string => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffInMs = now.getTime() - commentDate.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInHours < 1) {
        const minutes = Math.floor(diffInMs / (1000 * 60));
        return minutes <= 1 ? "Just now" : `${minutes} minutes ago`;
    } else if (diffInDays < 1) {
        const hours = Math.floor(diffInHours);
        return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
    } else if (diffInDays < 7) {
        const days = Math.floor(diffInDays);
        return days === 1 ? "1 day ago" : `${days} days ago`;
    } else {
        return commentDate.toLocaleDateString();
    }
};
</script>

<style scoped lang="scss">
.comments-section {
    margin-top: 12px;
    padding: 12px;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.05);
}

.comments-title {
    margin: 0;
    color: $text;
}

.add-comment {
    margin-bottom: 20px;
}

.add-comment-actions {
    margin-top: 8px;
    text-align: right;
}

.comments-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.comment-item {
    padding: 12px;
    border: 1px solid rgba(180, 200, 220, 0.2);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.02);
}

.comment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 0.9rem;
}

.comment-author {
    font-weight: 600;
    color: #5aa7ff;
}

.comment-date {
    color: #ffffff88;
    font-size: 0.8rem;
}

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

.no-comments {
    text-align: center;
    color: #ffffff88;
    font-style: italic;
    padding: 20px;
}
</style>

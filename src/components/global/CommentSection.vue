<template>
    <MyCard class="comments-section text-left mt-4" accent="gray">
        <div class="comments-title">
            <v-icon>mdi-chat-outline</v-icon>
            Comments
        </div>
        <MySeparator class="my-2" />

        <!-- Add comment section -->
        <div class="add-comment relative">
            <MyRichText v-model="newCommentContent" placeholder="Write a comment..." density="compact" :height="'80px'" />
            <div class="add-comment-actions">
                <MyButton @click="addCommentAsync" :disabled="!newCommentContent.trim()" class="custom-button"> Add Comment </MyButton>
            </div>
        </div>

        <!-- Comments list -->
        <div class="comments-list" v-if="comments.length > 0">
            <div v-for="comment in sortedComments" :key="comment.id" class="comment-item">
                <div class="comment-header">
                    <div>
                        <span class="comment-author" :style="{ color: getAuthorColor(comment.userId) }">
                            {{ authorNames[comment.userId] || "Loading..." }}
                        </span>
                        <span class="comment-date"> | {{ formatRelativeDate(comment.createdAt) }} | {{ formatISODate(comment.createdAt) }}</span>
                    </div>

                    <!-- Edit/Delete buttons for comment author -->
                    <div v-if="comment.userId === authStore.user?.id" class="comment-actions">
                        <v-btn icon size="x-small" @click="startEditComment(comment)" @mousedown.stop>
                            <v-icon size="14" class="green">mdi-pencil</v-icon>
                        </v-btn>
                        <v-btn icon size="x-small" @click="deleteCommentAsync(comment.id)" @mousedown.stop>
                            <v-icon size="14" class="danger">mdi-trash-can-outline</v-icon>
                        </v-btn>
                    </div>
                </div>
                <!-- Edit mode -->
                <div v-if="editingCommentId === comment.id" class="edit-comment relative">
                    <MyRichText
                        v-model="editCommentContent"
                        :height="'80px'"
                        density="compact"
                        @keydown.enter.exact.prevent="saveCommentEditAsync"
                        @keydown.escape="cancelCommentEdit"
                        placeholder="Write a comment"
                    />
                    <div class="edit-actions">
                        <MyButton @click="cancelCommentEdit" btn-class="px-2 custom-button" secondary>Cancel</MyButton>
                        <MyButton @click="saveCommentEditAsync" btn-class="px-2 custom-button" :disabled="!hasChanges">Save</MyButton>
                    </div>
                </div>
                <!-- Display mode -->
                <div v-else class="comment-content" v-html="processCommentHtml(comment.description)"></div>
            </div>
        </div>

        <!-- No comments message -->
        <div v-else class="no-comments">No comments yet.</div>
    </MyCard>
</template>

<script setup lang="ts">
import MyAlerts from "@/plugins/my-alerts";
import { addComment, deleteComment, getCommentsByAssociatedId, getUser, updateComment } from "@/services/firestore";
import { useAuthStore } from "@/stores/auth";
import { useLoadingStore } from "@/stores/loading";
import type { Comment } from "@/types";
import { formatISODate, formatRelativeDate } from "@/utils/dateUtils";

interface Props {
    associatedId: string;
    associatedType: "task" | "item";
}

interface Emits {
    (e: "comment-added", comment: Comment): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const authStore = useAuthStore();
const loadingStore = useLoadingStore();
const newCommentContent = ref("");
const authorNames = ref<Record<string, string>>({});
const comments = ref<Comment[]>([]);
const editingCommentId = ref<string | null>(null);
const editCommentContent = ref("");
const originalContent = ref("");

// Colores para autores: celeste claro y verde claro
const AUTHOR_COLORS = ["#33c7ffaa", "#3a9962aa"];

const getAuthorColor = (userId: string): string => {
    const index = userId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % AUTHOR_COLORS.length;
    return AUTHOR_COLORS[index]!;
};

const sortedComments = computed(() => {
    const commentsList = [...comments.value];
    // Ordenar por fecha descendente (más recientes primero)
    return commentsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
});

const hasChanges = computed(() => editCommentContent.value.trim() !== originalContent.value.trim());

const processCommentHtml = (html: string): string => {
    // Reemplazar todas las etiquetas <img> con links
    return html.replace(/<img[^>]*src="([^"]*)"[^>]*>/g, (match, src) => {
        return `<a href="${src}" target="_blank" rel="noopener noreferrer" style="color: #5aa7ff; text-decoration: underline; font-family: monospace; font-size: 0.9em;">${src}</a>`;
    });
};

// Función para agregar comentario al inicio de la lista
const addCommentToStart = async (comment: Comment) => {
    loadingStore.setLoading(true);
    try {
        comments.value.unshift(comment);
        // Cargar el nombre del autor para este comentario específico
        if (comment.userId && !authorNames.value[comment.userId]) {
            try {
                const user = await getUser(comment.userId);
                authorNames.value[comment.userId] = user ? `${user.name} ${user.lastName}` : "Unknown User";
            } catch (error) {
                console.warn(`Error getting author name for ${comment.userId}:`, error);
                authorNames.value[comment.userId] = "Unknown User";
            }
        }
        // Emitir evento para que el padre actualice su estado
        emit("comment-added", comment);
    } finally {
        loadingStore.setLoading(false);
    }
};

// Load comments from Firestore
const loadComments = async () => {
    loadingStore.setLoading(true);
    try {
        const fetchedComments = await getCommentsByAssociatedId(props.associatedId);
        comments.value = fetchedComments;
        if (fetchedComments.length > 0) {
            await loadAuthorNames();
        }
    } catch (error) {
        console.error("Error loading comments:", error);
    } finally {
        loadingStore.setLoading(false);
    }
};

// Load author names for all comments
const loadAuthorNames = async () => {
    loadingStore.setLoading(true);
    try {
        const uniqueAuthorIds = Array.from(new Set(comments.value.map((c) => c.userId)));
        const names: Record<string, string> = {};

        for (const authorId of uniqueAuthorIds) {
            if (authorId) {
                try {
                    const user = await getUser(authorId);
                    names[authorId] = user ? `${user.name} ${user.lastName}` : "Unknown User";
                } catch (error) {
                    console.warn(`Error getting author name for ${authorId}:`, error);
                    names[authorId] = "Unknown User";
                }
            }
        }

        authorNames.value = names;
    } finally {
        loadingStore.setLoading(false);
    }
};

// Watch for changes in associatedId to reload comments
watch(
    () => props.associatedId,
    async (newAssociatedId) => {
        if (newAssociatedId) {
            loadingStore.setLoading(true);
            try {
                await loadComments();
            } finally {
                loadingStore.setLoading(false);
            }
        }
    },
    { immediate: true },
);

const addCommentAsync = async () => {
    if (newCommentContent.value.trim()) {
        loadingStore.setLoading(true);
        try {
            const description = newCommentContent.value.trim();
            const now = new Date();
            const newCommentData = {
                associatedId: props.associatedId,
                associatedType: props.associatedType,
                userId: authStore.user?.id || "",
                createdAt: now,
                updatedAt: now,
                description,
            };

            // Guardar directamente en Firestore usando la nueva función
            const commentId = await addComment(newCommentData);
            const newComment: Comment = {
                id: commentId,
                ...newCommentData,
            };

            // Agregar al inicio de la lista para que aparezca primero
            await addCommentToStart(newComment);
            newCommentContent.value = "";
        } catch (error) {
            console.error("Error adding comment:", error);
        } finally {
            loadingStore.setLoading(false);
        }
    }
};

const startEditComment = (comment: Comment) => {
    editingCommentId.value = comment.id;
    editCommentContent.value = comment.description;
    originalContent.value = comment.description;
};

const cancelCommentEdit = () => {
    editingCommentId.value = null;
    editCommentContent.value = "";
    originalContent.value = "";
};

const saveCommentEditAsync = async () => {
    if (!editingCommentId.value || !editCommentContent.value.trim()) return;

    loadingStore.setLoading(true);
    try {
        await updateComment(editingCommentId.value, {
            description: editCommentContent.value.trim(),
            updatedAt: new Date(),
        });

        // Update local comment
        const commentIndex = comments.value.findIndex((c) => c.id === editingCommentId.value);
        if (commentIndex !== -1) {
            comments.value[commentIndex]!.description = editCommentContent.value.trim();
            comments.value[commentIndex]!.updatedAt = new Date();
        }

        editingCommentId.value = null;
        editCommentContent.value = "";
        originalContent.value = "";
    } catch (error) {
        console.error("Error updating comment:", error);
    } finally {
        loadingStore.setLoading(false);
    }
};

const deleteCommentAsync = async (commentId: string) => {
    const confirmed = await MyAlerts.confirmAsync("Eliminar comentario", "¿Estás seguro de que quieres eliminar este comentario?", "warning");
    if (!confirmed) return;

    loadingStore.setLoading(true);
    try {
        await deleteComment(commentId);
        // Remove from local list
        comments.value = comments.value.filter((c) => c.id !== commentId);
    } catch (error) {
        console.error("Error deleting comment:", error);
    } finally {
        loadingStore.setLoading(false);
    }
};

// Warn about pending comments before unmounting
onBeforeUnmount(async () => {
    if (newCommentContent.value.trim()) {
        const confirmed = await MyAlerts.confirmAsync(
            "Comentario pendiente",
            "Tienes un comentario sin guardar. ¿Quieres guardarlo antes de continuar?",
            "warning",
        );
        if (confirmed) {
            await addCommentAsync();
        }
    }
});
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
    font-size: 1rem;
}

.add-comment {
    margin-bottom: 20px;
}

.add-comment-actions {
    position: absolute;
    right: 0;
    bottom: 0;
    text-align: right;
}
.custom-button {
    padding: 2px 5px !important;
    height: 30px !important;
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

.comment-actions {
    display: flex;
    gap: 4px;
}

.edit-comment {
    margin-top: 8px;
}

.edit-actions {
    position: absolute;
    right: 0;
    bottom: 0;
    // margin-top: 8px;
    display: flex;
    gap: 20px;
    justify-content: flex-end;
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

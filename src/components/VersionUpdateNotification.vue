<template>
    <teleport to="body">
        <div v-if="visible" class="version-update-notification" role="alert" aria-live="polite">
            <div class="notification-content">
                <div class="icon">
                    <v-icon size="24" color="primary">mdi-update</v-icon>
                </div>
                <div class="text-content">
                    <div class="title">Aplicación actualizada ✨</div>
                    <div class="message">Estás usando la versión {{ version }}</div>
                </div>
                <button class="close-btn" @click="dismiss" aria-label="Cerrar notificación">
                    <v-icon size="20" color="primary">mdi-close</v-icon>
                </button>
            </div>
        </div>
    </teleport>
</template>

<script setup lang="ts">
import { dismissVersionUpdateNotification, versionUpdateState } from "@/plugins/pwa-updater";
import { computed } from "vue";

const visible = computed(() => versionUpdateState.visible);
const version = computed(() => versionUpdateState.version);
const dismiss = () => {
    dismissVersionUpdateNotification();
};
</script>

<style scoped lang="scss">
.version-update-notification {
    position: fixed;
    right: 12px;
    bottom: 12px;
    z-index: 9999;
    max-width: 360px;
    min-width: 280px;
}

.notification-content {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(20, 22, 25, 0.96);
    color: #fff;
    border: 1px solid rgba($primary, 0.12);
    border-radius: 14px;
    padding: 12px 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(8px);
}

.icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: rgba($primary, 0.2);
    border-radius: 8px;
}

.text-content {
    flex: 1;
    min-width: 0;
}

.title {
    font-weight: 600;
    font-size: 0.95rem;
    line-height: 1.2;
    color: $primary;
    margin-bottom: 2px;
}

.message {
    font-size: 0.85rem;
    line-height: 1.3;
    color: rgba($primary, 0.8);
    word-break: break-word;
}

.close-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: rgba($primary, 0.1);
    border: 1px solid rgba($primary, 0.2);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-left: 8px;

    &:hover {
        background: rgba($primary, 0.2);
        transform: scale(1.05);
    }

    &:active {
        transform: scale(0.95);
    }
}

/* Mobile responsive */
@media (max-width: $mobile-resolution) {
    .version-update-notification {
        right: 8px;
        left: 8px;
        bottom: 8px;
        max-width: none;
    }

    .notification-content {
        padding: 10px 14px;
        gap: 10px;
    }

    .icon {
        width: 28px;
        height: 28px;
    }

    .title {
        font-size: 0.9rem;
    }

    .message {
        font-size: 0.8rem;
    }

    .close-btn {
        width: 24px;
        height: 24px;
        margin-left: 4px;
    }
}

/* Animation */
.version-update-notification {
    animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }

    to {
        transform: translateX(0);
        opacity: 1;
    }
}
</style>

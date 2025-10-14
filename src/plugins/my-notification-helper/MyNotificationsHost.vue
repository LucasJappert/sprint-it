<template>
    <teleport to="body">
        <div class="my-notify__container" role="region" aria-live="polite" aria-atomic="false">
            <div
                v-for="n in state.items"
                :key="n.id"
                class="my-notify__item"
                :class="`my-notify__item--${n.variant}`"
                role="status"
                @click="onClick(n.id)"
                @mouseenter="onEnter(n.id)"
                @mouseleave="onLeave(n.id)"
            >
                <div class="flex-center justify-start">
                    <div class="ico" aria-hidden="true" :class="`ico--${n.variant}`">
                        <v-icon :size="20">{{ iconName(n.variant) }}</v-icon>
                    </div>
                    <div class="ml-2">
                        <div v-if="n.title" class="my-notify__title">{{ n.title }}</div>
                        <div class="my-notify__msg" v-html="n.message"></div>
                    </div>
                </div>

                <div v-if="n.actions && n.actions.length" class="my-notify__actions">
                    <button v-for="action in n.actions" :key="action.label" @click="handleAction(action, n.id)" class="my-notify__action-btn">
                        {{ action.label }}
                    </button>
                </div>

                <div v-if="n.durationMs > 0" class="my-notify__progress" aria-hidden="true">
                    <div class="my-notify__bar" :style="{ transform: `scaleX(${Math.max(0, Math.min(1, n.progress))})` }" />
                </div>
            </div>
        </div>
    </teleport>
</template>

<script setup lang="ts">
import type { NotifyVariant } from "./my-notification-helper";
import { dismiss, pause, resume, notificationsState as state } from "./my-notification-helper";

const ICONS: Record<NotifyVariant, string> = {
    ok: "mdi-check-circle-outline",
    error: "mdi-close-circle-outline",
    warning: "mdi-alert",
    info: "mdi-help-circle",
};

const iconName = (v: NotifyVariant) => ICONS[v];

const onClick = (id: number) => dismiss(id);
const onEnter = (id: number) => pause(id);
const onLeave = (id: number) => resume(id);

const handleAction = (action: { label: string; action: () => void }, id: number) => {
    action.action();
    dismiss(id);
};
</script>

<style scoped lang="scss">
@import "@/styles/variables.scss";
.my-notify__container {
    position: fixed;
    right: 12px;
    bottom: 12px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: flex-end; /* apila desde abajo */
    gap: 8px;
    pointer-events: none; /* deja pasar clicks salvo en items */
}

.my-notify__item {
    pointer-events: auto;
    min-width: 280px;
    max-width: 360px;
    background: rgba(20, 22, 25, 0.96);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    padding: 10px 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    display: flex;
    flex-direction: column;
    gap: 8px;
    cursor: pointer;
    transition: transform 140ms ease, opacity 140ms ease, border-color 140ms ease, background-color 140ms ease;
    will-change: transform, opacity;
}

.my-notify__item:hover {
    transform: translateY(-2px);
}

/* El ícono toma el color de la variante vía --notify-color */
.ico {
    color: var(--notify-color, currentColor);
}
.ico :deep(.v-icon) {
    line-height: 1;
} /* opcional: alinear mejor */

/* Título y cuerpo coloreados por la variante */
.my-notify__title {
    color: var(--notify-color, currentColor);
    font-weight: 700;
    font-size: 0.95rem;
    line-height: 1.2;
}
.my-notify__msg {
    color: var(--notify-color, currentColor);
    opacity: 0.95;
    font-size: 0.9rem;
    line-height: 1.35;
    word-break: break-word;
}

.my-notify__actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
}

.my-notify__action-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #fff;
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: background-color 140ms ease;
}

.my-notify__action-btn:hover {
    background: rgba(255, 255, 255, 0.2);
}

/* Barra de progreso */
.my-notify__progress {
    height: 3px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.12);
    overflow: hidden;
}
.my-notify__bar {
    height: 100%;
    width: 100%;
    transform-origin: left center;
    transition: transform 100ms linear;
    background: var(--notify-color);
}

/* === Variantes: definen el color y el borde =============================== */
/* Tip: si querés además un fondo sutil por variante, podés añadir
   background-color: rgba($token, 0.08) aquí mismo. */

.my-notify__item--ok {
    --notify-color: #{$primary};
    border-color: rgba($primary, 0.35);
}
.my-notify__item--error {
    --notify-color: #{$error};
    border-color: rgba($error, 0.35);
}
.my-notify__item--warning {
    --notify-color: #{$warning};
    border-color: rgba($warning, 0.45);
}
.my-notify__item--info {
    --notify-color: #{$info};
    border-color: rgba($info, 0.35);
}

/* === Mobile =============================================================== */
@media (max-width: 600px) {
    .my-notify__container {
        left: 8px;
        right: 8px;
        bottom: 8px;
        align-items: stretch;
    }
    .my-notify__item {
        max-width: none;
        width: 100%;
    }
}

/* === (Opcional) Si preferís SOLO título+icono en color variante ========== */
//Descomentar y ajustar según gusto:
// .my-notify__msg,
// .my-notify__title {
//     color: rgba(255, 255, 255, 0.62);
// }
</style>

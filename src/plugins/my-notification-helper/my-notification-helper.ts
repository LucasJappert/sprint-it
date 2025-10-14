
import { nextTick, reactive } from "vue"; // 👈 importa reactive y nextTick
export type NotifyVariant = "ok" | "error" | "warning" | "info";

export interface NotifyOptions {
    title?: string;
    message: string;
    durationSec?: number; // 0 = persistente
    actions?: Array<{ label: string; action: () => void; }>;
}

type InternalItem = {
    id: number;
    variant: NotifyVariant;
    title?: string;
    message: string;
    durationMs: number;   // total
    remainingMs: number;  // restante (pausa/reanudar)
    progress: number;     // 1..0
    lastStartAt: number;  // timestamp al iniciar/reanudar
    paused: boolean;
    raf?: number;
    actions?: Array<{ label: string; action: () => void; }>;
};

let idSeq = 0;

export const notificationsState = reactive({
    items: [] as InternalItem[], // visibles
    queue: [] as InternalItem[], // en espera
});

const config = reactive({
    maxVisible: 5,
});

const now = () => performance.now();

/* ========================
   Temporizador
======================== */
const startTimer = (n: InternalItem): void => {
    // 1) Evitar múltiples loops
    if (n.raf) {
        cancelAnimationFrame(n.raf);
        n.raf = undefined;
    }

    if (n.durationMs <= 0) {
        n.progress = 1;
        n.paused = true;
        return;
    }

    n.paused = false;
    n.lastStartAt = now();

    const tick = () => {
        if (n.paused) return;

        const elapsed = now() - n.lastStartAt;
        const left = n.remainingMs - elapsed;

        // clamp progres 1..0
        const p = left <= 0 ? 0 : left / n.durationMs;
        n.progress = Math.max(0, Math.min(1, p));

        if (left <= 0) {
            dismiss(n.id);
            return;
        }

        n.raf = requestAnimationFrame(tick);
    };

    // 2) Primer frame: que pinte ya el progreso actual
    n.raf = requestAnimationFrame(tick);
};


const pauseTimer = (n: InternalItem) => {
    if (n.paused || n.durationMs <= 0) return;
    const elapsed = now() - n.lastStartAt;
    n.remainingMs = Math.max(0, n.remainingMs - elapsed);
    n.paused = true;
    if (n.raf) cancelAnimationFrame(n.raf);
    n.raf = undefined;
};

const resumeTimer = (n: InternalItem) => {
    if (!n.paused || n.durationMs <= 0) return;
    startTimer(n);
};

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        notificationsState.items.forEach(n => pauseTimer(n));
    } else {
        notificationsState.items.forEach(n => resumeTimer(n));
    }
});
/* ========================
   Cola y visibilidad
======================== */
const startTimerAfterPaint = (n: InternalItem) => {
    // Esperamos a que Vue actualice el DOM del host
    nextTick(() => {
        // Esperamos un frame de render del navegador
        requestAnimationFrame(() => {
            startTimer(n);
        });
    });
};
const showOrQueue = (item: InternalItem) => {
    if (notificationsState.items.length >= config.maxVisible) {
        notificationsState.queue.push(item);
        return;
    }
    notificationsState.items.push(item);
    startTimerAfterPaint(item); // 👈 en vez de startTimer(item)
};

const maybeDequeueNext = () => {
    if (!notificationsState.queue.length) return;
    if (notificationsState.items.length >= config.maxVisible) return;
    const next = notificationsState.queue.shift()!;
    notificationsState.items.push(next);
    startTimerAfterPaint(next); // 👈 idem
};

/* ========================
   API interna
======================== */
const push = (variant: NotifyVariant, opts: NotifyOptions) => {
    const durationMs = Math.max(0, Math.round((opts.durationSec ?? 4) * 1000));

    // 👇 volvemos reactivo el item desde el minuto cero
    const item = reactive<InternalItem>({
        id: ++idSeq,
        variant,
        title: opts.title,
        message: opts.message,
        durationMs,
        remainingMs: durationMs,
        progress: 1,
        lastStartAt: now(),
        paused: false,
        actions: opts.actions,
    });

    showOrQueue(item);
    return item.id;
};

/* ========================
   API pública
======================== */
export const dismiss = (id: number) => {
    let idx = notificationsState.items.findIndex(n => n.id === id);
    if (idx !== -1) {
        const it = notificationsState.items[idx];
        if (it.raf) cancelAnimationFrame(it.raf);
        notificationsState.items.splice(idx, 1);
        maybeDequeueNext();
        return;
    }
    idx = notificationsState.queue.findIndex(n => n.id === id);
    if (idx !== -1) notificationsState.queue.splice(idx, 1);
};

export const dismissAll = () => {
    notificationsState.items.forEach(n => n.raf && cancelAnimationFrame(n.raf));
    notificationsState.items.splice(0);
    notificationsState.queue.splice(0);
};

export const pause = (id: number) => {
    const it = notificationsState.items.find(n => n.id === id);
    if (it) pauseTimer(it);
};

export const resume = (id: number) => {
    const it = notificationsState.items.find(n => n.id === id);
    if (it) resumeTimer(it);
};

export const notifyOk = (title: string, body: string = "", durationSec: number = 10, actions?: Array<{ label: string; action: () => void; }>) => push("ok", { title, message: body, durationSec, actions });
export const notifyError = (title: string, body: string = "", durationSec: number = 20, actions?: Array<{ label: string; action: () => void; }>) => push("error", { title, message: body, durationSec, actions });
export const notifyWarning = (title: string, body: string = "", durationSec: number = 10, actions?: Array<{ label: string; action: () => void; }>) => push("warning", { title, message: body, durationSec, actions });
export const notifyInfo = (title: string, body: string = "", durationSec: number = 10, actions?: Array<{ label: string; action: () => void; }>) => push("info", { title, message: body, durationSec, actions });

export const setNotificationsConfig = (opts: Partial<{ maxVisible: number; }>) => {
    if (typeof opts.maxVisible === "number" && opts.maxVisible > 0) {
        config.maxVisible = Math.floor(opts.maxVisible);
    }
};

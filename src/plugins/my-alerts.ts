import AppAlertDialog from "@/components/my-elements/MyAlertDialog.vue";
import type { App, AppContext } from "vue";
import { h, reactive, render } from "vue";

export type Icon = "success" | "info" | "warning" | "error" | "none";

export type AlertOptions = {
    title?: string;
    text?: string;
    html?: string;
    icon?: Icon;
    showCancel?: boolean;
    confirmText?: string;
    cancelText?: string;
    reverseButtons?: boolean;
    buttonClasses?: { confirm?: string; cancel?: string; };
    persistent?: boolean;
    maxWidth?: number | string;
    actionsClass?: string;
};

type Resolver = (val: boolean) => void;

const DEFAULTS: Required<Pick<
    AlertOptions,
    "title" | "icon" | "showCancel" | "confirmText" | "cancelText" | "reverseButtons" | "persistent" | "maxWidth"
>> = {
    title: "ATENCIÓN",
    icon: "info",
    showCancel: true,
    confirmText: "SI",
    cancelText: "NO",
    reverseButtons: true,
    persistent: true,
    maxWidth: 440
};

const state = reactive({
    open: false,
    opts: {} as AlertOptions,
    resolve: null as null | Resolver
});

let appContextRef: AppContext | null = null;
let hostEl: HTMLElement | null = null;
let mounted = false;

const queue: Array<{ opts: AlertOptions; resolve: Resolver; }> = [];

const mountHost = (): void => {
    if (mounted || typeof window === "undefined") return;
    if (!appContextRef) throw new Error("MyAlerts: plugin must be installed with app.use(MyAlerts) before use.");

    hostEl = document.createElement("div");
    document.body.appendChild(hostEl);

    const Host = {
        setup: () => () =>
            h(AppAlertDialog, {
                modelValue: state.open,
                "onUpdate:modelValue": (v: boolean) => (state.open = v),
                ...state.opts,
                onConfirm: () => state.resolve?.(true),
                onCancel: () => state.resolve?.(false)
            })
    };

    const vnode = h(Host);
    vnode.appContext = appContextRef;
    render(vnode, hostEl);
    mounted = true;
};

const flushNext = (): void => {
    if (state.open) return;
    const next = queue.shift();
    if (!next) return;

    state.opts = { ...DEFAULTS, ...next.opts };
    state.resolve = (v: boolean) => {
        state.open = false;
        next.resolve(v);
        requestAnimationFrame(() => flushNext());
    };

    requestAnimationFrame(() => (state.open = true));
};

const openDialog = (opts: AlertOptions): Promise<boolean> => {
    mountHost();
    return new Promise<boolean>((resolve) => {
        queue.push({ opts, resolve });
        flushNext();
    });
};

const confirmAsync = (title: string, html: string = "", icon: Icon = "info"): Promise<boolean> =>
    openDialog({
        title,
        html,
        icon,
        showCancel: true,
        confirmText: "SI",
        cancelText: "NO",
        reverseButtons: true,
        persistent: true
    });

const warmConfirmAsync = (html: string): Promise<boolean> =>
    confirmAsync("ATENCIÓN", html, "warning");

const okMessageAsync = (title: string, text: string = "", html: string = ""): Promise<void> =>
    openDialog({
        title,
        text,
        html,
        icon: "success",
        showCancel: false,
        confirmText: "Ok",
        reverseButtons: false,
        persistent: true
    }).then(() => undefined);

const infoMessageAsync = (title: string, text: string = "", html: string = ""): Promise<void> =>
    openDialog({
        title,
        text,
        html,
        icon: "info",
        showCancel: false,
        confirmText: "Ok",
        reverseButtons: false,
        persistent: true
    }).then(() => undefined);

const okCancelMessageAsync = (title: string, message: string): Promise<boolean> =>
    openDialog({
        title,
        text: message,
        icon: "info",
        showCancel: true,
        confirmText: "SI",
        cancelText: "NO",
        reverseButtons: true,
        persistent: true
    });

const closeCurrent = (confirmed = false): Promise<void> => {
    if (state.resolve) state.resolve(confirmed);
    else state.open = false;
    return Promise.resolve();
};

type MyAlertsApi = {
    install: (app: App) => void;
    openDialog: (opts: AlertOptions) => Promise<boolean>;
    closeCurrent: (confirmed?: boolean) => Promise<void>;
    confirmAsync: (title: string, html?: string, icon?: Icon) => Promise<boolean>;
    warmConfirmAsync: (html: string) => Promise<boolean>;
    okMessageAsync: (title: string, text?: string, html?: string) => Promise<void>;
    infoMessageAsync: (title: string, text?: string, html?: string) => Promise<void>;
    okCancelMessageAsync: (title: string, message: string) => Promise<boolean>;
};

const MyAlerts: MyAlertsApi = {
    install: (app: App): void => {
        appContextRef = app._context;
        mountHost();
        (app.config.globalProperties as any).$alerts = MyAlerts;
    },
    openDialog,
    closeCurrent,
    confirmAsync,
    warmConfirmAsync,
    okMessageAsync,
    infoMessageAsync,
    okCancelMessageAsync
};

export default MyAlerts;

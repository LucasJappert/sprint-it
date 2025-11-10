<template>
    <teleport to="body">
        <!-- Android/PC PWA install button -->
        <div v-if="(isAndroid || isPC) && shouldShow" class="pwa-install-button" role="button" aria-label="Install App">
            <button class="install-btn" @click="installPwa" aria-label="Install PWA">
                <v-icon size="20" color="primary">mdi-download</v-icon>
                <span class="install-text">Install App</span>
            </button>
            <button class="close-btn" @click="dismissForWeek" aria-label="Close and don't show for a week">
                <v-icon size="16" color="primary">mdi-close</v-icon>
            </button>
        </div>

        <!-- iOS installation instructions -->
        <div v-if="isIOS && shouldShowIOSInstructions" class="ios-install-instructions" role="dialog" aria-label="Instructions to install on iPhone">
            <div class="instructions-content">
                <div class="instructions-header">
                    <span class="instructions-title">Install App</span>
                    <button class="close-btn" @click="dismissIOSForWeek" aria-label="Close and don't show for a week">
                        <v-icon size="16" color="primary">mdi-close</v-icon>
                    </button>
                </div>
                <div class="instructions-note">
                    <small>Note: This feature is only available in Safari</small>
                </div>
                <hr class="mt-2" />
                <div class="instructions-steps mt-2">
                    <div class="step">
                        <span class="step-number">1</span>
                        <span>Open this page in <strong>Safari</strong></span>
                    </div>
                    <div class="step">
                        <span class="step-number">2</span>
                        <span>Tap the <strong>Share</strong> button</span>
                    </div>
                    <div class="step">
                        <span class="step-number">3</span>
                        <span>Select <strong>"Add to Home Screen"</strong></span>
                    </div>
                </div>
                <button class="dismiss-btn mt-2" @click="dismissIOSInstructions" aria-label="Understood, close instructions">Understood</button>
            </div>
        </div>
    </teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: "accepted" | "dismissed";
        platform: string;
    }>;
    prompt(): Promise<void>;
}

const PWA_INSTALL_DISMISSED_KEY = "sprint-it:pwa:install-dismissed-timestamp";
const IOS_INSTRUCTIONS_DISMISSED_KEY = "sprint-it:pwa:ios-instructions-dismissed";

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
const isDismissed = ref(false);
const iosInstructionsDismissed = ref(false);
const iosInstructionsDismissedTimestamp = ref(localStorage.getItem(IOS_INSTRUCTIONS_DISMISSED_KEY));

// Detect device type
const isIOS = computed(() => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
});
console.log("isIOS:", isIOS.value);

const isAndroid = computed(() => {
    return /Android/.test(navigator.userAgent);
});
console.log("isAndroid:", isAndroid.value);

const isPC = computed(() => {
    return !isIOS.value && !isAndroid.value;
});
console.log("isPC:", isPC.value);

const isSafari = computed(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isSafariBrowser = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|OPiOS|mercury/.test(ua);

    // On iOS, only Safari can add to home screen
    return isIOS ? isSafariBrowser : false;
});
console.log("isSafari:", isSafari.value, "userAgent:", navigator.userAgent);

const isStandalone = computed(() => {
    return (window.navigator as any).standalone === true;
});
console.log("isStandalone:", isStandalone.value);

const shouldShow = computed(() => {
    console.log("shouldShow - deferredPrompt:", deferredPrompt.value, "isDismissed:", isDismissed.value, "isAndroid:", isAndroid.value, "isPC:", isPC.value);
    if (!deferredPrompt.value || isDismissed.value) return false;

    // Only show for Android or PC
    if (!isAndroid.value && !isPC.value) return false;

    const dismissedTimestamp = localStorage.getItem(PWA_INSTALL_DISMISSED_KEY);
    if (!dismissedTimestamp) return true;

    const dismissedTime = parseInt(dismissedTimestamp, 10);
    const now = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

    const shouldShowResult = now - dismissedTime > oneWeekMs;
    console.log("shouldShow result:", shouldShowResult, "dismissedTime:", dismissedTime, "now:", now, "diff:", now - dismissedTime);
    return shouldShowResult;
});

const shouldShowIOSInstructions = computed(() => {
    console.log(
        "shouldShowIOSInstructions - isIOS:",
        isIOS.value,
        "isSafari:",
        isSafari.value,
        "isStandalone:",
        isStandalone.value,
        "iosInstructionsDismissed:",
        iosInstructionsDismissed.value,
        "iosInstructionsDismissedTimestamp:",
        iosInstructionsDismissedTimestamp.value,
    );
    if (!isIOS.value || iosInstructionsDismissed.value) return false;

    // Only show for iOS Safari, not when in standalone mode
    if (!isSafari.value || isStandalone.value) return false;

    const dismissedValue = iosInstructionsDismissedTimestamp.value;
    if (!dismissedValue) return true;

    if (dismissedValue === "dismissed") return false;

    const dismissedTime = parseInt(dismissedValue, 10);
    const now = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

    const shouldShowIOSResult = now - dismissedTime > oneWeekMs;
    console.log(
        "shouldShowIOSInstructions result:",
        shouldShowIOSResult,
        "dismissedValue:",
        dismissedValue,
        "dismissedTime:",
        dismissedTime,
        "now:",
        now,
        "diff:",
        now - dismissedTime,
    );
    return shouldShowIOSResult;
});

const installPwa = async () => {
    console.log("installPwa called, deferredPrompt:", deferredPrompt.value);
    if (!deferredPrompt.value) return;

    deferredPrompt.value.prompt();
    const { outcome } = await deferredPrompt.value.userChoice;

    if (outcome === "accepted") {
        console.log("User accepted to install the PWA");
        deferredPrompt.value = null; // Hide after installation
    } else {
        console.log("User rejected to install the PWA");
    }

    deferredPrompt.value = null;
};

const dismissForWeek = () => {
    console.log("dismissForWeek called");
    isDismissed.value = true;
    localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, Date.now().toString());
};

const dismissIOSForWeek = () => {
    console.log("dismissIOSForWeek called");
    const timestamp = Date.now().toString();
    localStorage.setItem(IOS_INSTRUCTIONS_DISMISSED_KEY, timestamp);
    iosInstructionsDismissedTimestamp.value = timestamp;
};

const dismissIOSInstructions = () => {
    console.log("dismissIOSInstructions called");
    iosInstructionsDismissed.value = true;
    localStorage.setItem(IOS_INSTRUCTIONS_DISMISSED_KEY, "dismissed");
    iosInstructionsDismissedTimestamp.value = "dismissed";
};

onMounted(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
        const promptEvent = e as BeforeInstallPromptEvent;
        promptEvent.preventDefault();
        deferredPrompt.value = promptEvent;
    };

    const handleAppInstalled = () => {
        console.log("handleAppInstalled called - PWA installed");
        deferredPrompt.value = null;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Cleanup
    return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("appinstalled", handleAppInstalled);
    };
});
</script>

<style scoped lang="scss">
.pwa-install-button {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 9998;
    display: flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border-radius: 12px;
    padding: 8px 12px;
}

.install-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: $bg-primary;
    border: 1px solid rgba($primary, 0.2);
    color: $primary;
    border-radius: 8px;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s ease;

    &:hover {
        background: $primary;
        transform: scale(1.02);
    }

    &:active {
        transform: scale(0.98);
    }
}

.install-text {
    white-space: nowrap;
}

.close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: $bg-primary;
    border: 1px solid rgba($primary, 0.2);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: rgba($primary, 0.2);
        transform: scale(1.05);
    }

    &:active {
        transform: scale(0.95);
    }
}

/* Mobile responsive */
@media (max-width: 600px) {
    .pwa-install-button {
        right: 12px;
        bottom: 12px;
        padding: 6px 10px;
        gap: 6px;
    }

    .install-btn {
        padding: 6px 10px;
        font-size: 0.8rem;
        gap: 6px;
    }

    .install-text {
        font-size: 0.8rem;
    }

    .close-btn {
        width: 20px;
        height: 20px;
    }
}

.ios-install-instructions {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 9998;
    max-width: 320px;
    min-width: 280px;
}

.instructions-content {
    display: flex;
    flex-direction: column;
    background: rgba(20, 22, 25, 0.96);
    color: #fff;
    border: 1px solid rgba($primary, 0.12);
    border-radius: 14px;
    padding: 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(8px);
    animation: slideIn 0.3s ease-out;
}

.instructions-note {
    font-size: 0.75rem;
    color: $primary;
}

.instructions-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.instructions-title {
    font-weight: 600;
    font-size: 1rem;
    color: $primary;
}

.instructions-steps {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.step {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;
    line-height: 1.4;
}

.step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: #ffffff20;
    color: white;
    border-radius: 50%;
    font-size: 0.75rem;
    font-weight: 600;
    flex-shrink: 0;
}

.dismiss-btn {
    align-self: flex-end;
    background: $bg-primary;
    color: $primary;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s ease;

    &:hover {
        background: #1565c0;
        transform: scale(1.02);
    }

    &:active {
        transform: scale(0.98);
    }
}

/* Mobile responsive for iOS instructions */
@media (max-width: 600px) {
    .ios-install-instructions {
        right: 12px;
        left: 12px;
        bottom: 12px;
        max-width: none;
    }

    .instructions-content {
        padding: 14px;
    }

    .instructions-note {
        font-size: 0.7rem;
    }

    .instructions-title {
        font-size: 0.9rem;
    }

    .step {
        font-size: 0.8rem;
    }
}

@keyframes slideIn {
    from {
        transform: translateY(100%);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}
</style>

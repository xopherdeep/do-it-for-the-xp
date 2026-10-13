/**
 * "Install App" for the web build. Browsers install a web app in three different ways, and only the Chrome
 * family lets the page start it: Chrome, Edge and Android fire `beforeinstallprompt`, which we keep and show
 * from the side menu. Safari has no such event; on an iPhone or iPad the hero installs through Share, then
 * Add to Home Screen, and on a Mac (Safari 17+) through File, then Add to Dock, so the menu shows those steps
 * instead. Once the game runs installed (or inside the packaged app) the entry goes away.
 *
 * startInstallWatch() must run at startup: Chrome fires its prompt early, often before the side menu exists.
 */
import { reactive } from "vue";
import { isNativeApp } from "@/lib/services/notifications/alertBridge";

/** How this browser installs the game: the menu entry shows for "prompt", "ios" and "mac-safari" */
export type InstallRoute = "installed" | "prompt" | "ios" | "mac-safari" | "unsupported";
export type InstallOutcome = "accepted" | "dismissed" | "unavailable";

export interface InstallEnv {
  /** Running as an installed app (display-mode standalone, or iOS's navigator.standalone) */
  standalone: boolean;
  /** Inside the packaged Capacitor app */
  native: boolean;
  /** Chrome, Edge or Android handed us an install prompt */
  hasPrompt: boolean;
  userAgent: string;
  maxTouchPoints: number;
}

/** Chrome's install prompt event; not in TypeScript's DOM types */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

// Add to Dock arrived with Safari 17 on macOS Sonoma
const MAC_SAFARI_MIN_VERSION = 17;

const isAppleMobile = (userAgent: string, maxTouchPoints: number): boolean => {
  const isPhoneOrPad = /iPhone|iPad|iPod/.test(userAgent);
  // iPadOS asks for the desktop site by default and reports a Mac; a Mac has no touch screen
  const isPadInDesktopMode = /Macintosh/.test(userAgent) && maxTouchPoints > 1;
  return isPhoneOrPad || isPadInDesktopMode;
};

const macSafariVersion = (userAgent: string): number | null => {
  const isOtherBrowser = /Chrome|Chromium|CriOS|Edg|Firefox|FxiOS|OPR/.test(userAgent);
  const version = /Macintosh.*Version\/(\d+).*Safari/.exec(userAgent);
  return !isOtherBrowser && version ? Number(version[1]) : null;
};

export const installRoute = (env: InstallEnv): InstallRoute => {
  if (env.standalone || env.native) return "installed";
  if (env.hasPrompt) return "prompt";
  if (isAppleMobile(env.userAgent, env.maxTouchPoints)) return "ios";
  const safari = macSafariVersion(env.userAgent);
  if (safari !== null && safari >= MAC_SAFARI_MIN_VERSION) return "mac-safari";
  return "unsupported";
};

/** The steps for a browser that installs through its own menus (Ionic alerts render this HTML) */
export const installSteps = (route: InstallRoute): { header: string; message: string } | null => {
  const step = (icon: string, text: string): string => `<p><i class="fal ${icon}"></i>&nbsp; ${text}</p>`;
  if (route === "ios") {
    return {
      header: "Install the App",
      message:
        step("fa-share-square", "Tap <b>Share</b> in the browser bar") +
        step("fa-plus-square", "Choose <b>Add to Home Screen</b>") +
        "<p>The game then opens full screen from its own icon.</p>",
    };
  }
  if (route === "mac-safari") {
    return {
      header: "Install the App",
      message:
        step("fa-bars", "Open Safari's <b>File</b> menu") +
        step("fa-plus-square", "Choose <b>Add to Dock</b>") +
        "<p>The game then opens in its own window from the Dock.</p>",
    };
  }
  return null;
};

export const installState = reactive({ route: "unsupported" as InstallRoute });

let deferredPrompt: InstallPromptEvent | null = null;
let installedNow = false;

const isStandalone = (): boolean => {
  const iosHomeScreen = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosHomeScreen || window.matchMedia("(display-mode: standalone)").matches;
};

const refresh = (): void => {
  installState.route = installRoute({
    standalone: installedNow || isStandalone(),
    native: isNativeApp(),
    hasPrompt: deferredPrompt !== null,
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
  });
};

export const startInstallWatch = (): void => {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Keep the prompt for the menu instead of letting the browser show its own mini banner
    event.preventDefault();
    deferredPrompt = event as InstallPromptEvent;
    refresh();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installedNow = true;
    refresh();
  });
  window.matchMedia("(display-mode: standalone)").addEventListener?.("change", refresh);
  refresh();
};

/** Shows Chrome's install dialog; a prompt works once, and the browser offers a fresh one later */
export const promptInstall = async (): Promise<InstallOutcome> => {
  const prompt = deferredPrompt;
  if (!prompt) return "unavailable";
  deferredPrompt = null;
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  refresh();
  return outcome;
};

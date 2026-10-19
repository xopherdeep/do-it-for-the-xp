/**
 * The app wake hook. The app shell (App.ts) rings it at three moments, and any module may register to hear them:
 *
 * - "start": the stores have loaded (the roster of heroes is in, the signed-in profile is restored);
 * - "login": a hero signed in or the profile switched (a sign out rings nobody);
 * - "resume": the app came back to the front (Capacitor's appStateChange on the phone, visibilitychange in a browser).
 *
 * The reminder scheduler (reminderScheduler.ts) is the first listener; a once-a-week job that must run "when the app
 * opens or comes back" (the bank interest payout) registers here too, with `onAppWake(hook)`. Hooks run one after
 * another and one that fails never stops the next. A hook registered after the start has passed can ask to be caught
 * up on it with `{ catchUp: true }`.
 */
import debug from "@/lib/utils/debug";
import { isNativeApp } from "./alertBridge";

export type AppWakeReason = "start" | "login" | "resume";

export interface AppWake {
  reason: AppWakeReason;
  now: Date;
}

export type AppWakeHook = (wake: AppWake) => void | Promise<void>;

const hooks = new Set<AppWakeHook>();
let hasStarted = false;

const callHook = async (hook: AppWakeHook, wake: AppWake): Promise<void> => {
  try {
    await hook(wake);
  } catch (error) {
    debug.warn(`[appWake] a ${wake.reason} hook failed`, error);
  }
};

/** Hear every wake. Returns the function that stops listening. Registering one hook twice calls it once. */
export const onAppWake = (hook: AppWakeHook, options: { catchUp?: boolean } = {}): (() => void) => {
  hooks.add(hook);
  const shouldCatchUp = options.catchUp === true && hasStarted;
  if (shouldCatchUp) void callHook(hook, { reason: "start", now: new Date() });
  return () => void hooks.delete(hook);
};

/** Ring the hooks. The app shell calls this; a "start" is remembered for the late ones that ask to catch up. */
export const runAppWake = async (reason: AppWakeReason, now: Date = new Date()): Promise<void> => {
  const isStart = reason === "start";
  if (isStart) hasStarted = true;
  for (const hook of [...hooks]) await callHook(hook, { reason, now });
};

interface ResumeDeps {
  isNative?: () => boolean;
  /** Listen to Capacitor's appStateChange; resolves with the function that removes the listener */
  addAppStateListener?: (onChange: (isActive: boolean) => void) => Promise<() => void>;
  doc?: Pick<Document, "addEventListener" | "removeEventListener" | "visibilityState">;
}

/** The phone's own App plugin, loaded by a plain dynamic import so the bare specifier is bundled (as battle.guard does). */
const addCapacitorAppState = async (onChange: (isActive: boolean) => void): Promise<() => void> => {
  const { App } = await import("@capacitor/app");
  const handle = await App.addListener("appStateChange", ({ isActive }) => onChange(isActive));
  return () => void handle.remove();
};

/**
 * Call `onResume` each time the app comes back to the front: through Capacitor in the packaged app (its webview
 * also fires visibilitychange, so the page's own event is left out there), through visibilitychange in a browser.
 * Returns the stop function. Nothing here throws.
 */
export const listenForResume = (onResume: () => void, deps: ResumeDeps = {}): (() => void) => {
  const isNative = (deps.isNative ?? isNativeApp)();
  if (isNative) {
    let stopped = false;
    let remove: (() => void) | null = null;
    const addListener = deps.addAppStateListener ?? addCapacitorAppState;
    addListener((isActive) => {
      if (isActive) onResume();
    })
      .then((removeListener) => {
        if (stopped) removeListener();
        else remove = removeListener;
      })
      .catch((error) => debug.warn("[appWake] resume alerts are unavailable", error));
    return () => {
      stopped = true;
      remove?.();
      remove = null;
    };
  }

  const doc = deps.doc ?? (typeof document === "undefined" ? undefined : document);
  if (!doc) return () => undefined;
  const onVisibility = () => {
    const isVisible = doc.visibilityState === "visible";
    if (isVisible) onResume();
  };
  doc.addEventListener("visibilitychange", onVisibility);
  return () => doc.removeEventListener("visibilitychange", onVisibility);
};

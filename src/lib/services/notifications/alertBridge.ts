/**
 * The alert bridge: the one way the game rings an OS alert ("a beast ambushed you!") while the hero is
 * away from the screen. Two backends sit behind the same calls. In the packaged app it is Capacitor's
 * LocalNotifications plugin, which can also book an alert for a later moment and works with the phone
 * asleep. In a browser it is the Notification API, shown through a tiny service worker (public/alerts-sw.js)
 * so a tap can bring the game tab back. A phone browser only alerts while its page is still alive; the
 * packaged app is what covers phones properly. Nothing here throws: the results say why nothing happened.
 */
import { Capacitor } from "@capacitor/core";
import debug from "@/lib/utils/debug";

export type AlertPermission = "granted" | "denied" | "prompt" | "unsupported";
/** What the hero answered when the game asked about battle alerts; "unasked" until they have */
export type AlertChoice = "on" | "off" | "unasked";

export interface HeroAlert {
  /** The same id replaces the alert that is still up (or booked) under it */
  id: number;
  title: string;
  body: string;
}

export interface AlertResult {
  shown: boolean;
  reason?: "unsupported" | "denied" | "web" | "failed";
}

/** The one OS alert for "a beast ambushed you": a fixed id so a newer ambush alert replaces the older one. */
export const AMBUSH_ALERT_ID = 7001;
/** The one OS alert for "a hero cast a Power": a fixed id so a newer cast alert replaces the older one. */
export const POWER_CAST_ALERT_ID = 7002;

/**
 * Where the worker sits: beside index.html, under the publicPath. Dev serves "/" with history routing (a bare
 * relative path would resolve under the current route); production is "./" with hash routing.
 */
const WORKER_PATH = `${process.env.BASE_URL ?? "./"}alerts-sw.js`;
/** How long to wait for the worker to take charge before the alert falls back to the plain constructor. */
const WORKER_READY_MS = 3000;
const CHOICE_KEY = "xp.battleAlerts";

/** True inside the packaged (Capacitor) app, false in a browser. Synchronous on purpose, see requestAlertPermission. */
export const isNativeApp = (): boolean => {
  try {
    return Boolean(Capacitor.isNativePlatform());
  } catch {
    return false;
  }
};

/**
 * The LocalNotifications plugin, or null when it cannot be loaded (a browser, or a device without it).
 * A plain dynamic import: the bare specifier has to be bundled to resolve inside the packaged app.
 */
export const loadLocalNotifications = async (): Promise<any | null> => {
  try {
    const mod = await import("@capacitor/local-notifications");
    return mod?.LocalNotifications ?? null;
  } catch {
    return null;
  }
};

/** The browser's Notification class, or null when the browser has none (older phones, some webviews). */
const webNotification = (): typeof Notification | null => (typeof Notification === "undefined" ? null : Notification);

/** The plugin's permission answer in the bridge's words. */
const nativePermissionOf = (display: unknown): AlertPermission => {
  const isGranted = display === "granted";
  if (isGranted) return "granted";
  const isDenied = display === "denied";
  if (isDenied) return "denied";
  const isAskable = display === "prompt" || display === "prompt-with-rationale";
  if (isAskable) return "prompt";
  return "unsupported";
};

/** The browser's permission answer in the bridge's words ("default" means nobody has asked yet). */
const webPermissionOf = (permission: unknown): AlertPermission => {
  const isGranted = permission === "granted";
  if (isGranted) return "granted";
  const isDenied = permission === "denied";
  if (isDenied) return "denied";
  const isUnasked = permission === "default";
  if (isUnasked) return "prompt";
  return "unsupported";
};

/** Whether the game may ring an alert right now, without asking. */
export const alertPermission = async (): Promise<AlertPermission> => {
  try {
    if (isNativeApp()) {
      const plugin = await loadLocalNotifications();
      if (!plugin) return "unsupported";
      return nativePermissionOf((await plugin.checkPermissions())?.display);
    }
    const web = webNotification();
    return web ? webPermissionOf(web.permission) : "unsupported";
  } catch {
    return "unsupported";
  }
};

// The registration promise is kept so the worker is registered once; a failure clears it so a later try can run.
let workerPromise: Promise<ServiceWorkerRegistration | null> | null = null;
// The registration once it is ready, so cancelAlert can close a shown alert without registering anything.
let workerReady: ServiceWorkerRegistration | null = null;
// An alert shown by the plain constructor (no worker), kept by id so cancelAlert can still close it.
const looseAlerts = new Map<number, Notification>();

const registerWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const isWorkerUnavailable = typeof window === "undefined" || !window.isSecureContext || !("serviceWorker" in navigator);
    if (isWorkerUnavailable) return null;
    await navigator.serviceWorker.register(WORKER_PATH);
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), WORKER_READY_MS);
    });
    const ready = await Promise.race([navigator.serviceWorker.ready, timeout]);
    workerReady = ready ?? null;
    return workerReady;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
};

/**
 * Browser only: register the alert worker (once) and wait a few seconds for it to take charge. Gives back the
 * registration, or null when the page cannot have a worker (not a secure context, no support, or it failed),
 * in which case a later call tries again. The packaged app has no use for it and gets null.
 */
export const prepareAlerts = async (): Promise<ServiceWorkerRegistration | null> => {
  try {
    if (isNativeApp()) return null;
    if (!workerPromise) {
      workerPromise = registerWorker().then((registration) => {
        if (!registration) workerPromise = null;
        return registration;
      });
    }
    return await workerPromise;
  } catch {
    workerPromise = null;
    return null;
  }
};

/**
 * Ask the hero's device for permission to ring alerts. Call it from a tap: on the web the prompt only opens
 * inside the user gesture, so the browser branch reaches Notification.requestPermission() before any await.
 */
export const requestAlertPermission = async (): Promise<AlertPermission> => {
  try {
    if (isNativeApp()) {
      const plugin = await loadLocalNotifications();
      if (!plugin) return "unsupported";
      return nativePermissionOf((await plugin.requestPermissions())?.display);
    }
    const web = webNotification();
    if (!web) return "unsupported";
    // Old Safari answers through a callback and returns nothing; its permission property is current by then.
    const answer = (await web.requestPermission()) ?? web.permission;
    const permission = webPermissionOf(answer);
    // Warm the worker now that alerts are allowed, so the first ambush alert does not wait for it.
    const isGranted = permission === "granted";
    if (isGranted) prepareAlerts().catch(() => undefined);
    return permission;
  } catch {
    return "unsupported";
  }
};

/**
 * Android 8+ drops a notification whose channel does not exist, so every path that schedules one creates the
 * channels first (creating an existing channel is a no-op).
 */
export const ensureAlertChannels = async (plugin: any): Promise<void> => {
  try {
    await plugin.createChannel({
      id: "battle-alerts",
      name: "Battle Alerts",
      description: "Ambush and battle alerts",
      importance: 4,
    });
    await plugin.createChannel({
      id: "chore-reminders",
      name: "Chore Reminders",
      description: "Upcoming chore deadlines",
      importance: 4,
    });
  } catch (error) {
    // the plugin lacks the method in mocks and on the web
    debug.warn("[alertBridge] could not create the alert channels", error);
  }
};

/** Book (or fire now, with no `at`) an alert in the packaged app; the same id replaces the one already booked. */
const bookNative = async (alert: HeroAlert, at?: Date): Promise<AlertResult> => {
  const plugin = await loadLocalNotifications();
  if (!plugin) return { shown: false, reason: "unsupported" };
  const isDenied = nativePermissionOf((await plugin.checkPermissions())?.display) !== "granted";
  if (isDenied) return { shown: false, reason: "denied" };
  await ensureAlertChannels(plugin);
  await plugin.schedule({
    notifications: [
      {
        id: alert.id,
        title: alert.title,
        body: alert.body,
        channelId: "battle-alerts",
        ...(at ? { schedule: { at, allowWhileIdle: true } } : {}),
        extra: { kind: "battle-alert" },
      },
    ],
  });
  return { shown: true };
};

/** Ring an alert now. In a browser it is shown through the worker when there is one, else by the plain constructor. */
export const showAlert = async (alert: HeroAlert): Promise<AlertResult> => {
  try {
    if (isNativeApp()) return await bookNative(alert);

    const web = webNotification();
    if (!web) return { shown: false, reason: "unsupported" };
    const isDenied = web.permission !== "granted";
    if (isDenied) return { shown: false, reason: "denied" };

    const registration = await prepareAlerts();
    if (registration) {
      try {
        // The tag makes a newer alert with this id replace the old one, and renotify makes it buzz again.
        await registration.showNotification(alert.title, {
          body: alert.body,
          tag: String(alert.id),
          renotify: true,
          data: { url: location.href },
        } as NotificationOptions);
        return { shown: true };
      } catch (error) {
        // fall through to the plain constructor
        debug.warn("[alertBridge] the worker could not show the alert", error);
      }
    }
    try {
      const loose = new web(alert.title, { body: alert.body, tag: String(alert.id) });
      loose.onclick = () => {
        window.focus();
        loose.close();
      };
      looseAlerts.set(alert.id, loose);
      return { shown: true };
    } catch {
      // Android Chrome forbids the constructor and wants a worker
      return { shown: false, reason: "failed" };
    }
  } catch {
    return { shown: false, reason: "failed" };
  }
};

/**
 * Book an alert for a later moment. Only the packaged app can: a web page cannot wake itself, so in a browser
 * the answer is "web" and the live tick rings the alert when the moment comes.
 */
export const scheduleAlert = async (alert: HeroAlert & { at: Date }): Promise<AlertResult> => {
  try {
    if (!isNativeApp()) return { shown: false, reason: "web" };
    return await bookNative(alert, alert.at);
  } catch {
    return { shown: false, reason: "failed" };
  }
};

/** Take an alert back, booked or already on screen (the hero came back before they read it). */
export const cancelAlert = async (id: number): Promise<void> => {
  try {
    if (isNativeApp()) {
      const plugin = await loadLocalNotifications();
      await plugin?.cancel({ notifications: [{ id }] });
      // One already rung stays in the tray until it is taken off too
      await plugin?.removeDeliveredNotifications?.({ notifications: [{ id, title: "", body: "" }] });
      return;
    }
    looseAlerts.get(id)?.close();
    looseAlerts.delete(id);
    // A registration from an earlier visit still holds this page's alerts, so look it up when this one has none.
    const registration = workerReady ?? (await navigator.serviceWorker?.getRegistration?.());
    const shown = (await registration?.getNotifications({ tag: String(id) })) ?? [];
    shown.forEach((notification) => notification.close());
  } catch (error) {
    // nothing to take back
    debug.warn("[alertBridge] could not take an alert back", error);
  }
};

/** What the hero chose about battle alerts, kept on this device. "unasked" until they have answered. */
export const battleAlertsChoice = (): AlertChoice => {
  try {
    const stored = localStorage.getItem(CHOICE_KEY);
    return stored === "on" || stored === "off" ? stored : "unasked";
  } catch {
    return "unasked";
  }
};

export const setBattleAlertsChoice = (choice: "on" | "off"): void => {
  try {
    localStorage.setItem(CHOICE_KEY, choice);
  } catch (error) {
    // private mode or blocked storage: the hero is simply asked again next time
    debug.warn("[alertBridge] could not keep the alerts choice", error);
  }
};

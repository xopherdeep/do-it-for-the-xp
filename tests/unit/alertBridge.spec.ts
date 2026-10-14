/**
 * The alert bridge: browser backend (Notification + alerts-sw.js) and Capacitor backend (LocalNotifications).
 * Each test loads a fresh copy of the module, because the worker registration is memoized inside it.
 */

// How the mocked Capacitor core and plugin behave in the current test (names start with "mock" for jest's hoisting)
const mockNative = { value: false, throws: false };
const mockPlugin: { mode: "ok" | "empty" | "throws"; current: any } = { mode: "ok", current: undefined };

jest.mock("@capacitor/core", () => ({
  __esModule: true,
  Capacitor: {
    isNativePlatform: () => {
      if (mockNative.throws) throw new Error("no bridge");
      return mockNative.value;
    },
  },
}));
jest.mock("@capacitor/local-notifications", () => ({
  __esModule: true,
  get LocalNotifications() {
    if (mockPlugin.mode === "throws") throw new Error("plugin not installed");
    return mockPlugin.mode === "empty" ? undefined : mockPlugin.current;
  },
}));

type Bridge = typeof import("@/lib/services/notifications/alertBridge");
const load = (): Promise<Bridge> => import("@/lib/services/notifications/alertBridge");

const ambush = { id: 7001, title: "A beast ambushes you!", body: "Come back and fight." };

/** Let queued promise callbacks run (fake timers do not flush them) */
const flush = async (): Promise<void> => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

const makePlugin = (display = "granted") => ({
  checkPermissions: jest.fn().mockResolvedValue({ display }),
  requestPermissions: jest.fn().mockResolvedValue({ display: "granted" }),
  schedule: jest.fn().mockResolvedValue(undefined),
  cancel: jest.fn().mockResolvedValue(undefined),
  removeDeliveredNotifications: jest.fn().mockResolvedValue(undefined),
});

/** A fake global Notification; `permission` is what the browser reports, `answer` what the prompt resolves to */
const installNotification = (permission: string, { answer = permission, constructorThrows = false } = {}) => {
  const shown: any[] = [];
  class FakeNotification {
    static permission = permission;
    static requestPermission = jest.fn(async () => answer);
    onclick: (() => void) | null = null;
    close = jest.fn();
    constructor(public title: string, public options: any) {
      if (constructorThrows) throw new TypeError("Illegal constructor");
      shown.push(this);
    }
  }
  (global as any).Notification = FakeNotification;
  return { FakeNotification, shown };
};

/** A fake navigator.serviceWorker whose ready promise resolves to the registration (or never, with `neverReady`) */
const installWorker = ({ neverReady = false, registerRejects = false } = {}) => {
  const registration = {
    showNotification: jest.fn().mockResolvedValue(undefined),
    getNotifications: jest.fn().mockResolvedValue([] as any[]),
  };
  const register = registerRejects ? jest.fn().mockRejectedValue(new Error("blocked")) : jest.fn().mockResolvedValue(registration);
  Object.defineProperty(navigator, "serviceWorker", {
    value: { register, ready: neverReady ? new Promise(() => undefined) : Promise.resolve(registration), getRegistration: jest.fn() },
    configurable: true,
  });
  return { registration, register };
};

const setSecureContext = (value: boolean) => Object.defineProperty(window, "isSecureContext", { value, configurable: true });

beforeEach(() => {
  jest.resetModules();
  mockNative.value = false;
  mockNative.throws = false;
  mockPlugin.mode = "ok";
  mockPlugin.current = makePlugin();
  delete (global as any).Notification;
  delete (navigator as any).serviceWorker;
  setSecureContext(true);
  localStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("alertBridge basics", () => {
  it("keeps one fixed id for the ambush alert", async () => {
    expect((await load()).AMBUSH_ALERT_ID).toBe(7001);
  });

  it("knows the packaged app from the browser, and a failing bridge is a browser", async () => {
    const bridge = await load();
    expect(bridge.isNativeApp()).toBe(false);
    mockNative.value = true;
    expect(bridge.isNativeApp()).toBe(true);
    mockNative.throws = true;
    expect(bridge.isNativeApp()).toBe(false);
  });

  it("loads the plugin, and gives null when it is missing or its import throws", async () => {
    const bridge = await load();
    expect(await bridge.loadLocalNotifications()).toBe(mockPlugin.current);
    mockPlugin.mode = "empty";
    expect(await bridge.loadLocalNotifications()).toBeNull();
    mockPlugin.mode = "throws";
    expect(await bridge.loadLocalNotifications()).toBeNull();
  });
});

describe("alertBridge in a browser", () => {
  it("is unsupported where the browser has no Notification", async () => {
    const bridge = await load();
    expect(await bridge.alertPermission()).toBe("unsupported");
    expect(await bridge.showAlert(ambush)).toEqual({ shown: false, reason: "unsupported" });
    expect(await bridge.requestAlertPermission()).toBe("unsupported");
  });

  it("maps the browser's permission, with default meaning nobody has asked", async () => {
    const bridge = await load();
    installNotification("granted");
    expect(await bridge.alertPermission()).toBe("granted");
    installNotification("denied");
    expect(await bridge.alertPermission()).toBe("denied");
    installNotification("default");
    expect(await bridge.alertPermission()).toBe("prompt");
  });

  it("shows nothing when the hero has not allowed alerts", async () => {
    const bridge = await load();
    const { shown } = installNotification("denied");
    const { register } = installWorker();
    expect(await bridge.showAlert(ambush)).toEqual({ shown: false, reason: "denied" });
    installNotification("default");
    expect(await bridge.showAlert(ambush)).toEqual({ shown: false, reason: "denied" });
    expect(shown).toHaveLength(0);
    expect(register).not.toHaveBeenCalled();
  });

  it("registers the worker under the publicPath, so a dev page deep in a history route still finds it", async () => {
    const base = process.env.BASE_URL;
    process.env.BASE_URL = "/";
    try {
      const bridge = await load();
      installNotification("granted");
      const { register } = installWorker();
      await bridge.showAlert(ambush);
      expect(register).toHaveBeenCalledWith("/alerts-sw.js");
    } finally {
      if (base === undefined) delete process.env.BASE_URL;
      else process.env.BASE_URL = base;
    }
  });

  it("shows through the worker, tagged with the alert id, and registers the worker once", async () => {
    const bridge = await load();
    installNotification("granted");
    const { registration, register } = installWorker();
    expect(await bridge.showAlert(ambush)).toEqual({ shown: true });
    expect(register).toHaveBeenCalledWith("./alerts-sw.js");
    expect(registration.showNotification).toHaveBeenCalledWith("A beast ambushes you!", {
      body: "Come back and fight.",
      tag: "7001",
      renotify: true,
      data: { url: location.href },
    });
    expect(await bridge.showAlert({ ...ambush, body: "Again!" })).toEqual({ shown: true });
    expect(registration.showNotification).toHaveBeenCalledTimes(2);
    expect(register).toHaveBeenCalledTimes(1);
  });

  it("falls back to the plain Notification when the browser has no worker", async () => {
    const bridge = await load();
    const { shown } = installNotification("granted");
    expect(await bridge.showAlert(ambush)).toEqual({ shown: true });
    expect(shown).toHaveLength(1);
    expect(shown[0]).toMatchObject({ title: "A beast ambushes you!", options: { body: "Come back and fight.", tag: "7001" } });

    const focus = jest.spyOn(window, "focus").mockImplementation(() => undefined);
    shown[0].onclick();
    expect(focus).toHaveBeenCalled();
    expect(shown[0].close).toHaveBeenCalled();
  });

  it("falls back to the plain Notification when the page is not a secure context or the worker cannot show", async () => {
    let bridge = await load();
    const first = installNotification("granted");
    const insecure = installWorker();
    setSecureContext(false);
    expect(await bridge.showAlert(ambush)).toEqual({ shown: true });
    expect(insecure.register).not.toHaveBeenCalled();
    expect(first.shown).toHaveLength(1);

    jest.resetModules();
    bridge = await load();
    setSecureContext(true);
    const second = installNotification("granted");
    const { registration } = installWorker();
    registration.showNotification.mockRejectedValue(new Error("no active worker"));
    expect(await bridge.showAlert(ambush)).toEqual({ shown: true });
    expect(second.shown).toHaveLength(1);
  });

  it("falls back after waiting about 3 seconds for a worker that never takes charge", async () => {
    jest.useFakeTimers();
    const bridge = await load();
    const { shown } = installNotification("granted");
    installWorker({ neverReady: true });
    const pending = bridge.showAlert(ambush);
    await flush();
    jest.advanceTimersByTime(3000);
    expect(await pending).toEqual({ shown: true });
    expect(shown).toHaveLength(1);
  });

  it("says failed when neither the worker nor the constructor can show it", async () => {
    const bridge = await load();
    installNotification("granted", { constructorThrows: true });
    expect(await bridge.showAlert(ambush)).toEqual({ shown: false, reason: "failed" });
  });

  it("tries the worker again later after a failed registration", async () => {
    const bridge = await load();
    installNotification("granted");
    const { register } = installWorker({ registerRejects: true });
    expect(await bridge.prepareAlerts()).toBeNull();
    expect(await bridge.prepareAlerts()).toBeNull();
    expect(register).toHaveBeenCalledTimes(2);
  });

  it("cannot book an alert for later", async () => {
    const bridge = await load();
    installNotification("granted");
    expect(await bridge.scheduleAlert({ ...ambush, at: new Date() })).toEqual({ shown: false, reason: "web" });
  });

  it("asks inside the tap: requestPermission is reached before anything is awaited", async () => {
    const bridge = await load();
    const { FakeNotification } = installNotification("default", { answer: "default" });
    const asking = bridge.requestAlertPermission();
    expect(FakeNotification.requestPermission).toHaveBeenCalledTimes(1);
    expect(await asking).toBe("prompt");
  });

  it("maps the prompt's answer, and warms the worker only when alerts were allowed", async () => {
    let bridge = await load();
    installNotification("default", { answer: "denied" });
    const { register } = installWorker();
    expect(await bridge.requestAlertPermission()).toBe("denied");
    await flush();
    expect(register).not.toHaveBeenCalled();

    jest.resetModules();
    bridge = await load();
    installNotification("default", { answer: "granted" });
    const warmed = installWorker();
    expect(await bridge.requestAlertPermission()).toBe("granted");
    await flush();
    expect(warmed.register).toHaveBeenCalledWith("./alerts-sw.js");
  });

  it("takes an alert back from the worker's registration and closes a plain one", async () => {
    const bridge = await load();
    const { shown } = installNotification("granted");
    const { registration } = installWorker();
    await bridge.showAlert(ambush);
    const onScreen = { close: jest.fn() };
    registration.getNotifications.mockResolvedValue([onScreen]);
    await bridge.cancelAlert(7001);
    expect(registration.getNotifications).toHaveBeenCalledWith({ tag: "7001" });
    expect(onScreen.close).toHaveBeenCalled();
    expect(shown).toHaveLength(0);

    delete (navigator as any).serviceWorker;
    jest.resetModules();
    const plain = await load();
    const loose = installNotification("granted");
    await plain.showAlert(ambush);
    await plain.cancelAlert(7001);
    expect(loose.shown[0].close).toHaveBeenCalled();
  });

  it("never throws from cancel, even with nothing to cancel", async () => {
    const bridge = await load();
    await expect(bridge.cancelAlert(7001)).resolves.toBeUndefined();
  });

  it("has no worker to prepare in the packaged app", async () => {
    const bridge = await load();
    const { register } = installWorker();
    mockNative.value = true;
    expect(await bridge.prepareAlerts()).toBeNull();
    expect(register).not.toHaveBeenCalled();
  });
});

describe("alertBridge in the packaged app", () => {
  beforeEach(() => {
    mockNative.value = true;
  });

  it("maps the plugin's permission, prompt-with-rationale included", async () => {
    const bridge = await load();
    for (const [display, expected] of [
      ["granted", "granted"],
      ["denied", "denied"],
      ["prompt", "prompt"],
      ["prompt-with-rationale", "prompt"],
    ] as const) {
      mockPlugin.current = makePlugin(display);
      expect(await bridge.alertPermission()).toBe(expected);
    }
  });

  it("asks the plugin for permission", async () => {
    const bridge = await load();
    mockPlugin.current = makePlugin("prompt");
    expect(await bridge.requestAlertPermission()).toBe("granted");
    expect(mockPlugin.current.requestPermissions).toHaveBeenCalledTimes(1);
    mockPlugin.current.requestPermissions.mockResolvedValue({ display: "denied" });
    expect(await bridge.requestAlertPermission()).toBe("denied");
  });

  it("shows now by scheduling without a time, under the fixed id", async () => {
    const bridge = await load();
    expect(await bridge.showAlert(ambush)).toEqual({ shown: true });
    const call = mockPlugin.current.schedule.mock.calls[0][0];
    expect(call).toEqual({
      notifications: [{ id: 7001, title: "A beast ambushes you!", body: "Come back and fight.", channelId: "battle-alerts", extra: { kind: "battle-alert" } }],
    });
    expect(call.notifications[0]).not.toHaveProperty("schedule");
  });

  it("books for a later moment with the time it was given", async () => {
    const bridge = await load();
    const at = new Date(2026, 9, 10, 12, 0, 0);
    expect(await bridge.scheduleAlert({ ...ambush, at })).toEqual({ shown: true });
    expect(mockPlugin.current.schedule).toHaveBeenCalledWith({
      notifications: [expect.objectContaining({ id: 7001, channelId: "battle-alerts", schedule: { at, allowWhileIdle: true }, extra: { kind: "battle-alert" } })],
    });
  });

  it("books and shows nothing without permission", async () => {
    const bridge = await load();
    mockPlugin.current = makePlugin("prompt");
    expect(await bridge.showAlert(ambush)).toEqual({ shown: false, reason: "denied" });
    expect(await bridge.scheduleAlert({ ...ambush, at: new Date() })).toEqual({ shown: false, reason: "denied" });
    expect(mockPlugin.current.schedule).not.toHaveBeenCalled();
  });

  it("says failed when the plugin refuses to schedule", async () => {
    const bridge = await load();
    mockPlugin.current.schedule.mockRejectedValue(new Error("exact alarms off"));
    expect(await bridge.showAlert(ambush)).toEqual({ shown: false, reason: "failed" });
    expect(await bridge.scheduleAlert({ ...ambush, at: new Date() })).toEqual({ shown: false, reason: "failed" });
  });

  it("takes a booked alert back by id", async () => {
    const bridge = await load();
    await bridge.cancelAlert(7001);
    expect(mockPlugin.current.cancel).toHaveBeenCalledWith({ notifications: [{ id: 7001 }] });
    expect(mockPlugin.current.removeDeliveredNotifications).toHaveBeenCalledWith({
      notifications: [{ id: 7001, title: "", body: "" }],
    });
  });

  it("is unsupported when the plugin cannot be loaded", async () => {
    const bridge = await load();
    for (const mode of ["empty", "throws"] as const) {
      mockPlugin.mode = mode;
      expect(await bridge.alertPermission()).toBe("unsupported");
      expect(await bridge.requestAlertPermission()).toBe("unsupported");
      expect(await bridge.showAlert(ambush)).toEqual({ shown: false, reason: "unsupported" });
      expect(await bridge.scheduleAlert({ ...ambush, at: new Date() })).toEqual({ shown: false, reason: "unsupported" });
      await expect(bridge.cancelAlert(7001)).resolves.toBeUndefined();
    }
  });
});

describe("battle alerts choice", () => {
  it("is unasked until the hero answers, then remembers on or off", async () => {
    const bridge = await load();
    expect(bridge.battleAlertsChoice()).toBe("unasked");
    bridge.setBattleAlertsChoice("on");
    expect(localStorage.getItem("xp.battleAlerts")).toBe("on");
    expect(bridge.battleAlertsChoice()).toBe("on");
    bridge.setBattleAlertsChoice("off");
    expect(bridge.battleAlertsChoice()).toBe("off");
  });

  it("treats anything else as unasked", async () => {
    const bridge = await load();
    localStorage.setItem("xp.battleAlerts", "maybe");
    expect(bridge.battleAlertsChoice()).toBe("unasked");
  });

  it("survives storage that throws", async () => {
    const bridge = await load();
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(bridge.battleAlertsChoice()).toBe("unasked");
    expect(() => bridge.setBattleAlertsChoice("on")).not.toThrow();
  });
});

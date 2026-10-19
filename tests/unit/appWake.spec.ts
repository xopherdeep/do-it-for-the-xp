/**
 * The app wake hook: the one place other modules register "the stores have loaded / a hero signed in / the app
 * came back to the front", and the listener that tells the web page and the packaged app apart for the last one.
 */
const NOON = new Date(2026, 9, 18, 12, 0);

const freshModule = () => {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("@/lib/services/notifications/appWake") as typeof import("@/lib/services/notifications/appWake");
};

describe("onAppWake / runAppWake", () => {
  it("calls every hook with the reason and the moment", async () => {
    const { onAppWake, runAppWake } = freshModule();
    const first = jest.fn();
    const second = jest.fn();
    onAppWake(first);
    onAppWake(second);
    await runAppWake("resume", NOON);
    expect(first).toHaveBeenCalledWith({ reason: "resume", now: NOON });
    expect(second).toHaveBeenCalledWith({ reason: "resume", now: NOON });
  });

  it("goes on to the next hook when one throws or rejects", async () => {
    const { onAppWake, runAppWake } = freshModule();
    const last = jest.fn();
    onAppWake(() => {
      throw new Error("sync failure");
    });
    onAppWake(async () => {
      throw new Error("async failure");
    });
    onAppWake(last);
    await runAppWake("login", NOON);
    expect(last).toHaveBeenCalledTimes(1);
  });

  it("stops calling a hook once it is unregistered", async () => {
    const { onAppWake, runAppWake } = freshModule();
    const hook = jest.fn();
    const off = onAppWake(hook);
    off();
    await runAppWake("start", NOON);
    expect(hook).not.toHaveBeenCalled();
  });

  it("registering the same hook twice still calls it once", async () => {
    const { onAppWake, runAppWake } = freshModule();
    const hook = jest.fn();
    onAppWake(hook);
    onAppWake(hook);
    await runAppWake("start", NOON);
    expect(hook).toHaveBeenCalledTimes(1);
  });

  it("catches a late hook up on a start that already happened, only when it asks", async () => {
    const { onAppWake, runAppWake } = freshModule();
    await runAppWake("start", NOON);
    const asksToCatchUp = jest.fn();
    const doesNot = jest.fn();
    onAppWake(asksToCatchUp, { catchUp: true });
    onAppWake(doesNot);
    await Promise.resolve();
    expect(asksToCatchUp).toHaveBeenCalledWith(expect.objectContaining({ reason: "start" }));
    expect(doesNot).not.toHaveBeenCalled();
  });

  it("does not catch a hook up before the start has happened", async () => {
    const { onAppWake } = freshModule();
    const hook = jest.fn();
    onAppWake(hook, { catchUp: true });
    await Promise.resolve();
    expect(hook).not.toHaveBeenCalled();
  });
});

describe("listenForResume", () => {
  const fakeDocument = (visibilityState = "hidden") => {
    const listeners = new Set<() => void>();
    return {
      visibilityState,
      addEventListener: jest.fn((_type: string, fn: () => void) => void listeners.add(fn)),
      removeEventListener: jest.fn((_type: string, fn: () => void) => void listeners.delete(fn)),
      fire: () => listeners.forEach((fn) => fn()),
      count: () => listeners.size,
    };
  };

  it("in a browser, wakes when the page becomes visible again and not when it hides", () => {
    const { listenForResume } = freshModule();
    const doc = fakeDocument("hidden");
    const onResume = jest.fn();
    listenForResume(onResume, { isNative: () => false, doc: doc as any });
    doc.fire();
    expect(onResume).not.toHaveBeenCalled();
    doc.visibilityState = "visible";
    doc.fire();
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it("in a browser, stops listening when told to", () => {
    const { listenForResume } = freshModule();
    const doc = fakeDocument("visible");
    const stop = listenForResume(jest.fn(), { isNative: () => false, doc: doc as any });
    expect(doc.count()).toBe(1);
    stop();
    expect(doc.count()).toBe(0);
  });

  it("in the packaged app, wakes when Capacitor says the app is active and ignores the page's visibility", async () => {
    const { listenForResume } = freshModule();
    const doc = fakeDocument("visible");
    let push: (isActive: boolean) => void = () => undefined;
    const remove = jest.fn();
    const onResume = jest.fn();
    listenForResume(onResume, {
      isNative: () => true,
      doc: doc as any,
      addAppStateListener: async (callback) => {
        push = callback;
        return remove;
      },
    });
    await Promise.resolve();
    await Promise.resolve();
    doc.fire();
    expect(onResume).not.toHaveBeenCalled();
    push(false);
    expect(onResume).not.toHaveBeenCalled();
    push(true);
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it("in the packaged app, removes the Capacitor listener on stop, even when stop comes before it was added", async () => {
    const { listenForResume } = freshModule();
    const remove = jest.fn();
    const stop = listenForResume(jest.fn(), {
      isNative: () => true,
      doc: fakeDocument() as any,
      addAppStateListener: async () => remove,
    });
    stop();
    await Promise.resolve();
    await Promise.resolve();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("in the packaged app, survives a plugin that cannot be loaded", async () => {
    const { listenForResume } = freshModule();
    const stop = listenForResume(jest.fn(), {
      isNative: () => true,
      doc: fakeDocument() as any,
      addAppStateListener: async () => {
        throw new Error("no App plugin");
      },
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(() => stop()).not.toThrow();
  });
});

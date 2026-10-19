import { nextTick, reactive } from "vue";

/** The wiring that hangs the reminder scheduler on the app shell: the real stores' shape, fake phone and watches. */
const mockBook = jest.fn(async (_heroId: string, _now?: Date) => ({ scheduled: 0 }));
const mockStopApproval = jest.fn();
const mockStartApproval = jest.fn((_gmId: string) => mockStopApproval);
let mockIsNative = true;
let resumeCallback: () => void = () => undefined;
const mockStopResume = jest.fn();

jest.mock("@/lib/services/notifications/questWatch", () => ({
  bookHeroReminders: (heroId: string, now?: Date) => mockBook(heroId, now),
}));
jest.mock("@/lib/services/notifications/approvalWatch", () => ({
  startApprovalWatch: (gmId: string) => mockStartApproval(gmId),
}));
jest.mock("@/lib/services/notifications/alertBridge", () => ({
  isNativeApp: () => mockIsNative,
}));
jest.mock("@/lib/services/notifications/appWake", () => {
  const actual = jest.requireActual("@/lib/services/notifications/appWake");
  return {
    ...actual,
    listenForResume: (onResume: () => void) => {
      resumeCallback = onResume;
      return mockStopResume;
    },
  };
});

import { startAppReminders } from "@/lib/services/notifications/appReminders";
import { onAppWake } from "@/lib/services/notifications/appWake";

const settle = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve();
  await nextTick();
  for (let i = 0; i < 30; i++) await Promise.resolve();
};

const makeStore = () =>
  reactive({
    users: {
      dad: { id: "dad", isAdult: true },
      kid1: { id: "kid1", isAdult: false },
      kid2: { id: "kid2", isAdult: false },
    } as Record<string, any>,
    currentUser: { id: null as string | null, isAuthenticated: true },
  });

describe("startAppReminders", () => {
  let stop: () => void = () => undefined;

  beforeEach(() => {
    mockIsNative = true;
    mockBook.mockClear();
    mockStartApproval.mockClear();
    mockStopApproval.mockClear();
    mockStopResume.mockClear();
  });
  afterEach(() => stop());

  it("books every hero on the device once the stores have loaded, with nobody signed in", async () => {
    const store = makeStore();
    stop = startAppReminders(store, Promise.resolve());
    await settle();
    expect(mockBook.mock.calls.map(([heroId]) => heroId).sort()).toEqual(["dad", "kid1", "kid2"]);
    expect(mockStartApproval).not.toHaveBeenCalled();
  });

  it("books nothing before the stores have loaded", async () => {
    const store = makeStore();
    let finishLoading: () => void = () => undefined;
    stop = startAppReminders(store, new Promise<void>((resolve) => (finishLoading = resolve)));
    await settle();
    expect(mockBook).not.toHaveBeenCalled();
    finishLoading();
    await settle();
    expect(mockBook).toHaveBeenCalled();
  });

  it("starts the approval watch for a signed-in Game Master and stops it at sign out", async () => {
    const store = makeStore();
    store.currentUser.id = "dad";
    stop = startAppReminders(store, Promise.resolve());
    await settle();
    expect(mockStartApproval).toHaveBeenCalledTimes(1);
    expect(mockStartApproval).toHaveBeenCalledWith("dad");

    store.currentUser.id = null;
    await settle();
    expect(mockStopApproval).toHaveBeenCalledTimes(1);
  });

  it("does not start the approval watch for a hero, and stops it when a hero takes the device", async () => {
    const store = makeStore();
    store.currentUser.id = "dad";
    stop = startAppReminders(store, Promise.resolve());
    await settle();
    store.currentUser.id = "kid1";
    await settle();
    expect(mockStartApproval).toHaveBeenCalledTimes(1);
    expect(mockStopApproval).toHaveBeenCalledTimes(1);
  });

  it("hears a profile switch and tells the wake hooks it was a login", async () => {
    const store = makeStore();
    const reasons: string[] = [];
    const off = onAppWake(({ reason }) => void reasons.push(reason));
    stop = startAppReminders(store, Promise.resolve());
    await settle();
    reasons.length = 0;
    store.currentUser.id = "kid2";
    await settle();
    off();
    expect(reasons).toEqual(["login"]);
  });

  it("wakes again when the app comes back to the front, without a second approval watch", async () => {
    const store = makeStore();
    store.currentUser.id = "dad";
    const reasons: string[] = [];
    const off = onAppWake(({ reason }) => void reasons.push(reason));
    stop = startAppReminders(store, Promise.resolve());
    await settle();
    mockBook.mockClear();
    reasons.length = 0;
    resumeCallback();
    await settle();
    off();
    expect(reasons).toEqual(["resume"]);
    expect(mockBook).toHaveBeenCalledTimes(3);
    expect(mockStartApproval).toHaveBeenCalledTimes(1);
  });

  it("books no device reminders in a browser, yet the Game Master's approval watch runs", async () => {
    mockIsNative = false;
    const store = makeStore();
    store.currentUser.id = "dad";
    stop = startAppReminders(store, Promise.resolve());
    await settle();
    expect(mockBook).not.toHaveBeenCalled();
    expect(mockStartApproval).toHaveBeenCalledWith("dad");
  });

  it("stop() ends the approval watch, the resume listener and the sign-in watch", async () => {
    const store = makeStore();
    store.currentUser.id = "dad";
    stop = startAppReminders(store, Promise.resolve());
    await settle();
    stop();
    expect(mockStopApproval).toHaveBeenCalledTimes(1);
    expect(mockStopResume).toHaveBeenCalledTimes(1);
    mockStartApproval.mockClear();
    store.currentUser.id = "kid1";
    store.currentUser.id = "dad";
    await settle();
    expect(mockStartApproval).not.toHaveBeenCalled();
  });
});

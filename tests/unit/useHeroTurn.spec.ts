import { defineComponent, reactive, type ShallowUnwrapRef } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import type { ActiveRevealPrompt } from "@/components/organisms/RevealPrompt/revealPrompt";
import type { HeroTurn } from "@/lib/services/sync/heroTurn";
import { usePortalTurn, useTurnGate } from "@/hooks/useHeroTurn";

const BUSY = { label: "Mia's iPhone", lastSeenAt: null };
const held: HeroTurn = { state: "held", busy: null, provisional: false };
const busy: HeroTurn = { state: "busy", busy: BUSY, provisional: false };
const resting: HeroTurn = { state: "resting", busy: null, provisional: false };

const mockSync = reactive({
  isFamilyDevice: true,
  firstPushProgress: null as number | null,
  turns: {} as Record<string, HeroTurn>,
  tookOverNotice: null as string | null,
  signIn: jest.fn(),
  takeOver: jest.fn(),
  rest: jest.fn(),
});
jest.mock("@/lib/store/stores/sync", () => ({ __esModule: true, useSyncStore: () => mockSync }));

const mockUser = { getUserById: (id: string) => ({ id, name: { nick: "Mia" } }), logoutUser: jest.fn() };
jest.mock("@/lib/store/stores/user", () => ({ __esModule: true, useUserStore: () => mockUser }));

const mockRouter = { replace: jest.fn() };
jest.mock("vue-router", () => ({ __esModule: true, useRouter: () => mockRouter }));

/** Mounts a composable in a bare component and hands back what it returned */
const withSetup = <T extends object>(setup: () => T): ShallowUnwrapRef<T> =>
  mount(defineComponent({ setup, render: () => null })).vm as unknown as ShallowUnwrapRef<T>;

/** The prompt on screen, and its answer */
const showing = (prompt: ActiveRevealPrompt | null): ActiveRevealPrompt => {
  if (!prompt) throw new Error("no prompt on screen");
  return prompt;
};

describe("the clerk's turn questions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSync.isFamilyDevice = true;
    mockSync.firstPushProgress = null;
    mockSync.turns = {};
    mockSync.tookOverNotice = null;
    mockSync.signIn.mockResolvedValue("granted");
    mockSync.takeOver.mockImplementation(async (heroId: string) => {
      mockSync.turns = { ...mockSync.turns, [heroId]: held };
    });
    mockSync.rest.mockImplementation(async (heroId: string) => {
      mockSync.turns = { ...mockSync.turns, [heroId]: resting };
    });
  });

  it("the picker plays a granted hero at once, and asks when another device plays them", async () => {
    const gate = withSetup(() => useTurnGate());
    expect(await gate.requestTurn({ id: "h-1" })).toBe(true);
    expect(gate.prompt).toBeNull();

    mockSync.signIn.mockImplementation(async (heroId: string) => {
      mockSync.turns = { ...mockSync.turns, [heroId]: busy };
      return "busy";
    });
    const playing = gate.requestTurn({ id: "h-1", name: { nick: "Mia" } } as { id: string });
    await flushPromises();
    expect(showing(gate.prompt).options.lines).toEqual(["Mia is still playing on Mia's iPhone (last seen a while ago). Play here anyway?"]);
    gate.respond({ id: "play", amount: null });
    expect(await playing).toBe(true);
    expect(mockSync.takeOver).toHaveBeenCalledWith("h-1");

    const notNow = gate.requestTurn({ id: "h-1" });
    await flushPromises();
    gate.respond({ id: "later", amount: null });
    expect(await notNow).toBe(false);
    expect(mockSync.rest).toHaveBeenCalledWith("h-1");
  });

  it("the picker's loading line steps aside before the busy question, and never for a granted hero", async () => {
    const gate = withSetup(() => useTurnGate());
    const beforeAsking = jest.fn(async () => undefined);
    expect(await gate.requestTurn({ id: "h-1" }, beforeAsking)).toBe(true);
    expect(beforeAsking).not.toHaveBeenCalled();

    mockSync.signIn.mockImplementation(async (heroId: string) => {
      mockSync.turns = { ...mockSync.turns, [heroId]: busy };
      return "busy";
    });
    const asking = gate.requestTurn({ id: "h-1" }, beforeAsking);
    await flushPromises();
    expect(beforeAsking).toHaveBeenCalledTimes(1);
    expect(gate.prompt).not.toBeNull();
    gate.respond({ id: "later", amount: null });
    expect(await asking).toBe(false);
  });

  it("the portal says once that the hero was taken over, then asks; Not now on a family device goes back to the picker", async () => {
    mockSync.signIn.mockImplementation(async (heroId: string) => {
      mockSync.turns = { ...mockSync.turns, [heroId]: busy };
      return "busy";
    });
    const portal = withSetup(() => usePortalTurn("h-1"));
    mockSync.tookOverNotice = "h-1";
    await flushPromises();

    expect(mockSync.tookOverNotice).toBeNull();
    expect(showing(portal.prompt).options.lines).toEqual([
      "Mia's iPhone took over Mia's game while this one was away. This device has caught up.",
    ]);
    portal.respond({ id: "ok", amount: null });
    await flushPromises();

    expect(showing(portal.prompt).options.lines[0]).toMatch(/^Mia is still playing on Mia's iPhone/);
    portal.respond({ id: "later", amount: null });
    await flushPromises();
    expect(mockSync.rest).toHaveBeenCalledWith("h-1");
    expect(mockUser.logoutUser).toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith({ name: "xp-profile" });
  });

  it("Not now in the portal of a kid phone rests the hero, signs it out and goes to the hero's card; Play here takes it over", async () => {
    mockSync.isFamilyDevice = false;
    mockSync.turns = { "h-1": busy };
    const portal = withSetup(() => usePortalTurn("h-1"));
    await flushPromises();
    portal.respond({ id: "later", amount: null });
    await flushPromises();
    expect(mockSync.rest).toHaveBeenCalledWith("h-1");
    expect(mockUser.logoutUser).toHaveBeenCalled();
    expect(mockSync.rest.mock.invocationCallOrder[0]).toBeLessThan(mockUser.logoutUser.mock.invocationCallOrder[0]);
    expect(mockRouter.replace).toHaveBeenCalledWith({ name: "hero-phone" });

    jest.clearAllMocks();
    mockSync.turns = { "h-1": busy };
    const again = withSetup(() => usePortalTurn("h-1"));
    await flushPromises();
    again.respond({ id: "play", amount: null });
    await flushPromises();
    expect(mockSync.takeOver).toHaveBeenCalledWith("h-1");
    expect(again.prompt).toBeNull();
    expect(mockUser.logoutUser).not.toHaveBeenCalled();
  });

  it("the took-over line on a kid phone, then Not now, also signs the hero out to the hero's card", async () => {
    mockSync.isFamilyDevice = false;
    mockSync.signIn.mockImplementation(async (heroId: string) => {
      mockSync.turns = { ...mockSync.turns, [heroId]: busy };
      return "busy";
    });
    const portal = withSetup(() => usePortalTurn("h-1"));
    mockSync.tookOverNotice = "h-1";
    await flushPromises();
    portal.respond({ id: "ok", amount: null });
    await flushPromises();
    portal.respond({ id: "later", amount: null });
    await flushPromises();
    expect(mockSync.rest).toHaveBeenCalledWith("h-1");
    expect(mockUser.logoutUser).toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith({ name: "hero-phone" });
  });

  it("a took-over notice that arrives while the busy question is open is said once the question closes", async () => {
    mockSync.turns = { "h-1": busy };
    const portal = withSetup(() => usePortalTurn("h-1"));
    await flushPromises();
    expect(showing(portal.prompt).options.lines[0]).toMatch(/^Mia is still playing/);

    mockSync.signIn.mockResolvedValue("granted");
    mockSync.tookOverNotice = "h-1";
    await flushPromises();
    portal.respond({ id: "play", amount: null });
    await flushPromises();

    expect(showing(portal.prompt).options.lines[0]).toMatch(/took over Mia's game/);
    expect(mockSync.tookOverNotice).toBeNull();
  });

  it("the portal of a family device shows the first push line while it runs, and the turn's questions before it", async () => {
    const portal = withSetup(() => usePortalTurn("h-1"));
    expect(portal.prompt).toBeNull();

    mockSync.firstPushProgress = 0;
    await flushPromises();
    expect(showing(portal.prompt).options.lines).toEqual(["Sending the family's save to the site…"]);
    expect(showing(portal.prompt).options.choices).toEqual([]);
    mockSync.firstPushProgress = 50;
    await flushPromises();
    expect(showing(portal.prompt).options.lines).toEqual(["Sending the family's save to the site… (50)"]);

    mockSync.turns = { "h-1": busy };
    await flushPromises();
    expect(showing(portal.prompt).options.lines[0]).toMatch(/^Mia is still playing/);
    portal.respond({ id: "play", amount: null });
    await flushPromises();
    expect(showing(portal.prompt).options.lines).toEqual(["Sending the family's save to the site… (50)"]);

    mockSync.firstPushProgress = null;
    await flushPromises();
    expect(portal.prompt).toBeNull();
  });
});

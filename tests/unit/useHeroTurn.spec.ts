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

  it("a busy turn in the portal of a kid phone rests the hero there; Play here takes it over", async () => {
    mockSync.isFamilyDevice = false;
    mockSync.turns = { "h-1": busy };
    const portal = withSetup(() => usePortalTurn("h-1"));
    await flushPromises();
    portal.respond({ id: "later", amount: null });
    await flushPromises();
    expect(mockSync.rest).toHaveBeenCalledWith("h-1");
    expect(mockRouter.replace).not.toHaveBeenCalled();

    mockSync.turns = { "h-1": busy };
    await flushPromises();
    portal.respond({ id: "play", amount: null });
    await flushPromises();
    expect(mockSync.takeOver).toHaveBeenCalledWith("h-1");
    expect(portal.prompt).toBeNull();
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
});

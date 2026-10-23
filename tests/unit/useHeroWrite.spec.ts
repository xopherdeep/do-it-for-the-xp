import { defineComponent, reactive, type ShallowUnwrapRef } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { readFileSync } from "fs";
import { join } from "path";
import { resultOnTurn, saveHeroEdit, useHeroWrite } from "@/hooks/useHeroWrite";

const mockSync = reactive({ borrow: jest.fn() });
jest.mock("@/lib/store/stores/sync", () => ({ __esModule: true, useSyncStore: () => mockSync }));

const mockUser = {
  currentUser: { id: "gm-1" },
  getUserById: (id: string) => (id === "h-1" ? { id, name: { nick: "Mia" } } : { id, name: { nick: "Dad" } }),
};
jest.mock("@/lib/store/stores/user", () => ({ __esModule: true, useUserStore: () => mockUser }));

const withSetup = <T extends object>(setup: () => T): ShallowUnwrapRef<T> =>
  mount(defineComponent({ setup, render: () => null })).vm as unknown as ShallowUnwrapRef<T>;

describe("a Game Master's change to a hero under Family Sync", () => {
  beforeEach(() => jest.clearAllMocks());

  it("runs on the hero's turn (held here, or free and borrowed) and says nothing", async () => {
    mockSync.borrow.mockImplementation(async (_heroId: string, fn: () => Promise<void>) => {
      await fn();
      return { ran: true };
    });
    const writer = withSetup(() => useHeroWrite());
    const change = jest.fn(async () => undefined);

    expect(await writer.writeHero("h-1", change)).toBe(true);
    expect(change).toHaveBeenCalled();
    expect(mockSync.borrow).toHaveBeenCalledWith("h-1", change);
    expect(writer.prompt).toBeNull();
  });

  it("on a hero another device plays, nothing is written and the clerk names the device", async () => {
    mockSync.borrow.mockResolvedValue({ ran: false, busy: { label: "Mia's iPhone", lastSeenAt: null } });
    const writer = withSetup(() => useHeroWrite());
    const change = jest.fn(async () => undefined);

    const writing = writer.writeHero("h-1", change);
    await flushPromises();
    expect(writer.prompt?.options.lines).toEqual(["Mia is playing on Mia's iPhone. Try again when they rest."]);
    writer.respond({ id: "ok", amount: null });

    expect(await writing).toBe(false);
    expect(change).not.toHaveBeenCalled();
  });

  it("when the hero's turn cannot be had (no signal), nothing is written and the clerk says so", async () => {
    mockSync.borrow.mockResolvedValue({ ran: false, busy: null });
    const writer = withSetup(() => useHeroWrite());
    const writing = writer.writeHero("h-1", jest.fn());
    await flushPromises();
    expect(writer.prompt?.options.lines).toEqual(["Mia's game can't be reached right now. Try again in a moment."]);
    writer.respond({ id: "ok", amount: null });
    expect(await writing).toBe(false);
  });

  it("a profile edit saves through the screen's gate on the hero's turn; a new hero (no gate) is saved at once", async () => {
    const save = jest.fn(async () => undefined);
    const gate = { writeHero: jest.fn(async () => false) };
    expect(await saveHeroEdit(gate, "h-1", save)).toBe(false);
    expect(gate.writeHero).toHaveBeenCalledWith("h-1", save);
    expect(save).not.toHaveBeenCalled();

    expect(await saveHeroEdit(undefined, "h-9", save)).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("a change that answers something runs on the hero's turn and hands its answer back, or says it was refused", async () => {
    const work = jest.fn(async () => ({ bloodMoons: 1 }));
    const granted = jest.fn(async (_heroId: string, change: () => Promise<void>) => {
      await change();
      return true;
    });
    expect(await resultOnTurn(granted, "h-1", work)).toEqual({ bloodMoons: 1 });

    const refused = jest.fn(async () => false);
    work.mockClear();
    expect(await resultOnTurn(refused, "h-1", work)).toBe("refused");
    expect(work).not.toHaveBeenCalled();
  });

  it("the Compendium's key-item unlock and the blood moon's actions write a hero only on the hero's turn", () => {
    const source = (path: string) => readFileSync(join(__dirname, "../../src/app/Admin/XpCompendium/views", path), "utf8");
    const keyItems = source("XpAccessories/components/tabs/XpEconomyKeyItems.vue");
    expect(keyItems).toMatch(/resultOnTurn\(writeHero, userId, async \(\) => userStore\.unlockItem\(userId, itemName\)\)/);
    expect(keyItems).not.toMatch(/const isUnlocked = userStore\.unlockItem/);
    expect(keyItems).toContain('<xp-reveal-prompt :prompt="heroPrompt" @respond="answerHero" />');

    const bloodMoon = source("XpTemples/components/XpBloodMoonModal.vue");
    // every action (schedule, take back, weekly, rise now) goes through act(), whose work runs on the hero's turn
    expect(bloodMoon).toMatch(/const entry = await resultOnTurn\(writeHero, row\.userId, work\)/);
    expect(bloodMoon.match(/templeSystem\.(bloodMoon|scheduleBloodMoon|setBloodMoonEvery)\(/g)).toHaveLength(4);
    expect(bloodMoon.match(/await act\(|void act\(/g)).toHaveLength(4);
    expect(bloodMoon).toContain('<xp-reveal-prompt :prompt="heroPrompt" @respond="answerHero" />');
  });
});

/**
 * The battle return (design spec, "Fight-room drops"): on a win the beast drops what it held, and the hero takes it
 * through the chest reveal on returning to the room. The temple screen opens that reveal once, as the run reopens on the
 * room the battle returns to; a plain arrival opens nothing, and a hero who leaves it shut still finds "Take it" on the
 * room's sheet. The screen's two composables are wired here as TempleGrounds wires them, over the real temple engine.
 */
import { defineComponent, ref } from "vue";
import type { Router } from "vue-router";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { resetVisitMemory, roomActions } from "@/lib/services/temples/RoomInteractions";
import { useUserStore } from "@/lib/store/stores/user";
import { useRoomOutcomes, type RoomOutcomeDeps } from "@/app/Console/TempleGrounds/templeGrounds/useRoomOutcomes";
import { useTempleEntry } from "@/app/Console/TempleGrounds/templeGrounds/useTempleEntry";
import { addHero, contextAt, dungeons, enter, HERO, makeTemple, temples } from "./templeFixtures";

// Waking a floor reads the family's quest board: nothing wakes here
jest.mock("@/lib/services/temples/wakeOnEntry", () => ({ __esModule: true, wakeTempleOnEntry: jest.fn(async () => null) }));
jest.mock("@/lib/databases/ProfileDb", () => {
  class MockProfileDb {
    setProfile = jest.fn();
    getAll = jest.fn().mockResolvedValue([]);
  }
  return { __esModule: true, ProfileDb: MockProfileDb, default: MockProfileDb };
});
jest.mock("@/lib/services/core/StorageService", () => ({
  __esModule: true,
  default: { saveUsers: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("@/lib/store/stores/chat", () => ({
  __esModule: true,
  FAMILY_CHAT_ROOM: "family-chat",
  useChatStore: () => ({ postSystemLine: jest.fn(async () => ({})) }),
}));
jest.mock("@/lib/store/stores/notifications", () => ({
  __esModule: true,
  useNotificationsStore: () => ({ push: jest.fn() }),
}));
jest.mock("@/lib/databases/TempleProgressDb", () => ({
  getTempleProgressDb: () => ({
    getProgress: () => Promise.resolve(null),
    saveProgress: (progress: unknown) => Promise.resolve(progress),
  }),
}));

let pinia = createPinia();
beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  resetVisitMemory();
  addHero();
});

const FIGHT_ROOM: [number, number] = [0, 1];
const SMALL_KEY_DROP = { chest: "dungeon", dungeon: "small-key" };

/** The entrance, then a monster that drops a small key, with the hero standing in the fight room */
const fightTemple = (): string => {
  const monster: Room = { type: "monster", content: { beasts: ["beast-socktopus"], drops: SMALL_KEY_DROP } };
  const id = makeTemple({ E: { type: "entrance" }, M: monster }, [["E", "M"]]);
  enter(id, FIGHT_ROOM);
  return id;
};

/**
 * The temple screen over a temple: `returnsTo` is the room the route names (a battle returns there), none when the
 * hero walked in. `showPage` is Ionic showing the page (ionViewDidEnter: its first show, and each show after a parked
 * stay, as when a battle returns to the same room twice); `arrive` is the hero walking into the room they stand in.
 * `returnsLevel` is the route's ?level, read each time the page shows (it changes without a new page).
 */
const templeScreen = (id: string, returnsTo?: [number, number], returnsLevel?: () => string | undefined) => {
  const showDropReveal = jest.fn();
  const pass = () => undefined;
  const wrapper = mount(
    defineComponent({
      setup() {
        const currentPosition = ref<[number, number]>(FIGHT_ROOM);
        const currentLevel = ref("1F");
        const deps = {
          props: { temple: id, userId: HERO },
          userStore: useUserStore(),
          router: { push: jest.fn(), replace: jest.fn() } as unknown as Router,
          progressHeroId: HERO,
          templeSystem: temples,
          currentPosition,
          currentLevel,
          showTempleMessage: pass,
          handleTeleport: () => false,
          say: pass,
          fx: pass,
          showFanfare: pass,
          updateBg: pass,
          leaveTemple: pass,
          showTempleCleared: pass,
          showChestContentsDialog: pass,
          showEmptyChest: pass,
          showDropReveal,
          openChoiceReveal: pass,
          beastCard: async () => null,
          activeMonster: ref(null),
        } as unknown as RoomOutcomeDeps;
        const { getLiveContext: liveContext, handleArrival } = useRoomOutcomes(deps);
        const entry = { temple: id, heroId: HERO, whenOpened: Promise.resolve(true), currentLevel, templeSystem: temples, templeShortName: { value: "Test" }, say: pass, fx: pass };
        useTempleEntry({ ...entry, returnsTo, returnsLevel, liveContext, showDropReveal });
        return { handleArrival };
      },
      render: () => null,
    }),
    { global: { plugins: [pinia] } }
  );
  // Ionic keeps a page's composition hooks on the instance under the hook's name and fires them in turn (fireLifecycle)
  const vm = wrapper.vm as unknown as { handleArrival: () => Promise<void>; onIonViewDidEnter?: Array<() => void> };
  const showPage = async () => {
    for (const hook of vm.onIonViewDidEnter ?? []) hook();
    await flushPromises();
  };
  const arrive = async () => {
    await vm.handleArrival();
    await flushPromises();
  };
  return { showDropReveal, showPage, arrive };
};

describe("the battle return opens a won fight's drop", () => {
  it("opens the drop reveal as the run reopens on a won fight whose drop waits", async () => {
    const id = fightTemple();
    temples.markRoomCleared(id, "1F", FIGHT_ROOM);
    const screen = templeScreen(id, FIGHT_ROOM);

    await screen.showPage();

    expect(screen.showDropReveal).toHaveBeenCalledTimes(1);
  });

  it("opens it once: not on a later arrival in the room, nor when the page shows again; the sheet keeps Take it", async () => {
    const id = fightTemple();
    temples.markRoomCleared(id, "1F", FIGHT_ROOM);
    const screen = templeScreen(id, FIGHT_ROOM);
    await screen.showPage();

    await screen.arrive();
    await screen.showPage();

    expect(screen.showDropReveal).toHaveBeenCalledTimes(1);
    const sheet = roomActions(dungeons.getRoom(id, FIGHT_ROOM)!, contextAt(id, FIGHT_ROOM));
    expect(sheet.actions.map((action) => action.label)).toContain("Take it");
  });

  it("opens nothing as the battle returns to a fight still live (the hero fled), and opens it when a second fight there is won", async () => {
    const id = fightTemple();
    const screen = templeScreen(id, FIGHT_ROOM);

    await screen.showPage();
    expect(screen.showDropReveal).not.toHaveBeenCalled();

    // A second battle in the same room returns to the same page, which Ionic shows again instead of building anew
    temples.markRoomCleared(id, "1F", FIGHT_ROOM);
    await screen.showPage();
    expect(screen.showDropReveal).toHaveBeenCalledTimes(1);
  });

  it("opens nothing on a plain arrival in a room whose fight is still live", async () => {
    const id = fightTemple();
    const screen = templeScreen(id);
    await screen.showPage();

    await screen.arrive();

    expect(screen.showDropReveal).not.toHaveBeenCalled();
  });

  it("opens nothing when the hero walked in rather than came back from a battle, drop or no drop", async () => {
    const id = fightTemple();
    temples.markRoomCleared(id, "1F", FIGHT_ROOM);
    const screen = templeScreen(id);

    await screen.showPage();
    await screen.arrive();

    expect(screen.showDropReveal).not.toHaveBeenCalled();
  });
});

describe("the battle return keys its drop by floor as well as row and column", () => {
  /** A two-floor temple with the same fight room (a small key drop) at the same row and column on each floor */
  const towerTemple = (): string => makeTemple(
    { E: { type: "entrance" }, M: { type: "monster", content: { beasts: ["beast-socktopus"], drops: SMALL_KEY_DROP } } },
    { "1F": [["E", "M"]], "2F": [["E", "M"]] }
  );

  it("opens a second won drop at the same row and column on another floor, once each", async () => {
    const id = towerTemple();
    enter(id, FIGHT_ROOM, "1F");
    temples.markRoomCleared(id, "1F", FIGHT_ROOM);
    let routeLevel = "1F";
    const screen = templeScreen(id, FIGHT_ROOM, () => routeLevel);
    await screen.showPage();
    expect(screen.showDropReveal).toHaveBeenCalledTimes(1);

    // The hero climbs, wins the same room on 2F, and the battle returns there: the same page shows again, ?level=2F
    temples.getTempleState(id)!.currentLevel = "2F";
    temples.markRoomCleared(id, "2F", FIGHT_ROOM);
    routeLevel = "2F";
    await screen.showPage();
    expect(screen.showDropReveal).toHaveBeenCalledTimes(2);

    await screen.showPage();
    expect(screen.showDropReveal).toHaveBeenCalledTimes(2);
  });

  it("opens nothing when the route names a floor the hero does not stand on", async () => {
    const id = towerTemple();
    enter(id, FIGHT_ROOM, "1F");
    temples.markRoomCleared(id, "1F", FIGHT_ROOM);
    const screen = templeScreen(id, FIGHT_ROOM, () => "2F");

    await screen.showPage();

    expect(screen.showDropReveal).not.toHaveBeenCalled();
  });
});

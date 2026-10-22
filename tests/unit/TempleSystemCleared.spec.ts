import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import {
  battleReturnRoute,
  resolveBattleContext,
  templeBattleRoute,
  type BattleContext,
} from "@/app/Console/BattleField/battle/battleContext";
import { DungeonManager } from "@/lib/engine/core/dungeons/DungeonManager";
import { TempleHydrator } from "./helpers/dslTemple";
import { TempleSystem } from "@/lib/engine/core/dungeons/TempleSystem";
import { useTemple } from "@/hooks/temples/useTemple";
import { HometownRoutes } from "@/router/Console/hometown.routes";

// TempleGrounds pulls in the whole app shell (Ionic, stores, audio, IndexedDB); only its start-up wiring is under test
const mockRegisterTemples = jest.fn();
jest.mock("@/lib/mixins/ionic", () => ({ __esModule: true, default: {} }));
// What the screen asks Ionic to run when its page is entered again (a parked page comes back), kept for the specs to fire
const mockViewEnters: Array<() => unknown> = [];
jest.mock("@ionic/vue", () => ({
  actionSheetController: {},
  alertController: {},
  onIonViewWillEnter: (hook: () => unknown) => mockViewEnters.push(hook),
  // Once shown, a battle return opens a won fight's drop (useTempleEntry); no page here is shown after a battle
  onIonViewDidEnter: () => undefined,
}));
jest.mock("@/lib/engine/core/dungeons/TempleAdapter", () => ({
  registerAllTemples: () => mockRegisterTemples(),
  registerCustomTemples: () => Promise.resolve(),
}));
jest.mock("@/lib/engine/core/dungeons/importAllTemples", () => ({
  importAllTempleLayouts: () => Promise.resolve(),
  // openTemple waits for the shipped temples' seed sync before it reads a temple's record
  ensureBuiltInTemples: () => Promise.resolve(),
}));
jest.mock("@/lib/store/stores/user", () => ({
  useUserStore: () => ({
    users: { "hero-1": {} },
    currentUser: { id: "hero-1" },
    loadUsers: () => undefined,
    getUserById: () => undefined,
  }),
}));
// The temple screen asks for the hero's progress to be saved; whether it is, is TempleProgress.spec's business
jest.mock("@/lib/databases/TempleProgressDb", () => ({
  getTempleProgressDb: () => ({
    getProgress: () => Promise.resolve(null),
    saveProgress: (progress: unknown) => Promise.resolve(progress),
  }),
}));
jest.mock("@/assets/fx", () => ({ play$fx: () => undefined }));
jest.mock("@/app/Console/MyPortal/UserHud/components/XpFabUserHud.vue", () => ({ __esModule: true, default: {} }));
jest.mock("@/app/Console/MyPortal/UserHud/components/XpXpBar.vue", () => ({ __esModule: true, default: {} }));
jest.mock("@/app/Console/MyPortal/UserHud/components/XpMainHud.vue", () => ({ __esModule: true, default: {} }));

// The .ts is the component; importing "TempleGrounds" would resolve to the .vue next to it
const TempleGrounds = require("@/app/Console/TempleGrounds/TempleGrounds.ts").default;

const dungeons = DungeonManager.getInstance();
const temples = TempleSystem.getInstance();

// The real temple route record, with a blank page, so the specs never load the app
const templeRecord = HometownRoutes.find((record) => record.name === "temple")!;
const createTempleRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [{ path: templeRecord.path, name: "temple", component: { render: () => null } }],
  });

// Both singletons outlive a test, so every test gets a temple of its own
let counter = 0;
const nextId = () => `cleared-temple-${++counter}`;

/** One floor: the entrance, an empty hall, then a hard monster (M01!) whose room seals its doors on entry. */
const registerHall = (id: string) => {
  dungeons.registerDungeon(TempleHydrator.hydrate("EXIT R000 M01!", id, id));
  return id;
};

/** Two floors: 1F is the entrance and a hall, 2F is a hall and the sealing monster. */
const registerTower = (id: string) => {
  dungeons.registerDungeon(TempleHydrator.hydrateMultiFloor({ "1F": "EXIT R000", "2F": "R000 M01!" }, id, id));
  return id;
};

/** Two floors with a teleporter on each, at different columns: 1F is the entrance, a teleporter, a hall; 2F is two halls, a teleporter. */
const registerTeleportTower = (id: string) => {
  dungeons.registerDungeon(TempleHydrator.hydrateMultiFloor({ "1F": "EXIT TELE R000", "2F": "R000 R000 TELE" }, id, id));
  return id;
};

const SEALED = { north: true, south: true, east: true, west: true };
const OPEN = { north: false, south: false, east: false, west: false };

describe("TempleSystem.markRoomCleared", () => {
  it("remembers the room by floor and position", () => {
    const id = registerHall(nextId());
    temples.initTemple(id);

    temples.markRoomCleared(id, "1F", [0, 2]);

    expect(temples.isRoomCleared(id, "1F", [0, 2])).toBe(true);
    expect(temples.isRoomCleared(id, "2F", [0, 2])).toBe(false);
    expect(temples.isRoomCleared(id, "1F", [0, 1])).toBe(false);
  });

  it("keeps the cleared key when the temple is initialised again", () => {
    const id = registerHall(nextId());
    temples.initTemple(id);
    temples.markRoomCleared(id, "1F", [0, 2]);

    // The temple screen mounts again after the battle and runs initTemple for the room the hero is in
    expect(temples.initTemple(id, [0, 2])).toBe(true);
    temples.markRoomCleared(id, "1F", [0, 1]); // a later win elsewhere does not replace the first

    expect(temples.isRoomCleared(id, "1F", [0, 2])).toBe(true);
    expect(temples.isRoomCleared(id, "1F", [0, 1])).toBe(true);
  });

  it("creates the temple state when a reload wiped it, shaped like initTemple's", () => {
    const reloaded = nextId(); // the battle page after a hard reload: no dungeon registered, no temple state
    expect(temples.getTempleState(reloaded)).toBeUndefined();

    temples.markRoomCleared(reloaded, "2F", [3, 4]);

    const state = temples.getTempleState(reloaded)!;
    expect(state).toMatchObject({
      hasMap: false,
      hasCompass: false,
      playerKeys: 0,
      currentLevel: "2F",
      currentPosition: [3, 4],
    });
    expect([...state.visitedRooms]).toEqual(["2F:3,4"]);
    expect([...state.clearedRooms!]).toEqual(["2F:3,4"]);
    expect(temples.isRoomCleared(reloaded, "2F", [3, 4])).toBe(true);

    const initialised = registerHall(nextId());
    temples.initTemple(initialised);
    expect(Object.keys(state).sort()).toEqual(Object.keys(temples.getTempleState(initialised)!).sort());
  });

  it("records the visit in the dungeon too when it is already registered", () => {
    const id = registerHall(nextId());

    temples.markRoomCleared(id, "1F", [0, 2]); // registered, but nobody ever initialised the temple

    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 2] });
    expect(temples.hasVisited(id, [0, 2])).toBe(true);
    expect(temples.getCurrentRoom(id)?.type).toBe("monster");
  });

  it("does not hand the caller's position array to the temple state", () => {
    const id = nextId();
    const position: [number, number] = [1, 2];

    temples.markRoomCleared(id, "1F", position);
    position[0] = 9;

    expect(temples.getTempleState(id)?.currentPosition).toEqual([1, 2]);
  });

  it("lets the temple screen open the reloaded hero on the floor they fought on", () => {
    const id = nextId();
    temples.markRoomCleared(id, "2F", [0, 1]); // battle page, hard reload: nothing is registered yet
    registerTower(id); // the temple screen registers the dungeons when it mounts...

    expect(temples.initTemple(id, [0, 1], "2F")).toBe(true); // ...and initialises the temple

    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "2F", currentPosition: [0, 1] });
    expect(temples.getCurrentRoom(id)?.type).toBe("monster");
    expect(temples.isRoomCleared(id, "2F", [0, 1])).toBe(true);
    // The reload never sealed the room, so the hero can walk straight out
    expect(temples.getCurrentRoom(id)?.locked).toBeUndefined();
    expect(temples.moveToPosition(id, [0, 0], "west")).toBe(true);
  });

  describe("doors", () => {
    it("opens the doors a lockOnEnter fight sealed, so the winner is not stuck", () => {
      const id = registerHall(nextId());
      temples.initTemple(id);
      expect(temples.moveToPosition(id, [0, 1], "east")).toBe(true);
      expect(temples.moveToPosition(id, [0, 2], "east")).toBe(true); // M01!: every door locks behind the hero

      const room = temples.getCurrentRoom(id)!;
      expect(room.locked).toEqual(SEALED);
      expect(temples.moveToPosition(id, [0, 1], "west")).toBe(false);

      temples.markRoomCleared(id, "1F", [0, 2]);

      expect(room.locked).toEqual(OPEN);
      temples.markRoomCleared(id, "1F", [0, 2]); // a second win report changes nothing
      expect(room.locked).toEqual(OPEN);
      expect(temples.moveToPosition(id, [0, 1], "west")).toBe(true);
      // Walking back in does not seal the room a second time
      expect(temples.moveToPosition(id, [0, 2], "east")).toBe(true);
      expect(temples.getCurrentRoom(id)!.locked).toEqual(OPEN);
    });

    it("opens the room on the floor that was cleared, not the one the hero is standing on", () => {
      const id = registerTower(nextId());
      temples.initTemple(id, [1, 0, 0]); // [floorIndex, row, col]: the 2F hall
      expect(temples.moveToPosition(id, [0, 1], "east")).toBe(true); // M01! on 2F
      const room = temples.getCurrentRoom(id)!;
      expect(room.locked).toEqual(SEALED);

      temples.markRoomCleared(id, "2F", [0, 1]);

      expect(room.locked).toEqual(OPEN);
      expect(temples.isRoomCleared(id, "2F", [0, 1])).toBe(true);
    });

    it("puts a key door that was authored on the sealed room back instead of opening it", () => {
      const id = nextId();
      const dungeon = TempleHydrator.hydrate("EXIT R000 M01!", id, id);
      dungeon.rooms["R0_2"].locked = { north: true };
      dungeons.registerDungeon(dungeon);
      temples.initTemple(id);
      temples.moveToPosition(id, [0, 1], "east");
      temples.moveToPosition(id, [0, 2], "east");
      const room = temples.getCurrentRoom(id)!;
      expect(room.locked).toEqual(SEALED);

      temples.markRoomCleared(id, "1F", [0, 2]);

      expect(room.locked).toEqual({ ...OPEN, north: true });
    });

    it("seals a fight the hero has seen but not won, every time they walk in (7.2)", () => {
      const id = registerHall(nextId());
      temples.initTemple(id, [0, 2]); // a reload put the hero in the fight: visited, never sealed
      expect(temples.getCurrentRoom(id)?.locked).toBeUndefined();
      expect(temples.moveToPosition(id, [0, 1], "west")).toBe(true);

      expect(temples.moveToPosition(id, [0, 2], "east")).toBe(true);

      expect(temples.getCurrentRoom(id)!.locked).toEqual(SEALED);
      expect(temples.moveToPosition(id, [0, 1], "west")).toBe(false);
    });

    it("leaves the key door of a combat room that never sealed (a miniboss guarding a chest)", () => {
      const id = nextId();
      const dungeon = TempleHydrator.hydrate("EXIT MINI", id, id);
      dungeon.rooms["R0_1"].locked = { north: true };
      dungeons.registerDungeon(dungeon);
      temples.initTemple(id);
      temples.moveToPosition(id, [0, 1], "east");

      temples.markRoomCleared(id, "1F", [0, 1]);

      expect(temples.getCurrentRoom(id)!.locked).toEqual({ north: true });
      expect(temples.isRoomCleared(id, "1F", [0, 1])).toBe(true);
    });
  });
});

describe("TempleSystem.initTemple start floor", () => {
  it("starts a fresh temple on the floor that was named", () => {
    const id = registerTower(nextId());

    expect(temples.initTemple(id, [0, 1], "2F")).toBe(true);

    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "2F", currentPosition: [0, 1] });
    expect(temples.getCurrentRoom(id)?.type).toBe("monster");
  });

  it("still reads the [floorIndex, row, col] form, and lets a named floor win over the index", () => {
    const byIndex = registerTower(nextId());
    temples.initTemple(byIndex, [1, 0, 1]);
    expect(temples.getTempleState(byIndex)).toMatchObject({ currentLevel: "2F", currentPosition: [0, 1] });

    const byName = registerTower(nextId());
    temples.initTemple(byName, [1, 0, 1], "1F");
    expect(temples.getTempleState(byName)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 1] });
  });

  it("ignores a floor the temple does not have", () => {
    const tower = registerTower(nextId());
    temples.initTemple(tower, [0, 0], "9F");
    expect(temples.getTempleState(tower)?.currentLevel).toBe("1F");

    const hall = registerHall(nextId()); // a one-grid temple only has 1F
    temples.initTemple(hall, [0, 0], "2F");
    expect(temples.getTempleState(hall)?.currentLevel).toBe("1F");
  });

  it("keeps the hero where they are when the temple is already running", () => {
    const id = registerTower(nextId());
    temples.initTemple(id, [0, 1], "2F");

    temples.initTemple(id, [0, 0], "1F");

    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "2F", currentPosition: [0, 1] });
  });

  it("hands the floor the temple screen passes through useTemple to the temple", async () => {
    const id = registerTower(nextId());
    const wrapper = mount(
      defineComponent({
        setup: () => useTemple(id, [0, 1], "2F"),
        render: () => null,
      })
    );

    const vm = wrapper.vm as any;
    await vm.whenOpened; // the run starts once the temple's saved layout was read
    expect(vm.currentLevel).toBe("2F");
    expect(vm.currentPosition).toEqual([0, 1]);
    expect(vm.currentRoom?.type).toBe("monster");
    wrapper.unmount();
  });
});

describe("rooms are told apart by floor", () => {
  it("does not count a visit on 1F for the same coordinates on 2F", () => {
    const id = registerTower(nextId());

    dungeons.visitRoom(id, [0, 1], "1F");

    expect(dungeons.hasVisited(id, [0, 1], "1F")).toBe(true);
    expect(dungeons.hasVisited(id, [0, 1], "2F")).toBe(false);
    expect(dungeons.hasVisited(id, [0, 0], "1F")).toBe(false);
  });

  it("asks the floor the hero stands on whether a room was visited", () => {
    const id = registerTeleportTower(nextId());
    temples.initTemple(id, [0, 1]); // standing on the 1F teleporter
    expect(temples.hasVisited(id, [0, 1])).toBe(true);

    expect(temples.handleTeleport(id)).toEqual([0, 2]); // the 2F teleporter
    expect(temples.getTempleState(id)?.currentLevel).toBe("2F");

    // Nobody walked 2F's [0, 1], whatever was visited at the same coordinates upstairs
    expect(temples.hasVisited(id, [0, 1])).toBe(false);
    expect(temples.hasVisited(id, [0, 2])).toBe(true);
    expect(dungeons.hasVisited(id, [0, 1], "1F")).toBe(true);
  });

  it("opens the chest of the floor that was asked for", () => {
    const id = nextId();
    const dungeon = TempleHydrator.hydrateMultiFloor({ "1F": "EXIT $001", "2F": "R000 $001" }, id, id);
    dungeon.rooms["1F:R0_1"].content = { chest: "dungeon", dungeon: "map" };
    dungeon.rooms["2F:R0_1"].content = { chest: "dungeon", dungeon: "compass" };
    dungeons.registerDungeon(dungeon);

    expect(dungeons.openChestInRoom(id, [0, 1], "2F")).toMatchObject({ dungeon: "compass" });
    expect(dungeons.openChestInRoom(id, [0, 1], "1F")).toMatchObject({ dungeon: "map" });
    expect(dungeons.openChestInRoom(id, [0, 1])).toMatchObject({ dungeon: "map" }); // 1F stays the default
  });

  it("empties the chest of the floor the hero stands on", () => {
    const id = nextId();
    const dungeon = TempleHydrator.hydrateMultiFloor({ "1F": "EXIT $001", "2F": "R000 $001" }, id, id);
    dungeon.rooms["1F:R0_1"].content = { chest: "dungeon", dungeon: "map" };
    dungeon.rooms["2F:R0_1"].content = { chest: "dungeon", dungeon: "compass" };
    dungeons.registerDungeon(dungeon);
    temples.initTemple(id, [0, 1], "2F");

    expect(temples.openChest(id)).toMatchObject({ compassFound: true });

    expect(temples.getTempleState(id)).toMatchObject({ hasCompass: true, hasMap: false });
    expect(dungeons.openChestInRoom(id, [0, 1], "1F")).toMatchObject({ dungeon: "map" }); // 1F's chest was not touched
  });
});

describe("temple return route", () => {
  const battleRoute = (level: string) => {
    const link = templeBattleRoute("hero-1", "wind-temple", level, 3, 4) as {
      name: string;
      params: Record<string, string>;
    };
    return { name: link.name, params: link.params, query: {}, meta: {} } as any;
  };

  const router = createTempleRouter();

  it("carries the floor of the fight back to the temple", () => {
    const back = battleReturnRoute(resolveBattleContext(battleRoute("2F")));

    expect(back).toEqual({
      name: "temple",
      params: { temple: "wind-temple", userId: "hero-1", x: "3", y: "4" },
      query: { level: "2F" },
    });
  });

  it("resolves against the real temple route with the floor as a query param", () => {
    const resolved = router.resolve(battleReturnRoute(resolveBattleContext(battleRoute("2F"))));

    expect(resolved.fullPath).toBe("/temple/wind-temple/hero-1/3/4?level=2F");
    expect(resolved.query).toEqual({ level: "2F" });
    expect(resolved.params).toMatchObject({ temple: "wind-temple", userId: "hero-1", x: "3", y: "4" });
  });

  it("leaves the query off when the battle names no floor", () => {
    const ctx: BattleContext = { kind: "temple", userId: "hero-1", templeId: "wind-temple", x: 3, y: 4, beastIds: [] };

    expect(battleReturnRoute(ctx)).toEqual({
      name: "temple",
      params: { temple: "wind-temple", userId: "hero-1", x: "3", y: "4" },
    });
    expect(battleReturnRoute(ctx)).not.toHaveProperty("query");
  });
});

describe("TempleGrounds start", () => {
  /** Mounts the temple screen the way the router would after a battle sends the hero back. */
  const openTempleScreen = async (id: string, url: string, props: Record<string, string>) => {
    mockRegisterTemples.mockImplementation(() => registerTower(id)); // the screen registers its dungeons on setup
    const router = createTempleRouter();
    await router.push(url);
    await router.isReady();
    const wrapper = mount({ ...TempleGrounds, render: () => null }, { props, global: { plugins: [router] } });
    await (wrapper.vm as any).whenOpened; // the run starts once the temple's saved layout was read
    return wrapper;
  };

  it("puts the hero on the floor named by ?level= in the room named by x and y", async () => {
    const id = nextId();

    const wrapper = await openTempleScreen(id, `/temple/${id}/hero-1/1/0?level=2F`, {
      userId: "hero-1",
      temple: id,
      x: "1",
      y: "0",
    });

    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "2F", currentPosition: [0, 1] });
    expect((wrapper.vm as any).currentRoom?.type).toBe("monster");
    wrapper.unmount();
  });

  it("starts on the default floor when the route names none", async () => {
    const id = nextId();

    const wrapper = await openTempleScreen(id, `/temple/${id}/hero-1/1/0`, {
      userId: "hero-1",
      temple: id,
      x: "1",
      y: "0",
    });

    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 1] });
    wrapper.unmount();
  });

  it("ignores a floor that comes without a room to stand in", async () => {
    const id = nextId();

    const wrapper = await openTempleScreen(id, `/temple/${id}/hero-1?level=2F`, { userId: "hero-1", temple: id });

    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 0] });
    wrapper.unmount();
  });

  it("opens the temple for the hero the route names, so their progress is the one kept", async () => {
    const id = nextId();

    const wrapper = await openTempleScreen(id, `/temple/${id}/hero-2/1/0`, {
      userId: "hero-2",
      temple: id,
      x: "1",
      y: "0",
    });

    expect(temples.getHeroId(id)).toBe("hero-2");
    wrapper.unmount();
  });

  it("opens the temple for the signed-in hero when the route names none", async () => {
    const id = nextId();

    const wrapper = await openTempleScreen(id, `/temple/${id}`, { temple: id });

    expect(temples.getHeroId(id)).toBe("hero-1"); // the current user of the mocked store
    wrapper.unmount();
  });

  it("moves the background when a saved run puts the hero in another room after the mount", async () => {
    const id = nextId();
    const wrapper = await openTempleScreen(id, `/temple/${id}/hero-1/0/0`, { userId: "hero-1", temple: id, x: "0", y: "0" });
    const vm = wrapper.vm as any;
    expect(vm.backgroundPosition.x).not.toBe(-window.innerWidth);

    temples.getTempleState(id)!.currentPosition = [0, 1]; // what reading the save does to the temple state
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(vm.backgroundPosition.x).toBe(-window.innerWidth);
    wrapper.unmount();
  });

  // Ionic keeps the page parked after a push (Portal Home goes home that way) and shows it again on Back
  describe("when the page is entered again", () => {
    const enterAgain = () => mockViewEnters[mockViewEnters.length - 1]();

    it("opens the temple again at the entrance when the run was put away (Portal Home)", async () => {
      const id = nextId();
      const wrapper = await openTempleScreen(id, `/temple/${id}/hero-1`, { userId: "hero-1", temple: id });
      const vm = wrapper.vm as any;
      await temples.whenProgressReady(id);
      temples.moveToPosition(id, [0, 1], "east");
      await temples.leaveByPortal(id);
      expect(temples.getTempleState(id)).toBeUndefined();

      await enterAgain();

      expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 0] });
      expect(temples.getHeroId(id)).toBe("hero-1");
      expect(vm.currentPosition).toEqual([0, 0]);
      wrapper.unmount();
    });

    it("leaves a run that is still going alone", async () => {
      const id = nextId();
      const wrapper = await openTempleScreen(id, `/temple/${id}/hero-1`, { userId: "hero-1", temple: id });
      await temples.whenProgressReady(id);
      temples.moveToPosition(id, [0, 1], "east");
      const running = temples.getTempleState(id);

      await enterAgain();

      expect(temples.getTempleState(id)).toBe(running);
      expect(running).toMatchObject({ currentPosition: [0, 1] });
      wrapper.unmount();
    });
  });
});

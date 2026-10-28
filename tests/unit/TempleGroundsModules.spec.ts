import { defineComponent, ref } from "vue";
import { addDays, format } from "date-fns";
import { flushPromises, mount } from "@vue/test-utils";
import { toStartLevel, toStartPosition } from "@/app/Console/TempleGrounds/templeGrounds/routeStart";
import { getTempleWorldLocation } from "@/app/Console/TempleGrounds/templeGrounds/useTempleMeta";
import { useProjectTower } from "@/app/Console/TempleGrounds/templeGrounds/useProjectTower";
import { resolveSwipeDirection, useTempleMovement } from "@/app/Console/TempleGrounds/templeGrounds/useTempleMovement";
import { dateKey } from "@/lib/services/core/packs/packCommon";
import type { ProjectFloor, ProjectRecord } from "@/lib/services/projects/projectRecord";
import { markFloorSeen, onFloorReached, readTower } from "@/lib/services/projects/projectService";

// The tower in play reads and writes the project through its service: the screen's composable is tested over a stub of it
jest.mock("@/lib/services/projects/projectService", () => ({
  __esModule: true,
  onFloorReached: jest.fn(),
  readTower: jest.fn(),
  markFloorSeen: jest.fn(),
}));

// Characterization: what the temple screen's pure helpers return today, pinned when they left TempleGrounds.ts

describe("getTempleWorldLocation", () => {
  it.each([
    ["wind-temple", "plains", "world-plains"],
    ["water-temple", "islands", "world-islands"],
    ["earth-temple", "forest", "world-forest"],
    ["fire-temple", "mountains", "world-mountains"],
    ["ice-temple", "ice", "world-ice"],
    ["light-temple", "sands", "world-sands"],
    ["shadow-temple", "swamps", "world-swamps"],
    ["moon-temple", "the-moon", "the-moon"],
    ["storm-temple", "clouds", "world-clouds"],
  ])("walks out of %s into %s (%s)", (templeId, world, route) => {
    expect(getTempleWorldLocation(templeId)).toEqual({ world, route });
  });

  it.each(["gen-pantry-31", "", "WIND-TEMPLE"])("sends %p, which it does not know, home to town", (templeId) => {
    expect(getTempleWorldLocation(templeId)).toEqual({ world: "plains", route: "home-town" });
  });
});

// Characterization: the route's x, y and ?level, pinned when they left TempleGrounds.ts (the move changed nothing)
describe("toStartPosition", () => {
  it("is [row, col] for a complete numeric pair, with the route's strings and zero included", () => {
    expect(toStartPosition("2", "5")).toEqual([5, 2]);
    expect(toStartPosition("0", "0")).toEqual([0, 0]);
    expect(toStartPosition(1, 3)).toEqual([3, 1]);
  });

  it.each([
    [undefined, "1"],
    ["1", undefined],
    [null, "1"],
    ["", "1"],
    ["1", ""],
    ["a", "1"],
    ["1.5", "1"],
    ["-1", "1"],
  ])("is no start position for x=%p y=%p", (x, y) => {
    expect(toStartPosition(x, y)).toBeUndefined();
  });
});

describe("toStartLevel", () => {
  it("is the floor the route names, only next to a start position", () => {
    expect(toStartLevel("2F", [1, 1])).toBe("2F");
    expect(toStartLevel(["3F", "4F"], [1, 1])).toBe("3F");
    expect(toStartLevel("2F", undefined)).toBeUndefined();
  });

  it("is none for a blank or non-text floor", () => {
    expect(toStartLevel("", [1, 1])).toBeUndefined();
    expect(toStartLevel(undefined, [1, 1])).toBeUndefined();
    expect(toStartLevel(2, [1, 1])).toBeUndefined();
  });
});

describe("resolveSwipeDirection", () => {
  it("drags the world: a swipe right goes west, a swipe left goes east", () => {
    expect(resolveSwipeDirection(80, 10)).toBe("west");
    expect(resolveSwipeDirection(-80, 10)).toBe("east");
  });

  it("a swipe down goes north, a swipe up goes south", () => {
    expect(resolveSwipeDirection(10, 80)).toBe("north");
    expect(resolveSwipeDirection(10, -80)).toBe("south");
  });

  it("reads a diagonal by its longer side, and a tie as vertical", () => {
    expect(resolveSwipeDirection(60, -59)).toBe("west");
    expect(resolveSwipeDirection(-59, 60)).toBe("north");
    expect(resolveSwipeDirection(50, 50)).toBe("north");
    expect(resolveSwipeDirection(-50, -50)).toBe("south");
  });

  it("reads no movement at all as south", () => {
    expect(resolveSwipeDirection(0, 0)).toBe("south");
  });
});

describe("useTempleMovement: what a tap or a swipe toward each kind of side does", () => {
  /** The hero in the middle of a room, every side open; `kind` is what the temple calls the side that is tried */
  const walk = (kind: string, { locked = false } = {}) => {
    const deps = {
      props: { temple: "t" } as never,
      templeSystem: { doorKind: jest.fn(() => kind) } as never,
      currentPosition: ref<[number, number]>([1, 1]),
      canMoveUp: ref(true),
      canMoveDown: ref(true),
      canMoveLeft: ref(true),
      canMoveRight: ref(true),
      isDoorLocked: jest.fn(() => locked),
      stepTo: jest.fn(() => true),
      fx: jest.fn(),
      updateBg: jest.fn(),
      showLockedDoor: jest.fn(),
      showCrackedWall: jest.fn(),
      arrive: jest.fn(),
    };
    let movement!: ReturnType<typeof useTempleMovement>;
    mount(
      defineComponent({
        setup: () => {
          movement = useTempleMovement(deps as never);
          return () => null;
        },
      })
    );
    deps.updateBg.mockClear(); // the mount puts the floor under the hero
    return { deps, movement };
  };

  it("brings a cracked wall up close, and neither steps nor slides the floor", () => {
    const { deps, movement } = walk("bombable");

    movement.handleMove("north");

    expect(deps.showCrackedWall).toHaveBeenCalledWith("north");
    expect(deps.stepTo).not.toHaveBeenCalled();
    expect(deps.updateBg).not.toHaveBeenCalled();
    expect(deps.showLockedDoor).not.toHaveBeenCalled();
  });

  it("brings a cracked wall up before a lock on the same side", () => {
    const { deps, movement } = walk("bombable", { locked: true });

    movement.handleMove("east");

    expect(deps.showCrackedWall).toHaveBeenCalledWith("east");
    expect(deps.showLockedDoor).not.toHaveBeenCalled();
  });

  it("brings a cracked wall up for a swipe toward it, as for a tap", () => {
    const { deps, movement } = walk("bombable");

    movement.handleTouchStart({ changedTouches: [{ clientX: 200, clientY: 300 }] } as never);
    movement.handleTouchEnd({ changedTouches: [{ clientX: 100, clientY: 300 }] } as never); // a swipe left goes east

    expect(deps.showCrackedWall).toHaveBeenCalledWith("east");
    expect(deps.stepTo).not.toHaveBeenCalled();
  });

  it("steps through an open side", () => {
    const { deps, movement } = walk("open");

    movement.handleMove("south");

    expect(deps.showCrackedWall).not.toHaveBeenCalled();
    expect(deps.stepTo).toHaveBeenCalledWith("south");
    expect(deps.fx).toHaveBeenCalledWith("step");
  });

  it("still brings a locked door and the boss door up as doors", () => {
    const locked = walk("locked", { locked: true });
    locked.movement.handleMove("west");
    expect(locked.deps.showLockedDoor).toHaveBeenCalledWith("west");
    expect(locked.deps.showCrackedWall).not.toHaveBeenCalled();

    const boss = walk("master");
    boss.movement.handleMove("east");
    expect(boss.deps.showLockedDoor).toHaveBeenCalledWith("east");
  });
});

describe("useProjectTower: the tower in play on the temple screen", () => {
  const TOWER = "gen-project-spring-cleaning";
  const reach = onFloorReached as jest.Mock;
  const readIt = readTower as jest.Mock;
  const seen = markFloorSeen as jest.Mock;
  const templeSystem = { whenProgressReady: jest.fn(async () => undefined), refreshQuestRooms: jest.fn(async () => undefined) };

  const inDays = (days: number): string => dateKey(addDays(new Date(), days));
  const floorOf = (floorKey: string, phaseId: string, dueIn: number, extra: Partial<ProjectFloor> = {}): ProjectFloor => ({
    floorKey,
    phaseId,
    window: { phaseId, opensOn: inDays(dueIn - 9), dueOn: inDays(dueIn) },
    questIds: [`pq-${floorKey}`],
    wokenAt: "2027-04-01T09:00:00.000Z",
    ...extra,
  });
  const projectOf = (floors: ProjectFloor[]): ProjectRecord => ({
    id: "spring-cleaning-2027-04-01",
    typeId: "spring-cleaning",
    templeId: TOWER,
    status: "active",
    startOn: inDays(-6),
    endOn: inDays(10),
    house: { rooms: { kitchen: 1 } },
    floors,
    chores: [],
    reward: { text: "Pizza night", seenBy: [] },
    creditsSeenBy: [],
  });
  const openTower = (): ProjectRecord => projectOf([floorOf("1F", "declutter", 3), floorOf("2F", "deep-clean", 6, { wokenAt: undefined })]);

  /** The temple screen's tower composable over a temple, shown (Ionic's ionViewDidEnter) when the test says so */
  const screen = (temple: string, level = "1F") => {
    const currentLevel = ref(level);
    let tower!: ReturnType<typeof useProjectTower>;
    const wrapper = mount(
      defineComponent({
        setup() {
          tower = useProjectTower({ temple, heroId: "kai", whenOpened: Promise.resolve(true), currentLevel, templeSystem: templeSystem as never });
          return { ready: true };
        },
        render: () => null,
      })
    );
    const vm = wrapper.vm as unknown as { onIonViewDidEnter?: Array<() => void> };
    const showPage = async () => {
      for (const hook of vm.onIonViewDidEnter ?? []) hook();
      await flushPromises();
    };
    return { tower, currentLevel, showPage };
  };

  beforeEach(() => {
    for (const mock of [reach, readIt, seen, templeSystem.whenProgressReady, templeSystem.refreshQuestRooms]) mock.mockClear();
    reach.mockResolvedValue({ woken: [], settled: null });
    readIt.mockResolvedValue({ project: openTower(), cleared: [] });
    seen.mockResolvedValue(undefined);
  });

  it("does nothing for any other temple: no wake, no read, no clock, no lock", async () => {
    const { tower, showPage } = screen("wind-temple");

    await showPage();

    expect(reach).not.toHaveBeenCalled();
    expect(readIt).not.toHaveBeenCalled();
    expect(tower.floorClock.value).toBeNull();
    expect(tower.isFloorCleared("1F")).toBeUndefined();
    expect(tower.towerPrompt.value).toBeNull();
  });

  it("wakes the floor the hero stands on when the page shows, and reads the tower", async () => {
    const { showPage } = screen(TOWER, "2F");

    await showPage();

    expect(reach).toHaveBeenCalledWith(TOWER, "2F", expect.any(Date));
    expect(readIt).toHaveBeenCalled();
  });

  it("wakes the floor the hero arrives on as they climb", async () => {
    const { currentLevel, showPage } = screen(TOWER, "1F");
    await showPage();
    reach.mockClear();

    currentLevel.value = "2F";
    await flushPromises();

    expect(reach).toHaveBeenCalledWith(TOWER, "2F", expect.any(Date));
  });

  it("has the rooms read the hero's board again each time, after the wake: the chores woken since the run read it must fight", async () => {
    const { showPage } = screen(TOWER);

    await showPage();

    expect(templeSystem.refreshQuestRooms).toHaveBeenCalledWith(TOWER);
    expect(reach.mock.invocationCallOrder[0]).toBeLessThan(templeSystem.refreshQuestRooms.mock.invocationCallOrder[0]);
    expect(templeSystem.refreshQuestRooms.mock.invocationCallOrder[0]).toBeLessThan(readIt.mock.invocationCallOrder[0]);
  });

  it("reads the board again even when the wake failed, and keeps going when the board cannot be read", async () => {
    reach.mockRejectedValue(new Error("boom"));
    templeSystem.refreshQuestRooms.mockRejectedValueOnce(new Error("no board"));
    const { tower, showPage } = screen(TOWER);

    await showPage();

    expect(templeSystem.refreshQuestRooms).toHaveBeenCalledTimes(1);
    expect(tower.floorClock.value).not.toBeNull();
  });

  it("lets the stairs climb only from a floor that reads cleared", async () => {
    readIt.mockResolvedValue({ project: openTower(), cleared: ["1F"] });
    const { tower, showPage } = screen(TOWER);

    expect(tower.isFloorCleared("1F")).toBe(false);
    await showPage();

    expect(tower.isFloorCleared("1F")).toBe(true);
    expect(tower.isFloorCleared("2F")).toBe(false);
  });

  it("keeps the stairs shut when the tower cannot be read, and leaves the lock alone when no project is running", async () => {
    readIt.mockRejectedValue(new Error("storage is full"));
    const broken = screen(TOWER);
    await broken.showPage();
    expect(broken.tower.isFloorCleared("1F")).toBe(false);

    readIt.mockResolvedValue(null);
    const over = screen(TOWER);
    await over.showPage();
    expect(over.tower.isFloorCleared("1F")).toBeUndefined();
    expect(over.tower.floorClock.value).toBeNull();
  });

  it("takes the running project of another tower for no project: no clock, no offer, no prompt, no lock", async () => {
    // A cleared Moving Out tower stays in the game; Spring Cleaning is the project running, and its floors share the keys
    const other = projectOf([floorOf("1F", "declutter", 3, { clearedAt: "2027-04-02T09:00:00.000Z", multiplier: 1.6 }), floorOf("2F", "deep-clean", 6)]);
    readIt.mockResolvedValue({ project: other, cleared: ["1F"] });
    const { tower, showPage } = screen("gen-project-moving-out");

    await showPage();

    expect(tower.floorClock.value).toBeNull();
    expect(tower.isFloorCleared("1F")).toBeUndefined();
    expect(tower.isFloorCleared("2F")).toBeUndefined();
    expect(tower.towerPrompt.value).toBeNull();
    expect(seen).not.toHaveBeenCalled();
    // it asked as the tower it is in, so the service woke nothing of the other project
    expect(reach).toHaveBeenCalledWith("gen-project-moving-out", "1F", expect.any(Date));
  });

  it("shows the clock of the floor the hero stands on, with the offer, and follows them up", async () => {
    const { tower, currentLevel, showPage } = screen(TOWER, "1F");
    await showPage();

    const due = format(addDays(new Date(), 3), "EEE");
    expect(tower.floorClock.value).toMatchObject({ floorKey: "1F", name: "Declutter", state: "open" });
    expect(tower.floorClock.value?.line).toContain(`due ${due}, 3 days`);
    expect(tower.floorClock.value?.offer).toMatch(/×\d\.\d/);

    currentLevel.value = "2F";
    expect(tower.floorClock.value?.floorKey).toBe("2F");
  });

  it("tells the hero a floor was cleared, once: Floor cleared! with the bonus, marked seen as it shows", async () => {
    const cleared = projectOf([floorOf("1F", "declutter", 3, { clearedAt: "2027-04-02T09:00:00.000Z", multiplier: 1.6 }), floorOf("2F", "deep-clean", 6)]);
    readIt.mockResolvedValue({ project: cleared, cleared: ["1F"] });
    const { tower, showPage } = screen(TOWER);

    await showPage();

    const prompt = tower.towerPrompt.value;
    expect(prompt?.options.title).toBe("Floor cleared!");
    expect(prompt?.options.lines.join(" ")).toContain("×1.6");
    expect(seen).toHaveBeenCalledWith("kai", "1F");

    tower.answerTowerPrompt({ id: "onward", amount: null });
    await flushPromises();
    expect(tower.towerPrompt.value).toBeNull();
    expect(seen).toHaveBeenCalledTimes(1);

    // the page shows again, and the record says kai saw it
    const told = projectOf([{ ...cleared.floors[0], seenBy: ["kai"] }, cleared.floors[1]]);
    readIt.mockResolvedValue({ project: told, cleared: ["1F"] });
    await showPage();
    expect(tower.towerPrompt.value).toBeNull();
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("tells each cleared floor in turn, lowest first", async () => {
    const two = projectOf([
      floorOf("1F", "declutter", 3, { clearedAt: "2027-04-02T09:00:00.000Z", multiplier: 1 }),
      floorOf("2F", "deep-clean", 6, { clearedAt: "2027-04-03T09:00:00.000Z", multiplier: 1.2 }),
      floorOf("3F", "organize", 8),
    ]);
    readIt.mockResolvedValue({ project: two, cleared: ["1F", "2F"] });
    const { tower, showPage } = screen(TOWER);

    await showPage();
    expect(tower.towerPrompt.value?.options.lines[0]).toContain("Declutter");
    tower.answerTowerPrompt({ id: "onward", amount: null });
    await flushPromises();
    expect(tower.towerPrompt.value?.options.lines[0]).toContain("Deep Clean");
    expect(seen.mock.calls.map((call) => call[1])).toEqual(["1F", "2F"]);
  });

  it("does not stop the screen when the wake fails: the tower is still read", async () => {
    reach.mockRejectedValue(new Error("boom"));
    const { tower, showPage } = screen(TOWER);

    await showPage();

    expect(readIt).toHaveBeenCalled();
    expect(tower.floorClock.value).not.toBeNull();
  });
});

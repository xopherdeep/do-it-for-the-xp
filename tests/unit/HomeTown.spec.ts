import { flushPromises, shallowMount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, reactive } from "vue";
import HomeTown from "@/app/Console/MyPortal/HomeTown/HomeTown.vue";
import type { ProjectRecord } from "@/lib/services/projects/projectRecord";
import { readTower, readTrophies } from "@/lib/services/projects/projectService";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * GitHub issue 146: Ionic keeps HomeTown cached, so when the party switches heroes the same page instance sees a new
 * `:userId` on the route. Every building in the plaza has to send the hero now on the route, not the first one.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));

const mockPush = jest.fn();
const mockRoute = reactive({ name: "home-town", params: { userId: "hero-1" } as Record<string, string> });

jest.mock("vue-router", () => ({
  ...jest.requireActual("vue-router"),
  useRouter: () => ({ push: mockPush }),
  useRoute: () => mockRoute,
}));

jest.mock("@/lib/databases/TempleDb", () => ({
  __esModule: true,
  templeStorage: { create: jest.fn(async () => undefined) },
  TempleDb: class {
    getTempleById = async () => null;
  },
}));

jest.mock("@/lib/services/projects/projectService", () => ({ __esModule: true, readTower: jest.fn(), readTrophies: jest.fn() }));

const running = readTower as jest.Mock;
const trophies = readTrophies as jest.Mock;

const mountTown = () => shallowMount(HomeTown);

const enter = (wrapper: ReturnType<typeof mountTown>, label: string) => {
  const action = (wrapper.vm as any).userActions.find((a: { label: string }) => a.label === label);
  action.click();
};

describe("HomeTown", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockPush.mockClear();
    mockRoute.params.userId = "hero-1";

    const userStore = useUserStore();
    userStore.addUser({ id: "hero-1", nick: "Arthur", stats: { hp: 10, maxHp: 10 } });
    userStore.addUser({ id: "hero-2", nick: "Guinevere", stats: { hp: 10, maxHp: 10 } });
  });

  it("sends the hero on the route into the bank when the page is first opened", () => {
    const wrapper = mountTown();

    expect((wrapper.vm as any).userId).toBe("hero-1");
    expect((wrapper.vm as any).user.nick).toBe("Arthur");

    enter(wrapper, "Bank");
    expect(mockPush).toHaveBeenCalledWith({ name: "bank", params: { userId: "hero-1" } });
  });

  it("sends the new hero after the route's userId changes on the cached page", async () => {
    const wrapper = mountTown();

    mockRoute.params.userId = "hero-2";
    await nextTick();

    expect((wrapper.vm as any).userId).toBe("hero-2");
    expect((wrapper.vm as any).user.nick).toBe("Guinevere");

    enter(wrapper, "Bank");
    expect(mockPush).toHaveBeenCalledWith({ name: "bank", params: { userId: "hero-2" } });

    enter(wrapper, "The Plains");
    expect(mockPush).toHaveBeenLastCalledWith({ name: "world-plains", params: { userId: "hero-2" } });
    expect(mockPush).not.toHaveBeenCalledWith({ name: "bank", params: { userId: "hero-1" } });
  });
});

/** A project of Spring Cleaning, running or cleared, with the floors the spot reads */
const projectOf = (status: ProjectRecord["status"], id = "spring-cleaning-2027-04-01"): ProjectRecord => ({
  id,
  typeId: "spring-cleaning",
  templeId: "gen-project-spring-cleaning",
  status,
  startOn: "2027-04-01",
  endOn: "2027-04-10",
  house: { rooms: { kitchen: 1 } },
  floors: [{ floorKey: "1F", phaseId: "declutter", window: { phaseId: "declutter", opensOn: "2027-04-01", dueOn: "2027-04-05" }, questIds: ["pq-a"], wokenAt: "2027-04-01T09:00:00.000Z" }],
  chores: [],
  reward: { text: "Pizza night", seenBy: [] },
  creditsSeenBy: [],
  ...(status === "cleared" ? { clearedAt: "2027-04-08T20:00:00.000Z" } : {}),
});

describe("HomeTown's Old House", () => {
  const movingOutOf = (status: ProjectRecord["status"]): ProjectRecord => ({ ...projectOf(status, "moving-out-2027-04-01"), typeId: "moving-out" });

  const townWithOldHouse = () => {
    const wrapper = mountTown();
    (wrapper.vm as any).hasOldHouse = true;
    return wrapper;
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    running.mockReset();
    trophies.mockReset();
    running.mockResolvedValue(null);
    trophies.mockResolvedValue([]);
  });

  it("stands while the family has its temple record and no tower", async () => {
    const wrapper = townWithOldHouse();

    await (wrapper.vm as any).findTower();

    expect((wrapper.vm as any).isOldHouseShown).toBe(true);
  });

  it("is not on the plaza without its temple record", async () => {
    const wrapper = mountTown();

    await (wrapper.vm as any).findTower();

    expect((wrapper.vm as any).isOldHouseShown).toBe(false);
  });

  it("steps aside for a Moving Out tower, running or kept as the trophy", async () => {
    running.mockResolvedValue({ project: movingOutOf("active"), cleared: [] });
    const building = townWithOldHouse();
    await (building.vm as any).findTower();
    expect((building.vm as any).isOldHouseShown).toBe(false);

    running.mockResolvedValue(null);
    trophies.mockResolvedValue([movingOutOf("cleared")]);
    const trophy = townWithOldHouse();
    await (trophy.vm as any).findTower();
    expect((trophy.vm as any).isOldHouseShown).toBe(false);
  });

  it("stays beside another kind of tower", async () => {
    running.mockResolvedValue({ project: projectOf("active"), cleared: [] });
    const wrapper = townWithOldHouse();

    await (wrapper.vm as any).findTower();

    expect((wrapper.vm as any).isOldHouseShown).toBe(true);
  });
});

describe("HomeTown's project tower", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockRoute.params.userId = "hero-1";
    running.mockReset();
    trophies.mockReset();
    running.mockResolvedValue(null);
    trophies.mockResolvedValue([]);
  });

  it("stands for the running project, and a tap opens its sheet", async () => {
    running.mockResolvedValue({ project: projectOf("active"), cleared: [] });
    trophies.mockResolvedValue([projectOf("cleared", "spring-cleaning-2026-04-01")]);
    const wrapper = mountTown();

    await (wrapper.vm as any).findTower();
    (wrapper.vm as any).openTower();

    expect((wrapper.vm as any).towerSpot.cue).toBe("Now on 1F: Declutter");
    expect((wrapper.vm as any).isTowerOpen).toBe(true);
    expect((wrapper.vm as any).isTrophyOpen).toBe(false);
  });

  it("with no active project but a cleared one shows the trophy, and a tap opens the trophy sheet", async () => {
    trophies.mockResolvedValue([projectOf("cleared")]);
    const wrapper = mountTown();

    await (wrapper.vm as any).findTower();
    (wrapper.vm as any).openTower();

    expect((wrapper.vm as any).towerSpot.label).toBe("The Spring Spire");
    expect((wrapper.vm as any).towerSpot.cue).toBe("Cleared! See the trophy");
    expect((wrapper.vm as any).isTrophyOpen).toBe(true);
    expect((wrapper.vm as any).isTowerOpen).toBe(false);
  });

  it("shows no tower with neither a running project nor a cleared one", async () => {
    const wrapper = mountTown();

    await (wrapper.vm as any).findTower();

    expect((wrapper.vm as any).towerSpot).toBeNull();
  });

  it("keeps the running tower when the trophies cannot be read", async () => {
    running.mockResolvedValue({ project: projectOf("active"), cleared: [] });
    trophies.mockRejectedValue(new Error("no storage"));
    const wrapper = mountTown();

    await (wrapper.vm as any).findTower();

    expect((wrapper.vm as any).towerSpot.label).toBe("The Spring Spire");
  });

  it("starts again by closing the trophy and opening the project wizard on the run's type", async () => {
    trophies.mockResolvedValue([projectOf("cleared")]);
    const wrapper = mountTown();
    await (wrapper.vm as any).findTower();
    (wrapper.vm as any).openTower();

    (wrapper.vm as any).startAgain("moving-out");

    expect((wrapper.vm as any).isTrophyOpen).toBe(false);
    expect((wrapper.vm as any).isWizardOpen).toBe(true);
    expect((wrapper.vm as any).restartType).toBe("moving-out");
  });

  it("looks for the tower again when the wizard closes: the new project takes the trophy's place", async () => {
    trophies.mockResolvedValue([projectOf("cleared")]);
    const wrapper = mountTown();
    await (wrapper.vm as any).findTower();
    (wrapper.vm as any).startAgain("spring-cleaning");
    running.mockResolvedValue({ project: projectOf("active", "spring-cleaning-2027-05-01"), cleared: [] });

    (wrapper.vm as any).closeWizard();
    await flushPromises();

    expect((wrapper.vm as any).isWizardOpen).toBe(false);
    expect((wrapper.vm as any).towerSpot.cue).toBe("Now on 1F: Declutter");
  });
});

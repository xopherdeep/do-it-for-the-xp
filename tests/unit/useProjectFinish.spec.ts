import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h, reactive } from "vue";
import { useProjectFinish } from "@/hooks/useProjectFinish";
import { withSeen } from "@/lib/services/projects/projectProgress";
import type { ProjectRecord } from "@/lib/services/projects/projectRecord";
import { markSeen, readFinish, readTrophies } from "@/lib/services/projects/projectService";
import { useBattleStore } from "@/lib/store/stores/battle";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * What a hero is shown when the portal opens after a tower is won: the reward reveal once, then the credits once, each
 * remembered (markSeen) before it shows so a second look cannot show it twice. Nothing while the hero is in a temple or
 * a fight, or while a Game Master plays them. The project service is a stub with a record that remembers what was seen;
 * the stores, the rules and the copy are real.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn(), default: {} }));
jest.mock("@/lib/services/projects/projectService", () => ({ __esModule: true, readTrophies: jest.fn(), readFinish: jest.fn(), markSeen: jest.fn() }));
jest.mock("@/lib/engine/audio/speech", () => ({
  __esModule: true,
  speak: jest.fn(() => true),
  stop: jest.fn(),
  hasReadingVoice: () => false,
  onReadingVoiceChange: () => () => undefined,
}));
jest.mock("@/lib/api", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("@/lib/databases/ProfileDb", () => ({ __esModule: true, ProfileDb: class { setProfile() { return Promise.resolve(); } }, default: class {} }));
jest.mock("@/lib/databases/profileStorage", () => ({ __esModule: true, profileStorage: {}, default: {} }));
jest.mock("@/lib/services/gp/GPService", () => ({ getGPService: () => ({ syncGP: jest.fn() }) }));
jest.mock("@/lib/services/notifications/notify", () => ({ notify: jest.fn() }));

const mockRoute = reactive({ name: "home-town", fullPath: "/hometown/twelve" });
jest.mock("vue-router", () => ({ ...jest.requireActual("vue-router"), useRoute: () => mockRoute }));

const trophies = readTrophies as jest.Mock;
const finish = readFinish as jest.Mock;
const seen = markSeen as jest.Mock;

const clearedRun = (extra: Partial<ProjectRecord> = {}): ProjectRecord => ({
  id: "spring-cleaning-2027-04-03",
  typeId: "spring-cleaning",
  templeId: "gen-project-spring-cleaning",
  status: "cleared",
  startOn: "2027-04-03",
  endOn: "2027-04-10",
  house: { rooms: { kitchen: 1 } },
  floors: [{ floorKey: "1F", phaseId: "roof", window: { phaseId: "roof", opensOn: "2027-04-03", dueOn: "2027-04-10" }, questIds: ["pq-a"] }],
  chores: [],
  reward: { text: "Pizza night", earnedAt: "2027-04-08T20:00:00.000Z", seenBy: [] },
  creditsSeenBy: [],
  clearedAt: "2027-04-08T20:00:00.000Z",
  ...extra,
});

/** The record the stub service keeps: it remembers who was told, as the real one does */
let current: ProjectRecord | null;

const hostOf = (heroId: string) =>
  defineComponent({
    setup() {
      return useProjectFinish(heroId);
    },
    render: () => h("div"),
  });

const mountFor = async (heroId = "twelve") => {
  const wrapper = mount(hostOf(heroId));
  await flushPromises();
  return wrapper;
};

type Host = Awaited<ReturnType<typeof mountFor>>;

const vm = (wrapper: Host) => wrapper.vm as unknown as { finishPrompt: { options: { title?: string; lines: string[] } } | null; answerFinish: (answer: { id: string; amount: null }) => void; credits: { towerName: string } | null; closeCredits: () => void };

const answer = async (wrapper: Host) => {
  vm(wrapper).answerFinish({ id: "onward", amount: null });
  await flushPromises();
};

beforeEach(() => {
  setActivePinia(createPinia());
  const store = useUserStore();
  store.addUser({ id: "twelve", isAdult: false, name: { first: "Twelve", nick: "Twelve" }, jobClass: "Mage" } as never);
  // The youngest reader picked the simple voice on their profile
  store.addUser({ id: "six", isAdult: false, voice: "simple", name: { first: "Six", nick: "Six" } } as never);
  store.loginUser(store.users.twelve);
  mockRoute.name = "home-town";
  mockRoute.fullPath = "/hometown/twelve";
  current = clearedRun();
  for (const mock of [trophies, finish, seen]) mock.mockReset();
  trophies.mockImplementation(async () => (current ? [current] : []));
  finish.mockImplementation(async () => (current ? { project: current, quests: [], paid: [] } : null));
  seen.mockImplementation(async (heroId: string, what: "reward" | "credits") => {
    if (current) current = withSeen(current, heroId, what);
  });
});

describe("the reward reveal on opening the portal", () => {
  it("shows a hero the family reward once, in the Tower Keeper's prompt", async () => {
    const wrapper = await mountFor();

    expect(vm(wrapper).finishPrompt?.options.title).toBe("Family reward unlocked!");
    expect(vm(wrapper).finishPrompt?.options.lines).toContain("Pizza night");
  });

  it("remembers the hero was told before the prompt shows, so a second look cannot show it twice", async () => {
    let remember: () => void = () => undefined;
    seen.mockImplementation(() => new Promise<void>((resolve) => (remember = resolve)));
    const wrapper = await mountFor();

    expect(seen).toHaveBeenCalledWith("twelve", "reward");
    expect(vm(wrapper).finishPrompt).toBeNull();

    remember();
    await flushPromises();
    expect(vm(wrapper).finishPrompt).not.toBeNull();
  });

  it("shows nothing when the hero could not be remembered as told: it would show every time", async () => {
    seen.mockRejectedValue(new Error("no storage"));
    const wrapper = await mountFor();
    expect(vm(wrapper).finishPrompt).toBeNull();
  });

  it("reads in the hero's own voice", async () => {
    const wrapper = await mountFor("six");
    expect(vm(wrapper).finishPrompt?.options.title).toBe("You won a prize!");
  });

  it("shows nothing to a hero who was already told, and nothing before the roof is beaten", async () => {
    current = clearedRun({ reward: { text: "Pizza night", seenBy: ["twelve"] }, creditsSeenBy: ["twelve"] });
    expect(vm(await mountFor()).finishPrompt).toBeNull();
    expect(seen).not.toHaveBeenCalled();

    current = clearedRun({ status: "active", clearedAt: undefined });
    expect(vm(await mountFor()).finishPrompt).toBeNull();
    current = null;
    expect(vm(await mountFor()).finishPrompt).toBeNull();
  });
});

describe("the credits on opening the portal", () => {
  it("roll once the reward was answered, for a hero who has not watched them", async () => {
    const wrapper = await mountFor();
    expect(vm(wrapper).credits).toBeNull();

    await answer(wrapper);

    expect(vm(wrapper).finishPrompt).toBeNull();
    expect(vm(wrapper).credits?.towerName).toBe("The Spring Spire");
    expect(finish).toHaveBeenCalledTimes(1);
    expect(seen).toHaveBeenCalledWith("twelve", "credits");
  });

  it("end when the roll is done, and are not shown again", async () => {
    const wrapper = await mountFor();
    await answer(wrapper);

    vm(wrapper).closeCredits();
    await flushPromises();
    mockRoute.fullPath = "/hometown/twelve/somewhere";
    await flushPromises();

    expect(vm(wrapper).credits).toBeNull();
    expect(vm(wrapper).finishPrompt).toBeNull();
    expect(seen).toHaveBeenCalledTimes(2);
  });

  it("go straight to the credits for a hero who has had the reward reveal already", async () => {
    current = clearedRun({ reward: { text: "Pizza night", seenBy: ["twelve"] } });
    const wrapper = await mountFor();

    expect(vm(wrapper).finishPrompt).toBeNull();
    expect(vm(wrapper).credits?.towerName).toBe("The Spring Spire");
  });
});

describe("when the finish waits", () => {
  it("holds off while the hero is in a temple, and tells them when they leave it", async () => {
    mockRoute.name = "temple";
    const wrapper = await mountFor();
    expect(vm(wrapper).finishPrompt).toBeNull();

    mockRoute.name = "world-plains";
    mockRoute.fullPath = "/world/plains/twelve";
    await flushPromises();

    expect(vm(wrapper).finishPrompt?.options.title).toBe("Family reward unlocked!");
  });

  it("does not roll the credits over a fight that began while the reward showed, and rolls them when it is over", async () => {
    const wrapper = await mountFor();
    expect(vm(wrapper).finishPrompt).not.toBeNull();

    useBattleStore().active = true;
    await answer(wrapper);

    expect(vm(wrapper).credits).toBeNull();
    expect(seen).not.toHaveBeenCalledWith("twelve", "credits");
    expect(finish).not.toHaveBeenCalled();

    useBattleStore().active = false;
    await flushPromises();

    expect(vm(wrapper).credits?.towerName).toBe("The Spring Spire");
    expect(seen).toHaveBeenCalledWith("twelve", "credits");
  });

  it("holds off during a fight", async () => {
    useBattleStore().active = true;
    const wrapper = await mountFor();
    expect(vm(wrapper).finishPrompt).toBeNull();
    expect(seen).not.toHaveBeenCalled();
  });

  it("holds off while a Game Master plays the hero: the hero is the one to be told", async () => {
    useUserStore().currentUser.isImpersonating = true;
    const wrapper = await mountFor();
    expect(vm(wrapper).finishPrompt).toBeNull();
    expect(seen).not.toHaveBeenCalled();
  });

  it("waits for the family's profiles to be read when the portal opens first", async () => {
    const wrapper = await mountFor("late");
    expect(vm(wrapper).finishPrompt).toBeNull();

    useUserStore().addUser({ id: "late", isAdult: false, name: { first: "Late", nick: "Late" } } as never);
    await flushPromises();

    expect(vm(wrapper).finishPrompt?.options.title).toBe("Family reward unlocked!");
  });

  it("is not told twice when two looks come at once", async () => {
    const wrapper = mount(hostOf("twelve"));
    mockRoute.fullPath = "/hometown/twelve/a";
    mockRoute.fullPath = "/hometown/twelve/b";
    await flushPromises();

    expect(seen).toHaveBeenCalledTimes(1);
    expect(vm(wrapper).finishPrompt).not.toBeNull();
  });

  it("keeps quiet when the project cannot be read", async () => {
    trophies.mockRejectedValue(new Error("no storage"));
    const wrapper = await mountFor();
    expect(vm(wrapper).finishPrompt).toBeNull();
    expect(vm(wrapper).credits).toBeNull();
  });
});

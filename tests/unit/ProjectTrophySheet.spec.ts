import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import ProjectTrophySheet from "@/app/Console/MyPortal/HomeTown/components/ProjectTrophySheet.vue";
import type { ProjectFloor, ProjectRecord } from "@/lib/services/projects/projectRecord";
import { dayText } from "@/lib/services/projects/projectWizard";
import { readFinish, readTrophies } from "@/lib/services/projects/projectService";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * The trophy sheet in Hometown: the cleared runs, newest first, with their dates, the days early, the reward and each
 * floor's multiplier; "Watch the credits" for the run picked; "Start again" (Game Master) which hands its type on to
 * the project wizard. The Ionic frame, the project service, the toast and the sound are stubs; the stores, the rules and
 * the copy are real.
 */

const mockToast = jest.fn();
let mockIsGameMaster = false;

jest.mock("@/hooks/useToast", () => ({ __esModule: true, useToast: () => ({ showToast: mockToast }) }));
jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn(), default: {} }));
jest.mock("@/router/_Guards/gm.guard", () => ({ __esModule: true, canAccessGameMaster: () => mockIsGameMaster }));
jest.mock("@/lib/services/projects/projectService", () => ({ __esModule: true, readTrophies: jest.fn(), readFinish: jest.fn() }));
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

const trophies = readTrophies as jest.Mock;
const finish = readFinish as jest.Mock;

const slot = { template: "<div><slot /></div>" };
const stubs = {
  IonModal: { props: ["isOpen"], template: "<div class='modal-stub'><slot /></div>" },
  IonHeader: slot,
  IonToolbar: slot,
  IonFooter: slot,
  IonContent: slot,
  XpCloseButton: { template: "<button class='close-stub' data-test='sheet-close'></button>" },
  // The roll has its own spec: here it shows who it is for and can be ended
  CreditsRoll: {
    props: ["credits"],
    emits: ["done"],
    template: "<div data-test='credits-stub'>{{ credits.towerName }}|{{ credits.heroes.map((hero) => hero.name).join(',') }}<button data-test='credits-end' @click=\"$emit('done')\"></button></div>",
  },
};

const floorOf = (floorKey: string, phaseId: string, questIds: string[], multiplier?: number): ProjectFloor => ({
  floorKey,
  phaseId,
  window: { phaseId, opensOn: "2027-04-03", dueOn: "2027-04-10" },
  questIds,
  ...(multiplier === undefined ? {} : { multiplier }),
  clearedAt: "2027-04-04T12:00:00.000Z",
});

const runOf = (id: string, typeId: string, clearedAt: string, extra: Partial<ProjectRecord> = {}): ProjectRecord => ({
  id,
  typeId: typeId as never,
  templeId: `gen-project-${typeId}`,
  status: "cleared",
  startOn: "2027-04-03",
  endOn: "2027-04-10",
  house: { rooms: { kitchen: 1 } },
  floors: [floorOf("1F", "declutter", ["pq-a"], 2), floorOf("2F", "deep-clean", ["pq-b"], 1.4), floorOf("3F", "roof", ["pq-fin"], 1)],
  chores: [],
  reward: { text: "Pizza night", earnedAt: clearedAt, seenBy: [] },
  creditsSeenBy: [],
  clearedAt,
  ...extra,
});

const NEWEST = runOf("moving-out-2027-06-01", "moving-out", new Date(2027, 5, 20, 20).toISOString(), {
  startOn: "2027-06-01",
  endOn: "2027-06-20",
  reward: { text: "A day at the lake", earnedAt: "2027-06-20T20:00:00.000Z", givenAt: "2027-06-21T10:00:00.000Z", seenBy: [] },
});
const OLDER = runOf("spring-cleaning-2027-04-03", "spring-cleaning", new Date(2027, 3, 8, 20).toISOString());

const mountSheet = async (options: { isGameMaster?: boolean; runs?: ProjectRecord[] } = {}) => {
  mockIsGameMaster = options.isGameMaster ?? false;
  trophies.mockResolvedValue(options.runs ?? [NEWEST, OLDER]);
  setActivePinia(createPinia());
  const store = useUserStore();
  store.addUser({ id: "twelve", isAdult: false, name: { first: "Twelve", nick: "Twelve" }, jobClass: "Mage" } as never);
  store.addUser({ id: "dad", isAdult: true, name: { first: "Dad" } } as never);
  store.loginUser(store.users.twelve);
  const wrapper = mount(ProjectTrophySheet, { props: { open: true }, global: { stubs } });
  await flushPromises();
  return wrapper;
};

type Sheet = Awaited<ReturnType<typeof mountSheet>>;

const tap = async (wrapper: Sheet, test: string) => {
  await wrapper.get(`[data-test="${test}"]`).trigger("click");
  await flushPromises();
};

beforeEach(() => {
  for (const mock of [mockToast, trophies, finish]) mock.mockReset();
  // Twelve was paid for the first chore of every run
  const paid = [{ id: "e1", questId: "pq-a", questName: "a", userId: "twelve", completedAt: "2027-04-04T12:00:00.000Z", dayKey: "2027-04-04", status: "approved", source: "claim", rewards: { xp: 0, gp: 0, ap: 0 }, rewardsApplied: true }];
  finish.mockImplementation(async (id: string) => ({ project: [NEWEST, OLDER].find((run) => run.id === id), quests: [], paid }));
});

describe("the cleared runs on the trophy sheet", () => {
  it("lists them newest first, each with its tower", async () => {
    const sheet = await mountSheet();
    const cards = sheet.findAll('[data-test="trophy"]');

    expect(cards).toHaveLength(2);
    expect(cards[0].text()).toContain("The Moving Keep");
    expect(cards[1].text()).toContain("The Spring Spire");
  });

  it("shows the dates, how early it was cleared and the reward", async () => {
    const sheet = await mountSheet();
    const [moving, spring] = sheet.findAll('[data-test="trophy"]');

    expect(spring.text()).toContain(`${dayText("2027-04-03")} to ${dayText("2027-04-08")}`);
    expect(spring.text()).toContain("Done 2 days early!");
    expect(spring.text()).toContain("Reward: Pizza night");
    expect(spring.text()).toContain("Waiting for the Game Master");
    expect(moving.text()).toContain("Reward: A day at the lake");
    expect(moving.text()).toContain("Handed over");
  });

  it("shows each floor's multiplier, a floor with none as x1", async () => {
    const sheet = await mountSheet({ runs: [OLDER] });
    const floors = sheet.findAll('[data-test="trophy-floor"]');

    expect(floors.map((floor) => floor.text())).toEqual([
      expect.stringContaining("1F"),
      expect.stringContaining("2F"),
      expect.stringContaining("3F"),
    ]);
    expect(floors[0].text()).toContain("×2.0");
    expect(floors[1].text()).toContain("×1.4");
    expect(floors[2].text()).toContain("×1.0");
    expect(floors[1].text()).toContain("Deep Clean");
    expect(floors[2].text()).toContain("The Roof");
  });

  it("says so when no tower has been cleared", async () => {
    const sheet = await mountSheet({ runs: [] });

    expect(sheet.find('[data-test="trophy"]').exists()).toBe(false);
    expect(sheet.get('[data-test="trophy-empty"]').text()).toBe("No tower has been cleared yet.");
    expect(sheet.find('[data-test="trophy-watch"]').exists()).toBe(false);
  });

  it("picks the newest run to start with and lets a hero pick another", async () => {
    const sheet = await mountSheet();
    const [moving, spring] = sheet.findAll('[data-test="trophy"]');
    expect(moving.attributes("aria-pressed")).toBe("true");
    expect(spring.attributes("aria-pressed")).toBe("false");

    await spring.trigger("click");

    expect(sheet.findAll('[data-test="trophy"]')[1].attributes("aria-pressed")).toBe("true");
    expect(sheet.findAll('[data-test="trophy"]')[0].attributes("aria-pressed")).toBe("false");
  });
});

describe("Watch the credits", () => {
  it("rolls the credits of the run picked, with the family's heroes named", async () => {
    const sheet = await mountSheet();

    await tap(sheet, "trophy-watch");

    expect(finish).toHaveBeenCalledWith(NEWEST.id);
    expect(sheet.get('[data-test="credits-stub"]').text()).toContain("The Moving Keep|Twelve");
  });

  it("asks for the run a hero picked", async () => {
    const sheet = await mountSheet();
    await sheet.findAll('[data-test="trophy"]')[1].trigger("click");

    await tap(sheet, "trophy-watch");

    expect(finish).toHaveBeenCalledWith(OLDER.id);
  });

  it("closes the roll when it is done", async () => {
    const sheet = await mountSheet();
    await tap(sheet, "trophy-watch");

    await tap(sheet, "credits-end");

    expect(sheet.find('[data-test="credits-stub"]').exists()).toBe(false);
  });

  it("tells the hero when the credits could not be read, and shows no roll", async () => {
    finish.mockResolvedValue(null);
    const sheet = await mountSheet();

    await tap(sheet, "trophy-watch");

    expect(sheet.find('[data-test="credits-stub"]').exists()).toBe(false);
    expect(mockToast).toHaveBeenCalledWith("The credits would not start. Try again.", expect.anything());
  });
});

describe("Start again", () => {
  it("is the Game Master's: a hero does not get it", async () => {
    const sheet = await mountSheet({ isGameMaster: false });
    expect(sheet.find('[data-test="trophy-again"]').exists()).toBe(false);
  });

  it("hands the type of the run picked on to the project wizard", async () => {
    const sheet = await mountSheet({ isGameMaster: true });

    await tap(sheet, "trophy-again");
    expect(sheet.emitted("start-again")).toEqual([["moving-out"]]);

    await sheet.findAll('[data-test="trophy"]')[1].trigger("click");
    await tap(sheet, "trophy-again");
    expect(sheet.emitted("start-again")?.[1]).toEqual(["spring-cleaning"]);
  });
});

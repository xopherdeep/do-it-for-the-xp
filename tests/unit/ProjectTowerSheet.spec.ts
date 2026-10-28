import { flushPromises, mount } from "@vue/test-utils";
import { addDays, format } from "date-fns";
import { createPinia, setActivePinia } from "pinia";
import ProjectTowerSheet from "@/app/Console/MyPortal/HomeTown/components/ProjectTowerSheet.vue";
import { dateKey } from "@/lib/services/core/packs/packCommon";
import { floorMultiplier } from "@/lib/services/projects/floorBonus";
import type { ProjectFloor, ProjectRecord } from "@/lib/services/projects/projectRecord";
import { abandonProject, extendProject, readTower, settleReadyFloors } from "@/lib/services/projects/projectService";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * The Hometown tower sheet: what a hero reads of the running tower (its name, the floor they are on, that floor's clock
 * and bonus offer) and what only the Game Master can do (move the end date, abandon the project after an in-world
 * confirm). The Ionic frame, the project service, the toast, the sound and the reveal prompt are stubs; the stores, the
 * rules and the copy are real.
 */

const mockToast = jest.fn();
let mockIsGameMaster = false;

jest.mock("@/hooks/useToast", () => ({ __esModule: true, useToast: () => ({ showToast: mockToast }) }));
jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn(), default: {} }));
jest.mock("@/router/_Guards/gm.guard", () => ({ __esModule: true, canAccessGameMaster: () => mockIsGameMaster }));
jest.mock("@/lib/services/projects/projectService", () => ({
  __esModule: true,
  settleReadyFloors: jest.fn(),
  readTower: jest.fn(),
  extendProject: jest.fn(),
  abandonProject: jest.fn(),
}));
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

const settle = settleReadyFloors as jest.Mock;
const read = readTower as jest.Mock;
const extend = extendProject as jest.Mock;
const abandon = abandonProject as jest.Mock;

const slot = { template: "<div><slot /></div>" };
const stubs = {
  IonModal: { props: ["isOpen"], template: "<div class='modal-stub'><slot /></div>" },
  IonHeader: slot,
  IonToolbar: slot,
  IonFooter: slot,
  IonContent: slot,
  XpCloseButton: { template: "<button class='close-stub' data-test='sheet-close'></button>" },
  // The in-world prompt: each choice is a button that answers it
  XpRevealPrompt: {
    props: ["prompt"],
    emits: ["respond"],
    template:
      "<div v-if='prompt' data-test='prompt'><p v-for='line in prompt.options.lines' :key='line'>{{ line }}</p><button v-for='choice in prompt.options.choices' :key='choice.id' :data-test=\"'answer-' + choice.id\" @click=\"$emit('respond', { id: choice.id, amount: null })\">{{ choice.label }}</button></div>",
  },
};

const TODAY = dateKey(new Date());
const inDays = (days: number): string => dateKey(addDays(new Date(), days));
const aged = (years: number): string => `${new Date().getFullYear() - years}-01-01`;

const floorOf = (floorKey: string, phaseId: string, opensIn: number, dueIn: number, extra: Partial<ProjectFloor> = {}): ProjectFloor => ({
  floorKey,
  phaseId,
  window: { phaseId, opensOn: inDays(opensIn), dueOn: inDays(dueIn) },
  questIds: [`pq-${floorKey}`],
  ...extra,
});

/** Spring Cleaning on its second floor: Declutter cleared early (its day still ahead), Deep Clean open, due in 3 of its 10 days */
const projectOf = (floors?: ProjectFloor[]): ProjectRecord => ({
  id: `spring-cleaning-${inDays(-7)}`,
  typeId: "spring-cleaning",
  templeId: "gen-project-spring-cleaning",
  status: "active",
  startOn: inDays(-7),
  endOn: inDays(10),
  house: { rooms: { kitchen: 1 } },
  floors: floors ?? [
    floorOf("1F", "declutter", -7, 5, { wokenAt: "2027-04-01T09:00:00.000Z", clearedAt: "2027-04-02T09:00:00.000Z", multiplier: 2 }),
    floorOf("2F", "deep-clean", -6, 3, { wokenAt: "2027-04-02T09:00:00.000Z" }),
    floorOf("3F", "organize", 4, 7),
    floorOf("4F", "final-inspection", 8, 10),
    floorOf("5F", "roof", 8, 10),
  ],
  chores: [],
  reward: { text: "Pizza night", seenBy: [] },
  creditsSeenBy: [],
});

const mountSheet = async (options: { isGameMaster?: boolean; project?: ProjectRecord | null; cleared?: string[] } = {}) => {
  mockIsGameMaster = options.isGameMaster ?? false;
  const project = options.project === undefined ? projectOf() : options.project;
  read.mockResolvedValue(project ? { project, cleared: options.cleared ?? [] } : null);
  setActivePinia(createPinia());
  const store = useUserStore();
  store.addUser({ id: "lia", isAdult: false, birthday: aged(6), name: { first: "Lia", nick: "Lia" } } as never);
  store.loginUser(store.users.lia);
  const wrapper = mount(ProjectTowerSheet, { props: { open: true }, global: { stubs } });
  await flushPromises();
  return wrapper;
};

type Sheet = Awaited<ReturnType<typeof mountSheet>>;

const tap = async (wrapper: Sheet, test: string) => {
  await wrapper.get(`[data-test="${test}"]`).trigger("click");
  await flushPromises();
};

beforeEach(() => {
  for (const mock of [mockToast, settle, read, extend, abandon]) mock.mockReset();
  settle.mockResolvedValue(null);
  extend.mockResolvedValue({});
  abandon.mockResolvedValue(undefined);
});

describe("what a hero reads in the tower sheet", () => {
  it("shows the tower's name, the floor they are on and its clock", async () => {
    const sheet = await mountSheet();

    expect(sheet.get('[data-test="sheet-title"]').text()).toBe("The Spring Spire");
    expect(sheet.get('[data-test="current-floor"]').text()).toContain("2F");
    expect(sheet.get('[data-test="current-floor"]').text()).toContain("Deep Clean");
    const due = format(addDays(new Date(), 3), "EEE");
    expect(sheet.get('[data-test="floor-clock"]').text()).toBe(`Deep Clean: due ${due}, 3 days left`);
  });

  it("offers the bonus of clearing the floor today", async () => {
    const sheet = await mountSheet();
    const multiplier = floorMultiplier(projectOf().floors[1].window, TODAY);

    expect(multiplier).toBeGreaterThan(1);
    expect(sheet.get('[data-test="bonus-offer"]').text()).toBe(`Clear this floor today for ×${multiplier.toFixed(1)}`);
  });

  it("shows no offer once the floor is late, and reads late", async () => {
    const late = projectOf([floorOf("1F", "declutter", -9, -1, { wokenAt: "2027-04-01T09:00:00.000Z" })]);
    const sheet = await mountSheet({ project: late });

    expect(sheet.get('[data-test="floor-clock"]').text()).toBe("Declutter: late");
    expect(sheet.find('[data-test="bonus-offer"]').exists()).toBe(false);
  });

  it("reads 'due today' on the due day", async () => {
    const dueToday = projectOf([floorOf("1F", "declutter", -9, 0, { wokenAt: "2027-04-01T09:00:00.000Z" })]);
    const sheet = await mountSheet({ project: dueToday });
    expect(sheet.get('[data-test="floor-clock"]').text()).toBe("Declutter: due today");
  });

  it("lists every floor with where it stands, a floor cleared early as cleared and never as late", async () => {
    const sheet = await mountSheet();
    const rows = sheet.findAll('[data-test="floor-row"]');

    expect(rows).toHaveLength(5);
    expect(rows[0].attributes("data-state")).toBe("cleared");
    expect(rows[0].text()).toContain("Declutter");
    expect(rows[1].attributes("data-state")).toBe("open");
    expect(rows[2].attributes("data-state")).toBe("asleep");
    expect(rows[4].text()).toContain("The Roof");
    expect(sheet.text()).not.toContain(": late");
  });

  it("settles what is ready before it reads the tower", async () => {
    await mountSheet();
    expect(settle).toHaveBeenCalledTimes(1);
    expect(settle.mock.invocationCallOrder[0]).toBeLessThan(read.mock.invocationCallOrder[0]);
  });

  it("shows no Game Master controls to a hero", async () => {
    const sheet = await mountSheet({ isGameMaster: false });
    expect(sheet.find('[data-test="move-end"]').exists()).toBe(false);
    expect(sheet.find('[data-test="abandon"]').exists()).toBe(false);
  });

  it("lets a hero enter the tower", async () => {
    const sheet = await mountSheet();
    await tap(sheet, "enter");
    expect(sheet.emitted("enter")).toHaveLength(1);
  });

  it("still opens when settling fails: the tower is read all the same", async () => {
    settle.mockRejectedValue(new Error("storage is full"));
    const sheet = await mountSheet();
    expect(sheet.get('[data-test="sheet-title"]').text()).toBe("The Spring Spire");
  });
});

describe("what only the Game Master can do", () => {
  it("sees Move the end date and Abandon project as well", async () => {
    const sheet = await mountSheet({ isGameMaster: true });
    expect(sheet.get('[data-test="move-end"]').text()).toBe("Move the end date");
    expect(sheet.get('[data-test="abandon"]').text()).toBe("Abandon project");
    expect(sheet.get('[data-test="sheet-title"]').text()).toBe("The Spring Spire");
  });

  it("moves the end date: the day picked and today go to extendProject, and the tower is read again", async () => {
    const sheet = await mountSheet({ isGameMaster: true });
    await tap(sheet, "move-end");

    await sheet.get('[data-test="end-date"]').setValue(inDays(20));
    await tap(sheet, "end-move");

    expect(extend).toHaveBeenCalledWith(inDays(20), TODAY);
    expect(read).toHaveBeenCalledTimes(2);
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(sheet.emitted("changed")).toHaveLength(1);
  });

  it("starts the date picker on the project's end, no earlier than today", async () => {
    const sheet = await mountSheet({ isGameMaster: true });
    await tap(sheet, "move-end");
    expect((sheet.get('[data-test="end-date"]').element as HTMLInputElement).value).toBe(inDays(10));
    expect(sheet.get('[data-test="end-date"]').attributes("min")).toBe(TODAY);
  });

  it("refuses a day before today: nothing is asked of the service and the sheet says why", async () => {
    const sheet = await mountSheet({ isGameMaster: true });
    await tap(sheet, "move-end");

    await sheet.get('[data-test="end-date"]').setValue(inDays(-1));
    await tap(sheet, "end-move");

    expect(extend).not.toHaveBeenCalled();
    expect(sheet.get('[data-test="end-problem"]').text()).not.toBe("");
  });

  it("says so, and stays open, when the service refuses the day (too near for the floors left)", async () => {
    extend.mockRejectedValue(new RangeError("too near"));
    const sheet = await mountSheet({ isGameMaster: true });
    await tap(sheet, "move-end");

    await sheet.get('[data-test="end-date"]').setValue(inDays(1));
    await tap(sheet, "end-move");

    expect(sheet.get('[data-test="end-problem"]').text()).not.toBe("");
    expect(sheet.emitted("changed")).toBeUndefined();
    expect(sheet.emitted("close")).toBeUndefined();
  });

  it("asks before abandoning, and does it only on a yes", async () => {
    const sheet = await mountSheet({ isGameMaster: true });

    await tap(sheet, "abandon");
    expect(sheet.find('[data-test="prompt"]').exists()).toBe(true);
    expect(abandon).not.toHaveBeenCalled();

    await tap(sheet, "answer-yes");
    expect(abandon).toHaveBeenCalledTimes(1);
    expect(sheet.emitted("abandoned")).toHaveLength(1);
    expect(sheet.emitted("close")).toHaveLength(1);
  });

  it("leaves the project alone on a no", async () => {
    const sheet = await mountSheet({ isGameMaster: true });

    await tap(sheet, "abandon");
    await tap(sheet, "answer-no");

    expect(abandon).not.toHaveBeenCalled();
    expect(sheet.emitted("abandoned")).toBeUndefined();
  });

  it("stays open and says so when the project cannot be abandoned", async () => {
    abandon.mockRejectedValue(new Error("boom"));
    const sheet = await mountSheet({ isGameMaster: true });

    await tap(sheet, "abandon");
    await tap(sheet, "answer-yes");

    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(sheet.emitted("abandoned")).toBeUndefined();
    expect(sheet.emitted("close")).toBeUndefined();
  });
});

describe("with no tower standing", () => {
  it("says so and offers nothing to do, leaving a seam for the trophy", async () => {
    const sheet = await mountSheet({ project: null, isGameMaster: true });

    expect(sheet.get('[data-test="empty"]').text()).not.toBe("");
    expect(sheet.find('[data-test="enter"]').exists()).toBe(false);
    expect(sheet.find('[data-test="move-end"]').exists()).toBe(false);
    expect(sheet.find('[data-test="abandon"]').exists()).toBe(false);
  });

  it("gives the empty state to a slot, so the trophy can take its place", async () => {
    read.mockResolvedValue(null);
    setActivePinia(createPinia());
    const wrapper = mount(ProjectTowerSheet, {
      props: { open: true },
      slots: { empty: "<p data-test='trophy'>Trophies</p>" },
      global: { stubs },
    });
    await flushPromises();
    expect(wrapper.find('[data-test="trophy"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="empty"]').exists()).toBe(false);
  });
});

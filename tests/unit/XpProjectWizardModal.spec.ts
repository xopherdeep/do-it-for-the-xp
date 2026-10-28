import { flushPromises, mount } from "@vue/test-utils";
import { addDays } from "date-fns";
import { createPinia, setActivePinia } from "pinia";
import XpProjectWizardModal from "@/app/SideMenu/XpSettings/components/XpProjectWizardModal.vue";
import { getProjectDb } from "@/lib/databases/ProjectDb";
import { DEFAULT_MOVING_ROOMS } from "@/lib/services/core/packs/movingPack";
import { dateKey, FIBONACCI_STEPS } from "@/lib/services/core/packs/packCommon";
import { PROJECT_TYPES } from "@/lib/services/core/packs/projects";
import { suggestChores } from "@/lib/services/projects/projectChores";
import type { ProjectChore } from "@/lib/services/projects/projectChores";
import { minimumEndOn } from "@/lib/services/projects/projectSchedule";
import { readOpenMoveQuests, retireOldHouse, startProject } from "@/lib/services/projects/projectService";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * The Start a Project wizard in the shared wizard shell: five steps (the project, the house, the chores, the dates and
 * the reward, Build), a Build that starts the project once and closes, and a Game Master who has a project running
 * being told to finish it first. The Ionic frame, the speech engine, the toast, the project service and the project
 * database are stubs; the stores, the shell, the steps and the rules are real.
 */

const mockToast = jest.fn();
jest.mock("@/hooks/useToast", () => ({ __esModule: true, useToast: () => ({ showToast: mockToast }) }));
jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn(), default: {} }));
jest.mock("@/lib/engine/audio/speech", () => ({
  __esModule: true,
  speak: jest.fn(() => true),
  stop: jest.fn(),
  hasReadingVoice: () => false,
  onReadingVoiceChange: () => () => undefined,
}));
jest.mock("@/lib/services/projects/projectService", () => ({ __esModule: true, startProject: jest.fn(), retireOldHouse: jest.fn(), readOpenMoveQuests: jest.fn() }));
jest.mock("@/lib/databases/ProjectDb", () => ({ __esModule: true, getProjectDb: jest.fn() }));
jest.mock("@/lib/api", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("@/lib/databases/ProfileDb", () => ({ __esModule: true, ProfileDb: class { setProfile() { return Promise.resolve(); } }, default: class {} }));
jest.mock("@/lib/databases/profileStorage", () => ({ __esModule: true, profileStorage: {}, default: {} }));
jest.mock("@/lib/services/gp/GPService", () => ({ getGPService: () => ({ syncGP: jest.fn() }) }));
jest.mock("@/lib/services/notifications/notify", () => ({ notify: jest.fn() }));

const start = startProject as jest.Mock;
const projectDb = { getActive: jest.fn(), lastOfType: jest.fn() };
const slot = { template: "<div><slot /></div>" };
const stubs = {
  IonModal: { props: ["isOpen"], template: "<div class='modal-stub'><slot /></div>" },
  IonHeader: slot,
  IonToolbar: slot,
  IonFooter: slot,
  IonContent: slot,
  XpCloseButton: { template: "<button class='close-stub' data-test='wizard-close'></button>" },
  XpSpeakButton: { props: ["text"], template: "<button class='speak-stub' :data-text='text'></button>" },
};

const TODAY = dateKey(new Date());
const SPRING = PROJECT_TYPES["spring-cleaning"];
const USUAL_HOUSE = { rooms: DEFAULT_MOVING_ROOMS };

const thirtyYearsAgo = `${new Date().getFullYear() - 30}-01-01`;
const aged = (years: number): string => `${new Date().getFullYear() - years}-01-01`;

const mountWizard = async (props: Record<string, unknown> = { open: true }) => {
  localStorage.clear();
  setActivePinia(createPinia());
  const store = useUserStore();
  store.addUser({ id: "mom", isAdult: true, birthday: thirtyYearsAgo, name: { first: "Mom", nick: "Mom" } } as never);
  store.addUser({ id: "kai", isAdult: false, birthday: aged(12), name: { first: "Kai", nick: "Kai" } } as never);
  store.addUser({ id: "lia", isAdult: false, birthday: aged(6), name: { first: "Lia", nick: "Lia" } } as never);
  store.loginUser(store.users.mom);
  const wrapper = mount(XpProjectWizardModal, { props, global: { stubs } });
  await flushPromises();
  return wrapper;
};

type Wizard = Awaited<ReturnType<typeof mountWizard>>;

const tap = async (wrapper: Wizard, test: string) => {
  await wrapper.get(`[data-test="${test}"]`).trigger("click");
  await flushPromises();
};

const typed = async (wrapper: Wizard, test: string, text: string) => {
  await wrapper.get(`[data-test="${test}"]`).setValue(text);
  await flushPromises();
};

/** Picks the type, then walks Next to the screen of the given step */
const goTo = async (wrapper: Wizard, step: "house" | "chores" | "dates" | "build", typeId = "spring-cleaning") => {
  await tap(wrapper, `type-${typeId}`);
  const order = ["house", "chores", "dates", "build"];
  const nexts = order.indexOf(step) + 1;
  for (let screen = 0; screen < nexts; screen += 1) {
    if (step === "build" && screen === 3) await typed(wrapper, "reward", "Pizza night");
    await tap(wrapper, "next");
  }
};

const rows = (wrapper: Wizard) => wrapper.findAll('[data-test="chore-row"]');

beforeEach(() => {
  start.mockReset();
  start.mockResolvedValue({ id: "ok" });
  (retireOldHouse as jest.Mock).mockReset();
  (retireOldHouse as jest.Mock).mockResolvedValue(undefined);
  (readOpenMoveQuests as jest.Mock).mockReset();
  (readOpenMoveQuests as jest.Mock).mockResolvedValue([]);
  mockToast.mockReset();
  projectDb.getActive.mockReset();
  projectDb.getActive.mockResolvedValue(null);
  projectDb.lastOfType.mockReset();
  projectDb.lastOfType.mockResolvedValue(null);
  (getProjectDb as jest.Mock).mockReturnValue(projectDb);
});

describe("the Start a Project wizard in the shell", () => {
  it("opens on the project step: 1 / 5, Close, a card for each type and Next shut until one is picked", async () => {
    const wrapper = await mountWizard();
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("1 / 5");
    expect(wrapper.get('[data-test="back"]').text()).toBe("Close");
    Object.keys(PROJECT_TYPES).forEach((id) => expect(wrapper.find(`[data-test="type-${id}"]`).exists()).toBe(true));
    expect(wrapper.get('[data-test="guide"] span').text()).not.toBe("");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeDefined();
    await tap(wrapper, "type-spring-cleaning");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeUndefined();
  });

  it("closes from Back on the first step and from the header's close button", async () => {
    const wrapper = await mountWizard();
    await tap(wrapper, "back");
    await tap(wrapper, "wizard-close");
    expect(wrapper.emitted("close")).toHaveLength(2);
  });

  it("walks the five steps, Build starts the project once with the whole answer and the modal closes", async () => {
    const wrapper = await mountWizard();
    await goTo(wrapper, "build");
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("5 / 5");
    expect(wrapper.find('[data-test="next"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="build-summary"]').text()).toContain(SPRING.towerName);
    expect(start).not.toHaveBeenCalled();

    await tap(wrapper, "submit");
    expect(start).toHaveBeenCalledTimes(1);
    const [input, reward] = start.mock.calls[0];
    expect(reward).toBe("Pizza night");
    expect(input.projectId).toBe(`spring-cleaning-${TODAY}`);
    expect(input.type).toBe(SPRING);
    expect(input.windows[0].opensOn).toBe(TODAY);
    expect(input.windows[input.windows.length - 1].dueOn).toBe(dateKey(addDays(new Date(), SPRING.defaultDays)));
    expect(input.heroes.map((hero: { id: string }) => hero.id).sort()).toEqual(["kai", "lia", "mom"]);
    expect(input.heroes.find((hero: { id: string }) => hero.id === "lia").band).toBe("little");
    expect(input.chores).toEqual(suggestChores(SPRING, input.house, input.heroes));
    expect(wrapper.emitted("close")).toHaveLength(1);
    expect(mockToast).toHaveBeenCalledTimes(1);
  });

  it("starts the project once however many times Build is tapped", async () => {
    let finish: (value: unknown) => void = () => undefined;
    start.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const wrapper = await mountWizard();
    await goTo(wrapper, "build");
    await wrapper.get('[data-test="submit"]').trigger("click");
    await wrapper.get('[data-test="submit"]').trigger("click");
    finish({ id: "ok" });
    await flushPromises();
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("stays open and says so when the project cannot be started", async () => {
    start.mockRejectedValue(new Error("boom"));
    const wrapper = await mountWizard();
    await goTo(wrapper, "build");
    await tap(wrapper, "submit");
    expect(wrapper.emitted("close")).toBeUndefined();
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-test="submit"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="submit"]').attributes("disabled")).toBeUndefined();
  });

  it("starts again from the project step with an empty draft each time it opens", async () => {
    const wrapper = await mountWizard();
    await tap(wrapper, "type-moving-out");
    await tap(wrapper, "next");
    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });
    await flushPromises();
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("1 / 5");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeDefined();
  });
});

describe("a project already running", () => {
  const running = { id: "spring-cleaning-2026-10-01", typeId: "spring-cleaning", status: "active" };

  it("says to finish or abandon it first, by the tower's name, and has no Build", async () => {
    projectDb.getActive.mockResolvedValue(running);
    const wrapper = await mountWizard();
    expect(wrapper.get('[data-test="blocked"]').text()).toContain(`Finish or abandon ${SPRING.towerName} first`);
    expect(wrapper.find('[data-test="submit"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="next"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="type-spring-cleaning"]').exists()).toBe(false);
    expect(start).not.toHaveBeenCalled();
  });

  it("closes from the header's close button and from its own Close", async () => {
    projectDb.getActive.mockResolvedValue(running);
    const wrapper = await mountWizard();
    await tap(wrapper, "wizard-close");
    await tap(wrapper, "blocked-close");
    expect(wrapper.emitted("close")).toHaveLength(2);
  });

  it("asks again each time it opens, so a project finished meanwhile no longer blocks", async () => {
    projectDb.getActive.mockResolvedValue(running);
    const wrapper = await mountWizard();
    expect(wrapper.find('[data-test="blocked"]').exists()).toBe(true);
    await wrapper.setProps({ open: false });
    projectDb.getActive.mockResolvedValue(null);
    await wrapper.setProps({ open: true });
    await flushPromises();
    expect(wrapper.find('[data-test="blocked"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="type-spring-cleaning"]').exists()).toBe(true);
  });

  it("names the project by its id when the type is one this version does not know", async () => {
    projectDb.getActive.mockResolvedValue({ id: "holiday-prep-2026-12-01", typeId: "holiday-prep", status: "active" });
    const wrapper = await mountWizard();
    expect(wrapper.get('[data-test="blocked"]').text()).toContain("holiday-prep-2026-12-01");
    expect(wrapper.find('[data-test="submit"]').exists()).toBe(false);
  });
});

describe("a project run before", () => {
  it("starts from the last run's chores, with new ids", async () => {
    const lastChores: ProjectChore[] = suggestChores(SPRING, USUAL_HOUSE, [
      { id: "mom", name: "Mom", band: "grownup" },
      { id: "kai", name: "Kai", band: "kid" },
      { id: "lia", name: "Lia", band: "little" },
    ]);
    projectDb.lastOfType.mockImplementation(async (typeId: string) => (typeId === "spring-cleaning" ? { id: "old", typeId, chores: lastChores } : null));
    const wrapper = await mountWizard();
    expect(projectDb.lastOfType).toHaveBeenCalledWith("spring-cleaning");
    await goTo(wrapper, "build");
    await tap(wrapper, "submit");
    const { chores } = start.mock.calls[0][0];
    expect(chores).toHaveLength(lastChores.length);
    expect(chores.every((chore: ProjectChore) => chore.id.includes("~r1"))).toBe(true);
  });

  it("tells the Game Master the list came from the last run", async () => {
    const movingOut = PROJECT_TYPES["moving-out"];
    const chores = suggestChores(movingOut, USUAL_HOUSE, [{ id: "mom", name: "Mom", band: "grownup" }]);
    projectDb.lastOfType.mockImplementation(async (typeId: string) => (typeId === "moving-out" ? { id: "old", typeId, chores } : null));
    const wrapper = await mountWizard();
    await tap(wrapper, "type-moving-out");
    expect(wrapper.find('[data-test="rerun-note"]').exists()).toBe(true);
    await tap(wrapper, "type-spring-cleaning");
    expect(wrapper.find('[data-test="rerun-note"]').exists()).toBe(false);
  });

  it("opens on the type it is asked for (the trophy's Start again), with the last run's list ready", async () => {
    const movingOut = PROJECT_TYPES["moving-out"];
    const chores = suggestChores(movingOut, USUAL_HOUSE, [{ id: "mom", name: "Mom", band: "grownup" }]);
    projectDb.lastOfType.mockImplementation(async (typeId: string) => (typeId === "moving-out" ? { id: "old", typeId, chores } : null));
    const wrapper = await mountWizard({ open: true, typeId: "moving-out" });
    expect(wrapper.get('[data-test="type-moving-out"]').attributes("aria-pressed")).toBe("true");
    expect(wrapper.get('[data-test="type-spring-cleaning"]').attributes("aria-pressed")).toBe("false");
    expect(wrapper.find('[data-test="rerun-note"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeUndefined();
  });

  it("starts from the suggestions when the last run has no chores a tower could be built from", async () => {
    projectDb.lastOfType.mockImplementation(async (typeId: string) => ({ id: "old", typeId, chores: [] }));
    const wrapper = await mountWizard();
    await goTo(wrapper, "build");
    await tap(wrapper, "submit");
    const { chores } = start.mock.calls[0][0];
    expect(chores.length).toBeGreaterThan(0);
    expect(chores.some((chore: ProjectChore) => chore.id.includes("~r"))).toBe(false);
  });
});

describe("the house step", () => {
  it("rebuilds the chores for the rooms and carries the basement to the tower", async () => {
    const wrapper = await mountWizard();
    await goTo(wrapper, "chores");
    const before = rows(wrapper).length;
    await tap(wrapper, "back");
    await tap(wrapper, "room-more-bedroom");
    await tap(wrapper, "basement");
    await tap(wrapper, "next");
    expect(rows(wrapper).length).toBeGreaterThan(before);
    expect(wrapper.text()).toContain("Bedroom 4");
    await tap(wrapper, "next");
    await typed(wrapper, "reward", "Pizza night");
    await tap(wrapper, "next");
    await tap(wrapper, "submit");
    const { house } = start.mock.calls[0][0];
    expect(house.rooms.bedroom).toBe(4);
    expect(house.basement).toBe(true);
  });

  it("says why Next is shut once no room is left", async () => {
    const wrapper = await mountWizard();
    await tap(wrapper, "type-spring-cleaning");
    await tap(wrapper, "next");
    const toggles = ["kitchen", "living", "dining", "laundry", "storage", "garage", "yard"];
    for (const id of toggles) await tap(wrapper, `room-toggle-${id}`);
    for (const id of ["bedroom", "bathroom"]) {
      for (let count = 0; count < 4; count += 1) {
        if (wrapper.get(`[data-test="room-less-${id}"]`).attributes("disabled") === undefined) await tap(wrapper, `room-less-${id}`);
      }
    }
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[data-test="why"]').text().length).toBeGreaterThan(0);
  });
});

describe("the chores step", () => {
  it("groups the chores by floor, with the finale on the roof, and shows where each one lands", async () => {
    const wrapper = await mountWizard();
    await goTo(wrapper, "chores");
    SPRING.phases.forEach((phase) => expect(wrapper.find(`[data-test="phase-${phase.id}"]`).exists()).toBe(true));
    expect(wrapper.find('[data-test="phase-roof"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="chore-add-roof"]').exists()).toBe(false);
    SPRING.phases.forEach((phase) => expect(wrapper.find(`[data-test="chore-add-${phase.id}"]`).exists()).toBe(true));
    expect(wrapper.get('[data-test="chore-room"]').text().length).toBeGreaterThan(0);
  });

  it("edits a chore's name, size and hero, and Build sends the edits", async () => {
    const wrapper = await mountWizard();
    await goTo(wrapper, "chores");
    const first = rows(wrapper)[0];
    const id = first.attributes("data-chore") as string;
    const rowOf = () => wrapper.get(`[data-chore="${id}"]`);

    await rowOf().get('[data-test="chore-name"]').setValue("Sweep the porch");
    await rowOf().get('[data-test="chore-size"]').setValue("5");
    const whoBefore = rowOf().get('[data-test="chore-who"]').text();
    await rowOf().get('[data-test="chore-who"]').trigger("click");
    await flushPromises();
    expect(rowOf().get('[data-test="chore-who"]').text()).not.toBe(whoBefore);

    await tap(wrapper, "next");
    await typed(wrapper, "reward", "Pizza night");
    await tap(wrapper, "next");
    await tap(wrapper, "submit");
    const { chores, house, heroes } = start.mock.calls[0][0];
    const sent = chores.find((chore: ProjectChore) => chore.id === id);
    const original = suggestChores(SPRING, house, heroes).find((chore) => chore.id === id) as ProjectChore;
    expect(sent.name).toBe("Sweep the porch");
    expect(sent.difficulty).toBe(FIBONACCI_STEPS[5]);
    expect(sent.assignee).not.toEqual(original.assignee);
  });

  it("adds a chore to a floor and drops one, and a floor left with none stops Next with its name", async () => {
    const wrapper = await mountWizard();
    await goTo(wrapper, "chores");
    const before = rows(wrapper).length;
    await tap(wrapper, "chore-add-organize");
    expect(rows(wrapper)).toHaveLength(before + 1);
    expect(wrapper.get('[data-phase="organize"]').findAll('[data-test="chore-row"]').pop()?.attributes("data-custom")).toBe("true");

    const organize = wrapper.get('[data-phase="organize"]');
    while (organize.findAll('[data-test="chore-row"]').length > 0) {
      await organize.get('[data-test="chore-drop"]').trigger("click");
      await flushPromises();
    }
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[data-test="why"]').text()).toContain("Organize");
  });

  it("gives the finale no drop button", async () => {
    const wrapper = await mountWizard();
    await goTo(wrapper, "chores");
    const roof = wrapper.get('[data-phase="roof"]');
    expect(roof.findAll('[data-test="chore-row"]')).toHaveLength(1);
    expect(roof.find('[data-test="chore-drop"]').exists()).toBe(false);
  });
});

describe("the dates step", () => {
  it("opens on the type's default end, with the floors' days above and the end date and reward below", async () => {
    const wrapper = await mountWizard();
    await goTo(wrapper, "dates");
    const endOn = wrapper.get('[data-test="end-on"]').element as HTMLInputElement;
    expect(endOn.value).toBe(dateKey(addDays(new Date(), SPRING.defaultDays)));
    expect(wrapper.findAll('[data-test="window"]')).toHaveLength(SPRING.phases.length);
    expect(wrapper.find('[data-test="reward"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[data-test="why"]').text().length).toBeGreaterThan(0);
  });

  it("refuses an end before the earliest and names that date", async () => {
    const wrapper = await mountWizard();
    await goTo(wrapper, "dates");
    await typed(wrapper, "reward", "Pizza night");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeUndefined();
    await typed(wrapper, "end-on", TODAY);
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[data-test="why"]').text()).toContain(minimumEndOn(SPRING.phases.length, TODAY));
    await typed(wrapper, "end-on", minimumEndOn(SPRING.phases.length, TODAY));
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeUndefined();
  });

  it("holds Build back while the reward is empty, and the summary names the reward once it is given", async () => {
    const wrapper = await mountWizard();
    await goTo(wrapper, "dates");
    await typed(wrapper, "reward", "Pizza night");
    await tap(wrapper, "next");
    expect(wrapper.get('[data-test="build-summary"]').text()).toContain("Pizza night");
    await tap(wrapper, "back");
    await typed(wrapper, "reward", "   ");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeDefined();
    expect(start).not.toHaveBeenCalled();
  });
});

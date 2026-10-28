import { flushPromises, mount } from "@vue/test-utils";
import { addDays } from "date-fns";
import { createPinia, setActivePinia } from "pinia";
import XpProjectWizardModal from "@/app/SideMenu/XpSettings/components/XpProjectWizardModal.vue";
import { getProjectDb } from "@/lib/databases/ProjectDb";
import { buildMovingPack } from "@/lib/services/core/packs/movingPack";
import { dateKey } from "@/lib/services/core/packs/packCommon";
import { carriedQuestIds, prefillMovingOut } from "@/lib/services/projects/movingOutPrefill";
import { readOpenMoveQuests, retireOldHouse, startProject } from "@/lib/services/projects/projectService";
import { useUserStore } from "@/lib/store/stores/user";
import { answers } from "./movingHouseFixtures";

/**
 * Moving Out from the Moving House dialog: the wizard opens on the draft it is given (the house step, the family's rooms
 * and moving chores in place), and building Moving Out retires the Old House with the board chores still in the list.
 * The same stubs as XpProjectWizardModal.spec.ts: the Ionic frame, the project service and the project database.
 */

jest.mock("@/hooks/useToast", () => ({ __esModule: true, useToast: () => ({ showToast: jest.fn() }) }));
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
const retire = retireOldHouse as jest.Mock;
const openQuests = readOpenMoveQuests as jest.Mock;
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

const FAMILY = [
  { id: "mom", name: "Mom", band: "grownup" as const },
  { id: "kai", name: "Kai", band: "kid" as const },
  { id: "lia", name: "Lia", band: "little" as const },
];
// The dialog leaves `today` out, so the draft ends on the type's usual day counted from the real today, as the wizard does
const GIVEN = answers({ heroes: FAMILY, today: undefined, moveDate: dateKey(addDays(new Date(), 40)) });
const QUESTS = buildMovingPack(GIVEN).quests;
const prefill = () => prefillMovingOut(GIVEN, QUESTS, FAMILY);

const aged = (years: number): string => `${new Date().getFullYear() - years}-01-01`;

const mountWizard = async (props: Record<string, unknown>) => {
  localStorage.clear();
  setActivePinia(createPinia());
  const store = useUserStore();
  store.addUser({ id: "mom", isAdult: true, birthday: aged(30), name: { first: "Mom", nick: "Mom" } } as never);
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

/** From the project step, with a type picked, to the end: the house and the chores are taken as they come */
const buildFromType = async (wrapper: Wizard) => {
  await tap(wrapper, "next");
  await buildFromHouse(wrapper);
};

/** From the house step to the end: through the chores and the dates (a reward is asked there) to the build step, then Build */
const buildFromHouse = async (wrapper: Wizard) => {
  await tap(wrapper, "next");
  await tap(wrapper, "next");
  await wrapper.get('[data-test="reward"]').setValue("Pizza night");
  await flushPromises();
  await tap(wrapper, "next");
  await tap(wrapper, "submit");
};

beforeEach(() => {
  start.mockReset();
  start.mockResolvedValue({ id: "ok" });
  retire.mockReset();
  retire.mockResolvedValue(undefined);
  openQuests.mockReset();
  openQuests.mockResolvedValue([]);
  projectDb.getActive.mockReset();
  projectDb.getActive.mockResolvedValue(null);
  projectDb.lastOfType.mockReset();
  projectDb.lastOfType.mockResolvedValue(null);
  (getProjectDb as jest.Mock).mockReturnValue(projectDb);
});

describe("the wizard opened with a draft", () => {
  it("opens on the house step of Moving Out, with the family's rooms and moving chores in place", async () => {
    const draft = prefill();
    const wrapper = await mountWizard({ open: true, initial: draft });

    expect(wrapper.get(".xp-app-header__meta").text()).toBe("2 / 5");
    expect(wrapper.find('[data-test="step-house"]').exists()).toBe(true);
    await tap(wrapper, "next");
    expect(wrapper.findAll('[data-test="chore-row"]')).toHaveLength(draft.chores.length);
  });

  it("starts from the draft each time it opens, and from an empty one when it opens without", async () => {
    const wrapper = await mountWizard({ open: true, initial: prefill() });
    await wrapper.setProps({ open: false, initial: undefined });
    await wrapper.setProps({ open: true });
    await flushPromises();

    expect(wrapper.get(".xp-app-header__meta").text()).toBe("1 / 5");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeDefined();
  });
});

describe("building Moving Out retires the Old House", () => {
  it("builds Moving Out from the draft and retires it with the board chores that are in the tower", async () => {
    const draft = prefill();
    const wrapper = await mountWizard({ open: true, initial: draft });

    await buildFromHouse(wrapper);

    expect(start).toHaveBeenCalledTimes(1);
    expect(start.mock.calls[0][0].type.id).toBe("moving-out");
    expect(retire).toHaveBeenCalledTimes(1);
    expect(retire.mock.calls[0][0].sort()).toEqual(carriedQuestIds(draft).sort());
    expect(retire.mock.calls[0][0].length).toBeGreaterThan(10);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("leaves a chore the Game Master dropped from the list on the board", async () => {
    const draft = prefill();
    const wrapper = await mountWizard({ open: true, initial: draft });
    await tap(wrapper, "next");
    const dropped = draft.chores[0];
    await wrapper.get('[data-test="chore-drop"]').trigger("click");
    await flushPromises();
    await tap(wrapper, "next");
    await wrapper.get('[data-test="reward"]').setValue("Pizza night");
    await flushPromises();
    await tap(wrapper, "next");
    await tap(wrapper, "submit");

    const kept = retire.mock.calls[0][0] as string[];
    expect(dropped.id).toContain("custom-move-");
    expect(kept).not.toContain(dropped.id.split("custom-")[1]);
    expect(kept).toHaveLength(carriedQuestIds(draft).length - 1);
  });

  it("retires it when Moving Out is built from its own card too, with nothing to take off the board", async () => {
    const wrapper = await mountWizard({ open: true });
    await tap(wrapper, "type-moving-out");

    await buildFromType(wrapper);

    expect(retire).toHaveBeenCalledWith([]);
  });

  it("leaves the Old House alone when another kind of project is built", async () => {
    const wrapper = await mountWizard({ open: true });
    await tap(wrapper, "type-spring-cleaning");

    await buildFromType(wrapper);

    expect(start).toHaveBeenCalledTimes(1);
    expect(retire).not.toHaveBeenCalled();
  });

  it("does not retire it when the tower could not be built", async () => {
    start.mockRejectedValue(new Error("boom"));
    const wrapper = await mountWizard({ open: true, initial: prefill() });

    await buildFromHouse(wrapper);

    expect(retire).not.toHaveBeenCalled();
    expect(wrapper.emitted("close")).toBeUndefined();
  });
});

describe("changing the rooms after the handover", () => {
  it("keeps the chores carried from the board, so the tower does not get them as suggestions on top", async () => {
    const draft = prefill();
    const wrapper = await mountWizard({ open: true, initial: draft });

    await tap(wrapper, "room-less-bedroom");
    await tap(wrapper, "next");

    const carried = carriedQuestIds(draft).length;
    expect(carried).toBeGreaterThan(10);
    expect(wrapper.findAll('[data-test="chore-row"][data-custom="true"]')).toHaveLength(carried);
    await tap(wrapper, "next");
    await wrapper.get('[data-test="reward"]').setValue("Pizza night");
    await flushPromises();
    await tap(wrapper, "next");
    await tap(wrapper, "submit");
    expect(retire.mock.calls[0][0]).toHaveLength(carried);
  });
});

describe("Moving Out picked on the Start a Project card", () => {
  it("carries the open moving chores in, as the handover does, and retires the Old House with them", async () => {
    openQuests.mockResolvedValue(QUESTS);
    const wrapper = await mountWizard({ open: true });

    await tap(wrapper, "type-moving-out");
    await buildFromType(wrapper);

    expect(openQuests).toHaveBeenCalledTimes(1);
    const taken = retire.mock.calls[0][0] as string[];
    expect(taken.length).toBeGreaterThan(10);
    expect(start.mock.calls[0][0].chores.filter((chore: { custom?: boolean }) => chore.custom)).toHaveLength(taken.length);
  });

  it("reads no board for another kind of project", async () => {
    const wrapper = await mountWizard({ open: true });

    await tap(wrapper, "type-spring-cleaning");

    expect(openQuests).not.toHaveBeenCalled();
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeUndefined();
  });

  it("starts from the suggestions when the board cannot be read, and still builds", async () => {
    openQuests.mockRejectedValue(new Error("no storage"));
    const wrapper = await mountWizard({ open: true });

    await tap(wrapper, "type-moving-out");
    await buildFromType(wrapper);

    expect(start).toHaveBeenCalledTimes(1);
    expect(retire).toHaveBeenCalledWith([]);
  });
});

describe("the heroes the dialog handed over", () => {
  const HANDED = [
    { id: "mom", name: "Mom", band: "grownup" as const },
    { id: "kai", name: "Kai", band: "kid" as const },
    { id: "lia", name: "Lia", band: "out" as const },
  ];

  it("are the heroes of the whole build: Lia, sitting out in the dialog, is not made a hero of the tower", async () => {
    const given = answers({ heroes: HANDED, today: undefined, moveDate: dateKey(addDays(new Date(), 40)) });
    const draft = prefillMovingOut(given, buildMovingPack(given).quests, HANDED);
    const wrapper = await mountWizard({ open: true, initial: draft, heroes: HANDED });

    await buildFromHouse(wrapper);

    expect(start.mock.calls[0][0].heroes).toEqual(HANDED);
  });

  it("are not asked for when the wizard opens by itself: the family's profiles are the heroes", async () => {
    const wrapper = await mountWizard({ open: true, initial: prefill() });

    await buildFromHouse(wrapper);

    expect(start.mock.calls[0][0].heroes.map((hero: { id: string; band: string }) => `${hero.id}:${hero.band}`).sort()).toEqual(["kai:kid", "lia:little", "mom:grownup"]);
  });
});

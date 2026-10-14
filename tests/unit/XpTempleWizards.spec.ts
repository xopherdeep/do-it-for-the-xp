import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { computed, ref } from "vue";
import XpTempleAttributesWizard from "@/app/Admin/XpCompendium/views/XpTemples/components/tabs/XpTempleAttributesWizard.vue";
import XpTempleGenerateModal from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleGenerateModal.vue";
import { TempleDataInjectionKey } from "@/app/Admin/XpCompendium/views/XpTemples/hooks/useTempleData";
import { TempleDb, templeStorage } from "@/lib/databases/TempleDb";
import type { TempleInterface } from "@/lib/databases/TempleDb";
import { alertController, toastController } from "@ionic/vue";

/**
 * The two temple wizards on the shared shell: Config > General (Name and theme, Check and open) and the Generate modal
 * (Seed, Size and floors, Theme, Preview and save). The Ionic frame, the speech button, the temple hook, the creator
 * grid and the sounds are stubs; the shell, the steps, the forms, the generator and TempleDb (over an in-memory
 * storage) are real. The rules themselves are in templeWizard.spec.ts.
 */

jest.mock("@ionic/storage", () => {
  const rows = new Map<string, Map<string, unknown>>();
  class FakeStorage {
    private readonly mine: Map<string, unknown>;
    constructor(config: { name: string }) {
      if (!rows.has(config.name)) rows.set(config.name, new Map());
      this.mine = rows.get(config.name) as Map<string, unknown>;
    }
    async create() {
      return this;
    }
    async get(key: string) {
      return this.mine.has(key) ? JSON.parse(JSON.stringify(this.mine.get(key))) : null;
    }
    async set(key: string, value: unknown) {
      this.mine.set(key, JSON.parse(JSON.stringify(value)));
    }
    async remove(key: string) {
      this.mine.delete(key);
    }
    async clear() {
      this.mine.clear();
    }
    async keys() {
      return Array.from(this.mine.keys());
    }
  }
  return { Drivers: { IndexedDB: "indexeddb", LocalStorage: "localstorage" }, Storage: FakeStorage };
});
jest.mock("@ionic/vue", () => ({
  __esModule: true,
  ...jest.requireActual("@ionic/vue"),
  alertController: { create: jest.fn() },
  toastController: { create: jest.fn() },
}));
const mockPush = jest.fn();
jest.mock("vue-router", () => ({
  __esModule: true,
  ...jest.requireActual("vue-router"),
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ params: {}, query: {} }),
}));
jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn(), default: {} }));
jest.mock("@/lib/engine/audio/speech", () => ({
  __esModule: true,
  speak: jest.fn(() => true),
  stop: jest.fn(),
  hasReadingVoice: () => false,
  onReadingVoiceChange: () => () => undefined,
}));
jest.mock("@/lib/engine/core/dungeons/importAllTemples", () => ({
  __esModule: true,
  ensureBuiltInTemples: jest.fn(async () => undefined),
}));
// The hook drags in the whole temple engine; the wizard only needs its injection key
jest.mock("@/app/Admin/XpCompendium/views/XpTemples/hooks/useTempleData", () => ({
  __esModule: true,
  TempleDataInjectionKey: Symbol("TempleData"),
}));
jest.mock("@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/hooks/useTempleCreator", () => ({
  __esModule: true,
  SIDE_TYPE_INFO: {},
}));

const alertCreate = alertController.create as jest.Mock;
const toastCreate = toastController.create as jest.Mock;
const templeDb = new TempleDb(templeStorage);

const slot = { template: "<div><slot /></div>" };
const stubs = {
  IonPage: slot,
  IonHeader: slot,
  IonToolbar: slot,
  IonFooter: slot,
  IonContent: slot,
  IonModal: { props: ["isOpen"], emits: ["didDismiss"], template: "<div v-if='isOpen' class='modal-stub'><slot /></div>" },
  XpCloseButton: { template: "<button class='close-stub' data-test='wizard-close'></button>" },
  XpSpeakButton: { props: ["text"], template: "<button class='speak-stub' :data-text='text'></button>" },
  XpTempleCreatorGrid: { template: "<div class='grid-stub'></div>" },
};

const tap = async (wrapper: { get: (selector: string) => { trigger: (event: string) => Promise<void> } }, test: string) => {
  await wrapper.get(`[data-test="${test}"]`).trigger("click");
  await flushPromises();
};

const setField = async (wrapper: { get: (selector: string) => { setValue: (value: string) => Promise<void> } }, test: string, text: string) => {
  await wrapper.get(`[data-test="${test}"]`).setValue(text);
  await flushPromises();
};

beforeEach(async () => {
  jest.clearAllMocks();
  toastCreate.mockResolvedValue({ present: jest.fn() });
  await templeDb.clear();
});

// ---------------------------------------------------------------------------------------------------------------------
// Config > General
// ---------------------------------------------------------------------------------------------------------------------

const auditOf = (passed: boolean) => ({
  checks: [
    { id: "entrance", label: "Entrance", ok: true, detail: "Placed" },
    { id: "boss", label: "Boss room", ok: false, detail: "Place a boss room" },
  ],
  passed,
  summary: "1 of 2 checks pass",
  totalKeys: 1,
  totalLockedDoors: 2,
  keyBalance: -1,
});

/** What the temple hook hands down, with a temple that was loaded into it */
const hookWith = (loaded: Partial<TempleInterface>, passed = false) => {
  const temple = ref({ id: "temple-abc", categoryIds: [] as string[], level: 1, ...loaded } as TempleInterface);
  const saveTemple = jest.fn(async () => undefined);
  const data = {
    temple,
    categories: ref([
      { id: "c1", name: "Kitchen" },
      { id: "c2", name: "Yard" },
    ]),
    saveTemple,
    dungeonAudit: computed(() => auditOf(passed)),
  };
  return { data, temple, saveTemple };
};

const mountGeneral = async (data: unknown, templeId = "temple-abc") => {
  setActivePinia(createPinia());
  const wrapper = mount(XpTempleAttributesWizard, {
    props: { templeId, tab: "general" },
    global: { stubs, provide: { [TempleDataInjectionKey as unknown as symbol]: data } },
  });
  await flushPromises();
  return wrapper;
};

describe("Config > General as a wizard", () => {
  it("opens a new temple on Name and theme: New Temple, 1 / 2, Close, the guide's line, Next shut with the reason", async () => {
    const { data } = hookWith({});
    const wrapper = await mountGeneral(data);
    expect(wrapper.get(".xp-app-header__title").text()).toBe("New Temple");
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("1 / 2");
    expect(wrapper.find('[data-test="step-name"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="back"]').text()).toBe("Close");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[data-test="why"]').text()).toBe("Name the temple");
    const line = wrapper.get('[data-test="guide"] span').text();
    expect(line).not.toBe("");
    expect(wrapper.get(".speak-stub").attributes("data-text")).toBe(line);
  });

  it("keeps the name, the sign and the controls where a thumb reaches: in the bottom bar", async () => {
    const { data } = hookWith({});
    const wrapper = await mountGeneral(data);
    const bar = wrapper.get(".xp-wiz-bar");
    expect(bar.find('[data-test="name-input"]').exists()).toBe(true);
    expect(bar.find('[data-test="signs"]').exists()).toBe(true);
  });

  it("shows what the temple is called as it is typed, and Next wakes", async () => {
    const { data } = hookWith({});
    const wrapper = await mountGeneral(data);
    expect(wrapper.get('[data-test="nameplate"]').text()).toBe("Name it below");
    await setField(wrapper, "name-input", "Spire of Chores");
    expect(wrapper.get('[data-test="nameplate"]').text()).toBe("Spire of Chores");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeUndefined();
    expect(wrapper.find('[data-test="why"]').exists()).toBe(false);
  });

  it("goes on to Check and open, which lists the audit and names Save, and never blocks on what the audit lacks", async () => {
    const { data } = hookWith({}, false);
    const wrapper = await mountGeneral(data);
    await setField(wrapper, "name-input", "Spire of Chores");
    await tap(wrapper, "next");
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("2 / 2");
    expect(wrapper.find('[data-test="step-check"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="summary-title"]').text()).toBe("Spire of Chores");
    expect(wrapper.get('[data-test="verdict"]').text()).toContain("1 of 2 checks pass");
    expect(wrapper.find('[data-check="entrance"]').classes()).toContain("is-ok");
    expect(wrapper.find('[data-check="boss"]').classes()).not.toContain("is-ok");
    expect(wrapper.get('[data-test="submit"]').text()).toBe("Save");
    expect(wrapper.get('[data-test="submit"]').attributes("disabled")).toBeUndefined();
  });

  it("saves through the temple hook with the name, domains, sign and description the steps gave", async () => {
    const { data, temple, saveTemple } = hookWith({});
    const wrapper = await mountGeneral(data);
    await setField(wrapper, "name-input", "  Spire of Chores ");
    await setField(wrapper, "description", "Wind and stairs");
    await tap(wrapper, "domain-c2");
    await tap(wrapper, "sign-fa-skull");
    await tap(wrapper, "next");
    await tap(wrapper, "submit");
    expect(saveTemple).toHaveBeenCalledTimes(1);
    expect(temple.value).toMatchObject({
      id: "temple-abc",
      customName: "Spire of Chores",
      customDescription: "Wind and stairs",
      categoryIds: ["c2"],
      customIcon: "fad fa-skull",
    });
  });

  it("opens a stored temple on the check, as an edit with the dots to go back by, and a dot goes back to the name", async () => {
    await templeDb.setTemple({ id: "temple-abc", name: "Old Name", customName: "The Hearth", categoryIds: ["c1"] });
    const { data } = hookWith({ customName: "The Hearth", categoryIds: ["c1"] });
    const wrapper = await mountGeneral(data);
    expect(wrapper.get(".xp-app-header__title").text()).toBe("Edit Temple");
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("2 / 2");
    expect(wrapper.get('[data-test="summary-title"]').text()).toBe("The Hearth");
    expect(wrapper.get('[data-test="summary-domains"]').text()).toBe("Kitchen");
    await tap(wrapper, "dot-name");
    expect(wrapper.find('[data-test="step-name"]').exists()).toBe(true);
    expect((wrapper.get('[data-test="name-input"]').element as HTMLInputElement).value).toBe("The Hearth");
  });

  it("leaves a shipped temple's name and sign alone when they were not changed", async () => {
    await templeDb.setTemple({ id: "wind-temple", name: "The Howling Spire", categoryIds: [] });
    const { data, temple, saveTemple } = hookWith({ id: "wind-temple", name: "The Howling Spire" });
    const wrapper = await mountGeneral(data, "wind-temple");
    await tap(wrapper, "submit");
    expect(saveTemple).toHaveBeenCalledTimes(1);
    expect("customName" in temple.value).toBe(false);
    expect("customIcon" in temple.value).toBe(false);
  });

  it("says so, and stays, when the save fails", async () => {
    const { data, saveTemple } = hookWith({ name: "Old", id: "wind-temple" });
    saveTemple.mockRejectedValueOnce(new Error("disk full"));
    await templeDb.setTemple({ id: "wind-temple", name: "Old", categoryIds: [] });
    const wrapper = await mountGeneral(data, "wind-temple");
    await tap(wrapper, "submit");
    expect(toastCreate).toHaveBeenCalledWith(expect.objectContaining({ message: "There was a problem saving the temple", cssClass: "rpg-toast" }));
    expect(wrapper.find('[data-test="step-check"]').exists()).toBe(true);
  });

  it("closes to the Temples list", async () => {
    const { data } = hookWith({});
    const wrapper = await mountGeneral(data);
    await tap(wrapper, "back");
    expect(mockPush).toHaveBeenCalledWith({ name: "xp-compendium-temples" });
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------------------------------------------------

const mountGenerate = async (isOpen = true) => {
  setActivePinia(createPinia());
  const wrapper = mount(XpTempleGenerateModal, { props: { isOpen }, global: { stubs } });
  await flushPromises();
  return wrapper;
};

/** From the first step to the preview, with a seed we know */
const growTemple = async (wrapper: Awaited<ReturnType<typeof mountGenerate>>, seed = "attic-417") => {
  await setField(wrapper, "seed-input", seed);
  await tap(wrapper, "next");
  await tap(wrapper, "next");
  await tap(wrapper, "next");
};

describe("the Generate modal as a wizard", () => {
  it("renders nothing while it is shut, and opens on the Seed: 1 / 4, the seed on a plate, Next open", async () => {
    const shut = await mountGenerate(false);
    expect(shut.find(".xp-wizard").exists()).toBe(false);

    const wrapper = await mountGenerate();
    expect(wrapper.get(".xp-app-header__title").text()).toBe("Generate a Temple");
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("1 / 4");
    expect(wrapper.get('[data-test="seed-plate"]').text()).toMatch(/^[a-z]+-\d{3}$/);
    expect(wrapper.get('[data-test="back"]').text()).toBe("Close");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeUndefined();
    expect(wrapper.get('[data-test="seed-input"]').element.closest(".xp-wiz-bar")).not.toBeNull();
  });

  it("asks for a seed: blank shuts Next with the reason", async () => {
    const wrapper = await mountGenerate();
    await setField(wrapper, "seed-input", "  ");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[data-test="why"]').text()).toBe("Give it a seed");
  });

  it("rerolls to the next seed, and to a fresh one when the field is blank", async () => {
    const wrapper = await mountGenerate();
    await setField(wrapper, "seed-input", "attic-417");
    await tap(wrapper, "reroll");
    expect(wrapper.get('[data-test="seed-plate"]').text()).toBe("attic-418");
    await setField(wrapper, "seed-input", "");
    await tap(wrapper, "reroll");
    expect(wrapper.get('[data-test="seed-plate"]').text()).toMatch(/^[a-z]+-\d{3}$/);
  });

  it("takes the size, the floors and the locks from rails at the bottom, and says what they add up to", async () => {
    const wrapper = await mountGenerate();
    await tap(wrapper, "next");
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("2 / 4");
    expect(wrapper.get(".xp-wiz-bar").find('[data-test="floors-3"]').exists()).toBe(true);
    await tap(wrapper, "size-large");
    await tap(wrapper, "floors-3");
    await tap(wrapper, "locks-0");
    const lines = wrapper.findAll('[data-test="size-line"]').map((line) => line.text());
    expect(lines).toEqual(["About 7 to 9 rooms across a floor", "3 floors, joined by stairs", "No locked doors on the way"]);
    expect(wrapper.get('[data-test="size-large"]').classes()).toContain("is-active");
  });

  it("asks for a theme: blank says Pick a theme, an idea fills it, an element rail picks the element", async () => {
    const wrapper = await mountGenerate();
    await tap(wrapper, "next");
    await tap(wrapper, "next");
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("3 / 4");
    await setField(wrapper, "theme-input", "");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[data-test="why"]').text()).toBe("Pick a theme");

    const yard = wrapper.findAll('[data-test="theme-idea"]').find((idea) => idea.text() === "Yard");
    expect(yard).toBeDefined();
    await yard?.trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-test="theme-plate"]').text()).toBe("Yard");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeUndefined();

    await tap(wrapper, "element-moon");
    expect(wrapper.get('[data-test="element-moon"]').classes()).toContain("is-active");
  });

  it("grows the temple when the preview opens: the verdict, a grid per floor and the verb Save as <id>", async () => {
    const wrapper = await mountGenerate();
    await growTemple(wrapper);
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("4 / 4");
    expect(wrapper.find('[data-test="verdict"]').classes()).toContain("is-solvable");
    expect(wrapper.findAll('[data-test="floor"]')).toHaveLength(2);
    expect(wrapper.get('[data-test="submit"]').text()).toBe("Save as gen-attic-417");
    expect(wrapper.get('[data-test="submit"]').attributes("disabled")).toBeUndefined();
  });

  it("saves once, under the seed's id, tells the parent and says so in a toast", async () => {
    const wrapper = await mountGenerate();
    await growTemple(wrapper);
    await tap(wrapper, "submit");
    const stored = await templeDb.getTempleById("gen-attic-417");
    expect(stored).toMatchObject({ id: "gen-attic-417", generated: true, seed: "attic-417" });
    expect(stored?.dungeonLayout).toBeTruthy();
    expect(wrapper.emitted("saved")).toHaveLength(1);
    expect((wrapper.emitted("saved") as unknown[][])[0][0]).toMatchObject({ id: "gen-attic-417" });
    expect(toastCreate).toHaveBeenCalledWith(expect.objectContaining({ cssClass: "rpg-toast" }));
  });

  it("asks Replace, Save as a copy or Cancel when the id holds a different temple, and a copy takes the next free id", async () => {
    await templeDb.setTemple({ id: "gen-attic-417", name: "Edited by hand", categoryIds: [] });
    alertCreate.mockResolvedValue({ present: jest.fn(), onDidDismiss: () => Promise.resolve({ role: "copy" }) });
    const wrapper = await mountGenerate();
    await growTemple(wrapper);
    await tap(wrapper, "submit");
    expect(alertCreate).toHaveBeenCalledTimes(1);
    const buttons = (alertCreate.mock.calls[0][0] as { buttons: { text: string }[] }).buttons.map((button) => button.text);
    expect(buttons).toEqual(["Cancel", "Save as a copy", "Replace"]);
    expect((await templeDb.getTempleById("gen-attic-417"))?.name).toBe("Edited by hand");
    expect(await templeDb.getTempleById("gen-attic-417-2")).toMatchObject({ id: "gen-attic-417-2", generated: true });
  });

  it("writes nothing when the ask is answered Cancel", async () => {
    await templeDb.setTemple({ id: "gen-attic-417", name: "Edited by hand", categoryIds: [] });
    alertCreate.mockResolvedValue({ present: jest.fn(), onDidDismiss: () => Promise.resolve({ role: "cancel" }) });
    const wrapper = await mountGenerate();
    await growTemple(wrapper);
    await tap(wrapper, "submit");
    expect(wrapper.emitted("saved")).toBeUndefined();
    expect((await templeDb.getTempleById("gen-attic-417"))?.name).toBe("Edited by hand");
    expect(await templeDb.getTempleById("gen-attic-417-2")).toBeNull();
  });

  it("grows the temple again from a changed input, not the stale one", async () => {
    const wrapper = await mountGenerate();
    await growTemple(wrapper, "attic-417");
    await tap(wrapper, "back");
    await tap(wrapper, "back");
    await tap(wrapper, "back");
    await setField(wrapper, "seed-input", "pantry-9");
    await tap(wrapper, "next");
    await tap(wrapper, "next");
    await tap(wrapper, "next");
    expect(wrapper.get('[data-test="submit"]').text()).toBe("Save as gen-pantry-9");
  });

  it("starts over each time it opens: the first step, a fresh seed", async () => {
    const wrapper = await mountGenerate();
    await growTemple(wrapper);
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("4 / 4");
    await wrapper.setProps({ isOpen: false });
    await wrapper.setProps({ isOpen: true });
    await flushPromises();
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("1 / 4");
    expect(wrapper.get('[data-test="seed-plate"]').text()).not.toBe("attic-417");
  });

  it("closes from the first step", async () => {
    const wrapper = await mountGenerate();
    await tap(wrapper, "back");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });
});

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";
import XpAddBeast from "@/app/Admin/XpCompendium/views/XpBestiary/components/XpAddBeast.vue";
import BestiaryDb, { beastStorage } from "@/lib/databases/BestiaryDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import { backgroundManager } from "@/lib/engine/core/BackgroundManager";
import { play$fx } from "@/assets/fx";
import { modalController, toastController } from "@ionic/vue";

/**
 * The Game Master's beast form on the shared wizard shell: Pick its look, Name it, Chores that beat it, then the
 * summary with Summon (a new beast, with the fanfare) or Save (an edit, which opens on the summary). The Ionic frame,
 * the speech button, the fanfare, the background engine and the pickers' modals are stubs; the shell, the steps, the
 * form and BestiaryDb (over an in-memory storage) are real, so an edit is proven to keep what the form never shows.
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
  modalController: { create: jest.fn() },
  toastController: { create: jest.fn() },
}));
const mockPush = jest.fn();
let mockQuery: Record<string, string> = {};
jest.mock("vue-router", () => ({
  __esModule: true,
  ...jest.requireActual("vue-router"),
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ params: {}, query: mockQuery }),
}));
jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn(), default: {} }));
jest.mock("@/lib/engine/audio/speech", () => ({
  __esModule: true,
  speak: jest.fn(() => true),
  stop: jest.fn(),
  hasReadingVoice: () => false,
  onReadingVoiceChange: () => () => undefined,
}));
jest.mock("@/lib/engine/core/BackgroundManager", () => ({
  __esModule: true,
  backgroundManager: {
    initBackground: jest.fn(),
    updateBackground: jest.fn(),
    cleanupBackground: jest.fn(),
    isActiveFor: jest.fn(() => false),
  },
}));
jest.mock("@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/components/beastPortrait", () => ({
  __esModule: true,
  beastPortraitUrl: (avatar?: number | null) => (avatar ? `beast-${avatar}.webp` : null),
}));
jest.mock("@/components/molecules/AvatarSelect", () => ({ __esModule: true, default: { name: "AvatarSelectStub" } }));
jest.mock("@/components/organisms/BeastPhoto/BeastPhotoPicker.vue", () => ({
  __esModule: true,
  default: { name: "BeastPhotoPickerStub" },
}));
jest.mock("@/app/Admin/XpCompendium/views/XpBestiary/components/BeastDetailsModal.vue", () => ({
  __esModule: true,
  default: { name: "BeastDetailsModalStub" },
}));
// The review service is the creation rules' own (tests/unit/creationReview.spec.ts); here only the call is proven
jest.mock("@/lib/services/creations/creationReview", () => ({
  __esModule: true,
  approveStoredBeast: jest.fn().mockResolvedValue(true),
}));
import { approveStoredBeast } from "@/lib/services/creations/creationReview";
import { useUserStore } from "@/lib/store/stores/user";
const approveBeast = approveStoredBeast as jest.Mock;

const create = modalController.create as jest.Mock;
const toast = toastController.create as jest.Mock;
const fx = play$fx as jest.Mock;
const manager = backgroundManager as unknown as Record<"initBackground" | "updateBackground", jest.Mock>;
const bestiaryDb = new BestiaryDb(beastStorage);

/** A beast the family has grown: attached to quests, with an element, a temple theme and a second look */
const grownBeast = (): Beast => ({
  id: "beast-dish-goblin",
  name: "Dish Goblin",
  checklist: ["Load the dishwasher", "Wipe the counters"],
  avatar: 3,
  variantAvatar: 41,
  achievementIds: ["quest-1", "quest-2"],
  element: "forest",
  theme: "shadow",
  bg1: 10,
  bg2: 20,
  aspectRatio: 48,
});

const slot = { template: "<div><slot /></div>" };
const selectorStub = {
  name: "SelectorStub",
  props: ["initialBg1", "initialBg2", "aspectRatio", "targetRef"],
  emits: ["background-changed"],
  setup() {
    const isBgControlsModalOpen = ref(false);
    const openBgControlsModal = () => {
      isBgControlsModalOpen.value = true;
    };
    return { isBgControlsModalOpen, openBgControlsModal };
  },
  template: "<div class='selector-stub' :data-open='String(isBgControlsModalOpen)'></div>",
};
const stubs = {
  IonPage: slot,
  IonHeader: slot,
  IonToolbar: slot,
  IonFooter: slot,
  IonContent: slot,
  IonTextarea: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: "<textarea :value='modelValue' @input=\"$emit('update:modelValue', $event.target.value)\"></textarea>",
  },
  XpCloseButton: { template: "<button class='close-stub' data-test='wizard-close'></button>" },
  XpSpeakButton: { props: ["text"], template: "<button class='speak-stub' :data-text='text'></button>" },
  XpHeroFanfare: {
    props: ["open", "name", "subtitle", "portrait"],
    emits: ["done"],
    template: "<div class='fanfare-stub' :data-open='String(open)' :data-name='name' @click=\"$emit('done')\"></div>",
  },
  XpBackgroundSelector: selectorStub,
};

const mountForm = async (props: { id?: string } = {}) => {
  setActivePinia(createPinia());
  const wrapper = mount(XpAddBeast, { props, global: { stubs } });
  await flushPromises();
  return wrapper;
};
type Form = Awaited<ReturnType<typeof mountForm>>;

const tap = async (wrapper: Form, test: string) => {
  await wrapper.get(`[data-test="${test}"]`).trigger("click");
  await flushPromises();
};

const setField = async (wrapper: Form, test: string, text: string) => {
  await wrapper.get(`[data-test="${test}"]`).setValue(text);
  await flushPromises();
};

/** The avatar picker answers with this beast number, as a modal that closed with a pick would */
const pickerAnswers = (avatar: number | undefined) => {
  create.mockResolvedValueOnce({
    present: jest.fn(),
    onDidDismiss: () => Promise.resolve({ data: avatar }),
    onWillDismiss: () => Promise.resolve({ data: avatar }),
  });
};

const addChore = async (wrapper: Form, text: string) => {
  await setField(wrapper, "chore-input", text);
  await tap(wrapper, "chore-add");
};

/** From a new form to the summary with a look, a name and one chore */
const fillNewBeast = async (wrapper: Form, name = "Kitchen Dragon", chore = "Wipe the counters") => {
  pickerAnswers(12);
  await tap(wrapper, "pick-beast");
  await tap(wrapper, "next");
  await setField(wrapper, "name-input", name);
  await tap(wrapper, "next");
  await addChore(wrapper, chore);
  await tap(wrapper, "next");
};

const storedBeasts = async () => (await bestiaryDb.getAll()) as Beast[];

beforeEach(async () => {
  jest.clearAllMocks();
  mockQuery = {};
  toast.mockResolvedValue({ present: jest.fn() });
  await bestiaryDb.clear();
});

describe("a new beast", () => {
  it("opens on its look: New Beast, 1 / 4, Close, the guide's line, Next shut with the reason", async () => {
    const wrapper = await mountForm();
    expect(wrapper.get(".xp-app-header__title").text()).toBe("New Beast");
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("1 / 4");
    expect(wrapper.find('[data-test="step-look"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="back"]').text()).toBe("Close");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[data-test="why"]').text()).toBe("Pick a look");
    const line = wrapper.get('[data-test="guide"] span').text();
    expect(line).not.toBe("");
    expect(wrapper.get(".speak-stub").attributes("data-text")).toBe(line);
  });

  it("starts the live backdrop on the canvas with the backgrounds the Bestiary handed over", async () => {
    mockQuery = { bg1: "12", bg2: "99" };
    await mountForm();
    expect(manager.initBackground).toHaveBeenCalledWith(expect.objectContaining({ bg1: 12, bg2: 99, handleResize: true }));
  });

  it("opens the beast picker from its picture and from the button, and a pick wakes Next", async () => {
    const wrapper = await mountForm();
    pickerAnswers(12);
    await tap(wrapper, "pick-beast");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ component: expect.objectContaining({ name: "AvatarSelectStub" }) }));
    expect(wrapper.find('[data-test="beast-art"] img').exists()).toBe(true);
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeUndefined();
    expect(wrapper.find('[data-test="why"]').exists()).toBe(false);

    pickerAnswers(undefined);
    await tap(wrapper, "beast-art");
    expect(create).toHaveBeenCalledTimes(2);
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeUndefined();
  });

  it("starts the backdrop again after the picker closes, because the picker takes the canvas over", async () => {
    const wrapper = await mountForm();
    manager.initBackground.mockClear();
    pickerAnswers(12);
    await tap(wrapper, "pick-beast");
    await flushPromises();
    expect(manager.initBackground).toHaveBeenCalled();
  });

  it("opens the background sheet from the Background button", async () => {
    const wrapper = await mountForm();
    expect(wrapper.get(".selector-stub").attributes("data-open")).toBe("false");
    await tap(wrapper, "pick-background");
    expect(wrapper.get(".selector-stub").attributes("data-open")).toBe("true");
  });

  it("follows a background the sheet picks: the engine changes and the beast keeps it", async () => {
    const wrapper = await mountForm();
    wrapper.getComponent({ name: "SelectorStub" }).vm.$emit("background-changed", { bg1: 44, bg2: 7, aspectRatio: 48 });
    await flushPromises();
    expect(manager.updateBackground).toHaveBeenCalledWith(expect.objectContaining({ bg1: 44, bg2: 7, aspectRatio: 48 }));
    await fillNewBeast(wrapper);
    await tap(wrapper, "submit");
    expect((await storedBeasts())[0]).toMatchObject({ bg1: 44, bg2: 7, aspectRatio: 48 });
  });

  it("asks for a name next, with the reason, and shows what it is called as it is typed", async () => {
    const wrapper = await mountForm();
    pickerAnswers(12);
    await tap(wrapper, "pick-beast");
    await tap(wrapper, "next");
    expect(wrapper.find('[data-test="step-name"]').exists()).toBe(true);
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("2 / 4");
    expect(wrapper.get('[data-test="back"]').text()).toBe("Back");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[data-test="why"]').text()).toBe("Give it a name");

    await setField(wrapper, "name-input", "Kitchen Dragon");
    expect(wrapper.get('[data-test="nameplate"]').text()).toBe("Kitchen Dragon");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeUndefined();
  });

  it("asks for one chore on the third step, and a chore of spaces is not one", async () => {
    const wrapper = await mountForm();
    pickerAnswers(12);
    await tap(wrapper, "pick-beast");
    await tap(wrapper, "next");
    await setField(wrapper, "name-input", "Kitchen Dragon");
    await tap(wrapper, "next");
    expect(wrapper.find('[data-test="step-chores"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="no-chores"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="why"]').text()).toBe("Add one chore it loses to");

    await setField(wrapper, "chore-input", "   ");
    expect(wrapper.get('[data-test="chore-add"]').attributes("disabled")).toBeDefined();
    await tap(wrapper, "chore-add");
    expect(wrapper.findAll('[data-test="chore-row"]')).toHaveLength(0);
  });

  it("adds chores with Enter or the button, in order, and keeps one on blur so Next never loses a typed chore", async () => {
    const wrapper = await mountForm();
    pickerAnswers(12);
    await tap(wrapper, "pick-beast");
    await tap(wrapper, "next");
    await setField(wrapper, "name-input", "Kitchen Dragon");
    await tap(wrapper, "next");

    await setField(wrapper, "chore-input", "Load the dishwasher");
    await wrapper.get('[data-test="chore-input"]').trigger("keyup.enter");
    await addChore(wrapper, "Wipe the counters");
    await setField(wrapper, "chore-input", "Sweep the floor");
    await wrapper.get('[data-test="chore-input"]').trigger("blur");
    await flushPromises();

    const rows = wrapper.findAll('[data-test="chore-text"]').map((row) => (row.element as HTMLTextAreaElement).value);
    expect(rows).toEqual(["Load the dishwasher", "Wipe the counters", "Sweep the floor"]);
    expect((wrapper.get('[data-test="chore-input"]').element as HTMLInputElement).value).toBe("");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeUndefined();
  });

  it("edits a chore in place, moves it up or down, and drops it", async () => {
    const wrapper = await mountForm();
    pickerAnswers(12);
    await tap(wrapper, "pick-beast");
    await tap(wrapper, "next");
    await setField(wrapper, "name-input", "Kitchen Dragon");
    await tap(wrapper, "next");
    for (const chore of ["one", "two", "three"]) await addChore(wrapper, chore);
    const texts = () => wrapper.findAll('[data-test="chore-text"]').map((row) => (row.element as HTMLTextAreaElement).value);

    await wrapper.findAll('[data-test="chore-text"]')[0].setValue("uno");
    expect(texts()).toEqual(["uno", "two", "three"]);

    await wrapper.findAll('[data-test="chore-down"]')[0].trigger("click");
    expect(texts()).toEqual(["two", "uno", "three"]);
    await wrapper.findAll('[data-test="chore-up"]')[2].trigger("click");
    expect(texts()).toEqual(["two", "three", "uno"]);
    expect(wrapper.findAll('[data-test="chore-up"]')[0].attributes("disabled")).toBeDefined();
    expect(wrapper.findAll('[data-test="chore-down"]')[2].attributes("disabled")).toBeDefined();

    await wrapper.findAll('[data-test="chore-drop"]')[1].trigger("click");
    expect(texts()).toEqual(["two", "uno"]);
  });

  it("shows the summary as the last step with the verb Summon and a line for each answer", async () => {
    const wrapper = await mountForm();
    await fillNewBeast(wrapper);
    expect(wrapper.find('[data-test="step-summon"]').exists()).toBe(true);
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("4 / 4");
    expect(wrapper.find('[data-test="next"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="submit"]').text()).toBe("Summon");
    expect(wrapper.get('[data-test="submit"]').attributes("disabled")).toBeUndefined();
    expect(wrapper.get('[data-test="summary-name"]').text()).toContain("Kitchen Dragon");
    expect(wrapper.get('[data-test="summary-chores"]').text()).toContain("1 chore");
    expect(wrapper.get('[data-test="summary-chore"]').text()).toBe("Wipe the counters");
  });

  it("jumps back from a summary line to the step that owns it, and the dots go back too", async () => {
    const wrapper = await mountForm();
    await fillNewBeast(wrapper);
    await tap(wrapper, "summary-name");
    expect(wrapper.find('[data-test="step-name"]').exists()).toBe(true);
    expect((wrapper.get('[data-test="name-input"]').element as HTMLInputElement).value).toBe("Kitchen Dragon");

    await tap(wrapper, "dot-chores");
    expect(wrapper.find('[data-test="step-chores"]').exists()).toBe(true);
    await tap(wrapper, "dot-look");
    expect(wrapper.find('[data-test="step-look"]').exists()).toBe(true);
  });

  it("saves once on Summon, a new record with no quests attached, then plays the fanfare before it leaves", async () => {
    const wrapper = await mountForm();
    await fillNewBeast(wrapper, "  Kitchen Dragon ");
    expect(wrapper.get(".fanfare-stub").attributes("data-open")).toBe("false");
    await tap(wrapper, "submit");

    const beasts = await storedBeasts();
    expect(beasts).toHaveLength(1);
    expect(beasts[0]).toMatchObject({ name: "Kitchen Dragon", checklist: ["Wipe the counters"], avatar: 12, achievementIds: [] });
    expect(beasts[0].id).toEqual(expect.any(String));
    expect(wrapper.get(".fanfare-stub").attributes("data-open")).toBe("true");
    expect(wrapper.get(".fanfare-stub").attributes("data-name")).toBe("Kitchen Dragon");
    expect(mockPush).not.toHaveBeenCalled();

    await tap(wrapper, "submit");
    expect(await storedBeasts()).toHaveLength(1);

    await wrapper.get(".fanfare-stub").trigger("click");
    expect(mockPush).toHaveBeenCalledWith({ name: "xp-bestiary" });
  });

  it("says why and saves nothing when the save fails, and can be tried again", async () => {
    const wrapper = await mountForm();
    await fillNewBeast(wrapper);
    const save = jest.spyOn(BestiaryDb.prototype, "setBeast").mockRejectedValueOnce(new Error("disk full"));
    await tap(wrapper, "submit");
    expect(fx).toHaveBeenCalledWith("no");
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("problem") }));
    expect(wrapper.get(".fanfare-stub").attributes("data-open")).toBe("false");
    expect(await storedBeasts()).toHaveLength(0);

    save.mockRestore();
    await tap(wrapper, "submit");
    expect(await storedBeasts()).toHaveLength(1);
  });

  it("leaves for the Bestiary from Close on the first step and from the header's close button", async () => {
    const wrapper = await mountForm();
    await tap(wrapper, "back");
    expect(mockPush).toHaveBeenCalledWith({ name: "xp-bestiary" });
    mockPush.mockClear();
    await tap(wrapper, "wizard-close");
    expect(mockPush).toHaveBeenCalledWith({ name: "xp-bestiary" });
  });

  it("takes the AI helper's name and chores into the draft", async () => {
    const wrapper = await mountForm();
    pickerAnswers(12);
    await tap(wrapper, "pick-beast");
    await tap(wrapper, "next");
    await setField(wrapper, "name-input", "Kitchen Dragon");
    await tap(wrapper, "next");
    create.mockResolvedValueOnce({
      present: jest.fn(),
      onDidDismiss: () => Promise.resolve({ data: undefined }),
      onWillDismiss: () => Promise.resolve({ data: { beast: { name: "Dish Drake", checklist: ["Rinse", "Stack"] } } }),
    });
    await tap(wrapper, "ai-help");
    expect(create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        component: expect.objectContaining({ name: "BeastDetailsModalStub" }),
        componentProps: expect.objectContaining({ beast: expect.objectContaining({ name: "Kitchen Dragon" }) }),
      })
    );
    const rows = wrapper.findAll('[data-test="chore-text"]').map((row) => (row.element as HTMLTextAreaElement).value);
    expect(rows).toEqual(["Rinse", "Stack"]);
    await tap(wrapper, "next");
    expect(wrapper.get('[data-test="summary-name"]').text()).toContain("Dish Drake");
  });
});

describe("editing a beast", () => {
  beforeEach(async () => {
    await bestiaryDb.setBeast(grownBeast());
  });

  it("opens on the summary: Edit Beast, 4 / 4, the verb Save, and the beast's own lines", async () => {
    const wrapper = await mountForm({ id: "beast-dish-goblin" });
    expect(wrapper.get(".xp-app-header__title").text()).toBe("Edit Beast");
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("4 / 4");
    expect(wrapper.find('[data-test="step-summon"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="submit"]').text()).toBe("Save");
    expect(wrapper.get('[data-test="summary-name"]').text()).toContain("Dish Goblin");
    expect(wrapper.get('[data-test="summary-chores"]').text()).toContain("2 chores");
    expect(wrapper.findAll('[data-test="summary-chore"]').map((row) => row.text())).toEqual(["Load the dishwasher", "Wipe the counters"]);
  });

  it("starts the backdrop the beast was saved with", async () => {
    await mountForm({ id: "beast-dish-goblin" });
    expect(manager.initBackground).toHaveBeenLastCalledWith(expect.objectContaining({ bg1: 10, bg2: 20, aspectRatio: 48 }));
  });

  it("has every dot to go back by", async () => {
    const wrapper = await mountForm({ id: "beast-dish-goblin" });
    // The dot of the step it is on is a mark; the three before it are ways back
    for (const id of ["look", "name", "chores"]) {
      expect(wrapper.get(`[data-test="dot-${id}"]`).attributes("disabled")).toBeUndefined();
    }
    expect(wrapper.get('[data-test="dot-summon"]').attributes("disabled")).toBeDefined();
    await tap(wrapper, "dot-look");
    expect(wrapper.find('[data-test="step-look"]').exists()).toBe(true);
  });

  it("saves a rename into the same record and keeps the quests, element, theme and second look", async () => {
    const wrapper = await mountForm({ id: "beast-dish-goblin" });
    await tap(wrapper, "summary-name");
    await setField(wrapper, "name-input", "Dish Gobbo");
    await tap(wrapper, "next");
    await addChore(wrapper, "Dry the pans");
    await tap(wrapper, "next");
    await tap(wrapper, "submit");

    const beasts = await storedBeasts();
    expect(beasts).toHaveLength(1);
    expect(beasts[0]).toEqual({
      id: "beast-dish-goblin",
      name: "Dish Gobbo",
      checklist: ["Load the dishwasher", "Wipe the counters", "Dry the pans"],
      avatar: 3,
      variantAvatar: 41,
      achievementIds: ["quest-1", "quest-2"],
      element: "forest",
      theme: "shadow",
      bg1: 10,
      bg2: 20,
      aspectRatio: 48,
    });
  });

  it("thanks with a toast and goes back to the Bestiary, with no fanfare for a beast that already exists", async () => {
    const wrapper = await mountForm({ id: "beast-dish-goblin" });
    await tap(wrapper, "submit");
    expect(wrapper.get(".fanfare-stub").attributes("data-open")).toBe("false");
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("Updated") }));
    expect(mockPush).toHaveBeenCalledWith({ name: "xp-bestiary" });
  });

  it("shuts Save and says what is missing when an old beast has no picture, and the summary line goes back to fix it", async () => {
    await bestiaryDb.setBeast({ ...grownBeast(), avatar: 0 });
    const wrapper = await mountForm({ id: "beast-dish-goblin" });
    expect(wrapper.get('[data-test="submit"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[data-test="why"]').text()).toBe("Pick a look");
    await tap(wrapper, "summary-look");
    expect(wrapper.find('[data-test="step-look"]').exists()).toBe(true);
    pickerAnswers(9);
    await tap(wrapper, "pick-beast");
    await tap(wrapper, "dot-summon");
    expect(wrapper.get('[data-test="submit"]').attributes("disabled")).toBeUndefined();
  });

  it("opens a new beast when the id is no beast at all", async () => {
    const wrapper = await mountForm({ id: "beast-gone" });
    expect(wrapper.get(".xp-app-header__title").text()).toBe("New Beast");
    expect(wrapper.find('[data-test="step-look"]').exists()).toBe(true);
  });
});

describe("a kid's beast opened from Approvals", () => {
  const sockMonster = (): Beast => ({
    ...grownBeast(),
    id: "beast-sock",
    name: "Sock Monster",
    madeBy: "ronan",
    proposal: { by: "ronan", on: "2026-10-26T08:00:00.000Z", state: "proposed" },
  });

  it("is approved with the edits when the Game Master saves it, and the toast says so", async () => {
    await bestiaryDb.setBeast(sockMonster());
    approveBeast.mockResolvedValue(true);
    const wrapper = await mountForm({ id: "beast-sock" });
    useUserStore().currentUser.id = "mom";
    await tap(wrapper, "summary-name");
    await setField(wrapper, "name-input", "Sock Gobbo");
    await tap(wrapper, "next");
    await tap(wrapper, "next");
    await tap(wrapper, "submit");

    expect((await storedBeasts())[0]).toMatchObject({ id: "beast-sock", name: "Sock Gobbo", madeBy: "ronan" });
    expect(approveBeast).toHaveBeenCalledWith("beast-sock", "mom");
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ message: "Approved, with changes" }));
    expect(mockPush).toHaveBeenCalledWith({ name: "xp-bestiary" });
  });

  it("leaves a beast the family already fights alone", async () => {
    await bestiaryDb.setBeast(grownBeast());
    const wrapper = await mountForm({ id: "beast-dish-goblin" });
    await tap(wrapper, "submit");
    expect(approveBeast).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("Updated") }));
  });
});

describe("a drawing for the look", () => {
  const DRAWING = "data:image/jpeg;base64,DRAWING";

  /** The drawing sheet answers as a modal that closed with Use it (picked) or Not now (cancel) would */
  const snapAnswers = (data: string | null, role: "picked" | "cancel") => {
    create.mockResolvedValueOnce({
      present: jest.fn(),
      onDidDismiss: () => Promise.resolve({ data, role }),
      onWillDismiss: () => Promise.resolve({ data, role }),
    });
  };

  const artSrc = (wrapper: Form) => wrapper.find('[data-test="beast-art"] img').attributes("src");

  it("opens the drawing sheet from Snap a drawing, and a drawing is the look and the portrait with no library beast", async () => {
    const wrapper = await mountForm();
    snapAnswers(DRAWING, "picked");
    await tap(wrapper, "snap-drawing");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ component: expect.objectContaining({ name: "BeastPhotoPickerStub" }), cssClass: "beast-photo-modal" })
    );
    expect(artSrc(wrapper)).toBe(DRAWING);
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeUndefined();
  });

  it("changes nothing when the sheet is closed with Not now", async () => {
    const wrapper = await mountForm();
    snapAnswers(null, "cancel");
    await tap(wrapper, "snap-drawing");
    expect(wrapper.find('[data-test="beast-art"] img').exists()).toBe(false);
    expect(wrapper.get('[data-test="why"]').text()).toBe("Pick a look");
  });

  it("saves the drawing with the beast and reads 'Your drawing' on the summary", async () => {
    const wrapper = await mountForm();
    snapAnswers(DRAWING, "picked");
    await tap(wrapper, "snap-drawing");
    await tap(wrapper, "next");
    await setField(wrapper, "name-input", "Sockto");
    await tap(wrapper, "next");
    await addChore(wrapper, "Pair the socks");
    await tap(wrapper, "next");
    expect(wrapper.get('[data-test="summary-look"]').text()).toContain("Your drawing");

    await tap(wrapper, "submit");
    expect((await storedBeasts())[0]).toMatchObject({ name: "Sockto", avatar: 0, localImage: DRAWING });
  });

  it("keeps a library beast picked before it, and the portrait shows the drawing", async () => {
    const wrapper = await mountForm();
    pickerAnswers(12);
    await tap(wrapper, "pick-beast");
    expect(artSrc(wrapper)).toBe("beast-12.webp");
    snapAnswers(DRAWING, "picked");
    await tap(wrapper, "snap-drawing");
    expect(artSrc(wrapper)).toBe(DRAWING);

    await tap(wrapper, "next");
    await setField(wrapper, "name-input", "Sockto");
    await tap(wrapper, "next");
    await addChore(wrapper, "Pair the socks");
    await tap(wrapper, "next");
    await tap(wrapper, "submit");
    expect((await storedBeasts())[0]).toMatchObject({ avatar: 12, localImage: DRAWING });
  });

  it("lets the drawing go when a library beast is picked after it", async () => {
    const wrapper = await mountForm();
    snapAnswers(DRAWING, "picked");
    await tap(wrapper, "snap-drawing");
    pickerAnswers(12);
    await tap(wrapper, "pick-beast");
    expect(artSrc(wrapper)).toBe("beast-12.webp");

    await tap(wrapper, "next");
    await setField(wrapper, "name-input", "Kitchen Dragon");
    await tap(wrapper, "next");
    await addChore(wrapper, "Wipe the counters");
    await tap(wrapper, "next");
    expect(wrapper.get('[data-test="summary-look"]').text()).toContain("Beast 012");
    await tap(wrapper, "submit");
    const stored = (await storedBeasts())[0];
    expect(stored.avatar).toBe(12);
    expect(stored.localImage).toBeFalsy();
  });

  describe("on a beast that already has one", () => {
    beforeEach(async () => {
      await bestiaryDb.setBeast({ ...grownBeast(), avatar: 0, localImage: DRAWING });
    });

    it("opens on the summary with the drawing as its look, and a save keeps it", async () => {
      const wrapper = await mountForm({ id: "beast-dish-goblin" });
      expect(wrapper.get('[data-test="summary-look"]').text()).toContain("Your drawing");
      expect(wrapper.get('[data-test="submit"]').attributes("disabled")).toBeUndefined();
      await tap(wrapper, "submit");
      expect((await storedBeasts())[0]).toMatchObject({ avatar: 0, localImage: DRAWING, achievementIds: ["quest-1", "quest-2"] });
    });

    it("wipes the stored drawing when a library beast is picked in its place", async () => {
      const wrapper = await mountForm({ id: "beast-dish-goblin" });
      await tap(wrapper, "summary-look");
      pickerAnswers(9);
      await tap(wrapper, "pick-beast");
      await tap(wrapper, "dot-summon");
      await tap(wrapper, "submit");
      const stored = (await storedBeasts())[0];
      expect(stored.avatar).toBe(9);
      expect(stored.localImage).toBeFalsy();
    });
  });
});

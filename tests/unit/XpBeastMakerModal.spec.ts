import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";
import { modalController, toastController } from "@ionic/vue";
import XpBeastMakerModal from "@/app/Console/MyPortal/UserHud/MyQuests/components/XpBeastMakerModal.vue";
import { AchievementDb } from "@/lib/databases/AchievementDb";
import { BestiaryDb } from "@/lib/databases/BestiaryDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * The Beast Maker through the shared wizard shell: Look (a drawing or the library), Name (with the three suggestions),
 * Chores (up to five), Ready (the card as the family will see it) and Send it, then the fanfare and the two buttons.
 * The Ionic frame, the speech engine, the photo picker's sheet, the background engine, the fanfare and the Bestiary
 * are stubs; the store, the shell, the steps and the rules are real.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn(), default: {} }));
jest.mock("@/lib/engine/audio/speech", () => ({
  __esModule: true,
  speak: jest.fn(() => true),
  stop: jest.fn(),
  hasReadingVoice: () => false,
  onReadingVoiceChange: () => () => undefined,
}));
jest.mock("@ionic/vue", () => ({
  __esModule: true,
  ...jest.requireActual("@ionic/vue"),
  modalController: { create: jest.fn() },
  toastController: { create: jest.fn() },
}));
jest.mock("@/lib/engine/core/BackgroundManager", () => ({
  __esModule: true,
  backgroundManager: {
    initBackground: jest.fn(),
    cleanupBackground: jest.fn(),
    isActiveFor: jest.fn(() => false),
  },
}));
jest.mock("@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/components/beastPortrait", () => ({
  __esModule: true,
  beastPortraitUrl: (avatar?: number | null) => (avatar ? `beast-${avatar}.webp` : null),
}));
jest.mock("@/components/organisms/BeastPhoto/BeastPhotoPicker.vue", () => ({ __esModule: true, default: { name: "BeastPhotoPickerStub" } }));
jest.mock("@/lib/api", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("@/lib/databases/ProfileDb", () => ({ __esModule: true, ProfileDb: class { setProfile() { return Promise.resolve(); } }, default: class {} }));
jest.mock("@/lib/databases/profileStorage", () => ({ __esModule: true, profileStorage: {}, default: {} }));
jest.mock("@/lib/services/gp/GPService", () => ({ getGPService: () => ({ syncGP: jest.fn() }) }));
jest.mock("@/lib/services/notifications/notify", () => ({ notify: jest.fn() }));

const DRAWING = "data:image/jpeg;base64,AAAA";
const SOCKTOPUS = "beast-socktopus";

const create = modalController.create as jest.Mock;
const toast = toastController.create as jest.Mock;
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
  IonModal: { props: ["isOpen"], template: "<div class='modal-stub'><slot /></div>" },
  IonHeader: slot,
  IonToolbar: slot,
  IonFooter: slot,
  IonContent: slot,
  XpCloseButton: { template: "<button class='close-stub' data-test='wizard-close'></button>" },
  XpSpeakButton: { props: ["text"], template: "<button class='speak-stub' :data-text='text'></button>" },
  XpHeroFanfare: {
    props: ["open", "name", "subtitle", "portrait", "title", "actionText"],
    emits: ["done"],
    template: "<div class='fanfare-stub' :data-open='String(open)' :data-name='name' :data-sub='subtitle' @click=\"$emit('done')\"></div>",
  },
  XpBackgroundSelector: selectorStub,
};

/** A hero a Game Master allowed to make things: ten, so the adventure voice; a nick for the credit line */
const mountMaker = async (age = 10) => {
  localStorage.clear();
  setActivePinia(createPinia());
  const store = useUserStore();
  const year = new Date().getFullYear();
  store.addUser({ id: "hero", isAdult: false, birthday: `${year - age}-01-01`, name: { first: "Mia", nick: "Mimi" } });
  store.loginUser(store.users.hero);
  const wrapper = mount(XpBeastMakerModal, { props: { open: true, heroId: "hero" }, global: { stubs } });
  await flushPromises();
  return wrapper;
};

type Maker = Awaited<ReturnType<typeof mountMaker>>;

const tap = async (wrapper: Maker, test: string) => {
  await wrapper.get(`[data-test="${test}"]`).trigger("click");
  await flushPromises();
};

const typeInto = async (wrapper: Maker, test: string, text: string) => {
  await wrapper.get(`[data-test="${test}"]`).setValue(text);
  await flushPromises();
};

/** The photo picker's sheet answers with `data` and `role` the moment it is presented */
const pickerAnswers = (data: string | null, role: "picked" | "cancel") => {
  create.mockResolvedValue({ present: jest.fn(), onDidDismiss: () => Promise.resolve({ data, role }) });
};

const pickSocktopus = async (wrapper: Maker) => {
  await tap(wrapper, "look-library");
  await typeInto(wrapper, "search", "socks");
  await wrapper.get(`[data-beast="${SOCKTOPUS}"]`).trigger("click");
  await flushPromises();
};

const addChore = async (wrapper: Maker, text: string) => {
  await typeInto(wrapper, "chore-input", text);
  await tap(wrapper, "chore-add");
};

/** Through Look (a drawing), Name and Chores to the Ready card */
const toReady = async (wrapper: Maker, name = "Sock Goblin", chores = ["Sort the socks"]) => {
  pickerAnswers(DRAWING, "picked");
  await tap(wrapper, "look-photo");
  await tap(wrapper, "next");
  await typeInto(wrapper, "name-input", name);
  await tap(wrapper, "next");
  for (const chore of chores) await addChore(wrapper, chore);
  await tap(wrapper, "next");
};

let saved: jest.SpyInstance;
let read: jest.SpyInstance;
let readQuests: jest.SpyInstance;

beforeEach(() => {
  create.mockReset();
  toast.mockReset();
  toast.mockResolvedValue({ present: jest.fn() });
  saved = jest.spyOn(BestiaryDb.prototype, "setBeast").mockResolvedValue(undefined);
  read = jest.spyOn(BestiaryDb.prototype, "getBeasts").mockResolvedValue([]);
  readQuests = jest.spyOn(AchievementDb.prototype, "getTasks").mockResolvedValue([]);
});

afterEach(() => {
  saved.mockRestore();
  read.mockRestore();
  readQuests.mockRestore();
});

describe("the Beast Maker in the shell", () => {
  it("opens on Look: Beast Maker, 1 / 4, the guide's line, the two big tiles, Next shut", async () => {
    const wrapper = await mountMaker();
    expect(wrapper.get(".xp-app-header__title").text()).toBe("Beast Maker");
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("1 / 4");
    expect(wrapper.get('[data-test="guide"] span').text()).toBe("Show the village your beast.");
    expect(wrapper.get(".speak-stub").attributes("data-text")).toBe("Show the village your beast.");
    expect(wrapper.get('[data-test="look-photo"]').text()).toBe("Take a picture of your drawing");
    expect(wrapper.get('[data-test="look-library"]').text()).toBe("Pick one from the library");
    expect(wrapper.find('[data-test="stage"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="library"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[data-test="why"]').text()).toBe("Pick a look");
  });

  it("reads the simple voice to a little one", async () => {
    const wrapper = await mountMaker(6);
    expect(wrapper.get('[data-test="guide"] span').text()).toBe("Show me your beast!");
  });

  it("takes a picture of a drawing: the beast stands on its battlefield and Next wakes; Not now changes nothing", async () => {
    const wrapper = await mountMaker();
    pickerAnswers(null, "cancel");
    await tap(wrapper, "look-photo");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ cssClass: "beast-photo-modal" }));
    expect(wrapper.find('[data-test="stage"]').exists()).toBe(false);

    pickerAnswers(DRAWING, "picked");
    await tap(wrapper, "look-photo");
    expect(wrapper.get('[data-test="stage-portrait"]').attributes("src")).toBe(DRAWING);
    expect(wrapper.get('[data-test="look-photo"]').attributes("aria-pressed")).toBe("true");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeUndefined();
    expect(wrapper.find('[data-test="pick-background"]').exists()).toBe(true);
  });

  it("says the picture did not work when the sheet hands back no drawing", async () => {
    const wrapper = await mountMaker();
    pickerAnswers("", "picked");
    await tap(wrapper, "look-photo");
    expect(wrapper.find('[data-test="stage"]').exists()).toBe(false);
    expect(toast.mock.calls[0][0].message).toBe("That picture didn't work. Try again or pick one from the library.");
  });

  it("opens the library under the tiles, searches it from the bar, and a tap wears that beast and its battlefield", async () => {
    const wrapper = await mountMaker();
    await tap(wrapper, "look-library");
    expect(wrapper.findAll('[data-test="tile-beast"]').length).toBeGreaterThan(5);
    expect(wrapper.find('[data-test="tile-more"]').exists()).toBe(true);

    await typeInto(wrapper, "search", "socks");
    const first = wrapper.findAll('[data-test="tile-beast"]')[0];
    expect(first.attributes("data-beast")).toBe(SOCKTOPUS);
    expect(first.text()).toBe("Socktopus");

    await first.trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-test="stage-portrait"]').attributes("src")).toBe("beast-168.webp");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeUndefined();
    // the search is cleared (the whole library is back); searched for again, the pick is marked
    expect((wrapper.get('[data-test="search"]').element as HTMLInputElement).value).toBe("");
    await typeInto(wrapper, "search", "socks");
    expect(wrapper.get(`[data-beast="${SOCKTOPUS}"]`).attributes("aria-pressed")).toBe("true");
    const selector = wrapper.findComponent({ name: "SelectorStub" });
    expect(selector.props("initialBg1")).toBe(219);
    expect(selector.props("initialBg2")).toBe(218);

    await typeInto(wrapper, "search", "zzzzzzzz");
    expect(wrapper.get('[data-test="no-match"]').text()).toBe("No beast by that name. Try another word.");
  });

  it("opens the battlefield sheet from the bar, and a pick changes the draft's layers", async () => {
    const wrapper = await mountMaker();
    await pickSocktopus(wrapper);
    await tap(wrapper, "pick-background");
    const selector = wrapper.findComponent({ name: "SelectorStub" });
    expect(selector.attributes("data-open")).toBe("true");
    selector.vm.$emit("background-changed", { bg1: 7, bg2: 8 });
    await flushPromises();
    expect(selector.props("targetRef")).toMatchObject({ bg1: 7, bg2: 8 });
  });

  it("names it: the plate waits, Suggest a name offers three from the library beast's chore, a chip names it", async () => {
    const wrapper = await mountMaker();
    await pickSocktopus(wrapper);
    await tap(wrapper, "next");
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("2 / 4");
    expect(wrapper.get('[data-test="nameplate"]').text()).toBe("???");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeDefined();
    expect(wrapper.find('[data-test="name-suggestions"]').exists()).toBe(false);

    await tap(wrapper, "name-suggest");
    const chips = wrapper.findAll('[data-test="name-chip"]');
    expect(chips).toHaveLength(3);
    for (const chip of chips) expect(chip.text().startsWith("Sock ")).toBe(true);

    await chips[0].trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-test="nameplate"]').text()).toBe(chips[0].text());
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeUndefined();

    await typeInto(wrapper, "name-input", "Sock Goblin");
    expect(wrapper.get('[data-test="nameplate"]').text()).toBe("Sock Goblin");
  });

  it("offers the stock names when no chore and no library beast gives a word: a drawing over a library pick forgets its chore", async () => {
    const wrapper = await mountMaker();
    await pickSocktopus(wrapper);
    pickerAnswers(DRAWING, "picked");
    await tap(wrapper, "look-photo");
    await tap(wrapper, "next");
    await tap(wrapper, "name-suggest");
    expect(wrapper.findAll('[data-test="name-chip"]').map((chip) => chip.text())).toEqual(["Mystery Beast", "The Lurker", "Chore Fiend"]);
  });

  it("lists the chores that beat it: add, move, drop, and five at most", async () => {
    const wrapper = await mountMaker();
    pickerAnswers(DRAWING, "picked");
    await tap(wrapper, "look-photo");
    await tap(wrapper, "next");
    await typeInto(wrapper, "name-input", "Sock Goblin");
    await tap(wrapper, "next");
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("3 / 4");
    expect(wrapper.get('[data-test="no-chores"]').text()).toBe("No chores yet. Add the first one below.");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeDefined();

    await addChore(wrapper, "Sort the socks");
    await addChore(wrapper, "Roll them");
    const rows = () => wrapper.findAll('[data-test="chore-row"]').map((row) => row.find(".chore-row__text").text());
    expect(rows()).toEqual(["Sort the socks", "Roll them"]);
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeUndefined();

    await wrapper.findAll('[data-test="chore-up"]')[1].trigger("click");
    expect(rows()).toEqual(["Roll them", "Sort the socks"]);
    await wrapper.findAll('[data-test="chore-drop"]')[0].trigger("click");
    expect(rows()).toEqual(["Sort the socks"]);

    for (const text of ["Two", "Three", "Four", "Five"]) await addChore(wrapper, text);
    expect(rows()).toHaveLength(5);
    expect(wrapper.get('[data-test="chores-full"]').text()).toBe("Five chores is plenty. Send it!");
    expect(wrapper.get('[data-test="chore-input"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[data-test="chore-add"]').attributes("disabled")).toBeDefined();
  });

  it("ends on Ready with the card as the family will see it: the drawing, the name, the chores, Drawn by Mimi, the note", async () => {
    const wrapper = await mountMaker();
    await toReady(wrapper, "Sock Goblin", ["Sort the socks", "Roll them"]);
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("4 / 4");
    expect(wrapper.get('[data-test="step-ready"] [data-test="stage-portrait"]').attributes("src")).toBe(DRAWING);
    expect(wrapper.get('[data-test="ready-name"]').text()).toBe("Sock Goblin");
    expect(wrapper.get('[data-test="ready-credit"]').text()).toBe("Drawn by Mimi");
    expect(wrapper.findAll('[data-test="ready-chores"] li').map((li) => li.text())).toEqual(["Sort the socks", "Roll them"]);
    expect(wrapper.get('[data-test="ready-note"]').text()).toBe("A Game Master looks at it first.");
    expect(wrapper.find('[data-test="next"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="submit"]').text()).toBe("Send it");
  });

  it("credits a library look as Made by", async () => {
    const wrapper = await mountMaker();
    await pickSocktopus(wrapper);
    await tap(wrapper, "next");
    await typeInto(wrapper, "name-input", "Socky");
    await tap(wrapper, "next");
    await addChore(wrapper, "Match the pairs");
    await tap(wrapper, "next");
    expect(wrapper.get('[data-test="ready-credit"]').text()).toBe("Made by Mimi");
    expect(wrapper.get('[data-test="step-ready"] [data-test="stage-portrait"]').attributes("src")).toBe("beast-168.webp");
  });

  it("Send it saves the proposal once, says saved, plays the fanfare, then offers Make a quest with it and Done", async () => {
    const wrapper = await mountMaker();
    await toReady(wrapper);
    expect(wrapper.get(".fanfare-stub").attributes("data-open")).toBe("false");

    await tap(wrapper, "submit");
    expect(saved).toHaveBeenCalledTimes(1);
    const beast = saved.mock.calls[0][0] as Beast;
    expect(beast).toMatchObject({
      name: "Sock Goblin",
      checklist: ["Sort the socks"],
      localImage: DRAWING,
      madeBy: "hero",
      proposal: { by: "hero", state: "proposed" },
    });
    expect(typeof beast.id).toBe("string");
    expect(beast.id).not.toBe("");
    expect(wrapper.emitted("saved")?.[0]).toEqual([beast]);
    expect(wrapper.get(".fanfare-stub").attributes("data-open")).toBe("true");
    expect(wrapper.get(".fanfare-stub").attributes("data-name")).toBe("Sock Goblin");
    expect(wrapper.get(".fanfare-stub").attributes("data-sub")).toBe("Drawn by Mimi");

    await wrapper.get(".fanfare-stub").trigger("click");
    await flushPromises();
    expect(wrapper.get(".fanfare-stub").attributes("data-open")).toBe("false");
    expect(wrapper.find('[data-test="submit"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="sent-name"]').text()).toBe("Sock Goblin");
    expect(wrapper.get('[data-test="sent-quest"]').text()).toBe("Make a quest with it");
    expect(wrapper.get('[data-test="sent-done"]').text()).toBe("Done");

    await tap(wrapper, "sent-quest");
    expect(wrapper.emitted("quest")?.[0]).toEqual([beast]);
    await tap(wrapper, "sent-done");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("stops at the cap: ten creations, beasts and quests together, still with the Game Master, and nothing is saved", async () => {
    const proposal = (n: number) => ({ by: "hero", on: "2026-10-20T08:00:00.000Z", state: n % 2 ? "proposed" : "returned" });
    const beasts = Array.from({ length: 5 }, (_, n) => ({ id: `b${n}`, name: `Beast ${n}`, checklist: [], proposal: proposal(n) }));
    const quests = Array.from({ length: 5 }, (_, n) => ({ id: `q${n}`, achievementName: `Quest ${n}`, draft: true, proposal: proposal(n) }));
    read.mockResolvedValue([...beasts, null] as never);
    readQuests.mockResolvedValue([...quests, null] as never);
    const wrapper = await mountMaker();
    await toReady(wrapper);
    await tap(wrapper, "submit");
    expect(saved).not.toHaveBeenCalled();
    expect(toast.mock.calls[0][0].message).toBe("Ask a Game Master to look at your creations first.");
    expect(wrapper.get(".fanfare-stub").attributes("data-open")).toBe("false");
    expect(wrapper.find('[data-test="submit"]').exists()).toBe(true);
  });

  it("says the beast could not be saved when the Bestiary fails, and keeps the draft", async () => {
    saved.mockRejectedValue(new Error("storage full"));
    const wrapper = await mountMaker();
    await toReady(wrapper);
    await tap(wrapper, "submit");
    expect(toast.mock.calls[0][0].message).toBe("Your beast could not be saved. Try again.");
    expect(wrapper.get('[data-test="ready-name"]').text()).toBe("Sock Goblin");
    expect(wrapper.emitted("saved")).toBeUndefined();
  });

  it("closes from Back on the first screen and from the header, and starts fresh each time it opens", async () => {
    const wrapper = await mountMaker();
    await tap(wrapper, "back");
    await tap(wrapper, "wizard-close");
    expect(wrapper.emitted("close")).toHaveLength(2);

    pickerAnswers(DRAWING, "picked");
    await tap(wrapper, "look-photo");
    await tap(wrapper, "next");
    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });
    await flushPromises();
    expect(wrapper.find('[data-test="step-look"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="stage"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeDefined();
  });
});

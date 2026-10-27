import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { toastController } from "@ionic/vue";
import XpQuestWizardModal from "@/app/Console/MyPortal/UserHud/MyQuests/components/XpQuestWizardModal.vue";
import { AchievementDb } from "@/lib/databases/AchievementDb";
import { BestiaryDb } from "@/lib/databases/BestiaryDb";
import type { QuestPrefill } from "@/lib/services/quests/questPrefill";
import { saveWizardQuest } from "@/lib/services/quests/questWizardSave";
import { speak, stop } from "@/lib/engine/audio/speech";
import { useGameRulesStore } from "@/lib/store/stores/gameRules";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * The Quest Wizard through the shared wizard shell: the same screens, the same Back / Next / Summon, the same rule
 * (only a name is required). The Ionic frame, the speech engine, the fanfare and the save are stubs; the stores, the
 * shell and the steps are real.
 */

const mockToast = jest.fn();
jest.mock("@ionic/vue", () => ({
  ...jest.requireActual("@ionic/vue"),
  toastController: { create: (options: unknown) => mockToast(options) },
}));

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn(), default: {} }));
jest.mock("@/lib/engine/audio/speech", () => ({
  __esModule: true,
  speak: jest.fn(() => true),
  stop: jest.fn(),
  hasReadingVoice: () => false,
  onReadingVoiceChange: () => () => undefined,
}));
jest.mock("@/lib/engine/audio/routeMusic", () => ({ __esModule: true, changeBGM: jest.fn() }));
jest.mock("@/lib/services/quests/questWizardSave", () => ({
  __esModule: true,
  saveWizardQuest: jest.fn(),
}));
jest.mock("@/hooks/useToast", () => ({ __esModule: true, useToast: () => ({ showToast: jest.fn() }) }));
jest.mock("@/lib/api", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("@/lib/databases/ProfileDb", () => ({ __esModule: true, ProfileDb: class { setProfile() { return Promise.resolve(); } }, default: class {} }));
jest.mock("@/lib/databases/profileStorage", () => ({ __esModule: true, profileStorage: {}, default: {} }));
jest.mock("@/lib/services/gp/GPService", () => ({ getGPService: () => ({ syncGP: jest.fn() }) }));
jest.mock("@/lib/services/notifications/notify", () => ({ notify: jest.fn() }));

const save = saveWizardQuest as jest.Mock;
const slot = { template: "<div><slot /></div>" };
const stubs = {
  IonModal: { props: ["isOpen"], template: "<div class='modal-stub'><slot /></div>" },
  IonHeader: slot,
  IonToolbar: slot,
  IonFooter: slot,
  IonContent: slot,
  XpCloseButton: { template: "<button class='close-stub' data-test='wizard-close'></button>" },
  XpSpeakButton: { props: ["text"], template: "<button class='speak-stub' :data-text='text'></button>" },
  XpHeroFanfare: {
    props: ["open", "name"],
    emits: ["done"],
    template: "<div class='fanfare-stub' :data-open='String(open)' :data-name='name'><button data-test='fanfare-done' @click=\"$emit('done')\"></button></div>",
  },
};

const mountWizard = (isGm = false, profile: Record<string, unknown> = {}) => {
  localStorage.clear();
  setActivePinia(createPinia());
  const store = useUserStore();
  store.addUser({ id: "hero", isAdult: isGm, birthday: `${new Date().getFullYear() - 30}-01-01`, name: { first: "Mia" }, ...profile } as never);
  store.loginUser(store.users.hero);
  return mount(XpQuestWizardModal, { props: { open: true }, global: { stubs } });
};

type Wizard = ReturnType<typeof mountWizard>;

// A hero a Game Master allowed to make things, with a sibling and a parent on the same device
const mountMaker = async (prefill?: QuestPrefill) => {
  localStorage.clear();
  setActivePinia(createPinia());
  const store = useUserStore();
  const year = new Date().getFullYear();
  store.addUser({ id: "hero", isAdult: false, birthday: `${year - 10}-01-01`, name: { first: "Mia" } });
  store.addUser({ id: "sib", isAdult: false, birthday: `${year - 7}-01-01`, name: { first: "Jack" } });
  store.addUser({ id: "mom", isAdult: true, birthday: `${year - 40}-01-01`, name: { first: "Sam", nick: "Mom" } });
  store.loginUser(store.users.hero);
  const rules = useGameRulesStore();
  await rules.load();
  rules.makers = ["hero"];
  return mount(XpQuestWizardModal, { props: { open: true, prefill }, global: { stubs } });
};

const tap = async (wrapper: Wizard, test: string) => {
  await wrapper.get(`[data-test="${test}"]`).trigger("click");
  await flushPromises();
};

const typeName = async (wrapper: Wizard, text: string) => {
  const input = wrapper.get('[data-test="search"]');
  await input.setValue(text);
  await flushPromises();
};

beforeEach(() => {
  save.mockReset();
  save.mockResolvedValue({ id: "quest-1", achievementName: "make the bed" });
  mockToast.mockReset();
  mockToast.mockResolvedValue({ present: jest.fn() });
  (speak as jest.Mock).mockClear();
  (stop as jest.Mock).mockClear();
});

/** Types a name, walks to the last screen (4 Nexts for a hero, 5 for a Game Master), summons and taps the fanfare away */
const summonAndFinish = async (wrapper: Wizard, name: string, nexts = 4) => {
  await typeName(wrapper, name);
  for (let screen = 0; screen < nexts; screen += 1) await tap(wrapper, "next");
  await tap(wrapper, "submit");
  await tap(wrapper, "fanfare-done");
};

describe("the Quest Wizard in the shell", () => {
  it("opens on the chore screen: New Quest, 1 / 5 for a hero, Close, the guide's question, Next shut", () => {
    const wrapper = mountWizard();
    expect(wrapper.get(".xp-app-header__title").text()).toBe("New Quest");
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("1 / 5");
    expect(wrapper.find('[data-test="step-what"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="back"]').text()).toBe("Close");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeDefined();
    const line = wrapper.get('[data-test="guide"] span').text();
    expect(line).not.toBe("");
    expect(wrapper.get(".speak-stub").attributes("data-text")).toBe(line);
  });

  it("gives a Game Master one more screen, and a hero none", () => {
    expect(mountWizard(true).get(".xp-app-header__meta").text()).toBe("1 / 6");
  });

  it("wakes Next as soon as a name is typed, and says nothing about why before (no reason line)", async () => {
    const wrapper = mountWizard();
    expect(wrapper.find('[data-test="why"]').exists()).toBe(false);
    await typeName(wrapper, "Make the bed");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeUndefined();
  });

  it("asks its questions in order: the dots are a mark, not buttons", async () => {
    const wrapper = mountWizard();
    await typeName(wrapper, "Make the bed");
    for (const dot of wrapper.findAll(".xp-wiz-dot")) expect(dot.attributes("disabled")).toBeDefined();
  });

  it("walks the screens with Next and Back, keeping the field of the screen in the footer", async () => {
    const wrapper = mountWizard();
    await typeName(wrapper, "Make the bed");
    await tap(wrapper, "next");
    expect(wrapper.find('[data-test="step-steps"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="step-input"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="search"]').exists()).toBe(false);
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("2 / 5");
    expect(wrapper.get('[data-test="back"]').text()).toBe("Back");

    await tap(wrapper, "back");
    expect(wrapper.find('[data-test="step-what"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="back"]').text()).toBe("Close");
  });

  it("closes from Back on the first screen and from the header's close button", async () => {
    const wrapper = mountWizard();
    await tap(wrapper, "back");
    await tap(wrapper, "wizard-close");
    expect(wrapper.emitted("close")).toHaveLength(2);
  });

  it("ends on Ready with the summon button, and Summon saves once and opens the fanfare", async () => {
    const wrapper = mountWizard();
    await typeName(wrapper, "Make the bed");
    for (let screen = 0; screen < 4; screen += 1) await tap(wrapper, "next");

    expect(wrapper.find('[data-test="step-ready"]').exists()).toBe(true);
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("5 / 5");
    expect(wrapper.find('[data-test="next"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="submit"]').attributes("disabled")).toBeUndefined();
    expect(wrapper.get(".fanfare-stub").attributes("data-open")).toBe("false");

    await tap(wrapper, "submit");
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toMatchObject({ name: expect.stringMatching(/make the bed/i) });
    expect(wrapper.get(".fanfare-stub").attributes("data-open")).toBe("true");
  });

  it("starts again from the first screen with an empty draft each time it opens", async () => {
    const wrapper = mountWizard();
    await typeName(wrapper, "Make the bed");
    await tap(wrapper, "next");
    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });
    await flushPromises();
    expect(wrapper.find('[data-test="step-what"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeDefined();
  });

  it("cuts a spoken guide line off when the screen changes, so the last question does not talk over the next", async () => {
    const wrapper = mountWizard();
    await typeName(wrapper, "Make the bed");
    (stop as jest.Mock).mockClear();
    await tap(wrapper, "next");
    expect(stop).toHaveBeenCalled();
  });

  it("cuts the voice off when the wizard closes", async () => {
    const wrapper = mountWizard();
    (stop as jest.Mock).mockClear();
    await wrapper.setProps({ open: false });
    expect(stop).toHaveBeenCalled();
  });

  it("does not read the guide on its own for a reader who is past the simple voice, and gives them the speaker button", () => {
    const wrapper = mountWizard();
    expect(speak).not.toHaveBeenCalled();
    expect(wrapper.find(".speak-stub").exists()).toBe(true);
  });

  it("reads the guide on its own in the simple voice, until the hero turns auto-read off", () => {
    const simple = mountWizard(false, { isAdult: false, voice: "simple" });
    expect(speak).toHaveBeenCalledWith(simple.get('[data-test="guide"] span').text());

    (speak as jest.Mock).mockClear();
    mountWizard(false, { isAdult: false, voice: "simple", autoRead: false });
    expect(speak).not.toHaveBeenCalled();
  });
});

describe("the toast that follows a new quest", () => {
  it("names the quest the way it was saved, in title case, not the letters as typed", async () => {
    save.mockResolvedValue({ id: "quest-1", achievementName: "feed the cat" });
    const wrapper = mountWizard(true);
    await summonAndFinish(wrapper, "FEED THE CAT", 5);
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast.mock.calls[0][0].message).toBe("Feed The Cat");
  });

  it("title-cases the typed name when the saved quest comes back with none", async () => {
    save.mockResolvedValue({ id: "quest-1", achievementName: "" });
    const wrapper = mountWizard(true);
    await summonAndFinish(wrapper, "make the bed", 5);
    expect(mockToast.mock.calls[0][0].message).toBe("Make The Bed");
  });

  it("keeps the title-cased name inside the line that says the Game Master checks a hero's quest", async () => {
    const wrapper = mountWizard();
    await summonAndFinish(wrapper, "make the bed");
    const { message } = mockToast.mock.calls[0][0];
    expect(message).toContain("Make The Bed");
    expect(message).not.toContain("make the bed");
  });

  it("shows the same title-cased name on the fanfare", async () => {
    const wrapper = mountWizard(true);
    await typeName(wrapper, "make the bed");
    for (let screen = 0; screen < 5; screen += 1) await tap(wrapper, "next");
    await tap(wrapper, "submit");
    expect(wrapper.get(".fanfare-stub").attributes("data-name")).toBe("Make The Bed");
  });
});

describe("the Quest Wizard for a maker", () => {
  const toWho = async (wrapper: Wizard) => {
    await typeName(wrapper, "Make the bed");
    for (let screen = 0; screen < 4; screen += 1) await tap(wrapper, "next");
  };

  it("asks who it is for: Me (picked), each other profile with a parent marked, and Everyone", async () => {
    const wrapper = await mountMaker();
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("1 / 6");
    await toWho(wrapper);

    expect(wrapper.find('[data-test="step-who"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="who-me"]').text()).toBe("Me");
    expect(wrapper.get('[data-test="who-me"]').attributes("aria-pressed")).toBe("true");
    expect(wrapper.get('[data-test="hero-sib"]').text()).toBe("Jack");
    expect(wrapper.get('[data-test="hero-sib"]').attributes("aria-pressed")).toBe("false");
    expect(wrapper.get('[data-test="hero-mom"]').text()).toContain("Mom");
    expect(wrapper.get('[data-test="hero-mom"]').text()).toContain("A parent");
    expect(wrapper.find('[data-test="hero-hero"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="who-everyone"]').text()).toBe("Everyone");

    await tap(wrapper, "who-everyone");
    for (const test of ["who-me", "hero-sib", "hero-mom", "who-everyone"]) {
      expect(wrapper.get(`[data-test="${test}"]`).attributes("aria-pressed")).toBe("true");
    }
    await tap(wrapper, "who-everyone");
    expect(wrapper.get('[data-test="who-me"]').attributes("aria-pressed")).toBe("true");
    expect(wrapper.get('[data-test="hero-sib"]').attributes("aria-pressed")).toBe("false");
  });

  it("says a Game Master looks first when the quest is for someone else, and saves as a maker", async () => {
    const wrapper = await mountMaker();
    await toWho(wrapper);
    expect(wrapper.find('[data-test="kid-note"]').exists()).toBe(false);

    await tap(wrapper, "hero-sib");
    await tap(wrapper, "next");
    expect(wrapper.get('[data-test="kid-note"]').text()).toBe("A Game Master looks at it first.");

    await tap(wrapper, "submit");
    expect(save.mock.calls[0][0]).toMatchObject({ heroIds: ["hero", "sib"] });
    expect(save.mock.calls[0][1]).toMatchObject({ isGm: false, isMaker: true, creatorId: "hero" });
  });

  it("keeps today's note when the quest is for the maker alone", async () => {
    const wrapper = await mountMaker();
    await toWho(wrapper);
    await tap(wrapper, "next");
    expect(wrapper.get('[data-test="kid-note"]').text()).toBe("The Game Master checks it when you finish.");
  });

  it("opens on the steps of the beast the maker just drew, wearing its picture, and says a Game Master looks first", async () => {
    const drawing = "data:image/png;base64,AAAA";
    const beast = {
      id: "b9",
      name: "Sock Monster",
      checklist: ["Find the pair", "Roll them"],
      localImage: drawing,
      proposal: { by: "hero", on: "2026-10-20T08:00:00.000Z", state: "proposed" },
    };
    const read = jest.spyOn(BestiaryDb.prototype, "getBeasts").mockResolvedValue([beast] as never);
    // the spy comes off even when an assertion fails, so it cannot leak into a later test
    try {
      const wrapper = await mountMaker({ beastId: "b9" });
      await flushPromises();

      // the chore screen is passed over: the steps are the beast's own, so they cannot be dropped or added to
      expect(wrapper.find('[data-test="step-what"]').exists()).toBe(false);
      expect(wrapper.get(".xp-app-header__meta").text()).toBe("2 / 6");
      expect(wrapper.findAll('[data-test="step-row"]').map((row) => row.find(".qw-step__text").text())).toEqual(["Find the pair", "Roll them"]);
      expect(wrapper.find('[data-test="step-drop"]').exists()).toBe(false);
      expect(wrapper.find('[data-test="step-input"]').exists()).toBe(false);

      for (let screen = 0; screen < 4; screen += 1) await tap(wrapper, "next");
      expect(wrapper.get('[data-test="ready-name"]').text()).toBe("Sock Monster");
      expect(wrapper.get(".qw-card__portrait").attributes("src")).toBe(drawing);
      expect(wrapper.get(".qw-card__sub").text()).toBe("Sock Monster");
      expect(wrapper.get('[data-test="kid-note"]').text()).toBe("A Game Master looks at it first.");

      await tap(wrapper, "submit");
      expect(save.mock.calls[0][0]).toMatchObject({ beastId: "b9", name: "Sock Monster", entry: null });
    } finally {
      read.mockRestore();
    }
  });

  describe("at the cap (ten creations, beasts and quests together, still with the Game Master)", () => {
    const waiting = (n: number) => ({ by: "hero", on: "2026-10-20T08:00:00.000Z", state: n % 2 ? "proposed" : "returned" });
    const beasts = Array.from({ length: 5 }, (_, n) => ({ id: `b${n}`, name: `Beast ${n}`, checklist: [], proposal: waiting(n) }));
    const quests = Array.from({ length: 5 }, (_, n) => ({ id: `q${n}`, achievementName: `Quest ${n}`, draft: true, proposal: waiting(n) }));
    let readBeasts: jest.SpyInstance;
    let readQuests: jest.SpyInstance;
    let toast: jest.SpyInstance;

    beforeEach(() => {
      readBeasts = jest.spyOn(BestiaryDb.prototype, "getBeasts").mockResolvedValue([...beasts, null] as never);
      readQuests = jest.spyOn(AchievementDb.prototype, "getTasks").mockResolvedValue(quests as never);
      toast = jest.spyOn(toastController, "create").mockResolvedValue({ present: jest.fn() } as never);
    });

    afterEach(() => {
      readBeasts.mockRestore();
      readQuests.mockRestore();
      toast.mockRestore();
    });

    it("refuses a quest for a sibling with the cap line, and nothing is saved", async () => {
      const wrapper = await mountMaker();
      await toWho(wrapper);
      await tap(wrapper, "hero-sib");
      await tap(wrapper, "next");
      await tap(wrapper, "submit");
      expect(save).not.toHaveBeenCalled();
      expect(toast.mock.calls[0][0]).toMatchObject({ header: "Ask a Game Master to look at your creations first." });
      expect(wrapper.get(".fanfare-stub").attributes("data-open")).toBe("false");
      expect(wrapper.find('[data-test="submit"]').exists()).toBe(true);
    });

    it("still saves a quest for the maker alone, which is no creation (today's live path)", async () => {
      const wrapper = await mountMaker();
      await toWho(wrapper);
      await tap(wrapper, "next");
      await tap(wrapper, "submit");
      expect(save).toHaveBeenCalledTimes(1);
      expect(toast).not.toHaveBeenCalled();
    });
  });
});

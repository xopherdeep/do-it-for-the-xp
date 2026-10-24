import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import XpQuestWizardModal from "@/app/Console/MyPortal/UserHud/MyQuests/components/XpQuestWizardModal.vue";
import { saveWizardQuest } from "@/lib/services/quests/questWizardSave";
import { speak, stop } from "@/lib/engine/audio/speech";
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

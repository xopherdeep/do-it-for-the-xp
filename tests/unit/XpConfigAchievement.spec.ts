/**
 * The quest config page as a wizard (docs: compendium-wizards-design, W4): the real shell, the real form hook and the
 * real step rules over faked browser storage; the five step bodies, the fanfare, the Ionic frame and the router are
 * stubs. A new quest opens on step one and walks What's the chore? -> Who does it? -> When? -> How hard? -> Ready?,
 * the verb marks it Ready (the fanfare for a debut, a toast for a quest that was already live), a saved quest opens on
 * the summary and a saved draft on the first step that still wants an answer.
 */
import { flushPromises, mount } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import AchievementDb, { achievementStorage } from "@/lib/databases/AchievementDb";
import XpConfigAchievement from "@/app/Admin/XpCompendium/views/XpAchievements/XpConfigAchievement/XpConfigAchievement.vue";

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
// A save happens only when a test flushes it, so no timer from one test can write into the next
jest.mock("lodash", () => ({
  ...jest.requireActual("lodash"),
  debounce: (save: () => unknown) => {
    let isPending = false;
    const debounced = () => {
      isPending = true;
    };
    debounced.flush = () => {
      if (!isPending) return undefined;
      isPending = false;
      return save();
    };
    debounced.cancel = () => {
      isPending = false;
    };
    return debounced;
  },
}));

// Every view-will-enter callback the page registered, so a test can enter the page again
const mockEntered: Array<() => void> = [];
const mockToast = jest.fn(() => Promise.resolve({ present: jest.fn() }));
const mockAlert = jest.fn(() => Promise.resolve({ present: jest.fn() }));
jest.mock("@ionic/vue", () => ({
  ...jest.requireActual("@ionic/vue"),
  // The Ionic router is not here: the page opens as soon as it is set up
  onIonViewWillEnter: (callback: () => void) => {
    mockEntered.push(callback);
    callback();
  },
  toastController: { create: (...args: unknown[]) => (mockToast as unknown as (...a: unknown[]) => unknown)(...args) },
  alertController: { create: (...args: unknown[]) => (mockAlert as unknown as (...a: unknown[]) => unknown)(...args) },
  modalController: { create: jest.fn(), dismiss: jest.fn() },
}));
const mockReplace = jest.fn();
jest.mock("vue-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: (...args: unknown[]) => mockReplace(...args), currentRoute: { value: { params: {} } } }),
}));
const mockBack = jest.fn();
jest.mock("@/hooks/useBack", () => ({ useBack: () => ({ stepBack: () => mockBack() }) }));
jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn(), default: {} }));
jest.mock("@/lib/databases/ProfileDb", () => {
  class MockProfileDb {
    getAll = jest.fn().mockResolvedValue([{ id: "hero-1", name: { first: "Mia" } }]);
  }
  return { __esModule: true, default: MockProfileDb };
});
jest.mock("@/lib/store/stores/pro", () => ({ useProStore: () => ({ requirePro: jest.fn() }) }));
jest.mock("@/lib/store/stores/bestiary-selection", () => ({ useBestiarySelectionStore: () => ({ startSelection: jest.fn() }) }));
jest.mock("@/app.config", () => ({ __esModule: true, default: { $getUserAvatar: jest.fn() } }));
jest.mock("@/app/Admin/XpCompendium/views/XpAchievements/XpConfigAchievement/components/XpReorderAchievementsModal.vue", () => ({
  __esModule: true,
  default: {},
}));

// The step bodies are the old tabs, with their own specs and screens; here each is a marker
const body = (id: string) => ({ __esModule: true, default: { template: `<div class="body" data-test="step-${id}"></div>` } });
jest.mock("@/app/Admin/XpCompendium/views/XpAchievements/XpConfigAchievement/components/tabs/QuestTypeTab.vue", () => body("chore"));
jest.mock("@/app/Admin/XpCompendium/views/XpAchievements/XpConfigAchievement/components/tabs/QuestHerosTab.vue", () => body("who"));
jest.mock("@/app/Admin/XpCompendium/views/XpAchievements/XpConfigAchievement/components/tabs/QuestScheduleTab.vue", () => body("when"));
jest.mock("@/app/Admin/XpCompendium/views/XpAchievements/XpConfigAchievement/components/tabs/QuestRewardsTab.vue", () => body("hard"));
jest.mock("@/app/Admin/XpCompendium/views/XpAchievements/XpConfigAchievement/components/tabs/QuestDashboardTab.vue", () => body("ready"));
jest.mock("@/components/organisms/HeroFanfare/XpHeroFanfare.vue", () => ({
  __esModule: true,
  default: { props: ["open", "name", "subtitle"], template: "<div class='fanfare-stub' :data-open='String(open)' :data-subtitle='subtitle'></div>" },
}));
jest.mock("@/components/molecules/Loading/XpLoading.vue", () => ({ __esModule: true, default: { template: "<div class='loading-stub'></div>" } }));

const scrollToTop = jest.fn();
const slot = { template: "<div><slot /></div>" };
const stubs = {
  IonPage: slot,
  IonHeader: slot,
  IonToolbar: slot,
  IonFooter: slot,
  IonContent: {
    template: "<div class='content-stub'><slot /></div>",
    mounted() {
      (this as unknown as { $el: { scrollToTop: jest.Mock } }).$el.scrollToTop = scrollToTop;
    },
  },
  IonModal: { template: "<div class='modal-stub'></div>" },
  IonRange: { props: ["value"], template: "<div class='range-stub' :data-value='value'><slot name='start' /><slot name='end' /></div>" },
  IonDatetime: { template: "<div></div>" },
  IonButton: { template: "<button><slot /></button>" },
  XpAddCategoryModal: { template: "<div class='category-stub'></div>" },
  XpInfoToggleModal: { template: "<div class='info-stub'></div>" },
  XpSpeakButton: { props: ["text"], template: "<button class='speak-stub' :data-text='text'></button>" },
  XpCloseButton: { template: "<button class='close-stub' data-test='wizard-close'></button>" },
  XpRevealPrompt: { props: ["prompt"], template: "<div class='prompt-stub'></div>" },
};

const achievementDb = new AchievementDb(achievementStorage);

type Page = VueWrapper<any>;

const mountPage = async (id: string): Promise<Page> => {
  setActivePinia(createPinia());
  const wrapper = mount(XpConfigAchievement, { props: { id }, global: { stubs } });
  await flushPromises();
  await nextTick();
  return wrapper;
};

const title = (wrapper: Page): string => wrapper.get(".xp-app-header__title").text();
const meta = (wrapper: Page): string => wrapper.get(".xp-app-header__meta").text();
const why = (wrapper: Page): string => wrapper.find('[data-test="why"]').text();

const tap = async (wrapper: Page, test: string) => {
  await wrapper.get(`[data-test="${test}"]`).trigger("click");
  await flushPromises();
  await nextTick();
};

const type = async (wrapper: Page, test: string, text: string) => {
  const input = wrapper.get(`[data-test="${test}"]`);
  await input.setValue(text);
  await nextTick();
};

/** A saved quest that is complete: named, filed, a plain chore for one hero, difficulty 3 */
const saveQuest = (patch: Record<string, unknown> = {}) =>
  achievementDb.setTask({
    ...AchievementDb.getDefault(),
    id: "q1",
    achievementName: "Load the dishwasher",
    categoryId: "cat-1",
    assignee: ["hero-1"],
    difficulty: 3,
    draft: false,
    ...patch,
  });

beforeEach(async () => {
  localStorage.clear();
  await achievementDb.clear();
  mockToast.mockClear();
  mockAlert.mockClear();
  mockReplace.mockClear();
  mockBack.mockClear();
  mockEntered.length = 0;
});

describe("a new quest", () => {
  it("opens on step one, What's the chore?, with the name and the three kinds at the bottom", async () => {
    const wrapper = await mountPage("new");
    expect(title(wrapper)).toBe("What's the chore?");
    expect(meta(wrapper)).toBe("1 / 5");
    expect(wrapper.find('[data-test="step-chore"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="name"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-test^="kind-"]').map((kind) => kind.text())).toEqual(["Normal", "Beast", "Chain"]);
    expect(wrapper.get('[data-test="kind-simple"]').classes()).toContain("is-active");
  });

  it("gives itself an address of its own", async () => {
    await mountPage("new");
    expect(mockReplace).toHaveBeenCalledTimes(1);
    const [location] = mockReplace.mock.calls[0];
    expect(location.name).toBe("xp-achievement-config-dashboard");
    expect(String(location.params.id)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("holds Next shut until the chore is named and filed, saying what is missing", async () => {
    const wrapper = await mountPage("new");
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeDefined();
    expect(why(wrapper)).toBe("Name the chore");
    await type(wrapper, "name", "Load the dishwasher");
    expect(why(wrapper)).toBe("Pick a category");
    wrapper.vm.achievement.categoryId = "cat-1";
    await nextTick();
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeUndefined();
  });

  it("asks for a beast once Beast is chosen, and lets a normal chore go on", async () => {
    const wrapper = await mountPage("new");
    await type(wrapper, "name", "Defeat the Socktopus");
    wrapper.vm.achievement.categoryId = "cat-1";
    await tap(wrapper, "kind-beast");
    expect(wrapper.get('[data-test="kind-beast"]').classes()).toContain("is-active");
    expect(why(wrapper)).toBe("Pick the beast to fight");
    await tap(wrapper, "kind-simple");
    expect(wrapper.find('[data-test="why"]').exists()).toBe(false);
  });

  it("walks the five steps and marks the quest Ready with the fanfare", async () => {
    const wrapper = await mountPage("new");
    await type(wrapper, "name", "Load the dishwasher");
    wrapper.vm.achievement.categoryId = "cat-1";
    await nextTick();
    await tap(wrapper, "next");
    expect(title(wrapper)).toBe("Who does it?");
    expect(wrapper.findAll('[data-test^="assignment-"]').map((choice) => choice.text())).toEqual(["Open", "Solo", "Team", "Rotate", "Race"]);
    expect(why(wrapper)).toBe("Pick at least one hero");

    await tap(wrapper, "assignment-asNeeded");
    expect(wrapper.get('[data-test="assignment-asNeeded"]').classes()).toContain("is-active");
    await tap(wrapper, "next");
    expect(title(wrapper)).toBe("When?");
    await tap(wrapper, "next");
    expect(title(wrapper)).toBe("How hard?");
    expect(wrapper.find('[data-test="difficulty-range"]').exists()).toBe(true);
    await tap(wrapper, "next");
    expect(title(wrapper)).toBe("Ready?");
    expect(meta(wrapper)).toBe("5 / 5");
    expect(wrapper.get('[data-test="submit"]').text()).toContain("Ready");
    expect(wrapper.get('[data-test="submit"]').attributes("disabled")).toBeUndefined();

    await tap(wrapper, "submit");
    expect(wrapper.get(".fanfare-stub").attributes("data-open")).toBe("true");
    expect(wrapper.get(".fanfare-stub").attributes("data-subtitle")).toBe("Open to every hero");
    const saved = await achievementDb.getTaskById(wrapper.vm.achievement.id);
    expect(saved).toMatchObject({ draft: false, type: "asNeeded" });
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("closes from the first step's Back, saving what was typed", async () => {
    const wrapper = await mountPage("new");
    await type(wrapper, "name", "Water the plants");
    await tap(wrapper, "back");
    expect(mockBack).toHaveBeenCalledTimes(1);
    const saved = await achievementDb.getTaskById(wrapper.vm.achievement.id);
    expect(saved?.draft).toBe(true);
    expect(saved?.achievementName).toMatch(/plants/i);
  });
});

describe("a saved quest", () => {
  it("opens on the summary, Ready?, with the verb open and every dot to go back by", async () => {
    await saveQuest();
    const wrapper = await mountPage("q1");
    expect(title(wrapper)).toBe("Ready?");
    expect(meta(wrapper)).toBe("5 / 5");
    expect(wrapper.get('[data-test="submit"]').attributes("disabled")).toBeUndefined();
    const dots = wrapper.findAll(".xp-wiz-dot");
    expect(dots).toHaveLength(5);
    expect(dots.every((dot) => dot.attributes("disabled") === undefined || dot.classes().includes("is-here"))).toBe(true);
    await wrapper.get('[data-test="dot-chore"]').trigger("click");
    await nextTick();
    expect(title(wrapper)).toBe("What's the chore?");
  });

  it("marks an edited quest Ready with a toast and goes back, no fanfare", async () => {
    await saveQuest();
    const wrapper = await mountPage("q1");
    await tap(wrapper, "submit");
    expect(wrapper.get(".fanfare-stub").attributes("data-open")).toBe("false");
    expect(mockToast).toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it("keeps its place when the page is entered again (coming back from the bestiary)", async () => {
    await saveQuest();
    const wrapper = await mountPage("q1");
    await wrapper.get('[data-test="dot-who"]').trigger("click");
    await nextTick();
    expect(title(wrapper)).toBe("Who does it?");
    mockEntered.forEach((enter) => enter());
    await flushPromises();
    expect(title(wrapper)).toBe("Who does it?");
  });

  it("opens a draft on the first step that still wants an answer", async () => {
    await saveQuest({ assignee: [], draft: true });
    const wrapper = await mountPage("q1");
    expect(title(wrapper)).toBe("Who does it?");
    expect(why(wrapper)).toBe("Pick at least one hero");
  });

  it("gives a draft's debut the fanfare when it is made Ready", async () => {
    await saveQuest({ assignee: [], draft: true });
    const wrapper = await mountPage("q1");
    await tap(wrapper, "assignment-asNeeded");
    await tap(wrapper, "next");
    await tap(wrapper, "next");
    await tap(wrapper, "next");
    expect(title(wrapper)).toBe("Ready?");
    await tap(wrapper, "submit");
    expect(wrapper.get(".fanfare-stub").attributes("data-open")).toBe("true");
    expect((await achievementDb.getTaskById("q1"))?.draft).toBe(false);
  });
});

describe("New Quest with a draft still waiting (GitHub issue #126)", () => {
  const promptOf = (wrapper: Page) => wrapper.vm.draftPrompt?.options;
  const answer = async (wrapper: Page, id: string) => {
    wrapper.vm.respondDraft({ id, amount: null });
    await flushPromises();
    await nextTick();
  };

  it("leaves a quest closed partway through a draft, and asks about it next time instead of minting another", async () => {
    const first = await mountPage("new");
    await type(first, "name", "Feed the dog");
    first.vm.achievement.categoryId = "cat-1";
    first.vm.achievement.assignee = ["hero-1"];
    await nextTick();
    await tap(first, "back");
    const saved = await achievementDb.getTaskById(first.vm.achievement.id);
    expect(saved?.draft).toBe(true);

    mockReplace.mockClear();
    const again = await mountPage("new");
    expect(promptOf(again)?.lines.join(" ")).toContain("Feed The Dog");
    expect(promptOf(again)?.choices.map((choice: { id: string }) => choice.id)).toEqual(["resume", "discard", "back"]);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(await achievementDb.getTasks()).toHaveLength(1);
  });

  it("opens a fresh quest when no draft waits, asking nothing", async () => {
    await saveQuest();
    const wrapper = await mountPage("new");
    expect(wrapper.vm.draftPrompt).toBeNull();
    expect(title(wrapper)).toBe("What's the chore?");
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it("Resume opens the draft where it left off, at its own address", async () => {
    await saveQuest({ draft: true });
    const wrapper = await mountPage("new");
    await answer(wrapper, "resume");
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace.mock.calls[0][0].params.id).toBe("q1");
    expect(title(wrapper)).toBe("Ready?");
    expect(wrapper.vm.achievement.achievementName).toBe("Load the dishwasher");
    await tap(wrapper, "submit");
    expect(wrapper.get(".fanfare-stub").attributes("data-open")).toBe("true");
    expect((await achievementDb.getTaskById("q1"))?.draft).toBe(false);
  });

  it("Discard deletes the draft, then starts a fresh quest on step one", async () => {
    await saveQuest({ draft: true });
    const wrapper = await mountPage("new");
    await answer(wrapper, "discard");
    expect(await achievementDb.getTaskById("q1")).toBeNull();
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(String(mockReplace.mock.calls[0][0].params.id)).toMatch(/^[0-9a-f-]{36}$/);
    expect(title(wrapper)).toBe("What's the chore?");
  });

  it("Discard asks about the next draft in turn, and mints a new id only once none is left", async () => {
    await saveQuest({ id: "d1", draft: true });
    await saveQuest({ id: "d2", achievementName: "Feed the cat", draft: true });
    const wrapper = await mountPage("new");
    expect(promptOf(wrapper)?.lines.join(" ")).toMatch(/1 more unfinished quest waits/);
    await answer(wrapper, "discard");
    expect(mockReplace).not.toHaveBeenCalled();
    expect(promptOf(wrapper)?.lines.join(" ")).not.toMatch(/more unfinished/);
    await answer(wrapper, "discard");
    expect(await achievementDb.getTasks()).toEqual([]);
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it("Not now (or Escape) leaves New Quest and changes nothing", async () => {
    await saveQuest({ draft: true });
    const wrapper = await mountPage("new");
    await answer(wrapper, "back");
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(await achievementDb.getTaskById("q1")).toMatchObject({ draft: true });
  });
});

describe("the Save chip", () => {
  it("says Draft for a quest that is not complete, and a tap lists what is missing in a toast, never an alert", async () => {
    await saveQuest({ assignee: [], draft: true });
    const wrapper = await mountPage("q1");
    wrapper.vm.saveState = "draft";
    await nextTick();
    const chip = wrapper.get('[data-test="save-chip"]');
    expect(chip.text()).toBe("Draft");
    await chip.trigger("click");
    await flushPromises();
    expect(mockToast).toHaveBeenCalled();
    expect(JSON.stringify(mockToast.mock.calls[0])).toContain("Pick at least one hero");
    expect(mockAlert).not.toHaveBeenCalled();
  });
});

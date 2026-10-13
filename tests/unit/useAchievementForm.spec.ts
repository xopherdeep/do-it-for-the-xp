/**
 * The quest form hook (useAchievementForm) at the three things the Game Master sees on the Why and How tabs:
 * the tier chip and the "About how long?" minutes (they follow the difficulty slider until the parent edits the
 * minutes, and a reset goes back), and the beast the library suggests for a quest that has none (only for a plain
 * quest with no beast; a live quest takes it on save, the beast joins the bestiary). Only the browser's storage is
 * faked (in memory); the rules are in tests/unit/questFormRules.spec.ts.
 */
import { nextTick } from "vue";
import AchievementDb, { achievementStorage } from "@/lib/databases/AchievementDb";
import BestiaryDb, { beastStorage } from "@/lib/databases/BestiaryDb";
import { useAchievementForm } from "@/app/Admin/XpCompendium/views/XpAchievements/XpConfigAchievement/hooks/useAchievementForm";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";

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
// The form saves itself two seconds after an edit. Here a save happens only when the test flushes it (saveNow), so no
// timer from one test can write into the next.
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
jest.mock("@ionic/vue", () => ({
  toastController: { create: jest.fn(() => Promise.resolve({ present: jest.fn() })) },
  alertController: { create: jest.fn(() => Promise.resolve({ present: jest.fn() })) },
  modalController: { create: jest.fn(), dismiss: jest.fn() },
}));
jest.mock("vue-router", () => ({
  useRouter: () => ({ push: jest.fn(), currentRoute: { value: { params: {} } } }),
}));
jest.mock("@/hooks/useBack", () => ({ useBack: () => ({ back: jest.fn() }) }));
jest.mock("@/lib/databases/ProfileDb", () => {
  class MockProfileDb {
    getAll = jest.fn().mockResolvedValue([]);
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

const achievementDb = new AchievementDb(achievementStorage);
const bestiaryDb = new BestiaryDb(beastStorage);
const dishGoblin = BEAST_LIBRARY.find((b) => b.name === "Dish Goblin")!;
const socktopus = BEAST_LIBRARY.find((b) => b.name === "Socktopus")!;

beforeEach(async () => {
  await achievementDb.clear();
  await bestiaryDb.clear();
});

/** A form on a new quest, named, with a category and a hero: complete enough to go live when saved */
const newForm = async (name = "Load the dishwasher", live = true) => {
  const form = useAchievementForm();
  await form.loadData("new");
  form.achievement.value.achievementName = name;
  if (live) {
    form.achievement.value.categoryId = "cat-1";
    form.achievement.value.assignee = ["hero-1"];
  }
  return form;
};

const savedQuest = async (form: Awaited<ReturnType<typeof newForm>>) => {
  await form.saveNow();
  return achievementDb.getTaskById(form.achievement.value.id);
};

describe("the Why tab: tier chip and minutes", () => {
  it("names the tier of the difficulty", async () => {
    const form = await newForm();
    expect(form.questTierName.value).toBe("Monster");
    form.fibonacciIndex.value = 2; // 3
    await nextTick();
    expect(form.questTierKey.value).toBe("miniboss");
    expect(form.questTierName.value).toBe("Miniboss");
    form.fibonacciIndex.value = 4; // 8
    await nextTick();
    expect(form.questTierName.value).toBe("Boss");
  });

  it("prefills the minutes from the difficulty and follows the slider until the parent edits them", async () => {
    const form = await newForm();
    expect(form.minutes.value).toBe(3);
    expect(form.isMinutesEdited.value).toBe(false);
    form.fibonacciIndex.value = 3; // 5
    await nextTick();
    expect(form.minutes.value).toBe(12);
    expect(form.minutesText.value).toBe("12 min");
    form.fibonacciIndex.value = 5; // 13
    await nextTick();
    expect(form.minutes.value).toBe(30);
  });

  it("keeps the parent's minutes when the slider moves, and a reset goes back to following it", async () => {
    const form = await newForm();
    form.fibonacciIndex.value = 3; // 5 -> 12
    await nextTick();
    form.setMinutes("17");
    expect(form.minutes.value).toBe(17);
    expect(form.isMinutesEdited.value).toBe(true);
    expect(form.defaultMinutesText.value).toBe("12 min");

    form.fibonacciIndex.value = 5; // 13 -> 30 by default
    await nextTick();
    expect(form.minutes.value).toBe(17);

    form.resetMinutes();
    expect(form.isMinutesEdited.value).toBe(false);
    expect(form.minutes.value).toBe(30);
    form.fibonacciIndex.value = 0;
    await nextTick();
    expect(form.minutes.value).toBe(3);
  });

  it("ignores a blank or half-typed minutes field", async () => {
    const form = await newForm();
    form.setMinutes("20");
    form.setMinutes("");
    form.setMinutes("0");
    form.setMinutes("abc");
    expect(form.minutes.value).toBe(20);
  });

  it("saves the minutes the parent typed, and nothing while they follow the difficulty", async () => {
    const followed = await newForm();
    expect((await savedQuest(followed))?.estimatedMinutes).toBeUndefined();

    const edited = await newForm();
    edited.setMinutes("25");
    expect((await savedQuest(edited))?.estimatedMinutes).toBe(25);

    edited.resetMinutes();
    const reset = await savedQuest(edited);
    expect(reset).not.toHaveProperty("estimatedMinutes");
  });
});

describe("the How tab: the beast the library suggests", () => {
  it("suggests the beast of the chore for a quest with no beast", async () => {
    const form = await newForm();
    expect(form.suggestedBeast.value?.name).toBe("Dish Goblin");
    expect(form.beastSuggestions.value.length).toBeGreaterThan(0);
    form.achievement.value.achievementName = "Match the socks";
    expect(form.suggestedBeast.value?.name).toBe("Socktopus");
  });

  it("suggests nothing for a quest that has a beast, is a chain, or is no chore", async () => {
    const form = await newForm();
    form.achievement.value.beastId = "beast-trash-troll";
    expect(form.suggestedBeast.value).toBeNull();
    form.achievement.value.beastId = "";
    form.achievement.value.adventureType = "chain";
    expect(form.suggestedBeast.value).toBeNull();
    form.achievement.value.adventureType = "simple";
    form.achievement.value.achievementName = "Defeat the final boss of Hyrule";
    expect(form.suggestedBeast.value).toBeNull();
  });

  it("stops suggesting when the parent says no beast, and starts again when they take it back", async () => {
    const form = await newForm();
    form.dismissSuggestion();
    expect(form.achievement.value.noBeast).toBe(true);
    expect(form.suggestedBeast.value).toBeNull();
    expect(form.isBeastDeclined.value).toBe(true);
    form.restoreSuggestion();
    expect(form.suggestedBeast.value?.name).toBe("Dish Goblin");
    expect(form.isBeastDeclined.value).toBe(false);
  });

  it("takes the suggestion on save: the quest becomes a beast quest and the beast joins the bestiary", async () => {
    const form = await newForm();
    form.setMinutes("14");
    const saved = await savedQuest(form);
    expect(saved).toMatchObject({ beastId: "beast-dish-goblin", adventureType: "beast", estimatedMinutes: 14, draft: false });
    const beasts = await bestiaryDb.getAll();
    expect(beasts.map((b) => b.id)).toEqual(["beast-dish-goblin"]);
    expect(beasts[0]).toMatchObject({ name: "Dish Goblin", avatar: dishGoblin.avatar });
    expect(form.beasts.value.map((b) => b.id)).toContain("beast-dish-goblin");
    expect(form.suggestedBeast.value).toBeNull();
  });

  it("keeps the family's own copy of the beast instead of overwriting it", async () => {
    await bestiaryDb.setBeast({ id: "beast-dish-goblin", name: "Gobbo", checklist: ["Stack them"], avatar: 3 });
    const form = await newForm();
    await savedQuest(form);
    const beasts = await bestiaryDb.getAll();
    expect(beasts).toHaveLength(1);
    expect(beasts[0].name).toBe("Gobbo");
    expect((await achievementDb.getTaskById(form.achievement.value.id))?.beastId).toBe("beast-dish-goblin");
  });

  it("leaves a draft beast-less: the suggestion waits until the quest is complete", async () => {
    const form = await newForm("Load the dishwasher", false);
    const saved = await savedQuest(form);
    expect(saved).toMatchObject({ draft: true, beastId: "", adventureType: "simple" });
    expect(await bestiaryDb.getAll()).toEqual([]);
    expect(form.suggestedBeast.value?.name).toBe("Dish Goblin");
  });

  it("leaves a quest beast-less when the parent said no beast", async () => {
    const form = await newForm();
    form.dismissSuggestion();
    const saved = await savedQuest(form);
    expect(saved).toMatchObject({ beastId: "", adventureType: "simple", noBeast: true });
    expect(await bestiaryDb.getAll()).toEqual([]);
  });

  it("takes the beast the parent picked with Change, at once for a live quest", async () => {
    const form = await newForm();
    await form.selectSuggestion(socktopus);
    expect(form.achievement.value).toMatchObject({ beastId: "beast-socktopus", adventureType: "beast", noBeast: false });
    expect((await bestiaryDb.getAll()).map((b) => b.id)).toEqual(["beast-socktopus"]);
    const saved = await savedQuest(form);
    expect(saved?.beastId).toBe("beast-socktopus");
  });

  it("holds the beast the parent picked for a draft until the quest goes live", async () => {
    const form = await newForm("Load the dishwasher", false);
    await form.selectSuggestion(socktopus);
    expect(form.achievement.value.beastId).toBe("");
    expect(form.suggestedBeast.value?.name).toBe("Socktopus");
    expect(await bestiaryDb.getAll()).toEqual([]);

    form.achievement.value.categoryId = "cat-1";
    form.achievement.value.assignee = ["hero-1"];
    const saved = await savedQuest(form);
    expect(saved).toMatchObject({ beastId: "beast-socktopus", adventureType: "beast", draft: false });
  });
});

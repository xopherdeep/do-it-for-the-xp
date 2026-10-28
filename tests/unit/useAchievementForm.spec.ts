/**
 * The quest form hook (useAchievementForm) at the things the Game Master sees in the quest wizard: the tier chip and
 * the "About how long?" minutes on How hard? (they follow the difficulty slider until the parent edits the minutes, and
 * a reset goes back), the beast the library suggests for a quest that has none on What's the chore? (only for a plain
 * quest with no beast; a live quest takes it on save, the beast joins the bestiary), the category a typed name picks,
 * and the Ready verb of the last step. Only the browser's storage is faked (in memory); the step rules are in
 * tests/unit/questConfigWizard.spec.ts and the form rules in tests/unit/questFormRules.spec.ts.
 */
import { nextTick } from "vue";
import AchievementDb, { AchievementCategoryDb, achievementCategoryStorage, achievementStorage } from "@/lib/databases/AchievementDb";
import BestiaryDb, { beastStorage } from "@/lib/databases/BestiaryDb";
import { useAchievementForm } from "@/app/Admin/XpCompendium/views/XpAchievements/XpConfigAchievement/hooks/useAchievementForm";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import { SEED_REWARDS } from "@/lib/services/core/packs/packSeeds";
import { suggestedRewards } from "@/lib/services/quests/questWizard";

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
jest.mock("@/hooks/useBack", () => ({ useBack: () => ({ stepBack: jest.fn() }) }));
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
// The review service is the creation rules' own (tests/unit/creationReview.spec.ts); here only the call is proven
jest.mock("@/lib/services/creations/creationReview", () => ({
  __esModule: true,
  approveStoredQuest: jest.fn().mockResolvedValue(true),
  freshProposalOf: jest.fn().mockResolvedValue({}),
}));
jest.mock("@/lib/store/stores/user", () => ({ useUserStore: () => ({ currentUser: { id: "mom" } }) }));
import { toastController } from "@ionic/vue";
import { approveStoredQuest, freshProposalOf } from "@/lib/services/creations/creationReview";
const approveQuest = approveStoredQuest as jest.Mock;
const freshProposal = freshProposalOf as jest.Mock;

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

describe("How hard?: the pay follows the same table as the packs and the Quest Wizard", () => {
  const payOf = (form: Awaited<ReturnType<typeof newForm>>) => {
    const { xp, gp, ap } = form.achievement.value;
    return { xp, gp, ap };
  };

  it("pays a new Tiny quest less than a Small one, the table's 60 XP / 15 GP / 1 AP", async () => {
    const form = await newForm();
    expect(form.achievement.value.difficulty).toBe(1);
    expect(payOf(form)).toEqual({ xp: 60, gp: 15, ap: 1 });
  });

  it("pays Small what the Quick Start quests of that size pay: 120 XP / 30 GP", async () => {
    const form = await newForm();
    form.fibonacciIndex.value = 1; // 2
    await nextTick();
    expect(form.achievement.value.difficulty).toBe(2);
    expect(payOf(form)).toEqual({ xp: 120, gp: 30, ap: 2 });
    expect(payOf(form)).toEqual(SEED_REWARDS[2]);
  });

  it("pays every step of the slider by the table, and each pays more than the one before", async () => {
    const form = await newForm();
    let before = { xp: 0, gp: 0, ap: 0 };
    for (let index = 0; index < form.fibonacciArray.length; index++) {
      form.fibonacciIndex.value = index;
      await nextTick();
      const pay = payOf(form);
      expect(pay).toEqual(suggestedRewards(form.fibonacciArray[index]));
      expect(pay.xp).toBeGreaterThan(before.xp);
      expect(pay.gp).toBeGreaterThan(before.gp);
      before = pay;
    }
  });

  it("keeps the table's pay in the stored default a quest is filled in from", () => {
    const { difficulty, xp, gp, ap } = AchievementDb.getDefault();
    expect({ xp, gp, ap }).toEqual(suggestedRewards(difficulty));
  });
});

describe("How hard?: tier chip and minutes", () => {
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

describe("What's the chore?: the beast the library suggests", () => {
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
    // Complete, so it takes the beast; still a draft until Ready (issue #126)
    expect(saved).toMatchObject({ beastId: "beast-dish-goblin", adventureType: "beast", estimatedMinutes: 14, draft: true });
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
    expect(saved).toMatchObject({ beastId: "beast-socktopus", adventureType: "beast", draft: true });
  });
});

describe("What's the chore?: the category a typed name picks", () => {
  const categoryDb = new AchievementCategoryDb(achievementCategoryStorage);

  beforeEach(async () => {
    await categoryDb.clear();
  });

  it("adds a new category and files the quest under it", async () => {
    const form = await newForm();
    await form.addCategory({ id: "cat-kitchen", name: "  Kitchen " });
    expect(form.categories.value).toEqual([{ id: "cat-kitchen", name: "Kitchen" }]);
    expect(form.achievement.value.categoryId).toBe("cat-kitchen");
  });

  it("picks the category a typed name already is, in any case or spacing, and adds no second one", async () => {
    const form = await newForm();
    await form.addCategory({ id: "cat-kitchen", name: "Kitchen" });
    await form.addCategory({ id: "cat-garden", name: "Garden" });
    expect(form.achievement.value.categoryId).toBe("cat-garden");

    await form.addCategory({ id: "cat-again", name: "  kitchen " });
    expect(form.achievement.value.categoryId).toBe("cat-kitchen");
    expect(form.categories.value.map((category) => category.name)).toEqual(["Garden", "Kitchen"]);
    expect((await categoryDb.getAll()).map((category) => category.id).sort()).toEqual(["cat-garden", "cat-kitchen"]);
  });

  it("files the quest under a category the parent taps in the list", async () => {
    const form = await newForm();
    await form.addCategory({ id: "cat-kitchen", name: "Kitchen" });
    await form.addCategory({ id: "cat-garden", name: "Garden" });
    form.selectCategory({ id: "cat-kitchen", name: "Kitchen" });
    expect(form.achievement.value.categoryId).toBe("cat-kitchen");
  });
});

describe("Ready?: the last step's verb", () => {
  it("lists what a quest still needs, in the words of the steps", async () => {
    const form = await newForm("Load the dishwasher", false);
    form.achievement.value.categoryId = "";
    form.achievement.value.assignee = [];
    expect(form.isValidAdventure.value).toBe(false);
    expect(form.getValidationMessage()).toBe("• Pick a category\n• Pick at least one hero");
    form.achievement.value.categoryId = "cat-1";
    form.achievement.value.assignee = ["hero-1"];
    expect(form.isValidAdventure.value).toBe(true);
    expect(form.getValidationMessage()).toBe("");
  });

  it("marks a complete draft Ready: saved for good, no longer a draft", async () => {
    const form = await newForm("Load the dishwasher", false);
    expect(await savedQuest(form)).toMatchObject({ draft: true });
    form.achievement.value.categoryId = "cat-1";
    form.achievement.value.assignee = ["hero-1"];
    expect(await form.confirmReady()).toBe(true);
    expect(form.saveState.value).toBe("saved");
    expect(await achievementDb.getTaskById(form.achievement.value.id)).toMatchObject({ draft: false });
  });

  it("refuses a quest that is not complete, and saves nothing", async () => {
    const form = await newForm("Load the dishwasher", false);
    expect(await form.confirmReady()).toBe(false);
    expect(await achievementDb.getTaskById(form.achievement.value.id)).toBeNull();
  });
});

describe("a draft until Ready (GitHub issue #126)", () => {
  it("keeps a new quest a draft however complete it is, until Ready is tapped", async () => {
    const form = await newForm();
    expect(form.isValidAdventure.value).toBe(true);
    expect(await savedQuest(form)).toMatchObject({ draft: true });
    expect(form.saveState.value).toBe("draft");
    expect(await form.confirmReady()).toBe(true);
    expect(await achievementDb.getTaskById(form.achievement.value.id)).toMatchObject({ draft: false });
  });

  it("keeps a quest live once Ready, when it is changed and saved again", async () => {
    const form = await newForm();
    await form.confirmReady();
    form.achievement.value.achievementName = "Load and unload the dishwasher";
    expect(await savedQuest(form)).toMatchObject({ draft: false });
    expect(form.saveState.value).toBe("saved");
  });

  it("keeps a published quest live while an edit leaves it complete", async () => {
    await achievementDb.setTask({ ...AchievementDb.getDefault(), id: "q-live", achievementName: "Walk The Dog", categoryId: "cat-1", assignee: ["hero-1"], draft: false });
    const form = useAchievementForm();
    await form.loadData("q-live");
    form.achievement.value.difficulty = 3;
    expect(await savedQuest(form)).toMatchObject({ draft: false });
  });

  it("treats a quest saved before drafts existed (no marker) as published", async () => {
    const old = { ...AchievementDb.getDefault(), id: "q-old", achievementName: "Walk The Dog", categoryId: "cat-1", assignee: ["hero-1"] };
    await achievementDb.setTask(old);
    const form = useAchievementForm();
    expect(await form.loadData("q-old")).toEqual({ isSaved: true, wasDraft: false });
    form.achievement.value.difficulty = 3;
    expect(await savedQuest(form)).toMatchObject({ draft: false });
  });

  it("hides a published quest while an edit leaves it incomplete, and shows it again once complete, even after a trip to the bestiary", async () => {
    await achievementDb.setTask({ ...AchievementDb.getDefault(), id: "q-live", achievementName: "Walk The Dog", categoryId: "cat-1", assignee: ["hero-1"], draft: false });
    const form = useAchievementForm();
    await form.loadData("q-live");
    form.achievement.value.assignee = [];
    expect(await savedQuest(form)).toMatchObject({ draft: true });
    // Coming back to the same quest reads it again: it was live when it was opened, so it may go live again
    await form.loadData("q-live");
    form.achievement.value.assignee = ["hero-1"];
    expect(await savedQuest(form)).toMatchObject({ draft: false });
  });

  it("keeps a draft that was opened again a draft until Ready", async () => {
    await achievementDb.setTask({ ...AchievementDb.getDefault(), id: "q-draft", achievementName: "Feed The Dog", categoryId: "cat-1", assignee: ["hero-1"], draft: true });
    const form = useAchievementForm();
    await form.loadData("q-draft");
    form.achievement.value.difficulty = 5;
    expect(await savedQuest(form)).toMatchObject({ draft: true });
  });

  it("says what New Quest opens on: fresh with no draft, else the draft to ask about", async () => {
    const form = useAchievementForm();
    expect(await form.loadNewQuestOpening()).toEqual({ kind: "fresh" });
    await achievementDb.setTask({ ...AchievementDb.getDefault(), id: "q-draft", achievementName: "Feed The Dog", draft: true });
    const opening = await form.loadNewQuestOpening();
    expect(opening).toMatchObject({ kind: "ask", waiting: 1, draft: { id: "q-draft" } });
  });
});

describe("opening a quest", () => {
  it("says whether it was already saved and whether it was still a draft", async () => {
    await achievementDb.setTask({ ...AchievementDb.getDefault(), id: "q-draft", achievementName: "Half done", draft: true });
    await achievementDb.setTask({ ...AchievementDb.getDefault(), id: "q-live", achievementName: "Done", draft: false });
    const form = useAchievementForm();
    expect(await form.loadData("q-draft")).toEqual({ isSaved: true, wasDraft: true });
    expect(await form.loadData("q-live")).toEqual({ isSaved: true, wasDraft: false });
    expect(await form.loadData("q-nowhere")).toEqual({ isSaved: false, wasDraft: false });
  });
});

describe("a kid's quest opened from Approvals", () => {
  const kidQuest = () => ({
    ...AchievementDb.getDefault(),
    id: "q-kid",
    achievementName: "Do The Dishes",
    categoryId: "cat-1",
    assignee: ["hero-1"],
    draft: true,
    createdBy: "jack",
    proposal: { by: "jack", on: "2026-10-26T08:00:00.000Z", state: "proposed" as const },
  });

  beforeEach(() => {
    approveQuest.mockClear();
  });

  it("is approved with the edits when the Game Master taps Ready, says so, and stays live after", async () => {
    await achievementDb.setTask(kidQuest());
    const form = useAchievementForm();
    await form.loadData("q-kid");
    form.achievement.value.difficulty = 3;
    expect(await form.confirmReady()).toBe(true);
    expect(approveQuest).toHaveBeenCalledWith("q-kid", "mom");
    expect(toastController.create).toHaveBeenCalledWith(expect.objectContaining({ message: "Approved, with changes" }));

    form.achievement.value.difficulty = 5;
    expect(await savedQuest(form)).toMatchObject({ draft: false, difficulty: 5 });
    expect(approveQuest).toHaveBeenCalledTimes(1);
  });

  it("stays waiting while the Game Master only edits, without Ready", async () => {
    await achievementDb.setTask(kidQuest());
    const form = useAchievementForm();
    await form.loadData("q-kid");
    form.achievement.value.difficulty = 3;
    expect(await savedQuest(form)).toMatchObject({ draft: true, proposal: { state: "proposed" } });
    expect(approveQuest).not.toHaveBeenCalled();
  });

  it("writes the proposal storage holds now, never the one it opened with (an approval made elsewhere meanwhile)", async () => {
    await achievementDb.setTask(kidQuest());
    const form = useAchievementForm();
    await form.loadData("q-kid");
    const approved = { ...kidQuest().proposal, state: "approved" as const, reviewedBy: "dad", paidOn: "2026-10-27T10:00:00.000Z" };
    freshProposal.mockResolvedValueOnce({ proposal: approved });
    form.achievement.value.difficulty = 3;
    expect(await savedQuest(form)).toMatchObject({ difficulty: 3, proposal: approved });
    expect(freshProposal).toHaveBeenCalledWith("q-kid");
  });

  it("is never asked about a quest a Game Master made", async () => {
    const form = await newForm();
    await form.confirmReady();
    expect(approveQuest).not.toHaveBeenCalled();
  });
});

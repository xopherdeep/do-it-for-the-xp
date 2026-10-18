import {
  DEFAULT_HOME_ROOMS,
  HOME_MIN_MINUTES,
  HOME_TEMPLATES,
  buildHomePack,
  homeBandFor,
  homePackBackup,
  homePackList,
  homePackSummary,
  homeStartDate,
} from "@/lib/services/core/packs/homePack";
import type { HomeAnswers, HomeHero } from "@/lib/services/core/packs/homePack";
import { dateKey } from "@/lib/services/core/packs/packCommon";
import { buildMovingPack } from "@/lib/services/core/packs/movingPack";
import { adoptLibraryBeast, beastTheme } from "@/lib/services/bestiary/librarySuggest";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import { CLASSIC_BEASTS } from "@/lib/services/core/classicBeasts";
import { STARTER_BEASTS, STARTER_CATEGORIES, STARTER_QUESTS } from "@/lib/services/core/StarterWorld";
import type { Beast } from "@/lib/databases/BestiaryDb";
import { BackupService } from "@/lib/services/core/BackupService";
import type { BackupStorage, BackupStoreDef } from "@/lib/services/core/BackupService";
import { DAY_TOKENS, deadlineDayOf, effectiveDeadline, getQuestWindow, questTimesOfDay } from "@/lib/engine/quests/QuestSchedule";
import { defaultMinutes } from "@/lib/services/quests/questClock";

jest.mock("@/lib/databases/AbilitiesDb", () => ({ __esModule: true, abilitiesStorage: { sentinel: "abilities" } }));
jest.mock("@/lib/databases/AccessoriesDb", () => ({
  __esModule: true,
  accessoriesStorage: { sentinel: "accessories" },
  AccessoryType: { RealLife: "real", Virtual: "virtual" },
  Rarity: { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4 },
}));
jest.mock("@/lib/databases/AchievementDb", () => ({
  __esModule: true,
  achievementStorage: { sentinel: "achievements" },
  achievementCategoryStorage: { sentinel: "achievementCategories" },
}));
jest.mock("@/lib/databases/BestiaryDb", () => ({ __esModule: true, beastStorage: { sentinel: "beasts" } }));
jest.mock("@/lib/databases/ChatDb", () => ({ __esModule: true, chatStorage: { sentinel: "chat" } }));
jest.mock("@/lib/databases/DosDontsDb", () => ({ __esModule: true, dosDontsStorage: { sentinel: "dosDonts" } }));
jest.mock("@/lib/databases/PackLibraryDb", () => ({ __esModule: true, packLibraryStorage: { sentinel: "packs" } }));
jest.mock("@/lib/databases/profileStorage", () => ({ __esModule: true, profileStorage: { sentinel: "profiles" } }));
jest.mock("@/lib/databases/PurchaseLogDb", () => ({ __esModule: true, purchaseLogStorage: { sentinel: "purchaseLog" } }));
jest.mock("@/lib/databases/QuestLogDb", () => ({ __esModule: true, questLogStorage: { sentinel: "questLog" } }));
jest.mock("@/lib/databases/ShopsDb", () => ({
  __esModule: true,
  shopStorage: { sentinel: "shops" },
  ShopItemType: { Ability: 0, Accessory: 1 },
}));
jest.mock("@/lib/databases/TempleDb", () => ({ __esModule: true, templeStorage: { sentinel: "temples" } }));
jest.mock("@/lib/databases/TempleProgressDb", () => ({ __esModule: true, templeProgressStorage: { sentinel: "templeProgress" } }));
jest.mock("@/lib/services/core/StorageService", () => ({ __esModule: true, default: { saveProfiles: jest.fn() } }));
jest.mock("@/router/_Guards/gm.guard", () => ({ __esModule: true, canManageFamily: () => true, RESTORE_GM_ONLY_MESSAGE: "GM only" }));
jest.mock("@/lib/store/stores/user", () => ({ __esModule: true, useUserStore: () => ({ loadUsers: jest.fn() }) }));

const PARENT: HomeHero = { id: "dad", name: "Dad", band: "grownup" };
const TWELVE: HomeHero = { id: "twelve", name: "Twelve", band: "kid" };
const SIX: HomeHero = { id: "six", name: "Six", band: "little" };

// Tuesday: the day the family starts
const START = "2026-10-13";

const answers = (extra: Partial<HomeAnswers> = {}): HomeAnswers => ({
  startDate: START,
  rooms: { ...DEFAULT_HOME_ROOMS },
  heroes: [PARENT, TWELVE, SIX],
  ...extra,
});

/** The difficulties each band plays on the Fibonacci scale; a chore several bands share is sized for the youngest */
const RANGES = { little: [1, 2], kid: [2, 5], grownup: [5, 13] } as const;
const ORDER = ["little", "kid", "grownup"] as const;

const bandsOf = (assignee: string[], heroes: HomeHero[]) =>
  new Set(heroes.filter((hero) => assignee.includes(hero.id)).map((hero) => hero.band));

const ids = (pack: ReturnType<typeof buildHomePack>) => pack.quests.map((quest) => String(quest.id));

describe("buildHomePack for a typical home", () => {
  const pack = buildHomePack(answers());
  const beastById = new Map(pack.beasts.map((beast) => [String(beast.id), beast]));
  const heroes = [PARENT, TWELVE, SIX];

  it("makes a curated couple of dozen quests, not the whole library", () => {
    expect(pack.quests.length).toBeGreaterThanOrEqual(20);
    expect(pack.quests.length).toBeLessThanOrEqual(30);
    expect(pack.quests.length).toBeLessThan(BEAST_LIBRARY.length / 2);
    expect(pack.rows).toHaveLength(pack.quests.length);
    expect(pack.heroCount).toBe(3);
  });

  it("makes every quest a beast quest with a library beast, its library checklist and a sane clock", () => {
    for (const quest of pack.quests) {
      const beast = beastById.get(String(quest.beastId));
      const library = BEAST_LIBRARY.find((entry) => entry.id === quest.beastId);
      expect(library).toBeDefined();
      expect(beast).toBeDefined();
      expect(quest.adventureType).toBe("beast");
      expect(beast!.checklist).toEqual(library!.checklist);
      expect(beast!.checklist.length).toBeGreaterThanOrEqual(3);
      expect(beast!.checklist.length).toBeLessThanOrEqual(6);
      const { attackCooldown, ...record } = beast!;
      expect(record).toEqual(adoptLibraryBeast(library!));
      expect(attackCooldown).toBeGreaterThanOrEqual(1);
      expect(attackCooldown).toBeLessThanOrEqual(12);
      // the clock is the estimate spread over the steps
      expect(attackCooldown * beast!.checklist.length).toBeCloseTo(quest.estimatedMinutes as number, 0);
    }
  });

  it("carries a beast only if a quest uses it, once, with the temple theme the library gave it", () => {
    const used = new Set(pack.quests.map((quest) => quest.beastId));
    expect(new Set(pack.beasts.map((beast) => beast.id)).size).toBe(pack.beasts.length);
    expect(pack.beasts.length).toBe(pack.quests.length);
    for (const beast of pack.beasts) {
      expect(used.has(beast.id)).toBe(true);
      expect(beast.theme).toBeDefined();
      expect(beastTheme(beast)).toBe(beast.theme);
      expect(beast.avatar).toBeGreaterThanOrEqual(94);
    }
  });

  it("takes the minutes from the chore's size, never under a minute a step", () => {
    const templateOf = (questId: string) => HOME_TEMPLATES.find((template) => `home-${template.slug}` === questId)!;
    for (const quest of pack.quests) {
      const template = templateOf(String(quest.id));
      expect(quest.estimatedMinutes).toBeGreaterThanOrEqual(HOME_MIN_MINUTES);
      if (!template.minutes && !template.scale) {
        expect(quest.estimatedMinutes).toBe(Math.max(HOME_MIN_MINUTES, defaultMinutes(quest.difficulty)));
      }
    }
  });

  it("owns its quest and category ids and collides with no library, classic, starter or moving id", () => {
    const moving = buildMovingPack({ moveDate: "2026-11-20", today: "2026-10-01", rooms: { ...DEFAULT_HOME_ROOMS }, heroes: [PARENT, TWELVE, SIX] });
    const taken = new Set<string>([
      ...CLASSIC_BEASTS.map((beast) => String(beast.id)),
      ...STARTER_BEASTS.map((beast) => String(beast.id)),
      ...STARTER_QUESTS.map((quest) => String(quest.id)),
      ...STARTER_CATEGORIES.map((category) => category.id),
      ...moving.quests.map((quest) => String(quest.id)),
      ...moving.categories.map((category) => category.id),
    ]);
    for (const id of [...ids(pack), ...pack.categories.map((category) => category.id)]) expect(taken.has(id)).toBe(false);
    for (const id of ids(pack)) expect(id).toMatch(/^home-/);
    for (const category of pack.categories) expect(category.id).toMatch(/^cat-home-/);
    expect(new Set(ids(pack)).size).toBe(pack.quests.length);
    // the beasts are the library's own ids, nothing invented
    const library = new Set(BEAST_LIBRARY.map((beast) => String(beast.id)));
    for (const beast of pack.beasts) expect(library.has(String(beast.id))).toBe(true);
  });

  it("puts every quest in a category the pack carries", () => {
    const categories = new Set(pack.categories.map((category) => category.id));
    for (const quest of pack.quests) expect(categories.has(quest.categoryId)).toBe(true);
    for (const category of pack.categories) expect(pack.quests.some((quest) => quest.categoryId === category.id)).toBe(true);
  });

  it("sizes quests by age: little 1-2, kid 2-5, the grown-ups' own chores 5-13", () => {
    for (const quest of pack.quests) {
      const bands = bandsOf(quest.assignee, heroes);
      const youngest = ORDER.find((band) => bands.has(band))!;
      const [low, high] = RANGES[youngest];
      expect(quest.difficulty).toBeGreaterThanOrEqual(low);
      expect(quest.difficulty).toBeLessThanOrEqual(high);
      if (bands.size === 1 && bands.has("grownup")) expect([5, 8, 13]).toContain(quest.difficulty);
    }
  });

  it("asks the GM's OK only for the kid's bigger jobs", () => {
    for (const quest of pack.quests) {
      const bands = bandsOf(quest.assignee, heroes);
      const isKidOnly = bands.size === 1 && bands.has("kid");
      expect(quest.requiresApproval).toBe(isKidOnly && quest.difficulty >= 5);
    }
    expect(pack.quests.some((quest) => quest.requiresApproval)).toBe(true);
  });

  it("pays the Fibonacci form's rewards and never ends a quest", () => {
    for (const quest of pack.quests) {
      expect(quest.xp).toBe(quest.difficulty * 100);
      expect(quest.gp).toBe(quest.difficulty * 10);
      expect(quest.ap).toBe(quest.difficulty);
      expect(quest.endsOn).toBe("");
    }
  });

  it("shares the family chores as Team Effort and gives every hero their own personal ones as Solo", () => {
    const dishes = pack.quests.find((quest) => quest.id === "home-dish-goblin")!;
    expect(dishes.achievementName).toBe("Dishes after dinner");
    expect(dishes.type).toBe("collaborate");
    expect([...dishes.assignee].sort()).toEqual(["dad", "twelve"]);
    const trash = pack.quests.find((quest) => quest.id === "home-garbage-gargoyle")!;
    expect(trash.type).toBe("collaborate");
    expect([...trash.assignee].sort()).toEqual(["dad", "twelve"]);

    const bed = pack.quests.find((quest) => quest.id === "home-bed-basilisk")!;
    expect(bed.type).toBe("individual");
    expect([...bed.assignee].sort()).toEqual(["six", "twelve"]);
    const teeth = pack.quests.find((quest) => quest.id === "home-fang-fairy")!;
    expect(teeth.type).toBe("individual");

    // a Team Effort of one hero is just their own quest
    expect(pack.quests.find((quest) => quest.id === "home-meadow-minotaur")!.type).toBe("individual");
    expect(pack.quests.find((quest) => quest.id === "home-meadow-minotaur")!.assignee).toEqual(["dad"]);
    expect(pack.quests.find((quest) => quest.id === "home-gravy-ghoul")!.assignee).toEqual(["six"]);

    // the quest list says what the quest record does
    for (const row of pack.rows) {
      const quest = pack.quests.find((candidate) => candidate.id === row.questId)!;
      expect(row.mode).toBe(quest.type === "collaborate" ? "Team Effort" : "Solo");
    }
  });

  it("makes a Team Effort of grown-ups when there are two", () => {
    const two = buildHomePack(answers({ heroes: [PARENT, { id: "mom", name: "Mom", band: "grownup" }, TWELVE, SIX] }));
    const mow = two.quests.find((quest) => quest.id === "home-meadow-minotaur")!;
    expect(mow.type).toBe("collaborate");
    expect([...mow.assignee].sort()).toEqual(["dad", "mom"]);
  });

  it("has a summary and a quest list a Game Master can read", () => {
    expect(homePackSummary(pack)).toBe(
      `Added ${pack.quests.length} quests and ${pack.beasts.length} beasts for 3 heroes, starting Tue Oct 13. First up: Get dressed by yourself.`
    );
    const list = homePackList(pack);
    expect(list).toContain("## Kitchen");
    expect(list).toContain("Dishes after dinner");
    expect(list).toContain("(GM approves)");
  });
});

describe("schedules", () => {
  const pack = buildHomePack(answers());
  const start = new Date(2026, 9, 13);
  const week = Array.from({ length: 7 }, (_, offset) => new Date(2026, 9, 13 + offset));

  it("are daily or weekly on real weekdays, with a start date and no end", () => {
    for (const quest of pack.quests) {
      expect(new Date(quest.startsOn).getTime()).toBe(start.getTime());
      if (quest.basicSchedule === "daily") {
        expect(quest.repeatOnDays).toEqual([]);
        expect(quest.showDailyUntilComplete).toBe(true);
      } else {
        expect(quest.basicSchedule).toBe("weekly");
        expect(quest.repeatOnDays.length).toBeGreaterThanOrEqual(1);
        expect(quest.repeatOnDays.length).toBeLessThanOrEqual(3);
        for (const day of quest.repeatOnDays) expect(DAY_TOKENS).toContain(day);
        expect(quest.showDailyUntilComplete).toBe(false);
      }
    }
  });

  it("are on the board the day they are due and nowhere else", () => {
    for (const quest of pack.quests) {
      const dueDays = week.filter((day) => getQuestWindow(quest, day));
      expect(dueDays.length).toBeGreaterThanOrEqual(1);
      if (quest.basicSchedule === "daily") expect(dueDays).toHaveLength(7);
      else expect(dueDays.map((day) => DAY_TOKENS[day.getDay()]).sort()).toEqual([...quest.repeatOnDays].sort());
    }
  });

  it("carry a due time the deadline rule reads on the day, and a time of day for the calendar", () => {
    for (const quest of pack.quests) {
      const twiceADay = (quest.timesOfDay?.length ?? 0) > 1;
      if (twiceADay) {
        expect(quest.dueByTime).toBe("");
      } else {
        expect(quest.dueByTime).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
      }
      expect(questTimesOfDay(quest).length).toBeGreaterThanOrEqual(1);
      const day = week.find((candidate) => getQuestWindow(quest, candidate))!;
      expect(deadlineDayOf(quest, undefined, day).getTime()).toBe(day.getTime());
      const deadline = effectiveDeadline(quest, undefined, day);
      if (twiceADay) {
        expect(deadline).toBeNull();
      } else {
        const [hours, minutes] = quest.dueByTime.split(":").map(Number);
        expect(deadline).toEqual(new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes));
        // the listed time of day agrees with the due time
        if (quest.timesOfDay?.length) expect(quest.timesOfDay).toEqual(questTimesOfDay({ dueByTime: quest.dueByTime }));
      }
    }
  });

  it("start on the date given", () => {
    const later = buildHomePack(answers({ startDate: "2026-11-02" }));
    for (const quest of later.quests) expect(dateKey(new Date(quest.startsOn))).toBe("2026-11-02");
    expect(later.startDate).toBe("2026-11-02");
  });
});

describe("rooms are parameters", () => {
  it("gives only the rooms the family ticks their quests", () => {
    const small = ids(buildHomePack(answers({ rooms: { kitchen: 1, bedroom: 1 } })));
    expect(small).toContain("home-dish-goblin");
    expect(small).toContain("home-bed-basilisk");
    expect(small).not.toContain("home-grime-griffin");
    expect(small).not.toContain("home-meadow-minotaur");
    expect(small).not.toContain("home-potty-poltergeist");
    expect(small).not.toContain("home-laundry-lurker");
    expect(small).not.toContain("home-zoomie-zephyr");

    const all = ids(buildHomePack(answers({ rooms: { ...DEFAULT_HOME_ROOMS, dog: 1, cat: 1, tank: 1 } })));
    expect(all).toEqual(
      expect.arrayContaining(["home-zoomie-zephyr", "home-plop-golem", "home-clumpling", "home-algae-ooze", "home-kibble-kobold", "home-furball-fiend"])
    );
    expect(all).toContain("home-grime-griffin");
  });

  it("matches the pets to the pet: a dog gets walks, a cat a litter box", () => {
    const dog = ids(buildHomePack(answers({ rooms: { ...DEFAULT_HOME_ROOMS, dog: 1 } })));
    expect(dog).toContain("home-zoomie-zephyr");
    expect(dog).toContain("home-kibble-kobold");
    expect(dog).not.toContain("home-clumpling");
    const cat = ids(buildHomePack(answers({ rooms: { ...DEFAULT_HOME_ROOMS, cat: 1 } })));
    expect(cat).toContain("home-clumpling");
    expect(cat).not.toContain("home-zoomie-zephyr");
  });

  it("makes nothing for no rooms, and only the rooms' groups get a category", () => {
    expect(buildHomePack(answers({ rooms: {} })).quests).toHaveLength(0);
    const kitchenOnly = buildHomePack(answers({ rooms: { kitchen: 1 } }));
    expect(kitchenOnly.categories.map((category) => category.id)).toEqual(["cat-home-kitchen"]);
    expect(kitchenOnly.categories[0].name).toBe("Home: Kitchen");
  });

  it("makes the bathroom jobs longer for each extra bathroom", () => {
    const minutes = (pack: ReturnType<typeof buildHomePack>, id: string) => pack.quests.find((quest) => quest.id === id)!.estimatedMinutes as number;
    const one = buildHomePack(answers({ rooms: { ...DEFAULT_HOME_ROOMS, bathroom: 1, bedroom: 1 } }));
    const three = buildHomePack(answers({ rooms: { ...DEFAULT_HOME_ROOMS, bathroom: 3, bedroom: 4 } }));
    expect(minutes(three, "home-potty-poltergeist")).toBeGreaterThan(minutes(one, "home-potty-poltergeist"));
    expect(minutes(three, "home-soap-scum-slime")).toBeGreaterThan(minutes(one, "home-soap-scum-slime"));
    expect(minutes(three, "home-fluffalo")).toBeGreaterThan(minutes(one, "home-fluffalo"));
    // the clock follows the minutes
    const beast = (pack: ReturnType<typeof buildHomePack>, id: string) => pack.beasts.find((entry) => entry.id === id)!;
    expect(beast(three, "beast-potty-poltergeist").attackCooldown).toBeGreaterThan(beast(one, "beast-potty-poltergeist").attackCooldown);
  });
});

describe("bands are parameters", () => {
  it("leaves out a band with no heroes and a hero who is sitting out", () => {
    const noLittle = buildHomePack(answers({ heroes: [PARENT, TWELVE] }));
    expect(noLittle.quests.some((quest) => quest.assignee.includes("six"))).toBe(false);
    expect(ids(noLittle)).not.toContain("home-gravy-ghoul");
    expect(noLittle.quests.find((quest) => quest.id === "home-bed-basilisk")!.assignee).toEqual(["twelve"]);

    const sittingOut = buildHomePack(answers({ heroes: [PARENT, TWELVE, { ...SIX, band: "out" }] }));
    expect(sittingOut.heroCount).toBe(2);
    expect(sittingOut.quests.some((quest) => quest.assignee.includes("six"))).toBe(false);

    expect(buildHomePack(answers({ heroes: [] })).quests).toHaveLength(0);
  });

  it("gives a grown-up only family just the grown-up chores", () => {
    const pack = buildHomePack(answers({ heroes: [PARENT] }));
    expect(pack.quests.length).toBeGreaterThan(0);
    for (const quest of pack.quests) expect(quest.assignee).toEqual(["dad"]);
    expect(ids(pack)).toContain("home-grease-gorgon");
    expect(ids(pack)).not.toContain("home-kibble-kobold");
  });

  it("gives two kids the same Solo chores and one shared Team Effort", () => {
    const pack = buildHomePack(answers({ heroes: [PARENT, TWELVE, { id: "ten", name: "Ten", band: "kid" }, SIX] }));
    expect([...pack.quests.find((quest) => quest.id === "home-bed-basilisk")!.assignee].sort()).toEqual(["six", "ten", "twelve"]);
    const unload = pack.quests.find((quest) => quest.id === "home-cupboard-kobold")!;
    expect(unload.type).toBe("collaborate");
    expect([...unload.assignee].sort()).toEqual(["ten", "twelve"]);
  });

  it("reads a hero's band off their profile like the Moving House pack does", () => {
    const today = new Date(2026, 9, 12);
    expect(homeBandFor({ isAdult: true, birthday: "2020-01-01" }, today)).toBe("grownup");
    expect(homeBandFor({ isAdult: false, birthday: "2020-06-15" }, today)).toBe("little");
    expect(homeBandFor({ isAdult: false, birthday: "2014-03-01" }, today)).toBe("kid");
  });
});

describe("the start date", () => {
  const today = new Date(2026, 9, 12, 15, 30);

  it("is the day after the move when the Moving House pack is loaded and the move is ahead", () => {
    expect(homeStartDate(new Date(2026, 10, 20).toISOString(), today)).toBe("2026-11-21");
    expect(homeStartDate(new Date(2026, 9, 12).toISOString(), today)).toBe("2026-10-13");
  });

  it("is today without a Moving House pack or when the move is over", () => {
    expect(homeStartDate(undefined, today)).toBe("2026-10-12");
    expect(homeStartDate("not a date", today)).toBe("2026-10-12");
    expect(homeStartDate(new Date(2026, 9, 1).toISOString(), today)).toBe("2026-10-12");
    expect(homeStartDate(new Date(2026, 9, 11).toISOString(), today)).toBe("2026-10-12");
  });
});

describe("loading the pack", () => {
  it("is the same every time for the same answers", () => {
    const first = buildHomePack(answers());
    const second = buildHomePack(answers());
    expect(second).toEqual(first);
    const now = new Date("2026-10-12T00:00:00Z");
    const backup = homePackBackup(first, [], now);
    expect(backup).toEqual(homePackBackup(second, [], now));
    expect(Object.keys(backup.stores).sort()).toEqual(["__achievementCategories", "__achievements", "__beasts"]);
    for (const entries of Object.values(backup.stores)) {
      for (const entry of entries) expect(entry.key).toBe(String((entry.value as { id: unknown }).id));
    }
  });

  class FakeStorage {
    readonly data = new Map<string, unknown>();
    constructor(seed: Record<string, unknown> = {}) {
      Object.entries(seed).forEach(([key, value]) => this.data.set(key, value));
    }
    async create() {
      return this;
    }
    async forEach(callback: (value: unknown, key: string, index: number) => unknown) {
      let index = 0;
      for (const [key, value] of Array.from(this.data.entries())) {
        if (callback(JSON.parse(JSON.stringify(value)), key, index++) !== undefined) return;
      }
    }
    async set(key: string, value: unknown) {
      this.data.set(key, JSON.parse(JSON.stringify(value)));
    }
    async clear() {
      this.data.clear();
    }
    asStorage() {
      return this as unknown as BackupStorage;
    }
  }

  const familyQuest = { id: "quest-the-kids-made", achievementName: "Feed the dragon" };
  const familyBeast = { id: "beast-the-kids-made", name: "Moanin Ronan's Cousin", checklist: ["Hum"] };
  const familyCategory = { id: "cat-ours", name: "Ours" };
  // The family already adopted a library beast and made it their own
  const ownedLibraryBeast = { ...adoptLibraryBeast(BEAST_LIBRARY.find((beast) => beast.slug === "dish-goblin")!), name: "Sir Plates", checklist: ["Scrape", "Load", "Start"] };

  const makeWorld = () => {
    const fakes = {
      __achievementCategories: new FakeStorage({ [familyCategory.id]: familyCategory }),
      __beasts: new FakeStorage({ [familyBeast.id]: familyBeast, [ownedLibraryBeast.id]: ownedLibraryBeast }),
      __achievements: new FakeStorage({ [familyQuest.id]: familyQuest }),
      __questLog: new FakeStorage({ done: { id: "done" } }),
    };
    const defs: BackupStoreDef[] = Object.entries(fakes).map(([name, fake]) => ({ name, label: name, storage: fake.asStorage() }));
    return { fakes, service: new BackupService(defs, jest.fn(async () => undefined), () => true) };
  };

  it("merges: the family's records stay, the pack's land, and a reload replaces only the pack's own quests", async () => {
    const { fakes, service } = makeWorld();
    const pack = buildHomePack(answers());
    await service.restoreBackup(homePackBackup(pack, [ownedLibraryBeast as Beast]), { mode: "merge" });

    expect(fakes.__achievements.data.get(familyQuest.id)).toEqual(familyQuest);
    expect(fakes.__beasts.data.get(familyBeast.id)).toEqual(familyBeast);
    expect(fakes.__achievementCategories.data.get(familyCategory.id)).toEqual(familyCategory);
    expect(fakes.__questLog.data.get("done")).toEqual({ id: "done" });
    expect(fakes.__achievements.data.size).toBe(pack.quests.length + 1);
    expect(fakes.__achievementCategories.data.size).toBe(pack.categories.length + 1);
    // the owned library beast is among the pack's beasts, so only the family's other beast is extra
    expect(fakes.__beasts.data.size).toBe(pack.beasts.length + 1);

    // the family edits a pack quest, then loads the same answers again: only that record goes back
    const edited = { ...(fakes.__achievements.data.get("home-fluffalo") as object), achievementName: "Edited" };
    fakes.__achievements.data.set("home-fluffalo", edited);
    await service.restoreBackup(homePackBackup(buildHomePack(answers()), [ownedLibraryBeast as Beast]), { mode: "merge" });
    expect((fakes.__achievements.data.get("home-fluffalo") as { achievementName: string }).achievementName).toBe("Vacuum the floor");
    expect(fakes.__achievements.data.size).toBe(pack.quests.length + 1);
    expect(fakes.__achievements.data.get(familyQuest.id)).toEqual(familyQuest);
  });

  it("keeps a library beast the family already owns and only sets its strike clock over the family's own checklist", async () => {
    const { fakes, service } = makeWorld();
    const pack = buildHomePack(answers());
    await service.restoreBackup(homePackBackup(pack, [ownedLibraryBeast as Beast]), { mode: "merge" });

    const kept = fakes.__beasts.data.get("beast-dish-goblin") as typeof ownedLibraryBeast & { attackCooldown: number };
    expect(kept.name).toBe("Sir Plates");
    expect(kept.checklist).toEqual(["Scrape", "Load", "Start"]);
    const dishes = pack.quests.find((quest) => quest.id === "home-dish-goblin")!;
    expect(kept.attackCooldown * 3).toBeCloseTo(dishes.estimatedMinutes as number, 0);

    // a beast the family does not have yet comes in as the library's own
    const adopted = fakes.__beasts.data.get("beast-fluffalo") as { name: string; checklist: string[] };
    const library = BEAST_LIBRARY.find((beast) => beast.slug === "fluffalo")!;
    expect(adopted.name).toBe(library.name);
    expect(adopted.checklist).toEqual(library.checklist);
  });
});

describe("the template table", () => {
  it("is honest: unique slugs, each a real library beast, each for someone in a room", () => {
    expect(new Set(HOME_TEMPLATES.map((template) => template.slug)).size).toBe(HOME_TEMPLATES.length);
    const library = new Set(BEAST_LIBRARY.map((beast) => beast.slug));
    for (const template of HOME_TEMPLATES) {
      expect(library.has(template.slug)).toBe(true);
      expect(template.who.length).toBeGreaterThan(0);
      expect(template.rooms.length).toBeGreaterThan(0);
    }
  });
});

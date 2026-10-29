import {
  DEFAULT_MOVING_ROOMS,
  MOVING_TEMPLATES,
  buildMovingPack,
  dateKey,
  movingBandFor,
  movingPackBackup,
  movingPackList,
  movingPackSummary,
} from "@/lib/services/core/packs/movingPack";
import type { MovingAnswers, MovingHero } from "@/lib/services/core/packs/movingPack";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import { CLASSIC_BEASTS } from "@/lib/services/core/classicBeasts";
import { STARTER_BEASTS, STARTER_CATEGORIES, STARTER_QUESTS } from "@/lib/services/core/StarterWorld";
import { BackupService } from "@/lib/services/core/BackupService";
import type { BackupStorage, BackupStoreDef } from "@/lib/services/core/BackupService";

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

const PARENT: MovingHero = { id: "dad", name: "Dad", band: "grownup" };
const TWELVE: MovingHero = { id: "twelve", name: "Twelve", band: "kid" };
const SIX: MovingHero = { id: "six", name: "Six", band: "little" };

const answers = (extra: Partial<MovingAnswers> = {}): MovingAnswers => ({
  moveDate: "2026-11-20",
  today: "2026-10-01",
  rooms: { ...DEFAULT_MOVING_ROOMS },
  heroes: [PARENT, TWELVE, SIX],
  ...extra,
});

const bandOf = (hero: MovingHero) => hero.band;
const assigneesBand = (assignee: string[], heroes: MovingHero[]) =>
  new Set(heroes.filter((hero) => assignee.includes(hero.id)).map(bandOf));

describe("buildMovingPack for a typical home", () => {
  const pack = buildMovingPack(answers());
  const beastById = new Map(pack.beasts.map((beast) => [String(beast.id), beast]));

  it("makes a few dozen quests, not hundreds", () => {
    expect(pack.quests.length).toBeGreaterThanOrEqual(40);
    expect(pack.quests.length).toBeLessThanOrEqual(70);
    expect(pack.rows).toHaveLength(pack.quests.length);
    expect(pack.heroCount).toBe(3);
  });

  it("makes every quest a beast quest whose beast has a 3 to 6 step checklist and a sane clock", () => {
    for (const quest of pack.quests) {
      const beast = beastById.get(String(quest.beastId));
      expect(beast).toBeDefined();
      expect(quest.adventureType).toBe("beast");
      expect(beast!.checklist.length).toBeGreaterThanOrEqual(3);
      expect(beast!.checklist.length).toBeLessThanOrEqual(6);
      expect(beast!.attackCooldown).toBeGreaterThanOrEqual(1);
      expect(beast!.attackCooldown).toBeLessThanOrEqual(36);
      // the clock is the estimate spread over the steps
      expect(beast!.attackCooldown * beast!.checklist.length).toBeCloseTo(quest.estimatedMinutes as number, 0);
      expect(quest.estimatedMinutes).toBeGreaterThan(0);
    }
  });

  it("carries a beast only if a quest uses it, with real art and the pack's own id", () => {
    const used = new Set(pack.quests.map((quest) => quest.beastId));
    for (const beast of pack.beasts) {
      expect(used.has(beast.id)).toBe(true);
      expect(String(beast.id)).toMatch(/^beast-move-/);
      expect(beast.avatar).toBeGreaterThanOrEqual(1);
      expect(beast.avatar).toBeLessThanOrEqual(293);
      expect([41, 42, 43, 44, 45, 46]).not.toContain(beast.avatar);
      expect(beast.name.length).toBeGreaterThan(2);
    }
  });

  it("collides with no library, classic or starter id", () => {
    const taken = new Set<string>([
      ...BEAST_LIBRARY.map((beast) => String(beast.id)),
      ...CLASSIC_BEASTS.map((beast) => String(beast.id)),
      ...STARTER_BEASTS.map((beast) => String(beast.id)),
      ...STARTER_QUESTS.map((quest) => String(quest.id)),
      ...STARTER_CATEGORIES.map((category) => category.id),
    ]);
    for (const id of [...pack.quests.map((q) => q.id), ...pack.beasts.map((b) => b.id), ...pack.categories.map((c) => c.id)]) {
      expect(taken.has(String(id))).toBe(false);
    }
    for (const quest of pack.quests) expect(String(quest.id)).toMatch(/^move-/);
    for (const category of pack.categories) expect(category.id).toMatch(/^cat-move-/);
    expect(new Set(pack.quests.map((q) => q.id)).size).toBe(pack.quests.length);
    expect(new Set(pack.beasts.map((b) => b.id)).size).toBe(pack.beasts.length);
  });

  it("puts every quest in a category the pack carries", () => {
    const categories = new Set(pack.categories.map((category) => category.id));
    for (const quest of pack.quests) expect(categories.has(quest.categoryId)).toBe(true);
  });

  it("sizes quests by age: little 1-2 and short, kid 2-5, grown-up the 5-13 bosses of an hour or more", () => {
    const heroes = [PARENT, TWELVE, SIX];
    for (const quest of pack.quests) {
      const bands = assigneesBand(quest.assignee, heroes);
      const minutes = quest.estimatedMinutes as number;
      if (quest.id.startsWith("move-daily-")) continue;
      if (quest.type === "collaborate" && bands.size > 1) continue; // a whole-family job
      if (bands.has("little") && bands.size === 1) {
        expect(quest.difficulty).toBeLessThanOrEqual(2);
        expect(minutes).toBeGreaterThanOrEqual(5);
        expect(minutes).toBeLessThanOrEqual(15);
      } else if (bands.has("kid") && bands.size === 1) {
        expect(quest.difficulty).toBeGreaterThanOrEqual(2);
        expect(quest.difficulty).toBeLessThanOrEqual(5);
        expect(minutes).toBeGreaterThanOrEqual(15);
        expect(minutes).toBeLessThanOrEqual(45);
      } else if (bands.has("grownup") && bands.size === 1) {
        expect([5, 8, 13]).toContain(quest.difficulty);
        expect(minutes).toBeGreaterThanOrEqual(60);
        expect(minutes).toBeLessThanOrEqual(180);
      }
    }
  });

  it("asks the GM's OK only for the kid's bigger jobs", () => {
    for (const quest of pack.quests) {
      const bands = assigneesBand(quest.assignee, [PARENT, TWELVE, SIX]);
      const isKidOnly = bands.size === 1 && bands.has("kid");
      expect(quest.requiresApproval).toBe(isKidOnly && quest.difficulty >= 5);
    }
    expect(pack.quests.some((quest) => quest.requiresApproval)).toBe(true);
  });

  it("pays the Fibonacci form's rewards and never ends a once quest", () => {
    for (const quest of pack.quests) {
      expect(quest.xp).toBe(quest.difficulty * 100);
      expect(quest.gp).toBe(quest.difficulty * 15);
      expect(quest.ap).toBe(quest.difficulty);
      if (quest.basicSchedule === "once") expect(quest.endsOn).toBe("");
    }
  });

  it("makes the whole-family jobs Team Effort for every hero", () => {
    const team = ["move-load-van", "move-walkthrough", "move-first-night", "move-open-first"].map((id) => pack.quests.find((q) => q.id === id)!);
    for (const quest of team) {
      expect(quest.type).toBe("collaborate");
      expect(quest.assignee.sort()).toEqual(["dad", "six", "twelve"]);
    }
  });

  it("gives each hero their own quests for their own stuff, and only their band's", () => {
    const dresserKid = pack.quests.filter((q) => q.id.startsWith("move-dresser-kid"));
    expect(dresserKid.map((q) => q.assignee)).toEqual([["twelve"]]);
    expect(dresserKid[0].type).toBe("individual");
    expect(pack.quests.find((q) => q.id === "move-toy-triage-six")!.assignee).toEqual(["six"]);
    expect(pack.quests.find((q) => q.id === "move-supplies")!.assignee).toEqual(["dad"]);
  });

  it("keeps a few daily essentials, small", () => {
    const dailies = pack.quests.filter((q) => q.basicSchedule === "daily");
    expect(dailies.map((q) => q.id).sort()).toEqual(["move-daily-dishes", "move-daily-teeth", "move-daily-tidy"]);
    for (const quest of dailies) expect(quest.showDailyUntilComplete).toBe(true);
  });

  it("has a summary and a quest list a Game Master can read", () => {
    expect(movingPackSummary(pack)).toMatch(/^Added \d+ quests and \d+ beasts for 3 heroes\. First up: Stock Up on Boxes and Tape\./);
    const list = movingPackList(pack);
    expect(list).toContain("## 1 Declutter and Donate");
    expect(list).toContain("Load the Van");
  });
});

describe("rooms are parameters", () => {
  const ids = (pack: ReturnType<typeof buildMovingPack>) => pack.quests.map((quest) => quest.id);

  it("gives only the rooms the family ticks their quests", () => {
    const without = ids(buildMovingPack(answers({ rooms: { kitchen: 1, bedroom: 1 } })));
    expect(without).not.toContain("move-garage");
    expect(without).not.toContain("move-storage");
    expect(without).not.toContain("move-bathrooms");
    expect(without).toContain("move-dishes");

    const withGarage = ids(buildMovingPack(answers({ rooms: { kitchen: 1, bedroom: 1, garage: 1, office: 1, pets: 1 } })));
    expect(withGarage).toEqual(expect.arrayContaining(["move-garage", "move-garage-gear", "move-office", "move-pets", "move-daily-feed-pets"]));
  });

  it("makes no bedroom quests without a bedroom, and no kitchen quests without a kitchen", () => {
    const none = ids(buildMovingPack(answers({ rooms: {} })));
    expect(none.some((id) => id.startsWith("move-dresser-kid"))).toBe(false);
    expect(none.some((id) => id.startsWith("move-beds-"))).toBe(false);
    expect(none).not.toContain("move-dishes");
    expect(none).toContain("move-supplies");
    expect(none).toContain("move-load-van");
  });

  it("makes the bed and bathroom jobs longer for each extra room", () => {
    const find = (pack: ReturnType<typeof buildMovingPack>, id: string) => pack.quests.find((q) => q.id === id)!.estimatedMinutes;
    const one = buildMovingPack(answers({ rooms: { bedroom: 1, bathroom: 1, guest: 1 } }));
    const three = buildMovingPack(answers({ rooms: { bedroom: 3, bathroom: 3, guest: 3 } }));
    expect(find(three, "move-beds-apart")).toBeGreaterThan(find(one, "move-beds-apart") as number);
    expect(find(three, "move-bathrooms")).toBeGreaterThan(find(one, "move-bathrooms") as number);
    expect(find(three, "move-guest-room")).toBeGreaterThan(find(one, "move-guest-room") as number);
  });

  it("leaves out a band with no heroes and a hero who is sitting out", () => {
    const noLittle = buildMovingPack(answers({ heroes: [PARENT, TWELVE] }));
    expect(noLittle.quests.some((q) => q.assignee.includes("six"))).toBe(false);
    expect(noLittle.quests.find((q) => q.id === "move-load-van")!.assignee.sort()).toEqual(["dad", "twelve"]);

    const sittingOut = buildMovingPack(answers({ heroes: [PARENT, TWELVE, { ...SIX, band: "out" }] }));
    expect(sittingOut.heroCount).toBe(2);
    expect(sittingOut.quests.some((q) => q.assignee.includes("six"))).toBe(false);

    expect(buildMovingPack(answers({ heroes: [] })).quests).toHaveLength(0);
  });

  it("splits a band's own-stuff quests by hero and shares the rest as a team", () => {
    const pack = buildMovingPack(answers({ heroes: [PARENT, { id: "mom", name: "Mom", band: "grownup" }, TWELVE, SIX] }));
    expect(pack.quests.filter((q) => q.id.startsWith("move-closet-grownup")).map((q) => q.assignee)).toEqual([["dad"], ["mom"]]);
    const kitchen = pack.quests.find((q) => q.id === "move-dishes")!;
    expect(kitchen.type).toBe("collaborate");
    expect(kitchen.assignee.sort()).toEqual(["dad", "mom"]);
  });
});

describe("due dates count back from the move date", () => {
  const pack = buildMovingPack(answers());
  const row = (id: string) => pack.rows.find((r) => r.questId === id)!;
  const startOf = (id: string) => dateKey(new Date(pack.quests.find((q) => q.id === id)!.startsOn));

  it("dates each quest from the move day", () => {
    expect(row("move-supplies").dueOn).toBe("2026-11-01");
    expect(row("move-garage").dueOn).toBe("2026-11-10");
    expect(row("move-pantry-fridge").dueOn).toBe("2026-11-19");
    expect(row("move-load-van").dueOn).toBe("2026-11-20");
    expect(row("move-deep-clean").dueOn).toBe("2026-11-21");
    expect(row("move-kitchen-cupboards").dueOn).toBe("2026-11-23");
  });

  it("opens each quest when its phase starts, so the board fills in order", () => {
    expect(startOf("move-supplies")).toBe("2026-10-30");
    expect(startOf("move-garage")).toBe("2026-11-04");
    expect(startOf("move-pantry-fridge")).toBe("2026-11-16");
    expect(startOf("move-load-van")).toBe("2026-11-20");
    expect(startOf("move-daily-teeth")).toBe("2026-10-30");
    expect(dateKey(new Date(pack.quests.find((q) => q.id === "move-daily-teeth")!.endsOn))).toBe("2026-11-27");
  });

  it("packs the kitchen after the quiet rooms and unpacks the beds before the kitchen cupboards", () => {
    expect(row("move-garage").dueOffset).toBeLessThan(row("move-dresser-kid-twelve").dueOffset);
    expect(row("move-dresser-kid-twelve").dueOffset).toBeLessThan(row("move-dishes").dueOffset);
    expect(row("move-beds-together").dueOffset).toBeLessThan(row("move-kitchen-cupboards").dueOffset);
    expect(row("move-kitchen-cupboards").dueOffset).toBeLessThan(row("move-living-unpack").dueOffset);
  });

  it("squeezes the early phases, in order, when the move is near", () => {
    const near = buildMovingPack(answers({ moveDate: "2026-10-08", today: "2026-10-01" }));
    const dueOf = (id: string) => near.rows.find((r) => r.questId === id)!.dueOn;
    expect(near.daysToMove).toBe(7);
    expect(dueOf("move-supplies") <= dueOf("move-garage")).toBe(true);
    expect(dueOf("move-garage") <= dueOf("move-dresser-kid-twelve")).toBe(true);
    expect(dueOf("move-dresser-kid-twelve") <= dueOf("move-dishes")).toBe(true);
    expect(dueOf("move-dishes") < "2026-10-08").toBe(true);
    expect(dueOf("move-deep-clean")).toBe("2026-10-09");
    expect(near.quests.every((q) => new Date(q.startsOn).getTime() <= new Date(2026, 9, 8).getTime())).toBe(true);
    expect(movingPackSummary(near)).toContain("7 days away");
  });
});

describe("loading the pack", () => {
  it("is the same every time for the same answers", () => {
    const first = buildMovingPack(answers());
    const second = buildMovingPack(answers());
    expect(second).toEqual(first);
    const backup = movingPackBackup(first, new Date("2026-10-01T00:00:00Z"));
    expect(backup).toEqual(movingPackBackup(second, new Date("2026-10-01T00:00:00Z")));
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

  const makeWorld = () => {
    const fakes = {
      __achievementCategories: new FakeStorage({ [familyCategory.id]: familyCategory }),
      __beasts: new FakeStorage({ [familyBeast.id]: familyBeast }),
      __achievements: new FakeStorage({ [familyQuest.id]: familyQuest }),
      __questLog: new FakeStorage({ done: { id: "done" } }),
    };
    const defs: BackupStoreDef[] = Object.entries(fakes).map(([name, fake]) => ({ name, label: name, storage: fake.asStorage() }));
    return { fakes, service: new BackupService(defs, jest.fn(async () => undefined), () => true) };
  };

  it("merges: the family's records stay, the pack's land, and a reload replaces only the pack's own ids", async () => {
    const { fakes, service } = makeWorld();
    const pack = buildMovingPack(answers());
    const file = movingPackBackup(pack);

    await service.restoreBackup(file, { mode: "merge" });
    expect(fakes.__achievements.data.get(familyQuest.id)).toEqual(familyQuest);
    expect(fakes.__beasts.data.get(familyBeast.id)).toEqual(familyBeast);
    expect(fakes.__achievementCategories.data.get(familyCategory.id)).toEqual(familyCategory);
    expect(fakes.__questLog.data.get("done")).toEqual({ id: "done" });
    expect(fakes.__achievements.data.size).toBe(pack.quests.length + 1);
    expect(fakes.__beasts.data.size).toBe(pack.beasts.length + 1);

    // the family edits a pack quest, then loads the same answers again: only that record goes back
    const edited = { ...(fakes.__achievements.data.get("move-supplies") as object), achievementName: "Edited" };
    fakes.__achievements.data.set("move-supplies", edited);
    await service.restoreBackup(movingPackBackup(buildMovingPack(answers())), { mode: "merge" });
    expect((fakes.__achievements.data.get("move-supplies") as { achievementName: string }).achievementName).toBe("Stock Up on Boxes and Tape");
    expect(fakes.__achievements.data.size).toBe(pack.quests.length + 1);
    expect(fakes.__achievements.data.get(familyQuest.id)).toEqual(familyQuest);
  });
});

describe("movingBandFor", () => {
  const today = new Date(2026, 9, 12);
  it("plays an adult as a grown-up, a child of 8 or less as little, an older one as a kid", () => {
    expect(movingBandFor({ isAdult: true, birthday: "2020-01-01" }, today)).toBe("grownup");
    expect(movingBandFor({ isAdult: false, birthday: "2020-10-01" }, today)).toBe("little");
    expect(movingBandFor({ isAdult: false, birthday: "2017-10-13" }, today)).toBe("little");
    expect(movingBandFor({ isAdult: false, birthday: "2017-10-12" }, today)).toBe("kid");
    expect(movingBandFor({ isAdult: false, birthday: "2014-03-01" }, today)).toBe("kid");
    expect(movingBandFor({ isAdult: false }, today)).toBe("kid");
    expect(movingBandFor({ isAdult: "true" }, today)).toBe("kid");
  });

  it("keeps the template table honest: unique slugs", () => {
    expect(new Set(MOVING_TEMPLATES.map((template) => template.slug)).size).toBe(MOVING_TEMPLATES.length);
  });
});

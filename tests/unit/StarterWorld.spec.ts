import {
  STARTER_ABILITIES,
  STARTER_ACCESSORIES,
  STARTER_BEASTS,
  STARTER_CATEGORIES,
  STARTER_QUESTS,
  STARTER_WORLD_STORES,
  buildStarterWorld,
  starterShops,
} from "@/lib/services/core/StarterWorld";
import { BACKUP_STORES, BackupService } from "@/lib/services/core/BackupService";
import { getAllShops } from "@/lib/engine/core/shopRegistry";
import { TIMES_OF_DAY, getQuestWindow, questMatchesSegment, questTimesOfDay } from "@/lib/engine/quests/QuestSchedule";

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

const ids = (records: readonly { id?: unknown }[]) => records.map((record) => String(record.id));
const unique = (list: readonly string[]) => new Set(list).size === list.length;

describe("buildStarterWorld", () => {
  const world = buildStarterWorld(new Date("2026-10-10T12:00:00Z"));

  it("is a backup the service accepts, stamped with the build time", () => {
    const parsed = new BackupService().parseBackup(world);
    expect(parsed.exportedAt).toBe("2026-10-10T12:00:00.000Z");
    expect(Object.keys(parsed.stores).sort()).toEqual([...STARTER_WORLD_STORES].sort());
  });

  it("never carries profiles, logs, temples or chat, so a restore leaves the family alone", () => {
    const summary = new BackupService().summarizeBackup(world);
    expect(world.stores.__profiles).toBeUndefined();
    expect(summary.ignored).toEqual([]);
    expect(summary.untouched).toEqual(
      expect.arrayContaining(["Profiles", "Quest log", "Purchase log", "Chat", "Temples", "Temple progress", "Dos and Don'ts"])
    );
  });

  it("names only stores the backup registry knows", () => {
    const known = new Set(BACKUP_STORES.map((store) => store.name));
    for (const name of STARTER_WORLD_STORES) expect(known.has(name)).toBe(true);
  });

  it("keys every record by its id and never repeats one", () => {
    for (const [name, entries] of Object.entries(world.stores)) {
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) expect(entry.key).toBe(String((entry.value as { id: unknown }).id));
      expect(unique(entries.map((entry) => entry.key))).toBe(true);
      expect(name).toMatch(/^__/);
    }
  });
});

describe("the starter content", () => {
  it("gives every quest a real category and beast, as an open bounty with no draft flag", () => {
    const categories = new Set(ids(STARTER_CATEGORIES));
    const beasts = new Set(ids(STARTER_BEASTS));
    for (const quest of STARTER_QUESTS) {
      expect(categories.has(quest.categoryId)).toBe(true);
      if (quest.beastId) expect(beasts.has(quest.beastId)).toBe(true);
      expect(quest.adventureType).toBe(quest.beastId ? "beast" : "simple");
      expect(quest.type).toBe("asNeeded");
      expect(quest.assignee).toEqual([]);
      expect(quest.draft).toBeUndefined();
      expect(quest.xp).toBeGreaterThan(0);
    }
  });

  describe("times of day", () => {
    const monday = new Date("2026-10-05T10:00:00");
    const questById = (id: string) => STARTER_QUESTS.find((quest) => quest.id === id)!;

    it("times the chores by the part of the day they belong to", () => {
      const timed = Object.fromEntries(
        STARTER_QUESTS.filter((quest) => quest.timesOfDay).map((quest) => [quest.id, quest.timesOfDay])
      );
      expect(timed).toEqual({
        "quest-bed": ["morning"],
        "quest-teeth": ["morning", "night"],
        "quest-pet": ["morning", "evening"],
        "quest-crumbs": ["noon"],
        "quest-dishes": ["evening"],
        "quest-homework": ["evening"],
        "quest-trash": ["evening"],
        "quest-reading": ["night"],
      });
    });

    it("leaves the weekly hauls untimed: no key at all, no due time", () => {
      for (const id of ["quest-socks", "quest-dust", "quest-laundry", "quest-weeds"]) {
        expect(Object.prototype.hasOwnProperty.call(questById(id), "timesOfDay")).toBe(false);
        expect(questTimesOfDay(questById(id))).toEqual([]);
      }
      for (const quest of STARTER_QUESTS) expect(quest.dueByTime).toBe("");
    });

    it("gives every time-of-day tab at least one chore, and All the whole board", () => {
      for (const time of TIMES_OF_DAY) {
        expect(STARTER_QUESTS.filter((quest) => questMatchesSegment(quest, time)).length).toBeGreaterThan(0);
      }
      expect(STARTER_QUESTS.filter((quest) => questMatchesSegment(quest, "all"))).toHaveLength(STARTER_QUESTS.length);
    });

    it("lists the tooth brushing under Morn and Night as one quest done twice a day", () => {
      const teeth = questById("quest-teeth");
      expect(questMatchesSegment(teeth, "morning")).toBe(true);
      expect(questMatchesSegment(teeth, "noon")).toBe(false);
      expect(questMatchesSegment(teeth, "night")).toBe(true);
      expect(getQuestWindow(teeth, monday)?.allowance).toBe(2);
      expect(getQuestWindow(questById("quest-pet"), monday)?.allowance).toBe(2);
      expect(getQuestWindow(questById("quest-dishes"), monday)?.allowance).toBe(1);
    });

    it("carries the times into the backup, so a restored world has them", () => {
      const restored = buildStarterWorld().stores.__achievements.find((entry) => entry.key === "quest-teeth");
      expect((restored?.value as { timesOfDay?: string[] }).timesOfDay).toEqual(["morning", "night"]);
    });
  });

  it("gives every beast a checklist, an avatar in the sprite range and battle backgrounds", () => {
    for (const beast of STARTER_BEASTS) {
      expect(beast.checklist.length).toBeGreaterThanOrEqual(3);
      expect(beast.avatar).toBeGreaterThanOrEqual(1);
      expect(beast.avatar).toBeLessThanOrEqual(73);
      expect(beast.bg1).toBeLessThanOrEqual(325);
      expect(beast.bg2).toBeLessThanOrEqual(325);
      expect(beast.element).toBeTruthy();
    }
  });

  it("marks every Power as a preset and keeps their ids distinct", () => {
    expect(STARTER_ABILITIES.length).toBeGreaterThan(10);
    expect(STARTER_ABILITIES.every((ability) => ability.isPreset)).toBe(true);
    expect(unique(ids(STARTER_ABILITIES))).toBe(true);
  });

  it("stocks every registry shop, the Market with the whole reward catalogue and the rest with three each", () => {
    const shops = starterShops();
    const rewards = new Set(ids(STARTER_ACCESSORIES));
    expect(ids(shops).sort()).toEqual(getAllShops().map((shop) => shop.id).sort());
    for (const shop of shops) {
      expect(shop.items.length).toBe(shop.id === "hometown-market" ? rewards.size : 3);
      for (const item of shop.items) expect(rewards.has(item.itemId)).toBe(true);
    }
  });
});

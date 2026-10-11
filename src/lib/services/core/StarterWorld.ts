/**
 * The starter world: a ready-made Compendium a Game Master can load from Settings to try the game
 * (or to test it on a phone) without authoring anything first.
 *
 * It is shaped as a backup file (BackupService) that names only the game-content stores, so restoring
 * it fills the quest categories, bestiary, quests, abilities, accessories and shops and leaves every
 * profile, log, temple and chat exactly as it is. Every quest is an open bounty, so it shows for any
 * hero the family already has.
 */
import { BACKUP_VERSION } from "./BackupService";
import type { BackupEntry, BackupFile } from "./BackupService";
import type { Achievement, AchievementCategoryInterface } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import { ShopItemType } from "@/lib/databases/ShopsDb";
import type { ShopInterface } from "@/lib/databases/ShopsDb";
import type { Ability } from "@/types/abilities";
import { HYBRID_PRESETS, REAL_LIFE_PRESETS, TECH_MAGE_PRESETS, TIME_MAGE_PRESETS } from "@/lib/services/abilities/AbilityPresets";
import { REAL_REWARD_PRESETS, rewardFromPreset } from "@/lib/services/shops/rewardPresets";
import { getAllShops } from "@/lib/engine/core/shopRegistry";

/** The stores the starter world fills; everything else in BACKUP_STORES is left untouched by a restore */
export const STARTER_WORLD_STORES = [
  "__achievementCategories",
  "__beasts",
  "__achievements",
  "__abilities",
  "__accessories",
  "__shops",
] as const;

/** A fixed day in the past, so every repeating quest is already running */
const STARTED_ON = "2026-01-01T00:00:00.000Z";

export const STARTER_CATEGORIES: AchievementCategoryInterface[] = [
  { id: "cat-chamber", name: "The Hero's Chamber" },
  { id: "cat-mess-hall", name: "The Mess Hall" },
  { id: "cat-grounds", name: "The Outer Grounds" },
  { id: "cat-tower", name: "The Scholar's Tower" },
  { id: "cat-upkeep", name: "Hero Upkeep" },
];

/** One beast per household chore, each tied to a region element so random encounters there pick it */
export const STARTER_BEASTS: Beast[] = [
  { id: "beast-socktopus", name: "Socktopus", element: "wind", avatar: 7, bg1: 219, bg2: 218, aspectRatio: 48, checklist: ["Sort the socks", "Match the pairs", "Put them away"] },
  { id: "beast-dish-goblin", name: "Dish Goblin", element: "water", avatar: 12, bg1: 44, bg2: 101, aspectRatio: 48, checklist: ["Scrape the plates", "Load the dishwasher", "Wipe the counters"] },
  { id: "beast-dust-bunny-king", name: "Dust Bunny King", element: "earth", avatar: 23, bg1: 150, bg2: 77, aspectRatio: 48, checklist: ["Dust the shelves", "Vacuum the floor", "Empty the bin"] },
  { id: "beast-laundry-lurker", name: "Laundry Lurker", element: "water", avatar: 31, bg1: 88, bg2: 203, aspectRatio: 48, checklist: ["Sort darks and lights", "Run the wash", "Fold and put away"] },
  { id: "beast-weed-wyrm", name: "Weed Wyrm", element: "earth", avatar: 40, bg1: 12, bg2: 266, aspectRatio: 48, checklist: ["Pull the weeds", "Water the plants", "Sweep the path"] },
  { id: "beast-trash-troll", name: "Trash Troll", element: "shadow", avatar: 48, bg1: 301, bg2: 55, aspectRatio: 48, checklist: ["Gather every bin", "Roll them to the curb", "Bring them back in"] },
  { id: "beast-crumb-gremlin", name: "Crumb Gremlin", element: "fire", avatar: 55, bg1: 170, bg2: 9, aspectRatio: 48, checklist: ["Wipe the table", "Sweep under it", "Push in the chairs"] },
  { id: "beast-homework-hydra", name: "Homework Hydra", element: "light", avatar: 61, bg1: 230, bg2: 140, aspectRatio: 48, checklist: ["Open the planner", "Finish each subject", "Pack the bag for tomorrow"] },
  { id: "beast-bed-basilisk", name: "Bed Basilisk", element: "moon", avatar: 66, bg1: 120, bg2: 288, aspectRatio: 48, checklist: ["Pull the sheets straight", "Fluff the pillows", "Fold the blanket"] },
  { id: "beast-fang-fairy", name: "Fang Fairy", element: "ice", avatar: 70, bg1: 60, bg2: 190, aspectRatio: 48, checklist: ["Brush for two minutes", "Floss", "Rinse"] },
];

interface QuestSeed {
  id: string;
  name: string;
  categoryId: string;
  beastId?: string;
  schedule: "daily" | "weekly";
  difficulty: 1 | 2 | 3;
  requiresApproval?: boolean;
}

/** Rewards grow with difficulty: a daily tidy pays a little, a weekly haul pays a lot */
const REWARDS: Record<QuestSeed["difficulty"], { xp: number; gp: number; ap: number }> = {
  1: { xp: 60, gp: 15, ap: 1 },
  2: { xp: 120, gp: 30, ap: 2 },
  3: { xp: 220, gp: 60, ap: 4 },
};

const QUEST_SEEDS: QuestSeed[] = [
  { id: "quest-socks", name: "Tame the Socktopus", categoryId: "cat-chamber", beastId: "beast-socktopus", schedule: "weekly", difficulty: 2 },
  { id: "quest-bed", name: "Smooth the Bed Basilisk", categoryId: "cat-chamber", beastId: "beast-bed-basilisk", schedule: "daily", difficulty: 1 },
  { id: "quest-dust", name: "Dethrone the Dust Bunny King", categoryId: "cat-chamber", beastId: "beast-dust-bunny-king", schedule: "weekly", difficulty: 3, requiresApproval: true },
  { id: "quest-dishes", name: "Banish the Dish Goblin", categoryId: "cat-mess-hall", beastId: "beast-dish-goblin", schedule: "daily", difficulty: 2 },
  { id: "quest-crumbs", name: "Sweep out the Crumb Gremlin", categoryId: "cat-mess-hall", beastId: "beast-crumb-gremlin", schedule: "daily", difficulty: 1 },
  { id: "quest-laundry", name: "Corner the Laundry Lurker", categoryId: "cat-chamber", beastId: "beast-laundry-lurker", schedule: "weekly", difficulty: 3, requiresApproval: true },
  { id: "quest-weeds", name: "Slay the Weed Wyrm", categoryId: "cat-grounds", beastId: "beast-weed-wyrm", schedule: "weekly", difficulty: 3, requiresApproval: true },
  { id: "quest-trash", name: "Outwit the Trash Troll", categoryId: "cat-grounds", beastId: "beast-trash-troll", schedule: "weekly", difficulty: 2 },
  { id: "quest-homework", name: "Behead the Homework Hydra", categoryId: "cat-tower", beastId: "beast-homework-hydra", schedule: "daily", difficulty: 2 },
  { id: "quest-reading", name: "Study the Ancient Tomes", categoryId: "cat-tower", schedule: "daily", difficulty: 1 },
  { id: "quest-teeth", name: "Fend off the Fang Fairy", categoryId: "cat-upkeep", beastId: "beast-fang-fairy", schedule: "daily", difficulty: 1 },
  { id: "quest-pet", name: "Feed the Loyal Familiar", categoryId: "cat-upkeep", schedule: "daily", difficulty: 1 },
];

const questFromSeed = (seed: QuestSeed): Achievement => ({
  id: seed.id,
  achievementName: seed.name,
  categoryId: seed.categoryId,
  beastId: seed.beastId ?? "",
  subAchievementIds: [],
  requiresApproval: Boolean(seed.requiresApproval),
  bonusAchievement: false,
  // An open bounty: any hero the family already has can claim it, so the world needs no profiles
  type: "asNeeded",
  assignee: [],
  startsOn: STARTED_ON,
  endsOn: "",
  dueByTime: "",
  basicSchedule: seed.schedule,
  scheduleType: "basic",
  showDailyUntilComplete: seed.schedule === "daily",
  customFrequency: 1,
  customPeriodType: "day",
  customPeriodNumber: 1,
  repeatOnDays: [],
  difficulty: seed.difficulty,
  ...REWARDS[seed.difficulty],
  adventureType: seed.beastId ? "beast" : "simple",
});

export const STARTER_QUESTS: Achievement[] = QUEST_SEEDS.map(questFromSeed);

/** Every ready-made Power: the Compendium's presets, as the Game Master would add them one by one */
export const STARTER_ABILITIES: Ability[] = [
  ...REAL_LIFE_PRESETS,
  ...TIME_MAGE_PRESETS,
  ...TECH_MAGE_PRESETS,
  ...HYBRID_PRESETS,
].map((preset) => ({ ...preset, isPreset: true }));

/** Every ready-made real-life reward, stocked in the shops below */
export const STARTER_ACCESSORIES = REAL_REWARD_PRESETS.map(rewardFromPreset);

/**
 * Every shop in the registry, stocked: the hometown Market carries the whole reward catalogue, each
 * regional shop a rotating three, so a hero has a reason to travel.
 */
export const starterShops = (): ShopInterface[] => {
  const rewards = STARTER_ACCESSORIES.map((item) => item.id as string);
  return getAllShops().map((meta, index) => {
    const stock = meta.id === "hometown-market" ? rewards : [0, 1, 2].map((n) => rewards[(index * 3 + n) % rewards.length]);
    return {
      id: meta.id,
      name: meta.name,
      description: meta.description,
      world: meta.world,
      icon: `fad fa-${meta.icon}`,
      clerkName: meta.clerkName,
      items: stock.map((itemId) => ({ itemId, type: ShopItemType.Accessory })),
    };
  });
};

const entries = (records: readonly { id?: unknown }[]): BackupEntry[] =>
  records.map((record) => ({ key: String(record.id), value: record }));

/** The starter world as a backup file BackupService.restoreBackup accepts; profiles are never in it */
export const buildStarterWorld = (now: Date = new Date()): BackupFile => ({
  version: BACKUP_VERSION,
  exportedAt: now.toISOString(),
  stores: {
    __achievementCategories: entries(STARTER_CATEGORIES),
    __beasts: entries(STARTER_BEASTS),
    __achievements: entries(STARTER_QUESTS),
    __abilities: entries(STARTER_ABILITIES),
    __accessories: entries(STARTER_ACCESSORIES),
    __shops: entries(starterShops()),
  },
});

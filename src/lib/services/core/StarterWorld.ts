/**
 * The starter world: a ready-made Compendium a Game Master can load from Settings to try the game
 * (or to test it on a phone) without authoring anything first.
 *
 * It is shaped as a backup file (BackupService) that names only the game-content stores. Load it with
 * restoreBackup(world, { mode: "merge" }): it adds its quest categories, beasts, quests, abilities,
 * accessories, shops and Do This, Not That rules, replaces only records whose id it owns, and keeps every
 * other record the family made. Profiles, logs, temples and chat are not in it at all. Every quest is an open bounty, so it shows
 * for any hero the family already has.
 */
import { BACKUP_VERSION } from "./BackupService";
import type { BackupEntry, BackupFile } from "./BackupService";
import type { Achievement, AchievementCategoryInterface } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import { BEAST_LIBRARY } from "./beastLibrary";
import { CLASSIC_BEASTS } from "./classicBeasts";
import { ShopItemType } from "@/lib/databases/ShopsDb";
import type { ShopInterface } from "@/lib/databases/ShopsDb";
import type { Ability } from "@/types/abilities";
import { HYBRID_PRESETS, REAL_LIFE_PRESETS, TECH_MAGE_PRESETS, TIME_MAGE_PRESETS } from "@/lib/services/abilities/AbilityPresets";
import {
  BASIC_CONSUMABLE_PRESETS,
  REAL_REWARD_PRESETS,
  consumableFromPreset,
  rewardFromPreset,
} from "@/lib/services/shops/rewardPresets";
import { getAllShops } from "@/lib/engine/core/shopRegistry";
import type { DosDont } from "@/lib/databases/DosDontsDb";
import { doDontFromSeed, plainBeast, questFromSeed } from "./packs/packSeeds";
import type { DoDontSeed, QuestSeed } from "./packs/packSeeds";

/** The stores the starter world fills; everything else in BACKUP_STORES is left untouched by a restore */
export const STARTER_WORLD_STORES = [
  "__achievementCategories",
  "__beasts",
  "__achievements",
  "__abilities",
  "__accessories",
  "__shops",
  "__dosDonts",
] as const;

export const STARTER_CATEGORIES: AchievementCategoryInterface[] = [
  { id: "cat-chamber", name: "The Hero's Chamber" },
  { id: "cat-mess-hall", name: "The Mess Hall" },
  { id: "cat-grounds", name: "The Outer Grounds" },
  { id: "cat-tower", name: "The Scholar's Tower" },
  { id: "cat-upkeep", name: "Hero Upkeep" },
  { id: "cat-family", name: "Family & Kin" },
  { id: "cat-health", name: "Vital Health & Habits" },
  { id: "cat-bosses", name: "Legendary Trials & Boss Fights" },
];

/**
 * The whole beast library (tools/art/beast_roster.json): one beast per common chore with its task list, each tied
 * to a region element so random encounters there pick it; then the classic beasts, the family's original monster
 * art with names to be replaced (no element, and kept out of random encounters, so they are only ever chosen).
 * Stored as plain beasts; the library's chore, room and age stay in BEAST_LIBRARY for the Compendium to browse.
 */
export const STARTER_LEGO_BEAST: Beast = {
  id: "beast-lego-monster",
  name: "Lego Monster",
  element: "earth",
  avatar: 294,
  bg1: 183,
  bg2: 217,
  aspectRatio: 48,
  checklist: [
    "Gather the loose Lego bricks from the floor",
    "Sort the bricks into the Lego bins",
    "Check under the bed and rug for stragglers",
    "Snap the bin lids shut",
  ],
};

export const STARTER_BEASTS: Beast[] = [...BEAST_LIBRARY, ...CLASSIC_BEASTS, STARTER_LEGO_BEAST].map(plainBeast);

const QUEST_SEEDS: QuestSeed[] = [
  { id: "quest-socks", name: "Tame the Socktopus", categoryId: "cat-chamber", beastId: "beast-socktopus", schedule: "weekly", difficulty: 2 },
  { id: "quest-bed", name: "Smooth the Bed Basilisk", categoryId: "cat-chamber", beastId: "beast-bed-basilisk", schedule: "daily", difficulty: 1, timesOfDay: ["morning"] },
  { id: "quest-dust", name: "Dethrone the Dust Bunny King", categoryId: "cat-chamber", beastId: "beast-dust-bunny-king", schedule: "weekly", difficulty: 3, requiresApproval: true },
  { id: "quest-dishes", name: "Banish the Dish Goblin", categoryId: "cat-mess-hall", beastId: "beast-dish-goblin", schedule: "daily", difficulty: 2, timesOfDay: ["evening"] },
  { id: "quest-crumbs", name: "Sweep out the Crumb Gremlin", categoryId: "cat-mess-hall", beastId: "beast-crumb-gremlin", schedule: "daily", difficulty: 1, timesOfDay: ["noon"] },
  { id: "quest-laundry", name: "Corner the Laundry Lurker", categoryId: "cat-chamber", beastId: "beast-laundry-lurker", schedule: "weekly", difficulty: 3, requiresApproval: true },
  { id: "quest-weeds", name: "Slay the Weed Wyrm", categoryId: "cat-grounds", beastId: "beast-weed-wyrm", schedule: "weekly", difficulty: 3, requiresApproval: true },
  { id: "quest-trash", name: "Outwit the Trash Troll", categoryId: "cat-grounds", beastId: "beast-trash-troll", schedule: "weekly", difficulty: 2, timesOfDay: ["evening"] },
  { id: "quest-homework", name: "Behead the Homework Hydra", categoryId: "cat-tower", beastId: "beast-homework-hydra", schedule: "daily", difficulty: 2, timesOfDay: ["evening"] },
  { id: "quest-reading", name: "Study the Ancient Tomes", categoryId: "cat-tower", schedule: "daily", difficulty: 1, timesOfDay: ["night"] },
  { id: "quest-teeth", name: "Fend off the Fang Fairy", categoryId: "cat-upkeep", beastId: "beast-fang-fairy", schedule: "daily", difficulty: 1, timesOfDay: ["morning", "night"] },
  { id: "quest-pet", name: "Feed the Loyal Familiar", categoryId: "cat-upkeep", schedule: "daily", difficulty: 1, timesOfDay: ["morning", "evening"] },
  { id: "quest-lego", name: "Dismantle the Lego Monster", categoryId: "cat-chamber", beastId: "beast-lego-monster", schedule: "daily", difficulty: 1, timesOfDay: ["evening"] },
  { id: "quest-hydrate", name: "Chug the Elixir of Life", categoryId: "cat-health", schedule: "daily", difficulty: 1, timesOfDay: ["morning", "noon"] },
  { id: "quest-hair", name: "Tame the Mane", categoryId: "cat-health", beastId: "beast-hairball-harpy", schedule: "daily", difficulty: 1, timesOfDay: ["morning"] },
  { id: "quest-wake", name: "Rouse the Snooze Sloth", categoryId: "cat-health", beastId: "beast-snooze-sloth", schedule: "daily", difficulty: 1, timesOfDay: ["morning"] },
  { id: "quest-sleep", name: "Pacify the Night Owlbear", categoryId: "cat-health", beastId: "beast-night-owlbear", schedule: "daily", difficulty: 1, timesOfDay: ["night"] },
  { id: "quest-outfit", name: "Consult the Pajama Pooka", categoryId: "cat-health", beastId: "beast-pajama-pooka", schedule: "daily", difficulty: 1, timesOfDay: ["evening"] },
  { id: "quest-vitamins", name: "Sniffle Sprite Salve", categoryId: "cat-health", beastId: "beast-sniffle-sprite", schedule: "daily", difficulty: 1, timesOfDay: ["morning"] },
  { id: "quest-hands", name: "Banish the Grubgoblin", categoryId: "cat-health", beastId: "beast-grubgoblin", schedule: "daily", difficulty: 1, timesOfDay: ["noon", "evening"] },
  { id: "quest-table-set", name: "Plate Pixie Parade", categoryId: "cat-mess-hall", beastId: "beast-plate-pixie", schedule: "daily", difficulty: 1, timesOfDay: ["evening"] },
  { id: "quest-table-clear", name: "Bribe the Gravy Ghoul", categoryId: "cat-mess-hall", beastId: "beast-gravy-ghoul", schedule: "daily", difficulty: 1, timesOfDay: ["evening"] },
  { id: "quest-cook", name: "Assist Simmer Salamander", categoryId: "cat-mess-hall", beastId: "beast-simmer-salamander", schedule: "weekly", difficulty: 2 },
  { id: "quest-breakfast", name: "Hangry Hob Feast", categoryId: "cat-mess-hall", beastId: "beast-hangry-hob", schedule: "daily", difficulty: 1, timesOfDay: ["morning"] },
  { id: "quest-lunchbox", name: "Disarm the Lunchbox Lurker", categoryId: "cat-mess-hall", beastId: "beast-lunchbox-lurker", schedule: "daily", difficulty: 1, timesOfDay: ["evening"] },
  { id: "quest-backpack", name: "Pack Backpack Boggart", categoryId: "cat-tower", beastId: "beast-backpack-boggart", schedule: "daily", difficulty: 1, timesOfDay: ["morning"] },
  { id: "quest-fridge", name: "Purge Leftover Lich", categoryId: "cat-mess-hall", beastId: "beast-leftover-lich", schedule: "weekly", difficulty: 3 },
  { id: "quest-mop", name: "Subdue Stickyfoot Slime", categoryId: "cat-chamber", beastId: "beast-stickyfoot-slime", schedule: "weekly", difficulty: 2 },
  { id: "quest-vacuum", name: "Wrangle the Fluffalo", categoryId: "cat-chamber", beastId: "beast-fluffalo", schedule: "weekly", difficulty: 2 },
  { id: "quest-car", name: "Clean Backseat Beastie", categoryId: "cat-grounds", beastId: "beast-backseat-beastie", schedule: "weekly", difficulty: 2 },
  { id: "quest-plants", name: "Quench Droop Dryad", categoryId: "cat-chamber", beastId: "beast-droop-dryad", schedule: "weekly", difficulty: 1 },
  { id: "quest-shoes", name: "Corral Shoe Shrew", categoryId: "cat-chamber", beastId: "beast-shoe-shrew", schedule: "daily", difficulty: 1, timesOfDay: ["evening"] },
  { id: "quest-toys", name: "Pacify Toybox Troll", categoryId: "cat-chamber", beastId: "beast-toybox-troll", schedule: "daily", difficulty: 1, timesOfDay: ["evening"] },
  { id: "quest-poop", name: "Plop Golem Patrol", categoryId: "cat-grounds", beastId: "beast-plop-golem", schedule: "weekly", difficulty: 2 },
  { id: "quest-walk-dog", name: "Zoomie Zephyr Sprint", categoryId: "cat-grounds", beastId: "beast-zoomie-zephyr", schedule: "daily", difficulty: 2, timesOfDay: ["morning"] },
  { id: "quest-screen-rest", name: "Silence Scroll Troll", categoryId: "cat-health", beastId: "beast-scroll-troll", schedule: "daily", difficulty: 1, timesOfDay: ["night"] },
  { id: "quest-family-meeting", name: "Council of Heroes", categoryId: "cat-family", schedule: "weekly", difficulty: 3 },
  { id: "quest-family-dinner", name: "Gather at the High Table", categoryId: "cat-family", schedule: "daily", difficulty: 1, timesOfDay: ["evening"] },
  { id: "quest-family-game", name: "Tavern Game Night", categoryId: "cat-family", schedule: "weekly", difficulty: 2 },
  { id: "quest-family-hike", name: "Expedition into the Wilds", categoryId: "cat-family", schedule: "weekly", difficulty: 3 },
  { id: "quest-sibling-care", name: "Kindred Bond", categoryId: "cat-family", schedule: "weekly", difficulty: 2 },
  { id: "quest-car-dj", name: "Bard of the Chariot", categoryId: "cat-family", schedule: "weekly", difficulty: 1 },
  { id: "quest-dad-hug", name: "Citadel Comfort", categoryId: "cat-family", schedule: "daily", difficulty: 1, timesOfDay: ["morning"] },
  { id: "quest-boss-chess", name: "Grandmaster's Gambit", categoryId: "cat-bosses", schedule: "weekly", difficulty: 3, requiresApproval: true },
  { id: "quest-boss-smash", name: "Colosseum Clash", categoryId: "cat-bosses", schedule: "weekly", difficulty: 3, requiresApproval: true },
  { id: "quest-boss-tcg", name: "Card Master's Duel", categoryId: "cat-bosses", schedule: "weekly", difficulty: 3, requiresApproval: true },
  { id: "quest-chrono-trigger", name: "Chrono Crusade", categoryId: "cat-bosses", schedule: "weekly", difficulty: 3, requiresApproval: true },
  { id: "quest-earthbound", name: "Cosmic Destiny", categoryId: "cat-bosses", schedule: "weekly", difficulty: 3, requiresApproval: true },
  { id: "quest-ffvii", name: "Meteor Strike", categoryId: "cat-bosses", schedule: "weekly", difficulty: 3, requiresApproval: true },
  { id: "quest-zelda-oot", name: "Hero of Time", categoryId: "cat-bosses", schedule: "weekly", difficulty: 3, requiresApproval: true },
];

export const STARTER_QUESTS: Achievement[] = QUEST_SEEDS.map(questFromSeed);

/** Every ready-made Power: the Compendium's presets, as the Game Master would add them one by one */
export const STARTER_ABILITIES: Ability[] = [
  ...REAL_LIFE_PRESETS,
  ...TIME_MAGE_PRESETS,
  ...TECH_MAGE_PRESETS,
  ...HYBRID_PRESETS,
].map((preset) => ({ ...preset, isPreset: true }));

const DO_DONT_SEEDS: DoDontSeed[] = [
  { id: "do-kind-words", type: "do", whatFor: "Using kind words with a sibling", difficulty: 1 },
  { id: "do-help-unasked", type: "do", whatFor: "Helping out without being asked", difficulty: 2 },
  { id: "do-first-ask", type: "do", whatFor: "Listening the first time you're asked", difficulty: 1 },
  { id: "do-share", type: "do", whatFor: "Sharing toys or games without a fight", difficulty: 2 },
  { id: "do-truth", type: "do", whatFor: "Telling the truth, even when it's hard", difficulty: 3 },
  { id: "do-thank-you", type: "do", whatFor: "Saying please and thank you", difficulty: 1 },
  { id: "do-apologize", type: "do", whatFor: "Saying sorry and making it right", difficulty: 2 },
  { id: "dont-hit", type: "dont", whatFor: "Hitting, kicking or pushing", difficulty: 5 },
  { id: "dont-backtalk", type: "dont", whatFor: "Talking back or name-calling", difficulty: 2 },
  { id: "dont-whine", type: "dont", whatFor: "Whining after the answer is no", difficulty: 1 },
  { id: "dont-lie", type: "dont", whatFor: "Lying or hiding what happened", difficulty: 3 },
  { id: "dont-screens", type: "dont", whatFor: "Sneaking screen time", difficulty: 3 },
  { id: "dont-mess", type: "dont", whatFor: "Leaving a mess for someone else", difficulty: 1 },
  { id: "dont-tantrum", type: "dont", whatFor: "Throwing a tantrum", difficulty: 2 },
];

/** A starter set of house rules for the Do This, Not That board: everyday good deeds and the slips that cost gold */
export const STARTER_DOS_DONTS: DosDont[] = DO_DONT_SEEDS.map(doDontFromSeed);

/** Ready-made consumables (in-game items) and real-life rewards, stocked in the shops below */
export const STARTER_CONSUMABLES = BASIC_CONSUMABLE_PRESETS.map(consumableFromPreset);
export const STARTER_REAL_REWARDS = REAL_REWARD_PRESETS.map(rewardFromPreset);
export const STARTER_ACCESSORIES = [...STARTER_CONSUMABLES, ...STARTER_REAL_REWARDS];

/**
 * Every shop in the registry, stocked:
 * - Hometown Market carries all basic consumables and real-life rewards.
 * - Regional shops carry core consumables (Health Potion, Mana Potion) plus rotating rewards.
 */
export const starterShops = (): ShopInterface[] => {
  const consumableIds = STARTER_CONSUMABLES.map((item) => item.id as string);
  const realRewardIds = STARTER_REAL_REWARDS.map((item) => item.id as string);
  const allIds = STARTER_ACCESSORIES.map((item) => item.id as string);

  return getAllShops().map((meta, index) => {
    let stockIds: string[];
    if (meta.id === "hometown-market") {
      stockIds = allIds;
    } else {
      const baseConsumables = [consumableIds[0], consumableIds[1]];
      const rotatingRewards = [0, 1, 2].map((n) => realRewardIds[(index * 3 + n) % realRewardIds.length]);
      stockIds = [...baseConsumables, ...rotatingRewards];
    }
    return {
      id: meta.id,
      name: meta.name,
      description: meta.description,
      world: meta.world,
      icon: `fad fa-${meta.icon}`,
      clerkName: meta.clerkName,
      items: stockIds.map((itemId) => ({ itemId, type: ShopItemType.Accessory })),
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
    __dosDonts: entries(STARTER_DOS_DONTS),
  },
});

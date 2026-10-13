/**
 * Items outside a temple or a fight: the Lantern's list of overdue quests, the no-encounters check the battle guard
 * reads, and the locks (which items a hero may equip and how a locked one is earned).
 *
 * Rule zero of docs/Items-And-Classes-Contract.md: no item completes a chore. Items no longer bend the quest board
 * at all (docs/superpowers/specs/2026-10-13-equipment-rules-design.md, 1): the real-life bends are Powers now
 * (services/abilities/PowerBoardEffects.ts). Tapping a tool in the portal shows its card; only the Lantern still
 * reads the board, free, and it never writes.
 */
import { ITEM_METADATA } from "@/lib/engine/core/items/itemRegistry";
import { ITEM_RULES } from "@/lib/services/items/ItemRules";
import { getQuestEngine, type QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import type { HeroQuestEffects } from "@/lib/engine/quests/QuestSchedule";
import { useUserStore } from "@/lib/store/stores/user";

/** What the Lantern found: a line and a sound for the screen, and the quests it lit up. */
export interface LanternOutcome {
  ok: true;
  line: string;
  /** A play$fx key */
  sound: string;
  quests: QuestBoardItem[];
}

/** The tools the Game Master can unlock for a hero from the Compendium: every item with a rule, but the ones a hero always has. */
export const unlockableItemNames = (): string[] =>
  Object.keys(ITEM_RULES).filter((itemName) => !ALWAYS_UNLOCKED.includes(itemName));

/** True while a no-encounters stamp (Quiet Day, or an old X's Invisibility) keeps the random encounters away. */
export const hasNoEncounters = (user: { questEffects?: HeroQuestEffects } | null | undefined, now: Date): boolean => {
  const until = user?.questEffects?.noEncountersUntil;
  const stamp = until ? new Date(until).getTime() : NaN;
  return Number.isFinite(stamp) && stamp > now.getTime();
};

const plainEffects = (user: { questEffects?: HeroQuestEffects } | undefined): HeroQuestEffects =>
  JSON.parse(JSON.stringify(user?.questEffects ?? {}));

/**
 * The Lantern on the board: every overdue quest on the hero's board, read with the hero's own effects (so a quest
 * given extra time is not lit). Free, and it writes nothing.
 */
export const lanternOverdue = async (userId: string, now: Date = new Date()): Promise<LanternOutcome> => {
  const effects = plainEffects(useUserStore().getUserById(userId));
  const board = await getQuestEngine().getQuestBoardForUser(userId, now, undefined, effects);
  const lit = board.filter((entry) => entry.overdue);
  const names = lit.map((entry) => entry.quest.achievementName || "a quest");
  return {
    ok: true,
    line: lit.length ? `${lit.length} overdue: ${names.join(", ")}` : "The lantern finds nothing overdue. Well done.",
    sound: "useItem",
    quests: lit,
  };
};

// --- locks -----------------------------------------------------------------------------------------

/** The hero always has these: the pages, the potions, the little light and the Bombs (they still need Bombs in the pack). */
export const ALWAYS_UNLOCKED = ["My Quests", "Book Of Spells", "Goods", "Wallet", "Portal Home", "Bottles", "Lantern", "Bombs"];

/**
 * Which freed Pegasus (index into stats.pegasi, the order of XpWorldMapModal) gifts an item: Ventus the Gale's
 * Wind, Ignis Thor's Hammer, Sol the Sol's Flare, Aura the Pegasus Boots, Umbra Chronos' Clock. The Wind Whistle
 * is not here: it unlocks only from the Wind Temple's chest (CHEST_ALIASES), so freeing a Pegasus, Ventus
 * included, never hands it over.
 */
const PEGASUS_INDEX: Record<string, number> = {
  "Gale's Wind": 0,
  "Thor's Hammer": 1,
  "Sol's Flare": 2,
  "Pegasus Boots": 3,
  "Chronos' Clock": 8,
};

/** Temple chest items (templeRegistry) that are a board item by another name. */
const CHEST_ALIASES: Record<string, string> = {
  "Pegasus Whistle": "Wind Whistle",
  "Frost Wand": "Ice Wand",
  "Lightning Rod": "Tesla's Bolt",
  "Gaia's Hammer": "Gaia's Quake",
  "Lunar Pendant": "Night's Light",
  "Trident of Tides": "Hook Shot",
  "Flame Shield": "Fire Wand",
  "Dawnbreaker Bow": "Silver Arrow",
  "Void Dagger": "X's Invisibility",
};

/** Which temple's chest holds each board item, for the unlock hint. */
const CHEST_TEMPLE: Record<string, string> = {
  "Wind Whistle": "Wind Temple",
  "Ice Wand": "Ice Temple",
  "Tesla's Bolt": "Storm Temple",
  "Gaia's Quake": "Earth Temple",
  "Night's Light": "Moon Temple",
  "Hook Shot": "Water Temple",
  "Fire Wand": "Fire Temple",
  "Silver Arrow": "Light Temple",
  "X's Invisibility": "Shadow Temple",
};

/** The names a chest item unlocks on the hero: itself, and the board item it stands for. */
export const unlocksFromChest = (chestItem: string): string[] => {
  const alias = CHEST_ALIASES[chestItem];
  return alias ? [chestItem, alias] : [chestItem];
};

/**
 * Whether the hero may equip the item. A profile without an `unlockedItems` list predates the locks and
 * keeps everything (the owner's profiles must not lose their items); a new profile starts with an empty list.
 */
export const isItemUnlocked = (
  user: { unlockedItems?: string[]; stats?: { pegasi?: boolean[] } } | null | undefined,
  itemName: string
): boolean => {
  if (ALWAYS_UNLOCKED.includes(itemName)) return true;
  if (!Array.isArray(user?.unlockedItems)) return true;
  if (user.unlockedItems.includes(itemName)) return true;
  const pegasus = PEGASUS_INDEX[itemName];
  return pegasus !== undefined && Boolean(user.stats?.pegasi?.[pegasus]);
};

const PEGASUS_NAMES = ["Ventus", "Ignis", "Sol", "Aura", "Terra", "Glacie", "Aqua", "Venenum", "Umbra"];

/** How the hero earns a locked item: a freed Pegasus's gift first, else the item registry's unlock event when it knows the item. */
export const unlockHintOf = (itemName: string): string => {
  const gift = PEGASUS_INDEX[itemName];
  if (gift !== undefined) return `Locked: free ${PEGASUS_NAMES[gift]} the Pegasus to earn ${itemName}.`;
  const meta = Object.values(ITEM_METADATA).find((entry) => entry.name === itemName);
  const event = meta?.unlockEvent ?? "";
  // The registry names a Pegasus for an item that has none here (the Wind Whistle has a chest of its own)
  const isEarnedFromPegasus = event.startsWith("pegasus:") && !CHEST_TEMPLE[itemName];
  if (isEarnedFromPegasus) return `Locked: free ${event.slice("pegasus:".length)} the Pegasus to earn ${itemName}.`;
  if (event === "purchase") return `Locked: ${itemName} is for sale in a shop.`;
  const isEarnedFromChest = event.startsWith("dungeon:") || Boolean(CHEST_TEMPLE[itemName]);
  if (isEarnedFromChest) {
    const where = CHEST_TEMPLE[itemName] ? `the ${CHEST_TEMPLE[itemName]}` : "a temple";
    return `Locked: ${itemName} waits in a chest in ${where}.`;
  }
  return `Locked: ${itemName} is found in a temple chest or a shop.`;
};

/**
 * Item effects on the quest board: what tapping an equipped item does outside a temple or a fight.
 *
 * Rule zero of docs/Items-And-Classes-Contract.md: no item completes a chore. Everything here changes time,
 * order or the hero's own body; the chore is still done in the real world and approved by the Game Master.
 * The Game Master's quests are never written: each effect lands on the hero's profile as `questEffects`
 * (see HeroQuestEffects in QuestSchedule.ts), which the board reads back.
 *
 * Like ItemUse.useItem this is pure apart from the user store and the quest engine, and answers with a line
 * and a sound for the screen to show.
 */
import { addHours, endOfDay, format } from "date-fns";
import type { EquipmentItem } from "@/app/Console/MyPortal/UserHud/components/equipment/EquipmentItems";
import { ITEM_METADATA } from "@/lib/engine/core/items/itemRegistry";
import { getQuestEngine, type QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { dayKeyOf, effectiveDeadline, type HeroQuestEffects } from "@/lib/engine/quests/QuestSchedule";
import { useUserStore } from "@/lib/store/stores/user";
import { bedtimeNightOf, loadFamilySettings } from "@/lib/services/family/familySettings";
import { notify } from "@/lib/services/notifications/notify";

export type BoardEffectKind = "pick-quest" | "instant" | "soon" | "none";

export interface BoardEffect {
  kind: BoardEffectKind;
  /** MP the use costs */
  cost: number;
  /** Recharge after a use; 0 when the item can be used again at once */
  cooldownMs: number;
  /** One line of what it does on the board */
  describe: string;
  /** pick-quest only: which quests the picker lists */
  picks?: "open" | "future";
}

export interface BoardEffectContext {
  userId: string;
  /** The quest picked for a pick-quest item */
  questId?: string;
  now?: Date;
}

export interface BoardOutcome {
  ok: boolean;
  line: string;
  /** A play$fx key */
  sound: string;
  /** Lantern: the quests it lit up */
  quests?: QuestBoardItem[];
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Chronos' Clock holds the clocks this long, and cannot be stacked within that time. */
export const CHRONOS_PAUSE_MS = HOUR;
/** X's Invisibility keeps the beasts away this long. */
export const INVISIBILITY_MS = DAY;
/** The Ice Wand pushes a deadline back this far. */
export const ICE_WAND_MS = DAY;

const NONE: BoardEffect = { kind: "none", cost: 0, cooldownMs: 0, describe: "Use it in a temple or a fight." };

const EFFECTS: Record<string, BoardEffect> = {
  "Ice Wand": { kind: "pick-quest", picks: "open", cost: 50, cooldownMs: 0, describe: "Extends one quest's deadline by 24 hours." },
  "Silver Arrow": { kind: "pick-quest", picks: "open", cost: 25, cooldownMs: 0, describe: "Snoozes one quest to tomorrow." },
  "Hook Shot": { kind: "pick-quest", picks: "future", cost: 15, cooldownMs: 0, describe: "Pulls one future quest into today." },
  "Chronos' Clock": { kind: "instant", cost: 100, cooldownMs: CHRONOS_PAUSE_MS, describe: "Pauses every deadline for 1 hour." },
  Lantern: { kind: "instant", cost: 5, cooldownMs: 0, describe: "Lists every overdue or forgotten quest." },
  "X's Invisibility": { kind: "instant", cost: 300, cooldownMs: 2 * DAY, describe: "No random encounters for 24 hours." },
  // Needs the Game Master's quest model (child quests, notes, family settings, an order field): not yet on the board
  Bombs: { kind: "soon", cost: 40, cooldownMs: 0, describe: "Splits one quest into three smaller ones." },
  "Thor's Hammer": { kind: "soon", cost: 60, cooldownMs: 0, describe: "Marks one quest half done for the Game Master." },
  "Tesla's Bolt": { kind: "instant", cost: 100, cooldownMs: 2 * HOUR, describe: "Channels lightning energy for instant focus." },
  "Gaia's Quake": { kind: "soon", cost: 100, cooldownMs: DAY, describe: "Shuffles the order of today's quests." },
  "Night's Light": { kind: "instant", cost: 100, cooldownMs: 3 * DAY, describe: "Removes bedtime restrictions for one night." },
  "Gale's Wind": { kind: "instant", cost: 300, cooldownMs: 7 * DAY, describe: "Blows away chore pressure for 24 hours." },
};

/** Items with a board effect the Game Master can unlock for a hero from the Compendium. */
export const unlockableItemNames = (): string[] =>
  Object.keys(EFFECTS).filter((itemName) => !ALWAYS_UNLOCKED.includes(itemName));

/** What the item does on the quest board. Navigation items, Bottles and battle-only items do nothing here. */
export const boardEffectOf = (itemName: string | undefined): BoardEffect => EFFECTS[itemName ?? ""] ?? NONE;

/** "42 min left", "3 h left", "2 d left": how long until an item is ready again. */
export const cooldownLabel = (ms: number): string => {
  if (ms >= DAY) return `${Math.ceil(ms / DAY)} d left`;
  if (ms >= HOUR) return `${Math.ceil(ms / HOUR)} h left`;
  return `${Math.max(1, Math.ceil(ms / MINUTE))} min left`;
};

/** Milliseconds until the hero's item is ready again; 0 when it is. */
export const cooldownLeft = (user: { itemCooldowns?: Record<string, string> } | undefined, itemName: string, now: Date): number => {
  const readyAt = user?.itemCooldowns?.[itemName];
  const ready = readyAt ? new Date(readyAt).getTime() : NaN;
  return Number.isFinite(ready) ? Math.max(0, ready - now.getTime()) : 0;
};

/** True while X's Invisibility keeps the random encounters away. */
export const hasNoEncounters = (user: { questEffects?: HeroQuestEffects } | null | undefined, now: Date): boolean => {
  const until = user?.questEffects?.noEncountersUntil;
  const stamp = until ? new Date(until).getTime() : NaN;
  return Number.isFinite(stamp) && stamp > now.getTime();
};

const plainEffects = (user: { questEffects?: HeroQuestEffects } | undefined): HeroQuestEffects =>
  JSON.parse(JSON.stringify(user?.questEffects ?? {}));

const whenLabel = (date: Date, now: Date): string =>
  dayKeyOf(date) === dayKeyOf(now) ? format(date, "h:mma") : format(date, "EEE h:mma");

const refuse = (line: string): BoardOutcome => ({ ok: false, line, sound: "no" });

/**
 * Use the item on the board. Checks the recharge and the MP first and changes nothing when either refuses;
 * otherwise it writes the effect to the hero, charges the MP and starts the recharge.
 */
export const applyBoardEffect = async (
  item: Pick<EquipmentItem, "name"> & Partial<EquipmentItem>,
  ctx: BoardEffectContext
): Promise<BoardOutcome> => {
  const name = item.name;
  const effect = boardEffectOf(name);
  const now = ctx.now ?? new Date();
  const store = useUserStore();
  const user = store.getUserById(ctx.userId);
  if (!user) return refuse("Nobody is holding that.");

  if (effect.kind === "none") return refuse(`${name}: use it in a temple or a fight.`);
  if (effect.kind === "soon") return refuse(`${name}: coming soon to the quest board.`);

  const left = cooldownLeft(user, name, now);
  if (left > 0) return refuse(`Recharging: ${cooldownLabel(left)}`);
  const mp = Number(user.stats?.mp?.now ?? 0);
  if (mp < effect.cost) return refuse(`Not enough MP (${effect.cost} needed)`);

  const effects = plainEffects(user);
  let outcome: BoardOutcome;

  if (effect.kind === "pick-quest") {
    if (!ctx.questId) return refuse("Pick a quest first.");
    const board = await getQuestEngine().getQuestBoardForUser(ctx.userId, now, undefined, effects);
    const target = board.find((entry) => String(entry.quest.id) === String(ctx.questId));
    if (!target) return refuse("That quest is not on your board.");
    const title = target.quest.achievementName || "the quest";
    const questId = String(target.quest.id);

    switch (name) {
      case "Ice Wand": {
        if (target.status !== "open") return refuse(`${title} is not open today.`);
        const base = effectiveDeadline(target.quest, effects, now) ?? endOfDay(now);
        const until = addHours(base, ICE_WAND_MS / HOUR);
        effects.extendedUntil = { ...(effects.extendedUntil ?? {}), [questId]: until.toISOString() };
        outcome = { ok: true, line: `${title}: now due ${whenLabel(until, now)}.`, sound: "useMP" };
        break;
      }
      case "Silver Arrow": {
        if (target.status !== "open") return refuse(`${title} is not open today.`);
        effects.snoozedOn = { ...(effects.snoozedOn ?? {}), [questId]: dayKeyOf(now) };
        outcome = { ok: true, line: `${title}: snoozed to tomorrow.`, sound: "useMP" };
        break;
      }
      default: {
        // Hook Shot
        if (target.status !== "notDue") return refuse(`${title} is already on today's board.`);
        effects.pulledInOn = { ...(effects.pulledInOn ?? {}), [questId]: dayKeyOf(now) };
        outcome = { ok: true, line: `${title}: pulled into today.`, sound: "useMP" };
      }
    }
  } else if (name === "Tesla's Bolt") {
    if (!(await loadFamilySettings()).trustedHour) return refuse("The Game Master has not allowed a trusted hour.");
    effects.trustedUntil = new Date(now.getTime() + HOUR).toISOString();
    outcome = { ok: true, line: "Tesla's Bolt channels lightning! For 1 hour your claims need no approval.", sound: "useMP" };
  } else if (name === "Night's Light") {
    const family = await loadFamilySettings();
    if (!family.bedtime.enabled) return refuse("No bedtime is set.");
    effects.bedtimeLiftedOn = bedtimeNightOf(family, now);
    outcome = { ok: true, line: "Night's Light shines! Bedtime restrictions removed for tonight.", sound: "useMP" };
  } else if (name === "Gale's Wind") {
    effects.dayOffUntil = new Date(now.getTime() + DAY).toISOString();
    if ((await loadFamilySettings()).dayOffBroadcast) {
      const heroName = user.name?.nick || user.name?.first || "A hero";
      Object.values(store.users)
        .filter((profile: any) => profile?.isAdult === true)
        .forEach((gm: any) =>
          notify({
            heroId: String(gm.id),
            kind: "system",
            title: "A day off",
            body: `${heroName} called Gale's Wind: no chores until ${whenLabel(new Date(now.getTime() + DAY), now)}.`,
          })
        );
    }
    outcome = { ok: true, line: "Gale's Wind blows across the land! Chores swept clear for 24 hours.", sound: "useMP" };
  } else if (name === "Chronos' Clock") {
    const until = new Date(now.getTime() + CHRONOS_PAUSE_MS);
    effects.pause = { from: now.toISOString(), until: until.toISOString() };
    outcome = { ok: true, line: `Time stands still until ${format(until, "h:mma")}.`, sound: "useMP" };
  } else if (name === "X's Invisibility") {
    const until = new Date(now.getTime() + INVISIBILITY_MS);
    effects.noEncountersUntil = until.toISOString();
    outcome = { ok: true, line: `Unseen by beasts until ${whenLabel(until, now)}.`, sound: "useMP" };
  } else {
    // Lantern
    const board = await getQuestEngine().getQuestBoardForUser(ctx.userId, now, undefined, effects);
    const lit = board.filter((entry) => entry.overdue);
    const names = lit.map((entry) => entry.quest.achievementName || "a quest");
    outcome = {
      ok: true,
      line: lit.length
        ? `${lit.length} overdue: ${names.join(", ")}`
        : "The lantern finds nothing overdue. Well done.",
      sound: "useItem",
      quests: lit,
    };
  }

  store.setQuestEffects(ctx.userId, effects);
  if (effect.cost > 0) store.updateUserMP({ userId: ctx.userId, amount: -effect.cost });
  if (effect.cooldownMs > 0) store.setItemCooldown(ctx.userId, name, new Date(now.getTime() + effect.cooldownMs).toISOString());
  return outcome;
};

// --- locks -----------------------------------------------------------------------------------------

/** The hero always has these: the pages, the potions and the little light. */
export const ALWAYS_UNLOCKED = ["My Quests", "Book Of Spells", "Goods", "Wallet", "Portal Home", "Bottles", "Lantern"];

/** Which freed Pegasus (index into stats.pegasi, the order of XpWorldMapModal) unlocks a Pegasus item. */
const PEGASUS_INDEX: Record<string, number> = { "Wind Whistle": 0, "Pegasus Boots": 3 };

/** Temple chest items (templeRegistry) that are a board item by another name. */
const CHEST_ALIASES: Record<string, string> = {
  "Pegasus Whistle": "Wind Whistle",
  "Frost Wand": "Ice Wand",
  "Lightning Rod": "Tesla's Bolt",
  "Gaia's Hammer": "Gaia's Quake",
  "Lunar Pendant": "Night's Light",
};

/** Which temple's chest holds each board item, for the unlock hint. */
const CHEST_TEMPLE: Record<string, string> = {
  "Wind Whistle": "Wind Temple",
  "Ice Wand": "Ice Temple",
  "Tesla's Bolt": "Storm Temple",
  "Gaia's Quake": "Earth Temple",
  "Night's Light": "Moon Temple",
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

/** How the hero earns a locked item, from the item registry's unlock event when it knows the item. */
export const unlockHintOf = (itemName: string): string => {
  const meta = Object.values(ITEM_METADATA).find((entry) => entry.name === itemName);
  const event = meta?.unlockEvent ?? "";
  if (event.startsWith("pegasus:")) {
    const index = PEGASUS_INDEX[itemName];
    const pegasus = index !== undefined ? PEGASUS_NAMES[index] : event.slice("pegasus:".length);
    return `Locked: free ${pegasus} the Pegasus to earn ${itemName}.`;
  }
  if (event === "purchase") return `Locked: ${itemName} is for sale in a shop.`;
  if (event.startsWith("dungeon:") || CHEST_TEMPLE[itemName]) {
    const where = CHEST_TEMPLE[itemName] ? `the ${CHEST_TEMPLE[itemName]}` : "a temple";
    return `Locked: ${itemName} waits in a chest in ${where}.`;
  }
  return `Locked: ${itemName} is found in a temple chest or a shop.`;
};

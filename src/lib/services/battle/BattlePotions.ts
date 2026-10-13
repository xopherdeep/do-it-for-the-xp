/**
 * Battle potions: the bottles in the hero's pack that a fight can open (Goods > Bottles). A potion heals or restores,
 * is spent from the pack and costs no MP; there is no once-per-fight limit. Drinking one that would do nothing (HP or
 * MP already full) is refused and spends nothing (docs/superpowers/specs/2026-10-12-battle-powers-and-bag-design.md, 4).
 *
 * Pure rules: the sheet shows `potionShelf` and calls `drinkPotion`; the page plays the sound and says the line.
 */
import { useUserStore } from '@/lib/store/stores/user';
import { inventoryOf } from '@/lib/services/inventory/Inventory';
import { REASON_HP_FULL, SOUND_HEAL, heroPoints, refuse, type BattleEffectOutcome } from './BattleEffects';

export interface PotionRule {
  /** HP restored (capped at the hero's max). */
  hp?: number;
  /** MP restored (capped at the hero's max). */
  mp?: number;
  /** Fills both HP and MP. */
  full?: true;
  /** The card's effect line. */
  effect: string;
}

/** The potions a fight can drink, keyed by the pack entry's name. */
export const POTIONS: Record<string, PotionRule> = {
  /** The bottle a temple chest drops: the chest writes the row as "potion", shown as "Potion". */
  Potion: { hp: 50, effect: 'Restores 50 HP' },
  'Health Potion': { hp: 50, effect: 'Restores 50 HP' },
  'Mana Potion': { mp: 30, effect: 'Restores 30 MP' },
  Ether: { mp: 50, effect: 'Restores 50 MP' },
  Elixir: { full: true, effect: 'Fully restores HP and MP' },
  'Hi-Potion': { hp: 50, effect: 'Restores 50 HP' },
  'X-Potion': { hp: 100, effect: 'Restores 100 HP' },
  'Mega Potion': { hp: 200, effect: 'Restores 200 HP' },
};

/** Match a potion rule by name, case-insensitively and handling spacing/hyphens. */
export const findPotionRule = (name: string): { key: string; rule: PotionRule } | null => {
  if (!name) return null;
  if (POTIONS[name]) return { key: name, rule: POTIONS[name] };
  const lower = name.toLowerCase().replace(/[-_\s]+/g, " ").trim();
  for (const [key, rule] of Object.entries(POTIONS)) {
    if (key.toLowerCase().replace(/[-_\s]+/g, " ").trim() === lower) {
      return { key, rule };
    }
  }
  return null;
};

/** One bottle row on the potion sheet. `reason` is why it cannot be drunk right now, else null. */
export interface PotionCard {
  id: string;
  name: string;
  qty: number;
  faIcon: string;
  effect: string;
  reason: string | null;
}

const REASON_MP_FULL = 'Your MP is full.';
const REASON_FULL_STRENGTH = 'You are already at full strength.';
const NOT_IN_PACK = "You don't have that.";
const DEFAULT_ICON = 'flask-potion';

/** What the potion would give the hero right now: its rule capped by the room left in HP and MP. */
export const gainOf = (rule: PotionRule, userId: string): { hp: number; mp: number } => {
  const hp = heroPoints(userId, 'hp');
  const mp = heroPoints(userId, 'mp');
  const room = { hp: Math.max(0, hp.max - hp.now), mp: Math.max(0, mp.max - mp.now) };
  if (rule.full) return room;
  return { hp: Math.min(rule.hp ?? 0, room.hp), mp: Math.min(rule.mp ?? 0, room.mp) };
};

/** Why the potion would do nothing (HP or MP already full), else null. */
export const reasonOf = (rule: PotionRule, gain: { hp: number; mp: number }): string | null => {
  const canRestoreSomething = gain.hp > 0 || gain.mp > 0;
  if (canRestoreSomething) return null;
  if (rule.full) return REASON_FULL_STRENGTH;
  return rule.hp ? REASON_HP_FULL : REASON_MP_FULL;
};

/** Calculate whether a potion can be drunk by a user, returning reason or null. */
export const potionReason = (rule: PotionRule, userId: string): string | null => {
  return reasonOf(rule, gainOf(rule, userId));
};

/** The potions in the hero's pack (merged by `inventoryOf`, in name order), each with the reason it cannot be drunk now. */
export const potionShelf = (userId: string): PotionCard[] =>
  inventoryOf(useUserStore().getUserById(userId))
    .filter((entry) => Boolean(findPotionRule(entry.name)))
    .map((entry) => {
      const match = findPotionRule(entry.name)!;
      const rule = match.rule;
      return {
        id: entry.id,
        name: entry.name,
        qty: entry.qty,
        faIcon: entry.faIcon ?? DEFAULT_ICON,
        effect: rule.effect,
        reason: reasonOf(rule, gainOf(rule, userId)),
      };
    });

/** "an Ether", "a Health Potion" */
const withArticle = (name: string): string => `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;

/** Drink one potion of the pack entry: heal and/or restore, then spend one from the pack. Nothing is spent on a refusal. */
export const drinkPotion = (userId: string, entryId: string): BattleEffectOutcome => {
  const shelf = potionShelf(userId);
  const card = shelf.find(
    (potion) =>
      potion.id === entryId ||
      potion.name.toLowerCase() === entryId.toLowerCase() ||
      potion.name.toLowerCase().replace(/[-_\s]+/g, " ") === entryId.toLowerCase().replace(/[-_\s]+/g, " ")
  );
  if (!card) return refuse(NOT_IN_PACK);
  if (card.reason) return refuse(card.reason);

  const match = findPotionRule(card.name);
  const rule = match?.rule ?? POTIONS[card.name];
  const gain = gainOf(rule, userId);
  const store = useUserStore();
  if (!store.spendInventoryItem(userId, card.id)) return refuse(NOT_IN_PACK);
  if (gain.hp > 0) store.updateUserHP({ userId, amount: gain.hp });
  if (gain.mp > 0) store.updateUserMP({ userId, amount: gain.mp });

  const result = rule.full
    ? 'HP and MP fully restored!'
    : [gain.hp > 0 && `+${gain.hp} HP`, gain.mp > 0 && `+${gain.mp} MP`].filter(Boolean).join(', ');
  return { ok: true, line: `You drink ${withArticle(card.name)}: ${result}`, sound: SOUND_HEAL };
};

/**
 * Battle items: what using an item from the bag does during a fight (docs/Items-And-Classes-Contract.md, A,
 * docs/superpowers/specs/2026-10-12-battle-powers-and-bag-design.md, 3, and
 * docs/superpowers/specs/2026-10-13-equipment-rules-design.md, 5).
 *
 * Rule zero: no item completes a chore. Each fight tool points at one effect in BattleEffects (the table the
 * in-game Powers share) and takes its price and effect from ItemRules by name: Ice Wand, Chronos' Clock, Fire Wand
 * and Gale's Wind buy time, Thor's Hammer, Sol's Flare and the Bombs blunt the beast, the Silver Arrow pins it so it
 * misses its next two strikes. Only a tool held in one of the two hands can be used. Potions still drink from the
 * bag, Bottles and Goods open the potions, the Book Of Spells opens the Powers; everything else "can't be used in a
 * fight". The Bombs spend a Bomb from the pack instead of MP.
 *
 * Like ItemUse.useItem this module never touches the screen: it spends MP (or a Bomb) in the Pinia user store, runs
 * the effect, and answers with a line, a sound and whether it worked. The page shows the bag, plays the sound and
 * types the line. Items are recognised by name (profiles store plain copies of the catalogue).
 */
import { useUserStore } from '@/lib/store/stores/user';
import { ITEM_RULES, itemRule } from '@/lib/services/items/ItemRules';
import { REASON_NO_BOMBS, bombInPack, mpCostOf } from '@/lib/services/temples/ItemUse';
import { heroMpBill } from '@/lib/services/stats/StatEffects';
import { isItemUnlocked, unlockHintOf } from '@/lib/services/quests/ItemEffects';
import {
  BATTLE_EFFECTS,
  REASON_NO_MP,
  applyBattleEffect,
  battleEffectBlocked,
  heroPoints,
  refuse,
  type BattleEffectContext,
  type BattleEffectEngine,
  type BattleEffectId,
  type BattleEffectOutcome,
} from './BattleEffects';
import {
  drinkPotion,
  findPotionRule,
  potionReason,
  potionShelf,
} from './BattlePotions';

export {
  CHRONOS_FREEZE_MS,
  FIRE_WAND_FACTOR,
  HEAL_SHARE,
  ICE_WAND_MS,
  REASON_HP_FULL,
  REASON_NO_MP,
  REASON_USED,
  SOL_FLARE_FACTOR,
  SOUND_HEAL,
  SOUND_ITEM,
  SOUND_NO,
} from './BattleEffects';
export { REASON_NO_BOMBS } from '@/lib/services/temples/ItemUse';

/** The engine calls an item can make (the effects' Pick). */
export type BattleItemEngine = BattleEffectEngine;
export interface BattleItemContext extends BattleEffectContext {
  /** The names of the tools in the hero's two hands. Absent means nothing is held. */
  heldItems?: string[];
}
export type BattleItemOutcome = BattleEffectOutcome;

/** An equipped item as the profile stores it: the catalogue entry without its `click`. */
export interface BattleItemLike {
  name?: string;
  faIcon?: string;
  desc?: string;
  [key: string]: unknown;
}

/** One row of the Item sheet: what the hand holds and whether it can be used right now. */
export interface BattleItemCard {
  name: string;
  faIcon: string;
  mp: number;
  /** One line of what it does in a fight. */
  effect: string;
  /** Why it is greyed out, or null when it can be used. */
  reason: string | null;
}

export const REASON_NOTHING = "Can't use that in a fight.";
export const REASON_NOT_HELD = 'Hold it in a hand before a fight.';

/** The fight tools: each rule in ITEM_RULES with a `fight` effect, with its MP and that effect. Bottles is a container, not here. */
export const BATTLE_ITEMS: Record<string, { mp: number; effect: BattleEffectId }> = Object.fromEntries(
  Object.entries(ITEM_RULES).flatMap(([name, rule]) => (rule.fight ? [[name, { mp: rule.mp, effect: rule.fight }]] : []))
);

/** The fight table's row for an item name, or undefined (a plain lookup would find "constructor"). */
const battleRuleOf = (name: string): { mp: number; effect: BattleEffectId } | undefined =>
  Object.prototype.hasOwnProperty.call(BATTLE_ITEMS, name) ? BATTLE_ITEMS[name] : undefined;

/** Whether using the tool spends a Bomb from the pack (the Bombs). */
const spendsBomb = (name: string): boolean => itemRule(name)?.consumes === 'Bomb';

/** What tapping a bag item does in a fight: run an effect, open the potions, open the Powers, drink a potion, or nothing. */
export type BattleBagRole = 'effect' | 'potions' | 'powers' | 'potion' | 'none';

/** The bag's containers by lower-cased name. */
const CONTAINERS: Record<string, BattleBagRole> = { bottles: 'potions', goods: 'potions', 'book of spells': 'powers' };

/** The effect line a container's card shows. */
const CONTAINER_LINES: Record<'potions' | 'powers', string> = { potions: 'Your potions', powers: 'Your Powers' };

const nameOf = (item: BattleItemLike): string => (typeof item.name === 'string' ? item.name : '');

/** Sort a bag item for the fight: a BATTLE_ITEMS name is an effect, Containers open sheets, Potions/Ethers are consumable directly. */
export const battleBagRole = (item: BattleItemLike | null | undefined): BattleBagRole => {
  const name = item ? nameOf(item) : '';
  const isEffectItem = Boolean(battleRuleOf(name));
  if (isEffectItem) return 'effect';
  const container = CONTAINERS[name.toLowerCase()];
  if (container) return container;
  const isPotion = Boolean(findPotionRule(name));
  if (isPotion) return 'potion';
  return 'none';
};

/** The item's list price in MP in a fight: the rules table by name, whatever an old stored description says (the Bombs and Bottles cost 0). */
export const battleMpCost = (item: BattleItemLike): number => mpCostOf(item);

/** What this hero pays for the item: the list price with their class discount (Mage 25%, Sage 50%) and trained intelligence taken. */
export const heroMpCost = (item: BattleItemLike, userId: string): number =>
  heroMpBill(battleMpCost(item), useUserStore().getUserById(userId));

/**
 * Why a fight tool cannot be used right now, else null. In this order: locked, not in a hand, spent this fight (or
 * the engine says wait), out of bombs, not enough MP.
 */
const reasonOf = (name: string, effect: BattleEffectId, mp: number, ctx: BattleItemContext): string | null => {
  if (!isItemUnlocked(useUserStore().getUserById(ctx.userId), name)) return unlockHintOf(name);
  const isInHand = ctx.heldItems?.includes(name) ?? false;
  if (!isInHand) return REASON_NOT_HELD;
  const blocked = battleEffectBlocked(effect, ctx);
  if (blocked) return blocked;
  const isOutOfBombs = spendsBomb(name) && !bombInPack(ctx.userId);
  if (isOutOfBombs) return REASON_NO_BOMBS;
  const isShortOnMp = mp > 0 && heroPoints(ctx.userId, 'mp').now < mp;
  if (isShortOnMp) return REASON_NO_MP;
  return null;
};

/**
 * Describe a bag item for the battle card: name, MP, one line of effect and, when it cannot be used right now,
 * the reason. Containers (Bottles, Goods, Book Of Spells) cost nothing and carry no reason. Potions restore HP/MP.
 * A null item gives null.
 */
export const describeBattleItem = (item: BattleItemLike | null | undefined, ctx: BattleItemContext): BattleItemCard | null => {
  const isEmptyHand = !item || !nameOf(item);
  if (isEmptyHand) return null;
  const name = nameOf(item);
  const faIcon = typeof item.faIcon === 'string' ? item.faIcon : '';
  const role = battleBagRole(item);

  const isContainer = role === 'potions' || role === 'powers';
  if (isContainer) return { name, faIcon, mp: 0, effect: CONTAINER_LINES[role], reason: null };

  const isPotion = role === 'potion';
  if (isPotion) {
    const potion = findPotionRule(name);
    if (potion) {
      const shelfItem = potionShelf(ctx.userId).find(
        (p) => p.id === (item as any).id || p.name.toLowerCase() === name.toLowerCase()
      );
      const reason = shelfItem ? shelfItem.reason : potionReason(potion.rule, ctx.userId);
      return {
        name,
        faIcon: faIcon || 'flask-potion',
        mp: 0,
        effect: potion.rule.effect,
        reason,
      };
    }
  }

  const rule = battleRuleOf(name);
  const isNoFightTool = !rule;
  if (isNoFightTool) return { name, faIcon, mp: 0, effect: REASON_NOTHING, reason: REASON_NOTHING };

  const mp = heroMpCost(item, ctx.userId);
  return { name, faIcon, mp, effect: BATTLE_EFFECTS[rule.effect].label, reason: reasonOf(name, rule.effect, mp, ctx) };
};

/**
 * Use a fight item from the bag. Potions heal and restore. A tool checks, in order, that it is unlocked and in a
 * hand, that it is not spent this fight, that the pack has a Bomb (for the Bombs) and that the MP is there; then it
 * runs its effect and pays: MP from the hero, or one Bomb from the pack.
 */
export const useBattleItem = (item: BattleItemLike, ctx: BattleItemContext): BattleItemOutcome => {
  const name = nameOf(item) || 'That';

  const potion = findPotionRule(name);
  if (potion) {
    const entryId = (item as any).id || name;
    return drinkPotion(ctx.userId, entryId);
  }

  const rule = battleRuleOf(name);
  if (!rule) return refuse(`${name}: ${REASON_NOTHING}`);

  const mp = heroMpCost(item, ctx.userId);
  const reason = reasonOf(name, rule.effect, mp, ctx);
  if (reason) return refuse(reason);

  // reasonOf has checked the pack: a Bomb tool always finds its Bomb here
  const bomb = spendsBomb(name) ? bombInPack(ctx.userId) : null;
  const outcome = applyBattleEffect(rule.effect, ctx);
  const spentBomb = outcome.ok ? bomb : null;
  if (spentBomb) useUserStore().spendInventoryItem(ctx.userId, spentBomb.id);
  const shouldChargeMp = outcome.ok && mp > 0;
  if (shouldChargeMp) useUserStore().updateUserMP({ userId: ctx.userId, amount: -mp });
  return outcome;
};

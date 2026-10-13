/**
 * Battle items: what using an item from the bag does during a fight (docs/Items-And-Classes-Contract.md, A, and
 * docs/superpowers/specs/2026-10-12-battle-powers-and-bag-design.md, 3).
 *
 * Rule zero: no item completes a chore. Each fight item points at one effect in BattleEffects (the table the
 * in-game Powers share): Ice Wand, Chronos' Clock and Fire Wand buy time, Thor's Hammer and Sol's Flare blunt
 * the beast, the Silver Arrow sends a chore back to the board unfinished. Any unlocked item in the bag can be
 * used, held or not. Bottles and Goods open the potions, the Book Of Spells opens the Powers; everything else
 * "can't be used in a fight".
 *
 * Like ItemUse.useItem this module never touches the screen: it spends MP in the Pinia user store, runs the
 * effect, and answers with a line, a sound and whether it worked. The page shows the bag, plays the sound and
 * types the line. Items are recognised by name (profiles store plain copies of the catalogue).
 */
import { useUserStore } from '@/lib/store/stores/user';
import { mpCostOf } from '@/lib/services/temples/ItemUse';
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

/** The engine calls an item can make (the effects' Pick). */
export type BattleItemEngine = BattleEffectEngine;
export type BattleItemContext = BattleEffectContext;
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

/** The table from the contract: each fight item's MP and the effect it runs. Bottles is a container, not here. */
export const BATTLE_ITEMS: Record<string, { mp: number; effect: BattleEffectId }> = {
  'Ice Wand': { mp: 50, effect: 'frost' },
  "Chronos' Clock": { mp: 100, effect: 'time-stop' },
  "Thor's Hammer": { mp: 60, effect: 'stun' },
  'Silver Arrow': { mp: 25, effect: 'recall' },
  "Sol's Flare": { mp: 100, effect: 'weaken' },
  'Fire Wand': { mp: 50, effect: 'kindle' },
};

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
  if (BATTLE_ITEMS[name]) return 'effect';
  if (CONTAINERS[name.toLowerCase()]) return CONTAINERS[name.toLowerCase()];
  if (findPotionRule(name)) return 'potion';
  return 'none';
};

/** The item's MP cost in a fight: the number its description starts with, else the contract's table. */
export const battleMpCost = (item: BattleItemLike): number => mpCostOf(item) || BATTLE_ITEMS[nameOf(item)]?.mp || 0;

/** What this hero pays for the item: the list price with their class discount (Mage 25%, Sage 50%) and trained intelligence taken. */
export const heroMpCost = (item: BattleItemLike, userId: string): number =>
  heroMpBill(battleMpCost(item), useUserStore().getUserById(userId));

/** Why a fight item cannot be used right now (locked, spent this fight, HP full, not enough MP), else null. */
const reasonOf = (name: string, effect: BattleEffectId, mp: number, ctx: BattleItemContext): string | null => {
  if (!isItemUnlocked(useUserStore().getUserById(ctx.userId), name)) return unlockHintOf(name);
  const blocked = battleEffectBlocked(effect, ctx);
  if (blocked) return blocked;
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

  if (role === 'potion') {
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

  if (role === 'none') return { name, faIcon, mp: 0, effect: REASON_NOTHING, reason: REASON_NOTHING };

  const rule = BATTLE_ITEMS[name];
  const mp = heroMpCost(item, ctx.userId);
  return { name, faIcon, mp, effect: BATTLE_EFFECTS[rule.effect].label, reason: reasonOf(name, rule.effect, mp, ctx) };
};

/**
 * Use a fight item from the bag. Potions heal and restore. Combat items check locks, once-per-fight and MP first.
 */
export const useBattleItem = (item: BattleItemLike, ctx: BattleItemContext): BattleItemOutcome => {
  const name = nameOf(item) || 'That';

  const potion = findPotionRule(name);
  if (potion) {
    const entryId = (item as any).id || name;
    return drinkPotion(ctx.userId, entryId);
  }

  const rule = BATTLE_ITEMS[name];
  if (!rule) return refuse(`${name}: ${REASON_NOTHING}`);

  const mp = heroMpCost(item, ctx.userId);
  const reason = reasonOf(name, rule.effect, mp, ctx);
  if (reason) return refuse(reason);

  const outcome = applyBattleEffect(rule.effect, ctx);
  const shouldChargeMp = outcome.ok && !outcome.needsTaskPick && mp > 0;
  if (shouldChargeMp) useUserStore().updateUserMP({ userId: ctx.userId, amount: -mp });
  return outcome;
};

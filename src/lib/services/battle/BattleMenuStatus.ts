import type { BattlePowerEntry } from '@/lib/services/battle/BattlePowers';
import { REASON_NOT_HELD, type BattleItemCard, type BattleBagRole } from '@/lib/services/battle/BattleItems';
import { REASON_FULL_STRENGTH, REASON_MP_FULL, type PotionCard } from '@/lib/services/battle/BattlePotions';
import { REASON_HP_FULL, REASON_NO_MP, REASON_STRIKE_WAITING, REASON_USED } from '@/lib/services/battle/BattleEffects';

export interface MenuSlotStatus { enabled: boolean; note: string }
export interface BattleMenuStatus { tackle: MenuSlotStatus; powers: MenuSlotStatus; goods: MenuSlotStatus }
/** One bag tile as the page sees it: its role in a fight and the card the bag would show for it. */
export interface MenuGoodsTile { role: BattleBagRole; card: BattleItemCard | null }
export interface BattleMenuStatusInput {
  choresLeft: number;
  powers: BattlePowerEntry[];
  goods: MenuGoodsTile[];
  potions: PotionCard[];
}

export const battleMenuStatus = (input: BattleMenuStatusInput): BattleMenuStatus => {
  const tackle = getTackleStatus(input.choresLeft);
  const powers = getPowersStatus(input.powers);
  const goods = getGoodsStatus(input.goods, input.potions);
  return { tackle, powers, goods };
};

/** A menu note is a few letters wide: the engine's sentences ("Not enough MP") become the words a row can hold. */
const SHORT_REASONS: Record<string, string | undefined> = {
  [REASON_NO_MP]: 'no MP',
  [REASON_USED]: 'used',
  [REASON_HP_FULL]: 'HP full',
  [REASON_STRIKE_WAITING]: 'wait',
  [REASON_NOT_HELD]: 'not held',
  [REASON_MP_FULL]: 'MP full',
  [REASON_FULL_STRENGTH]: 'full',
};
const NOTE_WORD_MAX = 9;

export const shortReason = (reason: string): string => {
  const firstWord = reason.trim().split(/\s+/)[0].toLowerCase().slice(0, NOTE_WORD_MAX);
  return SHORT_REASONS[reason] ?? firstWord;
};

const TACKLE_NOTES: Record<number, string | undefined> = { 0: 'all done', 1: '1 chore' };

const getTackleStatus = (choresLeft: number): MenuSlotStatus => {
  return { enabled: true, note: TACKLE_NOTES[choresLeft] ?? `${choresLeft} chores` };
};

const getPowersStatus = (powers: BattlePowerEntry[]): MenuSlotStatus => {
  const castable = powers.filter(p => p.card.reason === null);

  const isCastable = castable.length > 0;
  if (isCastable) {
    const minMp = Math.min(...castable.map(p => p.card.mp));
    return { enabled: true, note: `${minMp} MP` };
  }

  const firstReason = powers[0]?.card.reason ?? null;
  const hasNoPowers = firstReason === null;
  if (hasNoPowers) return { enabled: false, note: 'none' };
  return { enabled: false, note: shortReason(firstReason) };
};

const isUsableEffectTile = (tile: MenuGoodsTile): boolean => tile.role === 'effect' && tile.card !== null && tile.card.reason === null;

const effectTileReason = (tile: MenuGoodsTile): string | null => {
  const isEffectTile = tile.role === 'effect';
  if (!isEffectTile) return null;
  return tile.card?.reason ?? null;
};

/**
 * Why Goods is greyed out: the first potion's reason (the hero owns it and could drink it), else the first effect tile's
 * (a tool out of hand). Null only when there are no potions and no tools to explain.
 */
const firstGoodsReason = (goods: MenuGoodsTile[], potions: PotionCard[]): string | null => {
  const potionReason = potions.map(p => p.reason).find(reason => reason !== null);
  const toolReason = goods.map(effectTileReason).find(reason => reason !== null);
  return potionReason ?? toolReason ?? null;
};

const getGoodsStatus = (goods: MenuGoodsTile[], potions: PotionCard[]): MenuSlotStatus => {
  const usableEffectTiles = goods.filter(isUsableEffectTile).length;
  const usablePotions = potions.filter(p => p.reason === null).reduce((sum, p) => sum + p.qty, 0);

  const count = usableEffectTiles + usablePotions;
  const isUsable = count > 0;
  if (isUsable) return { enabled: true, note: `x${count}` };

  const reason = firstGoodsReason(goods, potions);
  const hasNothing = reason === null;
  if (hasNothing) return { enabled: false, note: 'empty' };
  return { enabled: false, note: shortReason(reason) };
};

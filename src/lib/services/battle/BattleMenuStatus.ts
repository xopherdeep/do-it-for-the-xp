import type { BattlePowerEntry } from '@/lib/services/battle/BattlePowers';
import type { BattleItemCard, BattleBagRole } from '@/lib/services/battle/BattleItems';
import type { PotionCard } from '@/lib/services/battle/BattlePotions';

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

const getTackleStatus = (choresLeft: number): MenuSlotStatus => {
  const note = choresLeft === 0 ? 'all done' : choresLeft === 1 ? '1 chore' : `${choresLeft} chores`;
  return { enabled: true, note };
};

const getPowersStatus = (powers: BattlePowerEntry[]): MenuSlotStatus => {
  const castable = powers.filter(p => p.card.reason === null);

  if (castable.length === 0) {
    const note = powers.length === 0 ? 'none' : powers[0].card.reason || 'none';
    return { enabled: false, note };
  }

  const minMp = Math.min(...castable.map(p => p.card.mp));
  return { enabled: true, note: `${minMp} MP` };
};

const getGoodsStatus = (goods: MenuGoodsTile[], potions: PotionCard[]): MenuSlotStatus => {
  const usableEffectTiles = goods.filter(
    tile => tile.role === 'effect' && tile.card !== null && tile.card.reason === null
  ).length;

  const usablePotions = potions.filter(p => p.reason === null).reduce((sum, p) => sum + p.qty, 0);

  const count = usableEffectTiles + usablePotions;
  return { enabled: count > 0, note: count > 0 ? `x${count}` : 'empty' };
};

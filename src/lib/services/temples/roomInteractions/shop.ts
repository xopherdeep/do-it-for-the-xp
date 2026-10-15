/**
 * The shop room: the wares on offer and buying one. Prices are what this hero pays (trained charisma takes
 * 1% off a point, up to 20%, docs/Stats-Contract.md); a special item sells once per run (kept with the hero's
 * saved run, so a reload does not restock it and a blood moon does), Bombs as often as the hero likes (the Bombs
 * in a hand spend them, ItemUse).
 */
import type { Room } from '@/lib/engine/core/dungeons/types';
import { useUserStore } from '@/lib/store/stores/user';
import { canCarry } from '@/lib/services/inventory/Storage';
import { shopPrice } from '@/lib/services/stats/StatEffects';
import { healHero, readGold, readPoints } from './hero';
import { isRoomSpent, spendRoom } from './treasure';
import { SFX, titleWords } from './vocabulary';
import type { RoomContext, RoomOutcome, Ware } from './vocabulary';

const POTION_ID = 'potion-of-vigor';
const POTION_PRICE = 15;
const POTION_HEAL = 20;
const BOMB_ID = 'bomb';
const BOMB_PRICE = 20;
const SPECIAL_DEFAULT_PRICE = 50;
const BAG_FULL = 'Your bag is full. Store something at home first.';

/**
 * The wares on offer in a shop room, with what the hero already bought taken off the shelf. Prices are
 * what this hero pays: trained charisma takes 1% off a point, up to 20% (docs/Stats-Contract.md).
 */
export const shopWares = (room: Room, ctx: RoomContext): Ware[] => {
  const hero = useUserStore().getUserById(ctx.userId);
  const wares: Ware[] = [
    { id: POTION_ID, name: 'Potion of Vigor', price: shopPrice(POTION_PRICE, hero), blurb: `restore ${POTION_HEAL} HP` },
    { id: BOMB_ID, name: 'Bomb', price: shopPrice(BOMB_PRICE, hero), blurb: 'blows open a cracked wall' },
  ];
  const special = room.content?.specialItem;
  const hasSpecialItem = typeof special === 'string' && special;
  if (hasSpecialItem) {
    wares.push({
      id: `special:${special}`,
      name: titleWords(special),
      price: shopPrice(Number(room.content?.specialItemPrice ?? room.content?.price) || SPECIAL_DEFAULT_PRICE, hero),
      blurb: 'a rare find',
      soldOut: isRoomSpent(ctx),
    });
  }
  return wares;
};

/** Buy one thing from the shop room. Not enough GP changes nothing. */
export const buyWare = (room: Room, ctx: RoomContext, wareId: string): RoomOutcome => {
  const ware = shopWares(room, ctx).find((item) => item.id === wareId);
  if (!ware) return { message: 'We do not carry that.', sound: SFX.error };
  const isSoldOut = ware.soldOut;
  if (isSoldOut) return { message: 'Sold out. Sorry, friend.', sound: SFX.error };
  const isShortOfGp = readGold(ctx.userId) < ware.price;
  if (isShortOfGp) return { message: 'Not enough GP', sound: SFX.error };

  const store = useUserStore();
  const isPotion = ware.id === POTION_ID;
  if (isPotion) {
    const hp = readPoints(ctx.userId, 'hp');
    const isHealthy = hp.now >= hp.max;
    if (isHealthy) return { message: 'You are in fine shape already. Keep your GP.', sound: SFX.error };
    void store.updateUserGP({ userId: ctx.userId, wallet: -ware.price });
    const healed = healHero(ctx.userId, POTION_HEAL);
    return { message: `Potion of Vigor: +${healed} HP`, sound: SFX.buy };
  }

  const isBomb = ware.id === BOMB_ID;
  if (isBomb) {
    // The pack or nowhere, checked before any GP changes hands: a Bomb in home storage is out of the hand's reach
    // (ItemUse.bombInPack reads the pack), so a full bag takes nothing and charges nothing
    const bomb = { name: 'Bomb', kind: 'consumable', faIcon: 'bomb', qty: 1, source: ctx.templeId };
    const fitsInBag = canCarry(store.getUserById(ctx.userId), bomb) === 'bag';
    if (!fitsInBag) return { message: BAG_FULL, sound: SFX.error };
    store.addInventoryItem(ctx.userId, bomb);
    void store.updateUserGP({ userId: ctx.userId, wallet: -ware.price });
    return { message: 'A Bomb is in your bag.', sound: SFX.buy };
  }

  const special = ware.id.slice('special:'.length);
  const consumable = /(potion|ether)$/i.test(ware.name) || /elixir/i.test(ware.name);
  const item = {
    name: special,
    source: ctx.templeId,
    type: consumable ? 'consumable' : 'material',
    faIcon: consumable ? 'flask-potion' : 'gem',
    ...(ware.blurb ? { description: ware.blurb } : {}),
  };
  // Room is checked before any GP changes hands: a full bag and full storage take nothing and charge nothing
  const isNotStowed = !canCarry(store.getUserById(ctx.userId), item) || !store.addInventoryItem(ctx.userId, item);
  if (isNotStowed) {
    return { message: BAG_FULL, sound: SFX.error };
  }
  void store.updateUserGP({ userId: ctx.userId, wallet: -ware.price });
  spendRoom(ctx);
  return { message: `${ware.name} is in your bag.`, sound: SFX.buy };
};

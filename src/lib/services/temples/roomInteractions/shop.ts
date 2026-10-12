/**
 * The shop room: the wares on offer and buying one. Prices are what this hero pays (trained charisma takes
 * 1% off a point, up to 20%, docs/Stats-Contract.md); a special item sells once per visit.
 */
import type { Room } from '@/lib/engine/core/dungeons/types';
import { useUserStore } from '@/lib/store/stores/user';
import { shopPrice } from '@/lib/services/stats/StatEffects';
import { healHero, readGold, readPoints } from './hero';
import { hasHappened, rememberOnce, roomKey } from './visitMemory';
import { SFX, titleWords } from './vocabulary';
import type { RoomContext, RoomOutcome, Ware } from './vocabulary';

const POTION_ID = 'potion-of-vigor';
const POTION_PRICE = 15;
const POTION_HEAL = 20;
const SPECIAL_DEFAULT_PRICE = 50;

/**
 * The wares on offer in a shop room, with what the hero already bought taken off the shelf. Prices are
 * what this hero pays: trained charisma takes 1% off a point, up to 20% (docs/Stats-Contract.md).
 */
export const shopWares = (room: Room, ctx: RoomContext): Ware[] => {
  const hero = useUserStore().getUserById(ctx.userId);
  const wares: Ware[] = [
    { id: POTION_ID, name: 'Potion of Vigor', price: shopPrice(POTION_PRICE, hero), blurb: `restore ${POTION_HEAL} HP` },
  ];
  const special = room.content?.specialItem;
  const hasSpecialItem = typeof special === 'string' && special;
  if (hasSpecialItem) {
    wares.push({
      id: `special:${special}`,
      name: titleWords(special),
      price: shopPrice(Number(room.content?.specialItemPrice ?? room.content?.price) || SPECIAL_DEFAULT_PRICE, hero),
      blurb: 'a rare find',
      soldOut: hasHappened(roomKey(ctx, `bought:${special}`)),
    });
  }
  return wares;
};

/** Buy one thing from the shop room. Not enough GP changes nothing. */
export const buyWare = (room: Room, ctx: RoomContext, wareId: string): RoomOutcome => {
  const ware = shopWares(room, ctx).find((item) => item.id === wareId);
  if (!ware) return { message: 'We do not carry that.', sound: SFX.error };
  if (ware.soldOut) return { message: 'Sold out. Sorry, friend.', sound: SFX.error };
  if (readGold(ctx.userId) < ware.price) return { message: 'Not enough GP', sound: SFX.error };

  const store = useUserStore();
  if (ware.id === POTION_ID) {
    const hp = readPoints(ctx.userId, 'hp');
    if (hp.now >= hp.max) return { message: 'You are in fine shape already. Keep your GP.', sound: SFX.error };
    void store.updateUserGP({ userId: ctx.userId, wallet: -ware.price });
    const healed = healHero(ctx.userId, POTION_HEAL);
    return { message: `Potion of Vigor: +${healed} HP`, sound: SFX.buy };
  }

  const special = ware.id.slice('special:'.length);
  void store.updateUserGP({ userId: ctx.userId, wallet: -ware.price });
  const consumable = /(potion|ether)$/i.test(ware.name) || /elixir/i.test(ware.name);
  store.addInventoryItem(ctx.userId, {
    name: special,
    source: ctx.templeId,
    type: consumable ? 'consumable' : 'material',
    faIcon: consumable ? 'flask-potion' : 'gem',
    ...(ware.blurb ? { description: ware.blurb } : {}),
  });
  rememberOnce(roomKey(ctx, `bought:${special}`));
  return { message: `${ware.name} is in your bag.`, sound: SFX.buy };
};

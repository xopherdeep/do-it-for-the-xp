/**
 * What a shop asks and says, as in-world prompts (XpRevealPrompt): the clerk's talk and menu, the wallet on the shelf,
 * the receipt for a purchase and the reasons a sale did not go through, all in the shopkeeper's voice. The money rules
 * stay in wallet.ts and PurchaseService.ts; this only turns them into the prompt to show, so the shop screen has
 * nothing to word and the lines are tested without a screen. Every choice carries an icon.
 */
import type { RevealPromptOptions, RevealSpriteName } from '@/components/organisms/RevealPrompt/revealPrompt';
import { buyWalletUpgrade, type GpPurse, type WalletUpgradeResult } from '@/lib/services/gp/wallet';
import { gold, type WalletWare } from '@/lib/services/gp/walletShops';
import { copyFor } from '@/lib/services/copy/copy';
import type { Voice } from '@/lib/services/copy/voices';

/** Who is speaking at the counter, and the colour their box takes (a key of BUILDING_ACCENTS). */
export interface ShopVoice {
  shopkeeper: string;
  accent: string;
}

/** Each world's accent; the desert is the sands and the ice is the tundra. */
const ACCENT_OF_WORLD = new Map<string, string>([
  ['plains', 'plains'],
  ['forest', 'forest'],
  ['islands', 'islands'],
  ['swamps', 'swamps'],
  ['mountains', 'mountains'],
  ['desert', 'sands'],
  ['sands', 'sands'],
  ['ice', 'tundra'],
  ['tundra', 'tundra'],
  ['clouds', 'clouds'],
  ['moon', 'moon']
]);

/**
 * The accent of a shop that stands in this world: the region's own colour, or the general store's for Home Town, the
 * balloon (it follows the sky, not a region) and any world without a colour of its own.
 */
export function shopAccent(world: string | null | undefined): string {
  return ACCENT_OF_WORLD.get(String(world ?? '').trim().toLowerCase()) ?? 'accessoryShop';
}

/** The ids of the clerk's menu. */
export type ClerkPick = 'browse' | 'atm' | 'ok';

/**
 * The clerk talks and the menu follows. Escape is "browse": the hero steps back to the shelves. Behind a shut door the
 * clerk says when the shop opens and there is nothing to choose.
 */
export function clerkPrompt(voice: ShopVoice, lines: string[], isOpen: boolean): RevealPromptOptions {
  if (!isOpen) {
    return {
      speaker: voice.shopkeeper,
      accent: voice.accent,
      lines,
      choices: [{ id: 'ok', label: 'OK', icon: 'door-closed', tone: 'primary' }],
      cancelId: 'ok',
    };
  }
  return {
    speaker: voice.shopkeeper,
    accent: voice.accent,
    lines,
    choices: [
      { id: 'browse', label: 'Browse the shelves', icon: 'shopping-bag' },
      { id: 'atm', label: 'Use the ATM', icon: 'hand-holding-usd' },
    ],
    cancelId: 'browse',
  };
}

interface ShopNoticeOptions {
  sprite?: RevealSpriteName;
  sound?: string;
  speaker?: string;
  label?: string;
  icon?: string;
}

/** A line from the shopkeeper (or whoever `speaker` is) and one button to dismiss it; `sound` plays as it opens. */
export function shopNotice(
  voice: ShopVoice,
  line: string,
  options: ShopNoticeOptions = {}
): RevealPromptOptions {
  return {
    speaker: options.speaker ?? voice.shopkeeper,
    accent: voice.accent,
    sprite: options.sprite,
    sound: options.sound,
    lines: [line],
    choices: [{ id: 'ok', label: options.label ?? 'OK', icon: options.icon ?? 'check', tone: 'primary' }],
    cancelId: 'ok',
  };
}

/** A turn-down: the same notice with the "no" sound. */
export const shopRefusal = (voice: ShopVoice, line: string, sprite?: RevealSpriteName): RevealPromptOptions =>
  shopNotice(voice, line, { sprite, sound: 'no' });

/** The ATM in the shop speaks as the ATM, in the shop's colours. */
export const atmNotice = (voice: ShopVoice, line: string, options: { sprite?: RevealSpriteName; sound?: string } = {}): RevealPromptOptions =>
  shopNotice(voice, line, { ...options, speaker: 'ATM' });

/**
 * The wallet on the shelf. For a hero who may buy it: the shopkeeper's pitch with [Buy it] and [No thanks] (the choice
 * id `yes` is the sale). Otherwise the shopkeeper says why not, with one button (`ok`): it is not the hero's next wallet,
 * the hero is not tall enough, or the purse falls short, savings and all.
 */
export function walletPitch(
  voice: ShopVoice,
  ware: WalletWare,
  gp: GpPurse | null | undefined,
  level: number,
  words: Voice = 'adventure'
): RevealPromptOptions {
  if (!ware.offer) {
    const line = ware.status === 'owned' ? `${ware.note} ${ware.hint}` : ware.note;
    return shopRefusal(voice, line, 'coins');
  }
  if (ware.status === 'locked') {
    return shopRefusal(voice, copyFor('shop.wallet.level', words, { level: ware.offer.minLevel }), 'coins');
  }
  const sale = buyWalletUpgrade(gp, level);
  if (!sale.ok) return shopRefusal(voice, walletRefusal(sale, words), 'coins');
  return {
    speaker: voice.shopkeeper,
    accent: voice.accent,
    sprite: 'coins',
    title: ware.name,
    lines: [copyFor('shop.wallet.pitch', words, { limit: gold(ware.offer.limit), price: gold(ware.offer.price) })],
    choices: [
      { id: 'yes', label: `Buy for ${gold(ware.offer.price)}`, icon: 'coins', tone: 'primary' },
      { id: 'no', label: 'No thanks', icon: 'times', tone: 'ghost' },
    ],
    cancelId: 'no',
  };
}

/** The shopkeeper's reason a wallet sale failed. */
export function walletRefusal(sale: Extract<WalletUpgradeResult, { ok: false }>, words: Voice = 'adventure'): string {
  switch (sale.reason) {
    case 'poor':
      return copyFor('shop.wallet.poor', words, { short: gold(sale.short) });
    case 'locked':
      return copyFor('shop.wallet.level', words, { level: sale.offer?.minLevel });
    default:
      return copyFor('shop.wallet.biggest', words);
  }
}

/** The shopkeeper's receipt for the wallet: the coins rise, and the fanfare plays as they do. */
export const walletReceipt = (voice: ShopVoice, limit: number, words: Voice = 'adventure'): RevealPromptOptions =>
  shopNotice(voice, copyFor('shop.wallet.receipt', words, { limit: gold(limit) }), {
    sprite: 'coins',
    sound: 'levelUp',
    label: 'Great!',
    icon: 'wallet',
  });

/** The receipt for something off the shelf: the chest rises. The Game Master still has to hand the real thing over. */
export const purchaseReceipt = (voice: ShopVoice, itemName: string, words: Voice = 'adventure'): RevealPromptOptions =>
  shopNotice(voice, copyFor('shop.buy.receipt', words, { item: itemName }), {
    sprite: 'chest',
    sound: 'newItem',
    label: 'Thanks!',
    icon: 'gift',
  });

/** The receipt for an in-game consumable: packed directly into the bag. */
export const consumablePurchaseReceipt = (voice: ShopVoice, itemName: string, words: Voice = 'adventure'): RevealPromptOptions =>
  shopNotice(voice, copyFor('shop.buy.consumableReceipt', words, { item: itemName }), {
    sprite: 'chest',
    sound: 'newItem',
    label: 'Got it!',
    icon: 'backpack',
  });

/** Why a purchase did not go through. `shortBy` is the GP missing when the wallet fell short, else null (a snag). Nothing was charged. */
export function purchaseFailure(
  voice: ShopVoice,
  itemName: string,
  shortBy: number | null,
  words: Voice = 'adventure',
  reasonCode?: string
): RevealPromptOptions {
  if (shortBy !== null) {
    return shopRefusal(voice, copyFor('shop.buy.short', words, { short: gold(shortBy), item: itemName }), 'coins');
  }
  if (reasonCode === 'bag-full') {
    // There is no bag sprite: the chest stands in for the hero's full bag
    return shopRefusal(voice, copyFor('shop.buy.bagFull', words), 'chest');
  }
  return shopNotice(voice, copyFor('shop.buy.snag', words), { sound: 'error' });
}

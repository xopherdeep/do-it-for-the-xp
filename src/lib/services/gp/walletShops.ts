/**
 * Bigger wallets are found out in the world, Majora's Mask style: each region's shop sells exactly one wallet
 * tier, and only sells it to a hero whose NEXT tier it is. The Gold Bank sells none; it only says where to go.
 * Everything here is pure so the shop screen and the banker only have to show results.
 */
import {
  nextWalletUpgrade,
  WALLET_TIERS,
  walletLimitOf,
  walletUpgradePrice,
  type GpPurse,
  type WalletTier,
  type WalletUpgradeOffer,
} from "./wallet";

export interface WalletShop {
  /** The wallet size this shop sells */
  limit: number;
  /** World map region id */
  region: string;
  /** The shop route's merchant id */
  merchant: string;
  /** The shop's name as the sign reads */
  shop: string;
  /** Where it is, as the banker says it: "the Hermit's Tent in the Forest" */
  where: string;
}

/** Which shop sells which wallet, smallest first. The starting wallet (₲500) is nobody's to sell. */
export const WALLET_SHOPS: readonly WalletShop[] = [
  { limit: 1500, region: "plains", merchant: "pegasus-ranch", shop: "Pegasus Ranch", where: "the Pegasus Ranch in the Plains" },
  { limit: 3000, region: "forest", merchant: "hermits-tent", shop: "Hermit's Tent", where: "the Hermit's Tent in the Forest" },
  { limit: 6000, region: "islands", merchant: "wrecked-ship", shop: "Wrecked Ship", where: "the Wrecked Ship on the Islands" },
  { limit: 12000, region: "mountains", merchant: "crystal-caverns", shop: "Crystal Caverns", where: "the Crystal Caverns in the Mountains" },
  { limit: 25000, region: "sands", merchant: "pond-of-life", shop: "Pond of Life", where: "the Pond of Life in the Sands" },
  { limit: 50000, region: "moon", merchant: "theia-city", shop: "Theia City", where: "Theia City on the Moon" },
];

/** GP the way the shops print it */
export const gold = (value: number): string => `₲${Math.round(Number(value) || 0)}`;

/** The shop that sells this wallet size, or null for the starting wallet and sizes nobody sells. */
export function walletShopFor(limit: number): WalletShop | null {
  return WALLET_SHOPS.find((shop) => shop.limit === limit) ?? null;
}

/** The wallet shop at this place: a region id ("forest") or a merchant id ("hermits-tent"). Null when it sells none. */
export function walletShopAt(place: string | null | undefined): WalletShop | null {
  const key = String(place ?? "").trim().toLowerCase();
  if (!key) return null;
  return WALLET_SHOPS.find((shop) => shop.region === key || shop.merchant === key) ?? null;
}

export type WalletWareStatus =
  /** This is the hero's next wallet and they are tall enough to buy it */
  | "for-sale"
  /** This is the hero's next wallet but they are under its level */
  | "locked"
  /** The hero already carries this size or bigger */
  | "owned"
  /** The hero still needs a smaller wallet first */
  | "ahead";

export interface WalletWare {
  shop: WalletShop;
  tier: WalletTier;
  /** "Bigger Wallet (₲1500)" */
  name: string;
  /** "Holds ₲1500." */
  blurb: string;
  /** What it costs here, whether or not the hero may buy it today */
  price: number;
  /** The offer to hand to buyWalletUpgrade; only when this shop's wallet is the hero's next one */
  offer: WalletUpgradeOffer | null;
  status: WalletWareStatus;
  /** The one line under the price: "LVL 3 needed", "You already carry a bigger wallet.", or where to go instead */
  note: string;
  /** Where the hero's next wallet is sold (the banker's line) */
  hint: string;
}

/** The banker's line: where the hero's next wallet is sold, or that they carry the biggest. */
export function shopHintFor(gp?: GpPurse | null): string {
  const next = nextWalletUpgrade(gp);
  if (!next) return "You carry the biggest wallet there is.";
  const shop = walletShopFor(next.limit);
  // an odd limit from an old profile steps to a tier every shop knows, so this only guards a broken table
  if (!shop) return `A bigger wallet (${gold(next.limit)}) is out there somewhere.`;
  return `A bigger wallet is sold at ${shop.where}.`;
}

/**
 * The wallet this place has on its shelf for this hero, or null when the place sells no wallet.
 * `offer` is set only when it is the hero's NEXT wallet; otherwise `note` and `hint` say why not and where to go.
 */
export function walletOfferAt(place: string | null | undefined, gp?: GpPurse | null, level?: number): WalletWare | null {
  const shop = walletShopAt(place);
  if (!shop) return null;
  const tier = WALLET_TIERS.find((t) => t.limit === shop.limit) ?? { limit: shop.limit, minLevel: 1 };
  const next = nextWalletUpgrade(gp);
  const hint = shopHintFor(gp);
  const base = {
    shop,
    tier,
    name: `Bigger Wallet (${gold(tier.limit)})`,
    blurb: `Holds ${gold(tier.limit)}.`,
    price: walletUpgradePrice(tier.limit),
    hint,
  };

  const isOwned = walletLimitOf(gp) >= tier.limit;
  if (isOwned) {
    return { ...base, offer: null, status: "owned", note: "You already carry a bigger wallet." };
  }
  const isTierAhead = !next || next.limit !== tier.limit;
  if (isTierAhead) {
    return { ...base, offer: null, status: "ahead", note: hint };
  }
  const heroLevel = Number.isFinite(Number(level)) ? Number(level) : 1;
  const isUnderLevel = heroLevel < next.minLevel;
  if (isUnderLevel) {
    return { ...base, offer: next, status: "locked", note: `LVL ${next.minLevel} needed` };
  }
  return { ...base, offer: next, status: "for-sale", note: `Yours for ${gold(next.price)}.` };
}

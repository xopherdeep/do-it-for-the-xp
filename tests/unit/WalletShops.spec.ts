import { WALLET_TIERS } from "@/lib/services/gp/wallet";
import {
  gold,
  shopHintFor,
  WALLET_SHOPS,
  walletOfferAt,
  walletShopAt,
  walletShopFor,
} from "@/lib/services/gp/walletShops";

describe("wallet shops", () => {
  it("sells every wallet but the starting one, each in its own region", () => {
    const sold = WALLET_SHOPS.map((shop) => shop.limit);
    expect(sold).toEqual(WALLET_TIERS.slice(1).map((tier) => tier.limit));
    expect(new Set(WALLET_SHOPS.map((shop) => shop.region)).size).toBe(WALLET_SHOPS.length);
    expect(walletShopFor(300)).toMatchObject({ region: "plains", merchant: "pegasus-ranch", shop: "Pegasus Ranch" });
    expect(walletShopFor(500)).toMatchObject({ region: "forest", shop: "Hermit's Tent" });
    expect(walletShopFor(1000)).toMatchObject({ region: "islands", shop: "Wrecked Ship" });
    expect(walletShopFor(2500)).toMatchObject({ region: "mountains", shop: "Crystal Caverns" });
    expect(walletShopFor(5000)).toMatchObject({ region: "sands", shop: "Pond of Life" });
    expect(walletShopFor(10000)).toMatchObject({ region: "moon", shop: "Theia City" });
    expect(walletShopFor(100)).toBeNull();
  });

  it("finds a shop by region or by merchant id, and knows the ones that sell none", () => {
    expect(walletShopAt("forest")?.limit).toBe(500);
    expect(walletShopAt("hermits-tent")?.limit).toBe(500);
    expect(walletShopAt(" Moon ")?.limit).toBe(10000);
    expect(walletShopAt("swamps")).toBeNull();
    expect(walletShopAt("witchs-hut")).toBeNull();
    expect(walletShopAt(undefined)).toBeNull();
  });

  it("prints GP with the glyph", () => {
    expect(gold(300)).toBe("₲300");
    expect(gold(NaN)).toBe("₲0");
  });
});

describe("walletOfferAt", () => {
  it("sells the hero's next wallet when they are tall enough", () => {
    const ware = walletOfferAt("plains", { limit: 100, wallet: 50, savings: 100 }, 3);
    expect(ware).toMatchObject({
      status: "for-sale",
      name: "Bigger Wallet (₲300)",
      blurb: "Holds ₲300.",
      price: 150,
      offer: { limit: 300, minLevel: 3, price: 150 },
    });
  });

  it("greys the next wallet with its level when the hero is too small", () => {
    const ware = walletOfferAt("pegasus-ranch", { limit: 100 }, 2);
    expect(ware).toMatchObject({ status: "locked", note: "LVL 3 needed", offer: { limit: 300 } });
  });

  it("has no offer when the hero already carries this size or bigger", () => {
    expect(walletOfferAt("plains", { limit: 300 }, 9)).toMatchObject({
      status: "owned",
      offer: null,
      note: "You already carry a bigger wallet.",
      hint: "A bigger wallet is sold at the Hermit's Tent in the Forest.",
    });
    expect(walletOfferAt("plains", { limit: 1000 }, 9)?.status).toBe("owned");
  });

  it("points a hero who skipped ahead back to the shop with their next wallet", () => {
    const ware = walletOfferAt("mountains", { limit: 100 }, 20);
    expect(ware).toMatchObject({ status: "ahead", offer: null, price: 1250 });
    expect(ware?.note).toBe("A bigger wallet is sold at the Pegasus Ranch in the Plains.");
  });

  it("is null at a shop that sells no wallet", () => {
    expect(walletOfferAt("witchs-hut", { limit: 100 }, 1)).toBeNull();
    expect(walletOfferAt("hometown-market", { limit: 100 }, 1)).toBeNull();
  });

  it("treats a missing purse as the starting wallet", () => {
    expect(walletOfferAt("plains", undefined, 3)?.status).toBe("for-sale");
    expect(walletOfferAt("plains", null, undefined)?.status).toBe("locked");
  });
});

describe("shopHintFor", () => {
  it("names the shop and region of the next wallet", () => {
    expect(shopHintFor(undefined)).toBe("A bigger wallet is sold at the Pegasus Ranch in the Plains.");
    expect(shopHintFor({ limit: 300 })).toBe("A bigger wallet is sold at the Hermit's Tent in the Forest.");
    expect(shopHintFor({ limit: 500 })).toBe("A bigger wallet is sold at the Wrecked Ship on the Islands.");
    expect(shopHintFor({ limit: 1000 })).toBe("A bigger wallet is sold at the Crystal Caverns in the Mountains.");
    expect(shopHintFor({ limit: 2500 })).toBe("A bigger wallet is sold at the Pond of Life in the Sands.");
    expect(shopHintFor({ limit: 5000 })).toBe("A bigger wallet is sold at Theia City on the Moon.");
  });

  it("steps an odd old limit up to the next real tier", () => {
    expect(shopHintFor({ limit: 700 })).toBe("A bigger wallet is sold at the Wrecked Ship on the Islands.");
  });

  it("says so when the hero carries the biggest wallet", () => {
    expect(shopHintFor({ limit: 10000 })).toBe("You carry the biggest wallet there is.");
  });
});

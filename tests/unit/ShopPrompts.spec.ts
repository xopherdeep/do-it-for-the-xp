import { BUILDING_ACCENTS } from "@/components/organisms/RevealPrompt/revealPrompt";
import { walletOfferAt } from "@/lib/services/gp/walletShops";
import {
  atmNotice,
  clerkPrompt,
  purchaseFailure,
  purchaseReceipt,
  shopAccent,
  shopNotice,
  walletPitch,
  walletReceipt,
  walletRefusal,
} from "@/lib/services/shop/shopPrompts";

const voice = { shopkeeper: "Old Hermit", accent: "forest" };
const purse = (extra: object = {}) => ({ wallet: 100, savings: 0, debt: 0, hospitalBill: 0, limit: 100, ...extra });

describe("a shop's colour", () => {
  it("is the region's own, by the world the shop stands in", () => {
    expect(shopAccent("plains")).toBe("plains");
    expect(shopAccent("forest")).toBe("forest");
    expect(shopAccent("islands")).toBe("islands");
    expect(shopAccent("swamps")).toBe("swamps");
    expect(shopAccent("mountains")).toBe("mountains");
    expect(shopAccent("clouds")).toBe("clouds");
    expect(shopAccent("moon")).toBe("moon");
  });

  it("calls the desert the sands and the ice the tundra", () => {
    expect(shopAccent("desert")).toBe("sands");
    expect(shopAccent("ice")).toBe("tundra");
  });

  it("is the general store's for Home Town, the balloon and anywhere without a colour", () => {
    expect(shopAccent("hometown")).toBe("accessoryShop");
    expect(shopAccent("traveling")).toBe("accessoryShop");
    expect(shopAccent("")).toBe("accessoryShop");
    expect(shopAccent(undefined)).toBe("accessoryShop");
  });

  it("always names a colour the prompt knows", () => {
    for (const world of ["hometown", "plains", "forest", "islands", "swamps", "mountains", "desert", "ice", "clouds", "moon", "traveling", "nowhere"]) {
      expect(BUILDING_ACCENTS[shopAccent(world)]).toBeTruthy();
    }
  });
});

describe("the clerk's menu", () => {
  it("has the clerk speak, then offer the shelves or the ATM, and Escape goes back to the shelves", () => {
    const prompt = clerkPrompt(voice, ["Welcome!", "Have a look."], true);
    expect(prompt).toMatchObject({ speaker: "Old Hermit", accent: "forest", lines: ["Welcome!", "Have a look."], cancelId: "browse" });
    expect(prompt.choices.map((choice) => choice.id)).toEqual(["browse", "atm"]);
    expect(prompt.choices.map((choice) => choice.label)).toEqual(["Browse the shelves", "Use the ATM"]);
  });

  it("gives every row an icon, not only the active one", () => {
    expect(clerkPrompt(voice, ["Hi"], true).choices.map((choice) => choice.icon)).toEqual(["shopping-bag", "hand-holding-usd"]);
    expect(clerkPrompt(voice, ["Closed."], false).choices.every((choice) => Boolean(choice.icon))).toBe(true);
  });

  it("offers nothing but OK behind a shut door", () => {
    const prompt = clerkPrompt(voice, ["Sorry, we're closed."], false);
    expect(prompt.choices.map((choice) => choice.id)).toEqual(["ok"]);
    expect(prompt.cancelId).toBe("ok");
  });
});

describe("notices", () => {
  it("speak as the shopkeeper by default and carry the shop's colour", () => {
    const notice = shopNotice(voice, "Come again!");
    expect(notice).toMatchObject({ speaker: "Old Hermit", accent: "forest", lines: ["Come again!"], cancelId: "ok" });
    expect(notice.choices).toEqual([{ id: "ok", label: "OK", icon: "check", tone: "primary" }]);
  });

  it("can speak as the ATM, in the shop's colour, with coins rising", () => {
    expect(atmNotice(voice, "Deposited.", { sprite: "coins", sound: "coins" })).toMatchObject({
      speaker: "ATM",
      accent: "forest",
      sprite: "coins",
      sound: "coins",
    });
  });
});

describe("the wallet on the shelf", () => {
  // Level 3 and 100 wallet: the Pegasus Ranch's wallet is the next one, price 150
  const ranch = (gp = purse(), level = 3) => walletOfferAt("pegasus-ranch", gp, level)!;

  it("pitches the wallet, coins rising, with Buy for the price and No thanks", () => {
    const prompt = walletPitch(voice, ranch(purse({ savings: 200 })), purse({ savings: 200 }), 3);
    expect(prompt.sprite).toBe("coins");
    expect(prompt.title).toBe("Bigger Wallet (₲300)");
    expect(prompt.lines[0]).toBe("Holds ₲300. That'll be ₲150, out of your savings first.");
    expect(prompt.choices.map((choice) => [choice.id, choice.label, choice.icon])).toEqual([
      ["yes", "Buy for ₲150", "coins"],
      ["no", "No thanks", "times"],
    ]);
    expect(prompt.cancelId).toBe("no");
  });

  it("says the hero is short, savings and all, instead of asking", () => {
    const gp = purse({ wallet: 100, savings: 20 });
    const prompt = walletPitch(voice, ranch(gp), gp, 3);
    expect(prompt.lines[0]).toBe("You are ₲30 short, savings and all. Come back when your purse is fuller!");
    expect(prompt.choices.map((choice) => choice.id)).toEqual(["ok"]);
    expect(prompt.sound).toBe("no");
  });

  it("sends a hero who is too small to come back at the level", () => {
    const gp = purse({ wallet: 100, savings: 200 });
    const prompt = walletPitch(voice, ranch(gp, 2), gp, 2);
    expect(prompt.lines[0]).toBe("Come back at level 3, kid.");
    expect(prompt.choices.map((choice) => choice.id)).toEqual(["ok"]);
  });

  it("says a hero already carries a bigger wallet, and where the next one is", () => {
    const gp = purse({ limit: 500 });
    const prompt = walletPitch(voice, ranch(gp), gp, 5);
    expect(prompt.lines[0]).toContain("You already carry a bigger wallet.");
    expect(prompt.choices.map((choice) => choice.id)).toEqual(["ok"]);
  });

  it("reads each refusal of the sale in a few words", () => {
    expect(walletRefusal({ ok: false, reason: "poor", offer: null, short: 12 })).toContain("₲12 short");
    expect(walletRefusal({ ok: false, reason: "locked", offer: { limit: 300, price: 150, minLevel: 3 }, short: 0 })).toBe("Come back at level 3, kid.");
    expect(walletRefusal({ ok: false, reason: "maxed", offer: null, short: 0 })).toBe("You already carry the biggest wallet there is.");
  });

  it("congratulates the hero with the coins rising and the fanfare", () => {
    const receipt = walletReceipt(voice, 300);
    expect(receipt).toMatchObject({ sprite: "coins", sound: "levelUp", lines: ["Your wallet now holds ₲300!"] });
    expect(receipt.choices[0].icon).toBeTruthy();
  });

  it("gives every choice an icon", () => {
    const gp = purse({ savings: 200 });
    expect(walletPitch(voice, ranch(gp), gp, 3).choices.every((choice) => Boolean(choice.icon))).toBe(true);
    expect(walletPitch(voice, ranch(gp, 2), gp, 2).choices.every((choice) => Boolean(choice.icon))).toBe(true);
  });
});

describe("a purchase off the shelf", () => {
  it("is received with the chest rising and the Game Master named as the one who delivers", () => {
    const receipt = purchaseReceipt(voice, "Moon Boots");
    expect(receipt).toMatchObject({ sprite: "chest", sound: "newItem", accent: "forest" });
    expect(receipt.lines[0]).toBe("Here you go: Moon Boots! The Game Master will bring it to you.");
    expect(receipt.choices[0].icon).toBe("gift");
  });

  it("says how much more GP is needed when the wallet fell short", () => {
    const failure = purchaseFailure(voice, "Moon Boots", 15);
    expect(failure.lines[0]).toBe("You need ₲15 more to buy Moon Boots. Come back when your purse is fuller!");
    expect(failure.sound).toBe("no");
    expect(failure.choices.every((choice) => Boolean(choice.icon))).toBe(true);
  });

  it("says nothing was bought when the till jammed", () => {
    const failure = purchaseFailure(voice, "Moon Boots", null);
    expect(failure.lines[0]).toContain("nothing was bought");
    expect(failure.sound).toBe("error");
  });
});

import {
  CARE_COSTS,
  HEAL_COST,
  quoteCare,
  readPool,
  REVIVE_COST,
  ROOM_COST,
} from "@/lib/services/hometown/Lodging";

const hero = (hp: number, mp: number, wallet: number, max = { hp: 42, mp: 20 }) => ({
  hp: { now: hp, max: max.hp },
  mp: { now: mp, max: max.mp },
  gp: { wallet, savings: 0, debt: 0, limit: 1000 },
});

describe("Lodging price list", () => {
  it("publishes the three prices", () => {
    expect(HEAL_COST).toBe(50);
    expect(REVIVE_COST).toBe(100);
    expect(ROOM_COST).toBe(10);
    expect(CARE_COSTS).toEqual({ heal: 50, revive: 100, room: 10 });
  });
});

describe("quoteCare", () => {
  it("heal fills HP only, for 50 GP", () => {
    expect(quoteCare("heal", hero(10, 5, 60))).toEqual({
      kind: "heal", cost: 50, hpGain: 32, mpGain: 0, canPay: true,
    });
  });

  it("revive fills HP and MP, for 100 GP", () => {
    expect(quoteCare("revive", hero(0, 0, 100))).toEqual({
      kind: "revive", cost: 100, hpGain: 42, mpGain: 20, canPay: true,
    });
  });

  it("a night in a room fills HP and MP, inn-style, for 10 GP", () => {
    expect(quoteCare("room", hero(0, 0, 10))).toEqual({
      kind: "room", cost: 10, hpGain: 42, mpGain: 20, canPay: true,
    });
    // close to full: only the missing part
    expect(quoteCare("room", hero(40, 20, 10))).toMatchObject({ hpGain: 2, mpGain: 0, canPay: true });
  });

  it("refuses with 'poor' when the wallet is short", () => {
    expect(quoteCare("heal", hero(1, 1, 49))).toEqual({
      kind: "heal", cost: 50, hpGain: 41, mpGain: 0, canPay: false, reason: "poor",
    });
    expect(quoteCare("revive", hero(0, 0, 99)).reason).toBe("poor");
    expect(quoteCare("room", hero(0, 0, 9)).reason).toBe("poor");
  });

  it("refuses with 'healthy' when nothing would change, even with an empty wallet", () => {
    expect(quoteCare("heal", hero(42, 0, 0))).toEqual({
      kind: "heal", cost: 50, hpGain: 0, mpGain: 0, canPay: false, reason: "healthy",
    });
    expect(quoteCare("room", hero(42, 20, 0)).reason).toBe("healthy");
    expect(quoteCare("revive", hero(42, 20, 999)).reason).toBe("healthy");
    // heal cares about HP only: full HP with empty MP is still "healthy" at the hospital's heal desk
    expect(quoteCare("heal", hero(42, 0, 999)).reason).toBe("healthy");
    // but revive would restore the MP
    expect(quoteCare("revive", hero(42, 0, 999))).toMatchObject({ hpGain: 0, mpGain: 20, canPay: true });
  });

  it("reads old saves: bare numbers, missing pools, top-level maxHp/maxMp, missing gp", () => {
    expect(readPool(undefined)).toEqual({ now: 100, max: 100 });
    expect(readPool(30)).toEqual({ now: 30, max: 100 });
    expect(readPool({ now: 500, max: 100 })).toEqual({ now: 100, max: 100 });
    expect(readPool({ now: 5, max: 50 }, 80)).toEqual({ now: 5, max: 80 });
    expect(quoteCare("heal", { hp: 10, maxHp: 60, gp: { wallet: 50 } })).toMatchObject({ hpGain: 50, canPay: true });
    expect(quoteCare("heal", { hp: { now: 10, max: 60 } })).toMatchObject({ hpGain: 50, canPay: false, reason: "poor" });
    expect(quoteCare("room", undefined)).toMatchObject({ canPay: false, reason: "healthy" });
    expect(quoteCare("room", null)).toMatchObject({ canPay: false, reason: "healthy" });
  });
});

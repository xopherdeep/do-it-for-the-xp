import {
  BENCH_REST_SHARE,
  benchRestedToday,
  CARE_COSTS,
  HEAL_COST,
  quoteBedRest,
  quoteBenchRest,
  quoteCare,
  readPool,
  REVIVE_COST,
  ROOM_BASE_COST,
  ROOM_COST,
  ROOM_COST_PER_LEVEL,
  roomCost,
} from "@/lib/services/hometown/Lodging";

const hero = (hp: number, mp: number, wallet: number, max = { hp: 42, mp: 20 }) => ({
  hp: { now: hp, max: max.hp },
  mp: { now: mp, max: max.mp },
  gp: { wallet, savings: 0, debt: 0, limit: 1000 },
});

const tired = { hp: { now: 10, max: 40 }, mp: { now: 0, max: 30 } };

describe("Lodging price list", () => {
  it("publishes the three prices", () => {
    expect(HEAL_COST).toBe(50);
    expect(REVIVE_COST).toBe(100);
    expect(ROOM_COST).toBe(10);
    expect(CARE_COSTS).toEqual({ heal: 50, revive: 100, room: 10 });
  });

  it("prices the room by level", () => {
    expect(ROOM_BASE_COST).toBe(10);
    expect(ROOM_COST_PER_LEVEL).toBe(5);
    expect(ROOM_COST).toBe(ROOM_BASE_COST);
    expect(roomCost(1)).toBe(15);
    expect(roomCost(8)).toBe(50);
    expect(roomCost(0)).toBe(15);
    expect(roomCost(8.9)).toBe(50);
    expect(quoteCare("room", { ...tired, gp: { wallet: 100 } }, 8).cost).toBe(50);
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

  it("a night in a room fills HP and MP, inn-style, for roomCost(1) GP", () => {
    expect(quoteCare("room", hero(0, 0, roomCost(1)))).toEqual({
      kind: "room", cost: 15, hpGain: 42, mpGain: 20, canPay: true,
    });
    // close to full: only the missing part
    expect(quoteCare("room", hero(40, 20, roomCost(1)))).toMatchObject({ hpGain: 2, mpGain: 0, canPay: true });
  });

  it("refuses with 'poor' when the wallet is short", () => {
    expect(quoteCare("heal", hero(1, 1, 49))).toEqual({
      kind: "heal", cost: 50, hpGain: 41, mpGain: 0, canPay: false, reason: "poor",
    });
    expect(quoteCare("revive", hero(0, 0, 99)).reason).toBe("poor");
    expect(quoteCare("room", hero(0, 0, roomCost(1) - 1)).reason).toBe("poor");
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

describe("quoteBedRest: the home bed, once a local day", () => {
  it("lets the hero sleep once a local day", () => {
    expect(quoteBedRest(tired, null)).toEqual({ hpGain: 30, mpGain: 30, canRest: true });
    const late = new Date(2026, 9, 13, 23, 59);
    expect(quoteBedRest(tired, late.toISOString(), new Date(2026, 9, 13, 23, 59, 30)).reason).toBe("rested");
    expect(quoteBedRest(tired, late.toISOString(), new Date(2026, 9, 14, 0, 1)).canRest).toBe(true);
  });

  it("keeps the gains in the refusal, so the screen can show what a night would give", () => {
    const noon = new Date(2026, 9, 13, 12, 0, 0);
    expect(quoteBedRest(tired, noon.toISOString(), noon)).toEqual({ hpGain: 30, mpGain: 30, canRest: false, reason: "rested" });
  });

  it("says healthy before rested", () => {
    expect(quoteBedRest({ hp: { now: 40, max: 40 }, mp: { now: 30, max: 30 } }, new Date().toISOString()).reason).toBe("healthy");
  });

  it("is open when only MP is missing", () => {
    expect(quoteBedRest({ hp: { now: 40, max: 40 }, mp: { now: 5, max: 30 } }, null)).toEqual({ hpGain: 0, mpGain: 25, canRest: true });
  });
});

describe("quoteBenchRest: the free nap on the Hospital bench", () => {
  const noon = new Date(2026, 9, 10, 12, 0, 0);

  it("restores a quarter of max HP for nothing", () => {
    expect(BENCH_REST_SHARE).toBe(0.25);
    expect(quoteBenchRest(hero(1, 0, 0, { hp: 100, mp: 20 }), null, noon)).toEqual({ hpGain: 25, canRest: true });
    // a hero who limped home from a lost fight with 1 HP and 0 GP is never stuck
    expect(quoteBenchRest(hero(1, 0, 0), undefined, noon)).toEqual({ hpGain: 11, canRest: true }); // round(42 * 0.25)
  });

  it("never heals past max and always at least 1 HP", () => {
    expect(quoteBenchRest(hero(40, 0, 0), null, noon)).toEqual({ hpGain: 2, canRest: true });
    expect(quoteBenchRest(hero(1, 0, 0, { hp: 2, mp: 1 }), null, noon)).toEqual({ hpGain: 1, canRest: true });
  });

  it("is refused with 'healthy' at full HP, before anything else", () => {
    expect(quoteBenchRest(hero(42, 0, 0), noon.toISOString(), noon)).toEqual({
      hpGain: 0, canRest: false, reason: "healthy",
    });
  });

  it("is once a day: refused with 'rested' after a nap the same local day, open again tomorrow", () => {
    const earlier = new Date(2026, 9, 10, 0, 30, 0).toISOString();
    expect(quoteBenchRest(hero(1, 0, 0), earlier, noon)).toEqual({ hpGain: 11, canRest: false, reason: "rested" });

    const yesterday = new Date(2026, 9, 9, 23, 59, 0).toISOString();
    expect(quoteBenchRest(hero(1, 0, 0), yesterday, noon)).toEqual({ hpGain: 11, canRest: true });
  });

  it("treats a missing or unreadable stamp as never rested", () => {
    expect(benchRestedToday(null, noon)).toBe(false);
    expect(benchRestedToday("", noon)).toBe(false);
    expect(benchRestedToday("not a date", noon)).toBe(false);
    expect(benchRestedToday(noon.toISOString(), noon)).toBe(true);
    expect(quoteBenchRest(hero(1, 0, 0), "not a date", noon).canRest).toBe(true);
  });

  it("reads old saves that store HP as a bare number", () => {
    expect(quoteBenchRest({ hp: 3, maxHp: 40 }, null, noon)).toEqual({ hpGain: 10, canRest: true });
  });
});

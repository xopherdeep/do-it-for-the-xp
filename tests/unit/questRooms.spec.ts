import {
  QUEST_TIERS,
  TEMPLE_FULL_SIZE,
  TIER_ATTACK_FACTOR,
  questTier,
  templeSize,
  tierAttackFactor,
} from "@/lib/services/temples/questRooms";

describe("questTier", () => {
  it("makes difficulty 1 and 2 a monster, 3 to 5 a miniboss, 8 and up a boss", () => {
    expect([1, 2].map(questTier)).toEqual(["monster", "monster"]);
    expect([3, 5].map(questTier)).toEqual(["miniboss", "miniboss"]);
    expect([8, 13, 21, 34, 55, 89, 144].map(questTier)).toEqual(Array(7).fill("boss"));
  });

  it("rounds a legacy in-between value down to the tier below", () => {
    expect(questTier(4)).toBe("miniboss");
    expect(questTier(6)).toBe("miniboss");
    expect(questTier(7)).toBe("miniboss");
    expect(questTier(9)).toBe("boss");
    expect(questTier(12)).toBe("boss");
    expect(questTier(2.5)).toBe("monster");
    expect(questTier(7.9)).toBe("miniboss");
  });

  it("treats an unset or broken difficulty as the smallest tier", () => {
    expect(questTier(0)).toBe("monster");
    expect(questTier(-3)).toBe("monster");
    expect(questTier(undefined)).toBe("monster");
    expect(questTier(NaN)).toBe("monster");
    expect(questTier(Number("3"))).toBe("miniboss");
  });

  it("lists the tiers weakest first", () => {
    expect(QUEST_TIERS).toEqual(["monster", "miniboss", "boss"]);
  });
});

describe("tierAttackFactor", () => {
  it("is 1 for a monster, 1.2 for a miniboss and 1.5 for a boss", () => {
    expect(tierAttackFactor("monster")).toBe(1);
    expect(tierAttackFactor("miniboss")).toBe(1.2);
    expect(tierAttackFactor("boss")).toBe(1.5);
    expect(TIER_ATTACK_FACTOR).toEqual({ monster: 1, miniboss: 1.2, boss: 1.5 });
  });

  it("only ever makes a beast hit harder as the tier climbs", () => {
    const factors = QUEST_TIERS.map(tierAttackFactor);
    expect([...factors].sort((a, b) => a - b)).toEqual(factors);
    expect(factors[0]).toBe(1);
  });
});

describe("templeSize", () => {
  it("is the sum of the difficulties of the rooms' quests", () => {
    const size = templeSize([{ difficulty: 3 }, { difficulty: 5 }, { difficulty: 13 }]);
    expect(size.total).toBe(21);
    expect(size.awake).toBe(21);
    expect(size.dormant).toBe(0);
    expect(size.dormantRooms).toBe(0);
  });

  it("is zero for a temple without quest rooms", () => {
    expect(templeSize([])).toEqual({ total: 0, awake: 0, dormant: 0, dormantRooms: 0, isFull: false });
  });

  it("counts a dormant room by its template difficulty and tells how much of the size it is", () => {
    const size = templeSize([{ difficulty: 5 }, { difficulty: 8, dormant: true }, { difficulty: 2, dormant: true }]);
    expect(size.total).toBe(15);
    expect(size.awake).toBe(5);
    expect(size.dormant).toBe(10);
    expect(size.dormantRooms).toBe(2);
  });

  it("is full at 21 and over, and not before", () => {
    expect(TEMPLE_FULL_SIZE).toBe(21);
    expect(templeSize([{ difficulty: 13 }, { difficulty: 5 }, { difficulty: 3 }]).isFull).toBe(true); // 21
    expect(templeSize([{ difficulty: 13 }, { difficulty: 8 }, { difficulty: 5 }]).isFull).toBe(true); // 26
    expect(templeSize([{ difficulty: 13 }, { difficulty: 5 }, { difficulty: 2 }]).isFull).toBe(false); // 20
  });

  it("lets dormant rooms fill the temple, since they count with their template difficulty", () => {
    expect(templeSize([{ difficulty: 13 }, { difficulty: 8, dormant: true }]).isFull).toBe(true);
  });

  it("counts a room with an unset or broken difficulty as nothing", () => {
    const size = templeSize([{ difficulty: 3 }, { difficulty: NaN }, { difficulty: -4 }, {} as { difficulty: number }]);
    expect(size.total).toBe(3);
  });

  it("reads a legacy value as it stands, without rounding it to a tier", () => {
    expect(templeSize([{ difficulty: 4 }, { difficulty: 7 }]).total).toBe(11);
  });
});

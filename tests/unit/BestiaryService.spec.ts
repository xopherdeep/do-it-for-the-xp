import { BestiaryService, MAX_BG_INDEX, TOTAL_BEAST_AVATARS } from "@/lib/services/battle/BestiaryService";

jest.mock("@/lib/databases/BestiaryDb", () => {
  class MockBestiaryDb {
    getBeasts = jest.fn().mockResolvedValue([]);
    getBeastById = jest.fn().mockResolvedValue(null);
  }
  return {
    __esModule: true,
    default: MockBestiaryDb,
    beastStorage: {},
  };
});

describe("BestiaryService", () => {
  it("creates a sample enemy with a random beast avatar and battle background layers", () => {
    const service = new BestiaryService();
    const enemy = service.createSampleEnemy();

    expect(enemy.name).toBe("Training Dummy");
    expect(enemy.id).toBe("sample");
    expect(typeof enemy.avatar).toBe("number");
    expect(enemy.avatar).toBeGreaterThanOrEqual(1);
    expect(enemy.avatar).toBeLessThanOrEqual(TOTAL_BEAST_AVATARS);
    expect(typeof enemy.bg1).toBe("number");
    expect(enemy.bg1).toBeGreaterThanOrEqual(0);
    expect(enemy.bg1).toBeLessThanOrEqual(MAX_BG_INDEX);
    expect(typeof enemy.bg2).toBe("number");
    expect(enemy.bg2).toBeGreaterThanOrEqual(0);
    expect(enemy.bg2).toBeLessThanOrEqual(MAX_BG_INDEX);
    expect(enemy.tasks).toHaveLength(2);
  });
});

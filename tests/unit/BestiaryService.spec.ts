import { BestiaryService, MAX_BG_INDEX, TOTAL_BEAST_AVATARS } from "@/lib/services/battle/BestiaryService";

jest.mock("@/lib/databases/BestiaryDb", () => {
  // Like the real BestiaryDb: an id it does not know is answered with a blank beast, never with nothing
  const blank = { id: "new", name: "", checklist: [], achievementIds: [] };
  class MockBestiaryDb {
    getBeasts = jest.fn().mockResolvedValue([]);
    getBeastById = jest.fn().mockImplementation(async (id: string) => (id === "known" ? { id, name: "Cushion Croc", checklist: ["Fluff"], avatar: 7 } : blank));
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

  it("loads a beast the bestiary holds", async () => {
    const enemy = await new BestiaryService().loadBeastById("known");
    expect(enemy?.name).toBe("Cushion Croc");
    expect(enemy?.avatar).toBe(7);
  });

  it("answers null for an id the bestiary does not know, never a blank beast with the fallback emoji", async () => {
    // The temple battle falls back to the library's beast (or the room's stand-in) only on null
    expect(await new BestiaryService().loadBeastById("beast-cushion-croc")).toBeNull();
  });
});

import { BestiaryService, MAX_BG_INDEX, TOTAL_BEAST_AVATARS } from "@/lib/services/battle/BestiaryService";
import type { Beast } from "@/lib/databases/BestiaryDb";

jest.mock("@/lib/databases/BestiaryDb", () => {
  // Like the real BestiaryDb: an id it does not know is answered with a blank beast, never with nothing
  const blank = { id: "new", name: "", checklist: [], achievementIds: [] };
  const { isLiveBeast } = jest.requireActual("@/lib/services/creations/creations");
  class MockBestiaryDb {
    getBeasts = jest.fn().mockResolvedValue([]);
    // Like the real one: the stored beasts, less the ones a hero proposed that no Game Master has approved
    getLiveBeasts = jest.fn(async () => (await this.getBeasts()).filter(isLiveBeast));
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

  describe("a beast a hero proposed", () => {
    // The proposed beast is first and the approved one last, so a pick that reads the unfiltered list lands on the
    // proposed one at Math.random 0 and a pick that reads the live list lands on the live ones at 0 and at 0.99
    const proposed: Beast = { id: "beast-proposed", name: "Proposed Pal", checklist: [], proposal: { by: "ronan", on: "2026-10-27T10:00:00.000Z", state: "proposed" } };
    const approved: Beast = { id: "beast-approved", name: "Approved Pal", checklist: [], proposal: { by: "ronan", on: "2026-10-27T10:00:00.000Z", state: "approved" } };
    const serviceHolding = (beasts: Beast[]) => {
      const service = new BestiaryService();
      ((service as any).bestiary.getBeasts as jest.Mock).mockResolvedValue(beasts);
      return service;
    };

    afterEach(() => jest.restoreAllMocks());

    it("loadRandomBeast never picks a proposed beast", async () => {
      const service = serviceHolding([proposed, approved]);
      const random = jest.spyOn(Math, "random");
      for (const roll of [0, 0.99]) {
        random.mockReturnValue(roll);
        expect((await service.loadRandomBeast())?.name).toBe("Approved Pal");
      }
    });

    it("loadRandomBeast finds nothing to fight when every beast is still proposed", async () => {
      expect(await serviceHolding([proposed]).loadRandomBeast()).toBeNull();
    });

    it("listBeasts leaves it out for the temple rooms", async () => {
      const listed = await serviceHolding([proposed, approved]).listBeasts();
      expect(listed.map((beast) => beast.name)).toEqual(["Approved Pal"]);
    });
  });
});

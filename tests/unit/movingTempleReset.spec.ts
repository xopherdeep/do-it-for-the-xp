/**
 * Rebuilding the Old House moves its rooms, so every hero's saved walk through it is forgotten first: one clear per
 * hero for the temple's id, and a hero whose clear fails never stops the others. Once the new house is loaded, the run
 * a hero left in memory is dropped too (TempleQuestRooms.spec proves the engine side: the next visit starts afresh).
 */
import { MOVING_TEMPLE_ID } from "@/lib/services/core/packs/movingTemple";
import { forgetOldHouseRun, forgetOldHouseWalks } from "@/lib/services/core/packs/movingTempleReset";
import debug from "@/lib/utils/debug";

const mockForgetTempleRun = jest.fn();
jest.mock("@/lib/engine/core/dungeons/TempleSystem", () => ({
  __esModule: true,
  TempleSystem: { getInstance: () => ({ forgetTempleRun: mockForgetTempleRun }) },
}));
jest.mock("@/lib/databases/TempleProgressDb", () => ({ __esModule: true, getTempleProgressDb: jest.fn() }));
jest.mock("@/lib/utils/debug", () => ({ __esModule: true, default: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() } }));

describe("forgetOldHouseWalks", () => {
  beforeEach(() => jest.clearAllMocks());

  it("clears each hero's walk through the Old House once", async () => {
    const db = { clearProgress: jest.fn().mockResolvedValue(undefined) };
    await forgetOldHouseWalks(["dad", "twelve", "out-kid"], db);

    expect(db.clearProgress).toHaveBeenCalledTimes(3);
    for (const hero of ["dad", "twelve", "out-kid"]) {
      expect(db.clearProgress).toHaveBeenCalledWith(hero, MOVING_TEMPLE_ID);
    }
    expect(MOVING_TEMPLE_ID).toBe("gen-move-house");
  });

  it("keeps clearing the others when one hero's clear fails, and says so without throwing", async () => {
    const db = {
      clearProgress: jest.fn().mockImplementation(async (hero: string) => {
        if (hero === "twelve") throw new Error("storage is full");
      }),
    };

    await expect(forgetOldHouseWalks(["dad", "twelve", "out-kid"], db)).resolves.toBeUndefined();
    expect(db.clearProgress).toHaveBeenCalledTimes(3);
    expect(debug.warn).toHaveBeenCalledTimes(1);
  });

  it("does nothing for a family with no heroes", async () => {
    const db = { clearProgress: jest.fn() };
    await expect(forgetOldHouseWalks([], db)).resolves.toBeUndefined();
    expect(db.clearProgress).not.toHaveBeenCalled();
  });
});

describe("forgetOldHouseRun", () => {
  beforeEach(() => jest.clearAllMocks());

  it("drops the Old House run held in memory, and no other temple's", () => {
    const temples = { forgetTempleRun: jest.fn() };
    forgetOldHouseRun(temples);
    expect(temples.forgetTempleRun).toHaveBeenCalledTimes(1);
    expect(temples.forgetTempleRun).toHaveBeenCalledWith(MOVING_TEMPLE_ID);
  });

  it("asks the app's temple system when it is given none", () => {
    forgetOldHouseRun();
    expect(mockForgetTempleRun).toHaveBeenCalledWith(MOVING_TEMPLE_ID);
  });
});

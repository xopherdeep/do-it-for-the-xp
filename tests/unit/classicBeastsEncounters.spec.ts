import { loadEncounter } from "@/app/Console/BattleField/battle/encounterLoader";
import { WORLD_REGIONS } from "@/app/Console/BattleField/battle/battleContext";
import type { BattleContext } from "@/app/Console/BattleField/battle/battleContext";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { BestiaryService } from "@/lib/services/battle/BestiaryService";
import { CLASSIC_BEASTS, isClassicBeastId } from "@/lib/services/core/classicBeasts";
import { STARTER_BEASTS } from "@/lib/services/core/StarterWorld";
import { pickRoomBeast } from "@/lib/services/temples/RoomBeast";

/**
 * The classic beasts are for picking, never for chance: a free fight's random beast and a temple room's beast by
 * element must skip them, while a quest or a room that names one still gets it.
 */

const mockBestiary: { beasts: Beast[] } = { beasts: [] };

jest.mock("@/lib/databases/TempleDb", () => ({
  __esModule: true,
  default: { getTempleById: jest.fn() },
  templeStorage: {},
  TempleDb: class {},
}));
jest.mock("@/lib/databases/AchievementDb", () => ({
  __esModule: true,
  default: class {
    getTaskById = jest.fn().mockResolvedValue(null);
  },
  achievementStorage: {},
}));
jest.mock("@/lib/databases/BestiaryDb", () => {
  class MockBestiaryDb {
    getBeasts = jest.fn(async () => mockBestiary.beasts);
    getLiveBeasts = jest.fn(async () => mockBestiary.beasts);
    getBeastById = jest.fn(async (id: string) => mockBestiary.beasts.find((b) => String(b.id) === id) ?? null);
  }
  return { __esModule: true, default: MockBestiaryDb, beastStorage: {} };
});
jest.mock("@/lib/services/quests/QuestCompletionService", () => ({
  __esModule: true,
  questRewards: jest.fn().mockReturnValue(null),
}));
jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const freeFight = (region: string, beastIds: string[] = []): BattleContext => ({ kind: "free", userId: "hero", beastIds, region });

/** Every slot of a pool, so no random pick can hide a classic: Math.random sweeps 0 up to just under 1 */
const sweep = async <T>(pick: () => Promise<T>, steps = 400): Promise<T[]> => {
  const picked: T[] = [];
  const random = jest.spyOn(Math, "random");
  try {
    for (let step = 0; step < steps; step += 1) {
      random.mockReturnValue(step / steps);
      picked.push(await pick());
    }
  } finally {
    random.mockRestore();
  }
  return picked;
};

const chore = (id: string, element?: string): Beast => ({ id, name: id, checklist: ["a", "b", "c"], ...(element ? { element } : {}) });

describe("a free encounter", () => {
  const regions = ["", ...Object.keys(WORLD_REGIONS)];

  it("never draws a classic beast, in any region, from the starter world's whole bestiary", async () => {
    mockBestiary.beasts = STARTER_BEASTS;
    const service = new BestiaryService();
    for (const region of regions) {
      const encounters = await sweep(() => loadEncounter(freeFight(region), service));
      const enemyIds = encounters.flatMap((encounter) => encounter.enemies.map((enemy) => String(enemy.id)));
      expect(enemyIds.length).toBeGreaterThan(0);
      expect(enemyIds.some(isClassicBeastId)).toBe(false);
    }
  });

  it("falls back to the other beasts, not the classic ones, when a region has no beasts of its element", async () => {
    mockBestiary.beasts = [...CLASSIC_BEASTS, chore("beast-dish-goblin", "water"), chore("beast-family-made")];
    const service = new BestiaryService();
    const drawn = await sweep(async () => String((await service.loadRandomBeast("fire"))?.id));
    expect(new Set(drawn)).toEqual(new Set(["beast-dish-goblin", "beast-family-made"]));
    const anywhere = await sweep(async () => String((await service.loadRandomBeast())?.id));
    expect(anywhere.some(isClassicBeastId)).toBe(false);
  });

  it("finds no beast, so the training dummy fights, when the bestiary holds only classic beasts", async () => {
    mockBestiary.beasts = CLASSIC_BEASTS;
    const service = new BestiaryService();
    expect(await service.loadRandomBeast()).toBeNull();
    expect((await loadEncounter(freeFight("plains"), service)).enemies[0].id).toBe("sample");
  });

  it("still fights a classic beast a Game Master chose", async () => {
    mockBestiary.beasts = STARTER_BEASTS;
    const encounter = await loadEncounter(freeFight("", ["beast-classic-050"]), new BestiaryService());
    expect(encounter.enemies.map((enemy) => enemy.name)).toEqual(["Moanin Ronan"]);
  });
});

describe("a temple room's beast by element", () => {
  const elements = ["wind", "water", "earth", "fire", "light", "moon", "ice", "lightning", "shadow", "storm", "neutral", "none"];
  const room = (content: Room["content"] = {}, type = "monster"): Room => ({ type, content });

  it("never returns a classic beast, for any element or position", () => {
    for (const element of elements) {
      for (let row = 0; row < 12; row += 1) {
        for (let col = 0; col < 12; col += 1) {
          const picked = pickRoomBeast(room(), element, row, col, STARTER_BEASTS);
          if (picked) expect(isClassicBeastId(picked.id)).toBe(false);
        }
      }
    }
  });

  it("skips a classic beast even if one were given an element", () => {
    const tagged = CLASSIC_BEASTS.map((b) => ({ ...b, element: "neutral" }));
    const library = [chore("beast-cupboard-kobold", "neutral")];
    for (let step = 0; step < 20; step += 1) {
      expect(pickRoomBeast(room(), "neutral", step, 0, [...tagged, ...library])?.id).toBe("beast-cupboard-kobold");
    }
    expect(pickRoomBeast(room(), "neutral", 0, 0, tagged)).toBeNull();
  });

  it("still gives a room the classic beast its author chose", () => {
    const ronan = CLASSIC_BEASTS.find((b) => b.avatar === 50)!;
    expect(pickRoomBeast(room({ beasts: [String(ronan.id)] }), "fire", 0, 0, STARTER_BEASTS)?.name).toBe("Moanin Ronan");
  });
});

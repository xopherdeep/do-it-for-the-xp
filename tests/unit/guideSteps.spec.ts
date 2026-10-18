import {
  GUIDE_TEMPLES,
  nextGuideStep,
  nextTemple,
  normalPegasi,
  templeProgressOf,
  type GuideProgress,
} from "@/lib/services/guide/nextStep";
import { TEMPLE_METADATA } from "@/lib/engine/temples/templeRegistry";
import { WORLD_REGIONS } from "@/app/Console/BattleField/battle/battleContext";

const NONE = Array.from({ length: 9 }, () => false);

const start = (patch: Partial<GuideProgress> = {}): GuideProgress => ({
  questsSeen: false,
  shopSeen: false,
  champion: false,
  pegasi: NONE,
  temples: {},
  openQuests: 0,
  streakDays: 0,
  streakAtRisk: false,
  ...patch,
});

const freeing = (...indexes: number[]): boolean[] => NONE.map((_, i) => indexes.includes(i));

const ALL = NONE.map(() => true);

describe("Guide temple path", () => {
  it("names each temple, region and route as the registry and the region pages do", () => {
    for (const temple of GUIDE_TEMPLES) {
      const meta = TEMPLE_METADATA[temple.templeId];
      expect(meta).toBeDefined();
      expect(temple.place.replace(/^the /, "").toLowerCase()).toBe(meta.name.replace(/^The /, "").toLowerCase());
      expect(WORLD_REGIONS[meta.world].routeName).toBe(temple.route);
    }
  });

  it("covers all nine Pegasi once, the Wind Temple first", () => {
    expect(GUIDE_TEMPLES[0].templeId).toBe("wind-temple");
    expect(new Set(GUIDE_TEMPLES.map((temple) => temple.pegasus)).size).toBe(9);
  });

  it("points at the first temple whose Pegasus is still trapped", () => {
    expect(nextTemple(NONE)?.pegasusName).toBe("Aura");
    expect(nextTemple(freeing(3))?.pegasusName).toBe("Terra");
    expect(nextTemple(ALL)).toBeNull();
  });
});

describe("normalPegasi / templeProgressOf", () => {
  it("reads lists, old index-keyed maps and nothing", () => {
    expect(normalPegasi([true])).toEqual(freeing(0));
    expect(normalPegasi({ 3: true })).toEqual(freeing(3));
    expect(normalPegasi(undefined)).toEqual(NONE);
  });

  it("does not count the cleared mark as a room", () => {
    expect(templeProgressOf({ visitedRooms: ["1F:2,5"], clearedRooms: ["temple:cleared"] })).toEqual({
      visitedRooms: 1,
      clearedRooms: 0,
      cleared: true,
    });
  });
});

describe("nextGuideStep", () => {
  it("walks a new hero from the Beast Log to the first Pegasus", () => {
    expect(nextGuideStep(start()).id).toBe("quests");

    const walk = nextGuideStep(start({ questsSeen: true }));
    expect(walk.id).toBe("walk-to-temple");
    expect(walk.go).toEqual({ kind: "route", name: "world-plains" });

    const entered = { "wind-temple": { visitedRooms: 1, clearedRooms: 0, cleared: false } };
    const room = nextGuideStep(start({ questsSeen: true, temples: entered }));
    expect(room.id).toBe("first-room");
    expect(room.go).toEqual({ kind: "route", name: "world-plains" });

    const explored = { "wind-temple": { visitedRooms: 3, clearedRooms: 1, cleared: false } };
    expect(nextGuideStep(start({ questsSeen: true, temples: explored })).title).toBe("Free Aura");
  });

  it("sends a hero who just freed Aura to the shop, then to the next temple", () => {
    const shop = nextGuideStep(start({ questsSeen: true, pegasi: freeing(3) }));
    expect(shop.id).toBe("shop");
    expect(shop.freed).toBe(1);

    const fly = nextGuideStep(start({ questsSeen: true, shopSeen: true, pegasi: freeing(3) }));
    expect(fly.id).toBe("fly-to-temple");
    expect(fly.title).toBe("Fly to the Rootvault Hollow");
    expect(fly.go).toEqual({ kind: "route", name: "world-map" });

    const inside = { "earth-temple": { visitedRooms: 1, clearedRooms: 0, cleared: false } };
    const free = nextGuideStep(start({ questsSeen: true, shopSeen: true, pegasi: freeing(3), temples: inside }));
    expect(free.title).toBe("Free Terra");
    expect(free.go).toEqual({ kind: "route", name: "world-forest" });
  });

  it("skips the Beast Log step for a hero who already flies", () => {
    expect(nextGuideStep(start({ pegasi: freeing(3), shopSeen: true })).id).toBe("fly-to-temple");
  });

  it("celebrates once all nine are free", () => {
    const step = nextGuideStep(start({ questsSeen: true, shopSeen: true, pegasi: ALL }));
    expect(step.id).toBe("champion");
    expect(step.go).toEqual({ kind: "celebrate" });
  });

  it("never runs out after the celebration", () => {
    const champion = start({ questsSeen: true, shopSeen: true, pegasi: ALL, champion: true });
    expect(nextGuideStep({ ...champion, streakAtRisk: true, streakDays: 4 }).title).toBe("Save your 4-day streak");
    expect(nextGuideStep({ ...champion, openQuests: 2 }).title).toBe("Beat today's beasts (2 left)");
    const rest = nextGuideStep({ ...champion, streakDays: 5 });
    expect(rest.id).toBe("rest");
    expect(rest.lines.join(" ")).toContain("6 days");
    expect(rest.champion).toBe(true);
  });
});

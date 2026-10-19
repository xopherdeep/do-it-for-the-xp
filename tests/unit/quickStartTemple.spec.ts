/**
 * Quick Start makes the Howling Spire live (owner 2026-10-18, "set world, wake on arrival"): tonight's three quests go
 * into the Spire's first three monster rooms in walking order, one per room, the way a pack's quests sit in a room
 * (`content.questIds`); the other monster rooms wake their sleeping templates for every Quick Start hero, as the Temple
 * Quests tab would (planWake, Solo Missions starting this Monday); miniboss and boss rooms stay asleep for the Game
 * Master. The plan is pure; `runQuickStartTemple` writes only through the writers it is handed.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { TempleInterface } from "@/lib/databases/TempleDb";
import type { Room } from "@/lib/engine/core/dungeons/types";
import type { HeroQuestEffects } from "@/lib/engine/quests/QuestSchedule";
import windTemple from "@/lib/engine/temples/wind-temple";
import { QUICK_START_PACK } from "@/lib/services/core/packs/catalog/quickStart";
import { roomQuestIds } from "@/lib/services/temples/questRooms";
import {
  QUICK_START_QUEST_IDS,
  QUICK_START_TEMPLE_ID,
  quickStartTemplePlan,
  runQuickStartTemple,
  type QuickStartTempleDeps,
} from "@/lib/services/temples/quickStartTemple";
import { wasWokenFor, type HeroProfile } from "@/lib/services/temples/wakeOnEntry";
import { planWake } from "@/lib/services/temples/wakeTempleQuests";

const KIA = "hero-1";
const MIA = "hero-2";
const WED = new Date("2026-10-14T15:30:00");
const MONDAY = new Date("2026-10-12T00:00:00");

type Layout = NonNullable<TempleInterface["dungeonLayout"]>;

/** A fresh copy of the shipped Howling Spire, so no spec can change the one in code */
const spire = (): Layout => JSON.parse(JSON.stringify({ entrance: windTemple.entrance, maze: windTemple.maze, rooms: windTemple.rooms }));

const TONIGHT = ["quick-dishes", "quick-room", "quick-homework"];

const beastOf = (layout: Layout, symbol: string): string => String(layout.rooms[symbol].content?.quest?.beastId);

describe("the Quick Start quests and temple", () => {
  it("are tonight's three quests of the pack, and the Howling Spire", () => {
    expect(QUICK_START_QUEST_IDS).toEqual(TONIGHT);
    expect(QUICK_START_PACK.content.quests?.map((quest) => quest.id)).toEqual(TONIGHT);
    expect(QUICK_START_TEMPLE_ID).toBe("wind-temple");
  });
});

describe("quickStartTemplePlan: tonight's quests in the Spire", () => {
  it("puts them in the first three monster rooms a hero walks into from the entrance, one per room", () => {
    const plan = quickStartTemplePlan(spire(), TONIGHT, [KIA, MIA], WED);
    // The entrance opens east onto the Mustwisp's room; its locked north door leads on to the Spill Sprite, then the Mailbox Mimic
    expect(plan.placed.map(({ questId, symbol }) => [questId, symbol])).toEqual([
      ["quick-dishes", "M0305"],
      ["quick-room", "M0204"],
      ["quick-homework", "M0203"],
    ]);
    expect(plan.placed.map((place) => place.key)).toEqual(["1F:5,3", "1F:4,2", "1F:3,2"]);
    expect(plan.unplaced).toEqual([]);
  });

  it("holds each quest the way a pack's quest sits in a room, and keeps the room's template beside it", () => {
    const plan = quickStartTemplePlan(spire(), TONIGHT, [KIA], WED);
    const room = plan.layout!.rooms.M0305;
    expect(room.content?.questIds).toEqual(["quick-dishes"]);
    expect(room.content?.questId).toBeUndefined();
    expect(room.content?.quest).toEqual(windTemple.rooms.M0305.content.quest);
    expect(room.type).toBe("monster");
    expect(room.sides).toEqual(windTemple.rooms.M0305.sides);
  });

  it("changes only those three rooms and keeps the entrance and the maze", () => {
    const before = spire();
    const plan = quickStartTemplePlan(before, TONIGHT, [KIA], WED);
    const changed = Object.keys(before.rooms).filter((symbol) => JSON.stringify(before.rooms[symbol]) !== JSON.stringify(plan.layout!.rooms[symbol]));
    expect(changed.sort()).toEqual(["M0203", "M0204", "M0305"]);
    expect(plan.layout!.entrance).toEqual(before.entrance);
    expect(plan.layout!.maze).toEqual(before.maze);
  });

  it("never changes the layout it is handed", () => {
    const before = spire();
    const copy = JSON.parse(JSON.stringify(before));
    quickStartTemplePlan(before, TONIGHT, [KIA], WED);
    expect(before).toEqual(copy);
  });

  it("passes over a room that already holds a quest", () => {
    const layout = spire();
    layout.rooms.M0305 = { ...layout.rooms.M0305, content: { ...layout.rooms.M0305.content, questIds: ["mums-own"] } };
    const plan = quickStartTemplePlan(layout, TONIGHT, [KIA], WED);
    expect(plan.placed.map((place) => place.symbol)).toEqual(["M0204", "M0203", "M0201"]);
    expect(plan.layout!.rooms.M0305.content?.questIds).toEqual(["mums-own"]);
  });

  it("passes over a room picked with a single questId too", () => {
    const layout = spire();
    layout.rooms.M0305 = { ...layout.rooms.M0305, content: { ...layout.rooms.M0305.content, questId: "mums-own" } };
    const plan = quickStartTemplePlan(layout, TONIGHT, [KIA], WED);
    expect(plan.placed.map((place) => place.symbol)).not.toContain("M0305");
  });

  it("does not place a quest the temple already holds, so a second run changes nothing", () => {
    const first = quickStartTemplePlan(spire(), TONIGHT, [KIA], WED);
    const second = quickStartTemplePlan(first.layout, TONIGHT, [KIA], WED);
    expect(second.placed).toEqual([]);
    expect(second.unplaced).toEqual([]);
    expect(second.layout).toBeNull();
  });

  it("never writes a room whose token other cells share (it would change every one of them)", () => {
    const layout = spire();
    // The Mustwisp's token now stands in two cells: the entrance's east room and the wall west of the entrance's west room
    (layout.maze as Record<string, string[][]>)["1F"][5][0] = "M0305";
    const plan = quickStartTemplePlan(layout, TONIGHT, [KIA], WED);
    expect(plan.placed.map((place) => place.symbol)).not.toContain("M0305");
    expect(plan.placed).toHaveLength(3);
  });

  it("lists the quests no free monster room was left for", () => {
    const plan = quickStartTemplePlan(spire(), [...TONIGHT, "a", "b", "c", "d"], [KIA], WED);
    // The Spire has six monster rooms
    expect(plan.placed).toHaveLength(6);
    expect(plan.unplaced).toEqual(["d"]);
  });

  it("places nothing in a layout with no rooms", () => {
    const plan = quickStartTemplePlan({ entrance: [0, 0], maze: [], rooms: {} }, TONIGHT, [KIA], WED);
    expect(plan.placed).toEqual([]);
    expect(plan.layout).toBeNull();
    expect(plan.unplaced).toEqual(TONIGHT);
    expect(quickStartTemplePlan(null, TONIGHT, [KIA], WED).placed).toEqual([]);
  });
});

describe("quickStartTemplePlan: the other monster rooms wake", () => {
  it("wakes the other monster rooms' templates for every Quick Start hero, starting this Monday", () => {
    const layout = spire();
    const plan = quickStartTemplePlan(layout, TONIGHT, [KIA, MIA], WED);
    expect(plan.wake.templeId).toBe("wind-temple");
    expect(plan.wake.heroIds).toEqual([KIA, MIA]);
    expect(plan.wake.now).toBe(WED);
    expect(plan.wake.templates.map((template) => template.beastId).sort()).toEqual(
      [beastOf(layout, "M0102"), beastOf(layout, "M0302"), beastOf(layout, "M0201")].sort()
    );
  });

  it("leaves the miniboss and boss rooms asleep for the Game Master, and wakes nothing in the rooms tonight's quests took", () => {
    const layout = spire();
    const woken = quickStartTemplePlan(layout, TONIGHT, [KIA], WED).wake.templates.map((template) => template.beastId);
    for (const symbol of ["m0402", "m0504", "B0401", "M0305", "M0204", "M0203"]) {
      expect(woken).not.toContain(beastOf(layout, symbol));
    }
  });

  it("makes Solo Missions for the heroes through planWake, as the Temple Quests tab would", () => {
    const plan = quickStartTemplePlan(spire(), TONIGHT, [KIA, MIA], WED);
    const wake = planWake({ ...plan.wake, quests: [], beasts: [] });
    expect(wake.problem).toBeNull();
    expect(wake.quests.map((quest) => quest.id).sort()).toEqual(
      ["tq-wind-temple-cushion-croc", "tq-wind-temple-crumb-crawler", "tq-wind-temple-gravel-gnome"].sort()
    );
    for (const quest of wake.quests) {
      expect(quest).toMatchObject({ type: "individual", assignee: [KIA, MIA] });
      expect(new Date(quest.startsOn)).toEqual(MONDAY);
      expect(quest.draft).toBeUndefined();
    }
  });

  it("does not wake a room that already holds a quest", () => {
    const layout = spire();
    layout.rooms.M0201 = { ...layout.rooms.M0201, content: { ...layout.rooms.M0201.content, questIds: ["mums-own"] } };
    const woken = quickStartTemplePlan(layout, TONIGHT, [KIA], WED).wake.templates.map((template) => template.beastId);
    expect(woken).not.toContain(beastOf(layout, "M0201"));
  });

  it("wakes a beast once however many rooms hold it", () => {
    const layout = spire();
    layout.rooms.M0102 = { ...layout.rooms.M0102, content: { ...layout.rooms.M0102.content, quest: { ...layout.rooms.M0302.content!.quest! } } };
    const woken = quickStartTemplePlan(layout, TONIGHT, [KIA], WED).wake.templates.map((template) => template.beastId);
    expect(woken.filter((id) => id === beastOf(layout, "M0302"))).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The writes
// ---------------------------------------------------------------------------------------------------------------------

interface Fakes {
  deps: QuickStartTempleDeps;
  records: TempleInterface[];
  quests: Achievement[];
  beasts: Beast[];
  effects: Record<string, HeroQuestEffects>;
  calls: string[];
}

const fakes = (record: TempleInterface | null, heroes: Record<string, HeroProfile> = { [KIA]: {}, [MIA]: {} }): Fakes => {
  const out: Fakes = { records: [], quests: [], beasts: [], effects: {}, calls: [], deps: undefined as unknown as QuickStartTempleDeps };
  out.deps = {
    ensureTemples: async () => {
      out.calls.push("ensureTemples");
    },
    readRecord: async () => record,
    saveRecord: async (saved) => {
      out.calls.push("saveRecord");
      out.records.push(saved);
    },
    readQuests: async () => out.quests,
    readBeasts: async () => out.beasts,
    writers: {
      saveBeast: async (beast) => {
        out.calls.push("saveBeast");
        out.beasts.push(beast);
      },
      saveQuest: async (quest) => {
        out.calls.push("saveQuest");
        out.quests.push(quest);
      },
    },
    hero: (id) => heroes[id],
    saveEffects: (id, effects) => {
      out.calls.push("saveEffects");
      out.effects[id] = effects;
    },
  };
  return out;
};

const spireRecord = (): TempleInterface => ({
  id: "wind-temple",
  customName: "Wind Temple",
  customDescription: "Masters of aerial magic",
  categoryIds: ["dungeon", "wind"],
  level: 1,
  seedSignature: "v1:abc",
  dungeonLayout: spire(),
});

describe("runQuickStartTemple", () => {
  it("writes the Spire's record once, with tonight's quests in their rooms and every other field kept", async () => {
    const f = fakes(spireRecord());
    const done = await runQuickStartTemple([KIA, MIA], f.deps, WED);
    expect(f.records).toHaveLength(1);
    const saved = f.records[0];
    expect(saved).toMatchObject({ id: "wind-temple", customName: "Wind Temple", categoryIds: ["dungeon", "wind"], seedSignature: "v1:abc" });
    expect(roomQuestIds(saved.dungeonLayout!.rooms.M0305 as Room)).toEqual(["quick-dishes"]);
    expect(done.placed.map((place) => place.questId)).toEqual(TONIGHT);
  });

  it("waits for the shipped temples to be in the TempleDb before reading the record", async () => {
    const f = fakes(spireRecord());
    await runQuickStartTemple([KIA], f.deps, WED);
    expect(f.calls[0]).toBe("ensureTemples");
  });

  it("wakes the other monster rooms for the heroes through commitWake: the beasts first, then the quests", async () => {
    const f = fakes(spireRecord());
    const done = await runQuickStartTemple([KIA, MIA], f.deps, WED);
    expect(done.woken.map((quest) => quest.id).sort()).toEqual(
      ["tq-wind-temple-cushion-croc", "tq-wind-temple-crumb-crawler", "tq-wind-temple-gravel-gnome"].sort()
    );
    expect(f.quests.every((quest) => !quest.draft)).toBe(true);
    expect(f.quests.every((quest) => JSON.stringify(quest.assignee) === JSON.stringify([KIA, MIA]))).toBe(true);
    const lastBeast = f.calls.lastIndexOf("saveBeast");
    const firstQuest = f.calls.indexOf("saveQuest");
    expect(lastBeast).toBeLessThan(firstQuest);
  });

  it("remembers the wake on each hero's questEffects, keeping what was there, so walking in later wakes nothing again", async () => {
    const f = fakes(spireRecord(), { [KIA]: { questEffects: { snoozedOn: { q1: "2026-10-14" } } }, [MIA]: {} });
    const done = await runQuickStartTemple([KIA, MIA], f.deps, WED);
    expect(done.remembered).toEqual([KIA, MIA]);
    expect(f.effects[KIA]).toMatchObject({ snoozedOn: { q1: "2026-10-14" } });
    expect(wasWokenFor(f.effects[KIA], "wind-temple", "1F", "1F")).toBe(true);
    expect(wasWokenFor(f.effects[MIA], "wind-temple", "1F", "1F")).toBe(true);
    expect(f.effects[MIA].templesWokenAt?.["wind-temple@1F"]).toBe(WED.toISOString());
    // Remembered last, after every quest is written
    expect(f.calls.lastIndexOf("saveQuest")).toBeLessThan(f.calls.indexOf("saveEffects"));
  });

  it("skips a hero the store does not have", async () => {
    const f = fakes(spireRecord(), { [KIA]: {} });
    const done = await runQuickStartTemple([KIA, MIA], f.deps, WED);
    expect(done.remembered).toEqual([KIA]);
  });

  it("with no record to write into, still wakes the heroes from the shipped layout", async () => {
    const f = fakes(null);
    const done = await runQuickStartTemple([KIA], f.deps, WED);
    expect(f.records).toEqual([]);
    expect(done.placed).toEqual([]);
    expect(done.woken.map((quest) => quest.id)).toContain("tq-wind-temple-gravel-gnome");
  });

  it("never writes over a quest the family already has", async () => {
    const f = fakes(spireRecord());
    const mine = { id: "tq-wind-temple-gravel-gnome", achievementName: "Mine", beastId: "beast-gravel-gnome", assignee: [KIA] } as unknown as Achievement;
    f.quests.push(mine);
    const done = await runQuickStartTemple([KIA, MIA], f.deps, WED);
    expect(done.woken.map((quest) => quest.id)).not.toContain("tq-wind-temple-gravel-gnome");
    expect(f.quests.filter((quest) => quest.id === "tq-wind-temple-gravel-gnome")).toEqual([mine]);
  });

  it("does nothing to the quests with no heroes", async () => {
    const f = fakes(spireRecord());
    const done = await runQuickStartTemple([], f.deps, WED);
    expect(done.woken).toEqual([]);
    expect(f.quests).toEqual([]);
  });

  it("a failed write stops the rest and throws, and nothing is remembered", async () => {
    const f = fakes(spireRecord());
    f.deps.writers.saveQuest = async () => {
      throw new Error("disk full");
    };
    await expect(runQuickStartTemple([KIA], f.deps, WED)).rejects.toThrow("disk full");
    expect(f.effects).toEqual({});
  });
});

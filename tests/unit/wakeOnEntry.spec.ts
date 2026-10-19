/**
 * Wake on entry (owner 2026-10-18, "set world, wake on arrival"): the first time a hero of the family walks into a
 * shipped temple, its sleeping monster templates wake for that hero, as the Temple Quests tab would wake them (Solo
 * Missions starting this Monday). A beast whose woken quest already exists for another hero takes this hero in (added
 * to its assignees) instead of a second quest. Miniboss and boss rooms never wake by themselves. The wake is
 * remembered per hero per temple on the hero's questEffects, so walking in again wakes nothing and a quest the Game
 * Master deleted is not made again. The plan is pure; only `commitEntryWake` writes, through the writers it is handed.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { Room } from "@/lib/engine/core/dungeons/types";
import type { HeroQuestEffects } from "@/lib/engine/quests/QuestSchedule";
import windTemple from "@/lib/engine/temples/wind-temple";
import type { QuestLayout } from "@/lib/services/temples/templeQuestRows";
import {
  WOKEN_TEMPLES_FIELD,
  commitEntryWake,
  entryWakeSkip,
  isShippedTemple,
  rememberWake,
  wakeOnEntryPlan,
  wakeTempleOnEntry,
  wasWokenFor,
  type EntryHero,
  type EntryWakeDeps,
  type EntryWakeInput,
} from "@/lib/services/temples/wakeOnEntry";
import { isWokenQuest, wakeQuestId } from "@/lib/services/temples/wakeTempleQuests";

const KIA = "hero-1";
const MIA = "hero-2";
const WED = new Date("2026-10-14T15:30:00");
const MONDAY = new Date("2026-10-12T00:00:00");

/** A fresh copy of the shipped Howling Spire */
const spire = (): QuestLayout & { entrance: number[] } =>
  JSON.parse(JSON.stringify({ entrance: windTemple.entrance, maze: windTemple.maze, rooms: windTemple.rooms }));

/** The six monster rooms' beasts, and the miniboss and boss rooms' */
const MONSTERS = ["beast-cushion-croc", "beast-gravel-gnome", "beast-crumb-crawler", "beast-mailbox-mimic", "beast-spill-sprite", "beast-mustwisp"];
const BIG_ONES = ["beast-dust-bunny-king", "beast-cobweb-widow", "beast-fluffalo"];

const hero = (overrides: Partial<EntryHero> = {}): EntryHero => ({ id: KIA, ...overrides });

const quest = (id: string, overrides: Partial<Achievement> = {}): Achievement =>
  ({
    id,
    achievementName: `Quest ${id}`,
    type: "individual",
    assignee: [MIA],
    basicSchedule: "daily",
    startsOn: "2026-01-01T00:00:00.000Z",
    endsOn: "",
    difficulty: 1,
    beastId: "beast-cushion-croc",
    ...overrides,
  }) as unknown as Achievement;

const input = (overrides: Partial<EntryWakeInput> = {}): EntryWakeInput => ({
  templeId: "wind-temple",
  isShipped: true,
  layout: spire(),
  hero: hero(),
  quests: [],
  beasts: [],
  now: WED,
  ...overrides,
});

const beastsOf = (quests: readonly Achievement[]) => quests.map((made) => String(made.beastId)).sort();

describe("remembering a wake", () => {
  it("is a temple id and the moment it woke, kept on the hero's questEffects beside the Powers' effects", () => {
    const effects = rememberWake({ snoozedOn: { q1: "2026-10-14" } }, "wind-temple", WED);
    expect(effects).toEqual({ snoozedOn: { q1: "2026-10-14" }, [WOKEN_TEMPLES_FIELD]: { "wind-temple": WED.toISOString() } });
    expect(wasWokenFor(effects, "wind-temple")).toBe(true);
    expect(wasWokenFor(effects, "fire-temple")).toBe(false);
  });

  it("adds a temple to the ones already woken and never changes the effects it is handed", () => {
    const before = { [WOKEN_TEMPLES_FIELD]: { "fire-temple": "2026-10-01T00:00:00.000Z" } };
    const after = rememberWake(before, "wind-temple", WED);
    expect(after[WOKEN_TEMPLES_FIELD]).toEqual({ "fire-temple": "2026-10-01T00:00:00.000Z", "wind-temple": WED.toISOString() });
    expect(before[WOKEN_TEMPLES_FIELD]).toEqual({ "fire-temple": "2026-10-01T00:00:00.000Z" });
  });

  it("reads nothing as woken from effects that are missing or not a record", () => {
    expect(wasWokenFor(undefined, "wind-temple")).toBe(false);
    expect(wasWokenFor(null, "wind-temple")).toBe(false);
    // A stored profile is family data: a broken field reads as nothing woken
    expect(wasWokenFor({ [WOKEN_TEMPLES_FIELD]: ["wind-temple"] } as unknown as HeroQuestEffects, "wind-temple")).toBe(false);
    expect(rememberWake(undefined, "wind-temple", WED)).toEqual({ [WOKEN_TEMPLES_FIELD]: { "wind-temple": WED.toISOString() } });
  });
});

describe("entryWakeSkip", () => {
  it("wakes only a shipped temple, for a hero of the family who was never woken there", () => {
    expect(entryWakeSkip({ templeId: "wind-temple", isShipped: true, hero: hero() })).toBeNull();
    expect(entryWakeSkip({ templeId: "gen-move-house", isShipped: false, hero: hero() })).toBe("notShipped");
    expect(entryWakeSkip({ templeId: "wind-temple", isShipped: true, hero: null })).toBe("noHero");
    expect(entryWakeSkip({ templeId: "wind-temple", isShipped: true, hero: hero({ isAdult: true }) })).toBe("gameMaster");
    const woken = hero({ questEffects: rememberWake({}, "wind-temple", WED) });
    expect(entryWakeSkip({ templeId: "wind-temple", isShipped: true, hero: woken })).toBe("alreadyWoken");
  });

  it("knows the nine shipped temples", () => {
    expect(isShippedTemple("wind-temple")).toBe(true);
    expect(isShippedTemple("shadow-temple")).toBe(true);
    expect(isShippedTemple("gen-move-house")).toBe(false);
    expect(isShippedTemple("my-own-temple")).toBe(false);
  });
});

describe("wakeOnEntryPlan", () => {
  it("wakes every monster room's template for the hero alone, Solo Missions starting this Monday", () => {
    const plan = wakeOnEntryPlan(input());
    expect(plan.skip).toBeNull();
    expect(beastsOf(plan.quests)).toEqual([...MONSTERS].sort());
    for (const made of plan.quests) {
      expect(made).toMatchObject({ type: "individual", assignee: [KIA], id: wakeQuestId("wind-temple", String(made.beastId)) });
      expect(new Date(made.startsOn)).toEqual(MONDAY);
      expect(made.draft).toBeUndefined();
    }
    expect(plan.joined).toEqual([]);
  });

  it("never wakes the miniboss or boss rooms", () => {
    const woken = beastsOf(wakeOnEntryPlan(input()).quests);
    for (const beastId of BIG_ONES) expect(woken).not.toContain(beastId);
  });

  it("never wakes a boss room or a miniboss room built so, whatever its template's difficulty", () => {
    const layout = spire();
    layout.rooms!.B0401 = { ...layout.rooms!.B0401, content: { ...layout.rooms!.B0401.content, quest: { ...layout.rooms!.B0401.content!.quest!, difficulty: 1 } } };
    expect(beastsOf(wakeOnEntryPlan(input({ layout })).quests)).not.toContain("beast-fluffalo");
  });

  it("never wakes a monster room whose template is a miniboss's", () => {
    const layout = spire();
    layout.rooms!.M0201 = { ...layout.rooms!.M0201, content: { ...layout.rooms!.M0201.content, quest: { ...layout.rooms!.M0201.content!.quest!, difficulty: 3 } } };
    expect(beastsOf(wakeOnEntryPlan(input({ layout })).quests)).not.toContain("beast-cushion-croc");
  });

  it("adopts the library's beasts the bestiary lacks", () => {
    const plan = wakeOnEntryPlan(input());
    expect(plan.beasts.map((beast) => String(beast.id)).sort()).toEqual([...MONSTERS].sort());
  });

  it("remembers the temple on the hero's questEffects, keeping their Powers' effects", () => {
    const plan = wakeOnEntryPlan(input({ hero: hero({ questEffects: { trustedUntil: "2026-10-14T16:00:00.000Z" } }) }));
    expect(plan.effects).toMatchObject({ trustedUntil: "2026-10-14T16:00:00.000Z" });
    expect(wasWokenFor(plan.effects, "wind-temple")).toBe(true);
  });

  describe("a beast already woken for another hero", () => {
    it("takes this hero in: they are added to that quest's assignees, and no second quest is made", () => {
      const theirs = quest(wakeQuestId("wind-temple", "beast-cushion-croc"), { assignee: [MIA] });
      const plan = wakeOnEntryPlan(input({ quests: [theirs] }));
      expect(plan.joined).toEqual([{ ...theirs, assignee: [MIA, KIA] }]);
      expect(beastsOf(plan.quests)).not.toContain("beast-cushion-croc");
      expect(plan.quests).toHaveLength(MONSTERS.length - 1);
    });

    it("never changes the quest it is handed", () => {
      const theirs = quest(wakeQuestId("wind-temple", "beast-cushion-croc"), { assignee: [MIA] });
      wakeOnEntryPlan(input({ quests: [theirs] }));
      expect(theirs.assignee).toEqual([MIA]);
    });

    it("takes the hero into a quest another temple woke for the same beast", () => {
      const elsewhere = quest(wakeQuestId("earth-temple", "beast-cushion-croc"), { assignee: [MIA] });
      const plan = wakeOnEntryPlan(input({ quests: [elsewhere] }));
      expect(plan.joined.map((joined) => joined.id)).toEqual([elsewhere.id]);
      expect(beastsOf(plan.quests)).not.toContain("beast-cushion-croc");
    });

    it("prefers this temple's own woken quest when two temples woke the beast", () => {
      const elsewhere = quest(wakeQuestId("earth-temple", "beast-cushion-croc"));
      const here = quest(wakeQuestId("wind-temple", "beast-cushion-croc"));
      expect(wakeOnEntryPlan(input({ quests: [elsewhere, here] })).joined.map((joined) => joined.id)).toEqual([here.id]);
    });

    it("takes the hero in once however many rooms hold the beast", () => {
      const layout = spire();
      layout.rooms!.M0102 = { ...layout.rooms!.M0102, content: { ...layout.rooms!.M0102.content, quest: { ...layout.rooms!.M0201.content!.quest! } } };
      const theirs = quest(wakeQuestId("wind-temple", "beast-cushion-croc"));
      expect(wakeOnEntryPlan(input({ layout, quests: [theirs] })).joined).toHaveLength(1);
    });
  });

  describe("what is left as it is", () => {
    it("a beast whose quest is already the hero's (theirs or an Open Bounty)", () => {
      const mine = quest(wakeQuestId("wind-temple", "beast-cushion-croc"), { assignee: [KIA] });
      const bounty = quest("family-bounty", { type: "asNeeded", assignee: [], beastId: "beast-gravel-gnome" });
      const plan = wakeOnEntryPlan(input({ quests: [mine, bounty] }));
      expect(plan.joined).toEqual([]);
      expect(beastsOf(plan.quests)).not.toContain("beast-cushion-croc");
      expect(beastsOf(plan.quests)).not.toContain("beast-gravel-gnome");
    });

    it("the family's own quest for the beast, made for someone else: it is the Game Master's, never joined, and no second quest is made", () => {
      const familys = quest("mums-croc-quest", { assignee: [MIA] });
      const plan = wakeOnEntryPlan(input({ quests: [familys] }));
      expect(plan.joined).toEqual([]);
      expect(beastsOf(plan.quests)).not.toContain("beast-cushion-croc");
      expect(plan.skipped.map((skip) => [skip.beastId, skip.reason])).toEqual([["beast-cushion-croc", "usesQuest"]]);
    });

    it("a room the Game Master filled with a live quest of their own", () => {
      const layout = spire();
      layout.rooms!.M0201 = { ...layout.rooms!.M0201, content: { ...layout.rooms!.M0201.content, questIds: ["quick-dishes"] } };
      const tonight = quest("quick-dishes", { assignee: [KIA, MIA], beastId: "beast-dish-goblin" });
      const plan = wakeOnEntryPlan(input({ layout, quests: [tonight] }));
      expect(beastsOf(plan.quests)).not.toContain("beast-cushion-croc");
      expect(plan.joined).toEqual([]);
    });

    it("but a room whose pick is gone wakes from its template", () => {
      const layout = spire();
      layout.rooms!.M0201 = { ...layout.rooms!.M0201, content: { ...layout.rooms!.M0201.content, questIds: ["deleted-quest"] } };
      expect(beastsOf(wakeOnEntryPlan(input({ layout })).quests)).toContain("beast-cushion-croc");
    });

    it("a draft that holds the woken quest's id: the Game Master is still writing it", () => {
      const draft = quest(wakeQuestId("wind-temple", "beast-cushion-croc"), { draft: true, assignee: [MIA] });
      const plan = wakeOnEntryPlan(input({ quests: [draft] }));
      expect(plan.joined).toEqual([]);
      expect(beastsOf(plan.quests)).not.toContain("beast-cushion-croc");
      expect(plan.skipped.map((skip) => [skip.beastId, skip.reason])).toEqual([["beast-cushion-croc", "idTaken"]]);
    });
  });

  describe("nothing at all", () => {
    it("the second time the hero walks in: the wake is remembered, so a quest the Game Master deleted is not made again", () => {
      const first = wakeOnEntryPlan(input());
      const plan = wakeOnEntryPlan(input({ hero: hero({ questEffects: first.effects ?? undefined }), quests: [] }));
      expect(plan).toMatchObject({ skip: "alreadyWoken", quests: [], joined: [], beasts: [], effects: null });
    });

    it("for a Game Master, a temple that is not shipped, or a temple with no rooms", () => {
      expect(wakeOnEntryPlan(input({ hero: hero({ isAdult: true }) })).skip).toBe("gameMaster");
      expect(wakeOnEntryPlan(input({ templeId: "gen-move-house", isShipped: false })).skip).toBe("notShipped");
      expect(wakeOnEntryPlan(input({ layout: null })).skip).toBe("noLayout");
      expect(wakeOnEntryPlan(input({ layout: { maze: [], rooms: {} } })).quests).toEqual([]);
    });

    it("waking again with every quest made wakes nothing new, even with the wake forgotten", () => {
      const first = wakeOnEntryPlan(input());
      const again = wakeOnEntryPlan(input({ quests: first.quests }));
      expect(again.quests).toEqual([]);
      expect(again.joined).toEqual([]);
    });
  });

  it("a second hero walking in after the first shares every quest instead of getting their own", () => {
    const first = wakeOnEntryPlan(input());
    const second = wakeOnEntryPlan(input({ hero: hero({ id: MIA }), quests: first.quests }));
    expect(second.quests).toEqual([]);
    expect(second.joined.map((joined) => joined.assignee)).toEqual(first.quests.map(() => [KIA, MIA]));
    expect(second.joined.every(isWokenQuest)).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The writes
// ---------------------------------------------------------------------------------------------------------------------

const recorder = () => {
  const calls: string[] = [];
  const saved: { quests: Achievement[]; beasts: Beast[]; effects: Record<string, HeroQuestEffects> } = { quests: [], beasts: [], effects: {} };
  const writers = {
    saveBeast: async (beast: Beast) => {
      calls.push(`beast:${beast.id}`);
      saved.beasts.push(beast);
    },
    saveQuest: async (made: Achievement) => {
      calls.push(`quest:${made.id}`);
      saved.quests.push(made);
    },
    saveEffects: async (heroId: string, effects: HeroQuestEffects) => {
      calls.push(`effects:${heroId}`);
      saved.effects[heroId] = effects;
    },
  };
  return { calls, saved, writers };
};

describe("commitEntryWake", () => {
  it("writes the beasts, then the new quests, then the quests the hero joins, and remembers the wake last", async () => {
    const theirs = quest(wakeQuestId("wind-temple", "beast-cushion-croc"));
    const plan = wakeOnEntryPlan(input({ quests: [theirs] }));
    const { calls, saved, writers } = recorder();
    const done = await commitEntryWake(plan, KIA, writers);

    const kinds = calls.map((call) => call.split(":")[0]);
    expect(kinds.lastIndexOf("beast")).toBeLessThan(kinds.indexOf("quest"));
    expect(calls[calls.length - 2]).toBe(`quest:${theirs.id}`);
    expect(calls[calls.length - 1]).toBe(`effects:${KIA}`);
    expect(done).toMatchObject({ remembered: true, changed: true });
    expect(done.woken).toHaveLength(MONSTERS.length - 1);
    expect(done.joined.map((joined) => joined.assignee)).toEqual([[MIA, KIA]]);
    expect(wasWokenFor(saved.effects[KIA], "wind-temple")).toBe(true);
  });

  it("remembers the wake even when there was nothing to make, so the next walk in stays quiet", async () => {
    const layout: QuestLayout = { maze: [["E"]], rooms: { E: { type: "entrance" } as Room } };
    const { calls, writers } = recorder();
    const done = await commitEntryWake(wakeOnEntryPlan(input({ layout })), KIA, writers);
    expect(calls).toEqual([`effects:${KIA}`]);
    expect(done).toMatchObject({ remembered: true, changed: false });
  });

  it("writes nothing for a plan that skipped", async () => {
    const { calls, writers } = recorder();
    const done = await commitEntryWake(wakeOnEntryPlan(input({ hero: hero({ isAdult: true }) })), KIA, writers);
    expect(calls).toEqual([]);
    expect(done).toEqual({ woken: [], joined: [], adopted: [], remembered: false, changed: false });
  });

  it("a write that fails stops the rest and throws, and the wake is not remembered, so the next walk in tries again", async () => {
    const { saved, writers } = recorder();
    writers.saveQuest = async () => {
      throw new Error("disk full");
    };
    await expect(commitEntryWake(wakeOnEntryPlan(input()), KIA, writers)).rejects.toThrow("disk full");
    expect(saved.effects).toEqual({});
  });
});

describe("wakeTempleOnEntry", () => {
  const deps = (heroes: Record<string, EntryHero>, quests: Achievement[] = []) => {
    const { calls, saved, writers } = recorder();
    const reads: string[] = [];
    const wired: EntryWakeDeps = {
      readLayout: async (templeId) => {
        reads.push(`layout:${templeId}`);
        return templeId === "wind-temple" ? spire() : null;
      },
      readQuests: async () => {
        reads.push("quests");
        return [...quests, ...saved.quests];
      },
      readBeasts: async () => {
        reads.push("beasts");
        return saved.beasts;
      },
      writers: { saveBeast: writers.saveBeast, saveQuest: writers.saveQuest },
      hero: (id) => heroes[id],
      saveEffects: writers.saveEffects,
    };
    return { wired, calls, saved, reads };
  };

  it("wakes the temple for the hero who walks in and remembers it", async () => {
    const { wired, saved } = deps({ [KIA]: { id: KIA } });
    const done = await wakeTempleOnEntry("wind-temple", KIA, wired, WED);
    expect(done?.woken).toHaveLength(MONSTERS.length);
    expect(wasWokenFor(saved.effects[KIA], "wind-temple")).toBe(true);
  });

  it("reads nothing for a temple that is not shipped, a Game Master or a hero already woken there", async () => {
    const woken = { id: MIA, questEffects: rememberWake({}, "wind-temple", WED) };
    const { wired, reads, calls } = deps({ [KIA]: { id: KIA, isAdult: true }, [MIA]: woken });
    expect(await wakeTempleOnEntry("gen-move-house", KIA, wired, WED)).toBeNull();
    expect(await wakeTempleOnEntry("wind-temple", KIA, wired, WED)).toBeNull();
    expect(await wakeTempleOnEntry("wind-temple", MIA, wired, WED)).toBeNull();
    expect(await wakeTempleOnEntry("wind-temple", "nobody", wired, WED)).toBeNull();
    expect(reads).toEqual([]);
    expect(calls).toEqual([]);
  });
});

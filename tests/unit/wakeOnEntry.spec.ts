/**
 * Wake on entry (owner 2026-10-18, "set world, wake on arrival"): the first time a hero of the family walks into a
 * shipped temple, its sleeping monster templates wake for that hero, as the Temple Quests tab would wake them (Solo
 * Missions starting this Monday). A beast whose woken quest already exists for another hero takes this hero in (added
 * to its assignees) instead of a second quest. Miniboss and boss rooms never wake by themselves. The wake is
 * remembered per hero per temple floor on the hero's questEffects, so walking in again wakes nothing and a quest the
 * Game Master deleted is not made again. Walking in wakes only the entrance floor; every other floor wakes the first
 * time the hero arrives on it (owner 2026-10-19). The plan is pure; only `commitEntryWake` writes, through the writers
 * it is handed.
 *
 * A layout refresh (owner 2026-10-23, "wake only the new beasts"): the floors a hero woke under the old layout are
 * forgotten and the beasts those floors held are remembered instead, so a room that is new in the new layout wakes on
 * the next entry while a beast the old layout woke (its quest deleted since, or moved to another floor) never does.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { Room } from "@/lib/engine/core/dungeons/types";
import type { HeroQuestEffects } from "@/lib/engine/quests/QuestSchedule";
import { windBeforeEagle as windTemple } from "./windBeforeEagle";
import type { QuestLayout } from "@/lib/services/temples/templeQuestRows";
import {
  WOKEN_BEASTS_FIELD,
  WOKEN_TEMPLES_FIELD,
  commitEntryWake,
  entranceFloorOf,
  entryWakeSkip,
  isShippedTemple,
  rememberWake,
  rememberWokenBeasts,
  wakeKey,
  wakeOnEntryPlan,
  wakeTempleOnEntry,
  wasWokenFor,
  wokenBeastsOf,
  type EntryHero,
  type EntryWakeDeps,
  type EntryWakeInput,
  type PlayedLayout,
} from "@/lib/services/temples/wakeOnEntry";
import { isWokenQuest, wakeQuestId } from "@/lib/services/temples/wakeTempleQuests";

const KIA = "hero-1";
const MIA = "hero-2";
const WED = new Date("2026-10-14T15:30:00");
const MONDAY = new Date("2026-10-12T00:00:00");

/** A fresh copy of the Howling Spire as the owner made it (windBeforeEagle.ts) */
const spire = (): QuestLayout & { entrance: number[] } =>
  JSON.parse(JSON.stringify({ entrance: windTemple.entrance, maze: windTemple.maze, rooms: windTemple.rooms }));

/** The beasts of the three monster rooms on the tower's second floor */
const UPSTAIRS = ["beast-kibble-kobold", "beast-droop-dryad", "beast-zoomie-zephyr"];

const monsterRoom = (beastId: string, difficulty = 1): Room =>
  ({ type: "monster", content: { beasts: [], quest: { beastId, difficulty, basicSchedule: "daily", dueByTime: "19:00" } } }) as unknown as Room;

/** The Spire grown into a tower: its own 1F, a 2F with three monster rooms of its own, and a 3F with no monster room at all */
const tower = (): PlayedLayout => {
  const layout = spire();
  layout.rooms = { ...layout.rooms, U1: monsterRoom(UPSTAIRS[0]), U2: monsterRoom(UPSTAIRS[1]), U3: monsterRoom(UPSTAIRS[2], 2) };
  layout.maze = { ...(layout.maze as Record<string, string[][]>), "2F": [["U1", "U2"], ["U3", "_____"]], "3F": [["R0103"]] };
  return layout;
};

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
  floor: "1F",
  hero: hero(),
  quests: [],
  beasts: [],
  now: WED,
  ...overrides,
});

const beastsOf = (quests: readonly Achievement[]) => quests.map((made) => String(made.beastId)).sort();

describe("remembering a wake", () => {
  it("is a temple id, a floor and the moment it woke, kept on the hero's questEffects beside the Powers' effects", () => {
    const effects = rememberWake({ snoozedOn: { q1: "2026-10-14" } }, "wind-temple", "1F", WED);
    expect(effects).toEqual({ snoozedOn: { q1: "2026-10-14" }, [WOKEN_TEMPLES_FIELD]: { "wind-temple@1F": WED.toISOString() } });
    expect(wasWokenFor(effects, "wind-temple", "1F", "1F")).toBe(true);
    expect(wasWokenFor(effects, "fire-temple", "1F", "1F")).toBe(false);
  });

  it("names a wake by temple and floor", () => {
    expect(wakeKey("wind-temple", "2F")).toBe("wind-temple@2F");
    expect(wakeKey("earth-temple", "B1")).toBe("earth-temple@B1");
  });

  it("adds a floor to the ones already woken and never changes the effects it is handed", () => {
    const before = { [WOKEN_TEMPLES_FIELD]: { "fire-temple@1F": "2026-10-01T00:00:00.000Z" } };
    const after = rememberWake(before, "wind-temple", "2F", WED);
    expect(after[WOKEN_TEMPLES_FIELD]).toEqual({ "fire-temple@1F": "2026-10-01T00:00:00.000Z", "wind-temple@2F": WED.toISOString() });
    expect(before[WOKEN_TEMPLES_FIELD]).toEqual({ "fire-temple@1F": "2026-10-01T00:00:00.000Z" });
  });

  it("remembers each floor of a temple on its own", () => {
    const effects = rememberWake({}, "wind-temple", "1F", WED);
    expect(wasWokenFor(effects, "wind-temple", "1F", "1F")).toBe(true);
    expect(wasWokenFor(effects, "wind-temple", "2F", "1F")).toBe(false);
    expect(wasWokenFor(effects, "earth-temple", "1F", "1F")).toBe(false);
  });

  it("reads a wake remembered by temple alone (before floors) as the entrance floor's, and no other floor's", () => {
    const legacy = { [WOKEN_TEMPLES_FIELD]: { "wind-temple": "2026-10-01T00:00:00.000Z" } };
    expect(wasWokenFor(legacy, "wind-temple", "1F", "1F")).toBe(true);
    expect(wasWokenFor(legacy, "wind-temple", "2F", "1F")).toBe(false);
    // The entrance floor is whatever the layout says: a temple that starts on 2F has its legacy wake there
    expect(wasWokenFor(legacy, "wind-temple", "2F", "2F")).toBe(true);
    expect(wasWokenFor(legacy, "wind-temple", "1F", "2F")).toBe(false);
  });

  it("reads nothing as woken from effects that are missing or not a record", () => {
    expect(wasWokenFor(undefined, "wind-temple", "1F", "1F")).toBe(false);
    expect(wasWokenFor(null, "wind-temple", "1F", "1F")).toBe(false);
    // A stored profile is family data: a broken field reads as nothing woken
    expect(wasWokenFor({ [WOKEN_TEMPLES_FIELD]: ["wind-temple"] } as unknown as HeroQuestEffects, "wind-temple", "1F", "1F")).toBe(false);
    expect(rememberWake(undefined, "wind-temple", "1F", WED)).toEqual({ [WOKEN_TEMPLES_FIELD]: { "wind-temple@1F": WED.toISOString() } });
  });
});

describe("entranceFloorOf", () => {
  it("is the first floor for an entrance given as [row, col], and for a temple drawn as one grid", () => {
    expect(entranceFloorOf(spire())).toBe("1F");
    expect(entranceFloorOf({ entrance: [0, 0], maze: [["E"]], rooms: {} })).toBe("1F");
    // The editor allows floors named 2F, 3F: the first floor the temple has
    expect(entranceFloorOf({ entrance: [1, 1], maze: { "2F": [], "3F": [] }, rooms: {} })).toBe("2F");
  });

  it("is the floor an entrance of [floorIndex, row, col] counts to, in the order the maze draws them", () => {
    const layout = { ...tower(), entrance: [1, 0, 0] };
    expect(entranceFloorOf(layout)).toBe("2F");
    expect(entranceFloorOf({ ...layout, entrance: [2, 0, 0] })).toBe("3F");
  });

  it("is the first floor when the entrance counts to a floor the temple does not have", () => {
    expect(entranceFloorOf({ ...tower(), entrance: [9, 0, 0] })).toBe("1F");
  });

  it("is 1F for a layout with no entrance or no maze", () => {
    expect(entranceFloorOf({ maze: { "1F": [["E"]] }, rooms: {} })).toBe("1F");
    expect(entranceFloorOf({ rooms: {} })).toBe("1F");
    expect(entranceFloorOf(null)).toBe("1F");
  });
});

describe("entryWakeSkip", () => {
  it("wakes only a shipped temple, for a hero of the family who was never woken there", () => {
    const where = { floor: "1F", entranceFloor: "1F" };
    expect(entryWakeSkip({ templeId: "wind-temple", isShipped: true, hero: hero(), ...where })).toBeNull();
    expect(entryWakeSkip({ templeId: "gen-move-house", isShipped: false, hero: hero(), ...where })).toBe("notShipped");
    expect(entryWakeSkip({ templeId: "wind-temple", isShipped: true, hero: null, ...where })).toBe("noHero");
    expect(entryWakeSkip({ templeId: "wind-temple", isShipped: true, hero: hero({ isAdult: true }), ...where })).toBe("gameMaster");
    const woken = hero({ questEffects: rememberWake({}, "wind-temple", "1F", WED) });
    expect(entryWakeSkip({ templeId: "wind-temple", isShipped: true, hero: woken, ...where })).toBe("alreadyWoken");
    // Another floor of the same temple is still asleep
    expect(entryWakeSkip({ templeId: "wind-temple", isShipped: true, hero: woken, floor: "2F", entranceFloor: "1F" })).toBeNull();
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

  it("remembers the floor on the hero's questEffects, keeping their Powers' effects", () => {
    const plan = wakeOnEntryPlan(input({ hero: hero({ questEffects: { trustedUntil: "2026-10-14T16:00:00.000Z" } }) }));
    expect(plan.effects).toMatchObject({ trustedUntil: "2026-10-14T16:00:00.000Z" });
    expect(wasWokenFor(plan.effects, "wind-temple", "1F", "1F")).toBe(true);
    expect(plan.floor).toBe("1F");
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
// Floor by floor
// ---------------------------------------------------------------------------------------------------------------------

describe("waking floor by floor", () => {
  const onFloor = (floor: string, overrides: Partial<EntryWakeInput> = {}) => wakeOnEntryPlan(input({ layout: tower(), floor, ...overrides }));

  it("the first entry wakes only the entrance floor's beasts", () => {
    const plan = onFloor("1F");
    expect(plan.skip).toBeNull();
    expect(beastsOf(plan.quests)).toEqual([...MONSTERS].sort());
    for (const beastId of UPSTAIRS) expect(beastsOf(plan.quests)).not.toContain(beastId);
    expect(wasWokenFor(plan.effects, "wind-temple", "1F", "1F")).toBe(true);
    expect(wasWokenFor(plan.effects, "wind-temple", "2F", "1F")).toBe(false);
  });

  it("arriving on 2F wakes 2F's beasts, and keeps what 1F remembered", () => {
    const first = onFloor("1F");
    const plan = onFloor("2F", { hero: hero({ questEffects: first.effects ?? undefined }), quests: first.quests });
    expect(plan.skip).toBeNull();
    expect(plan.floor).toBe("2F");
    expect(beastsOf(plan.quests)).toEqual([...UPSTAIRS].sort());
    for (const made of plan.quests) expect(made).toMatchObject({ type: "individual", assignee: [KIA], id: wakeQuestId("wind-temple", String(made.beastId)) });
    expect(wasWokenFor(plan.effects, "wind-temple", "1F", "1F")).toBe(true);
    expect(wasWokenFor(plan.effects, "wind-temple", "2F", "1F")).toBe(true);
    expect(wasWokenFor(plan.effects, "wind-temple", "3F", "1F")).toBe(false);
  });

  it("a second arrival on 2F wakes nothing", () => {
    const first = onFloor("2F");
    const again = onFloor("2F", { hero: hero({ questEffects: first.effects ?? undefined }), quests: [] });
    expect(again).toMatchObject({ skip: "alreadyWoken", quests: [], joined: [], beasts: [], effects: null });
  });

  it("a wake remembered by temple alone counts as 1F woken, and 2F still sleeps", () => {
    const legacy = hero({ questEffects: { [WOKEN_TEMPLES_FIELD]: { "wind-temple": "2026-10-01T00:00:00.000Z" } } });
    expect(onFloor("1F", { hero: legacy }).skip).toBe("alreadyWoken");
    const upstairs = onFloor("2F", { hero: legacy });
    expect(upstairs.skip).toBeNull();
    expect(beastsOf(upstairs.quests)).toEqual([...UPSTAIRS].sort());
    // The old memory stays beside the new
    expect(upstairs.effects?.[WOKEN_TEMPLES_FIELD]).toMatchObject({ "wind-temple": "2026-10-01T00:00:00.000Z", "wind-temple@2F": WED.toISOString() });
  });

  it("reads the old wake as the entrance floor's even when the entrance is not on 1F", () => {
    const layout: PlayedLayout = { ...tower(), entrance: [1, 0, 0] };
    expect(entranceFloorOf(layout)).toBe("2F");
    const legacy = hero({ questEffects: { [WOKEN_TEMPLES_FIELD]: { "wind-temple": "2026-10-01T00:00:00.000Z" } } });
    // The old wake was the entrance floor's: here that is 2F, so 1F is the sleeping one
    expect(wakeOnEntryPlan(input({ layout, floor: "2F", hero: legacy })).skip).toBe("alreadyWoken");
    expect(wakeOnEntryPlan(input({ layout, floor: "1F", hero: legacy })).skip).toBeNull();
  });

  it("a one-floor temple wakes every monster room on entry, as before", () => {
    const layout = spire();
    const plan = wakeOnEntryPlan(input({ layout, floor: entranceFloorOf(layout) }));
    expect(beastsOf(plan.quests)).toEqual([...MONSTERS].sort());
    expect(plan.joined).toEqual([]);
  });

  it("a floor with no monster rooms wakes nothing, and still remembers it", () => {
    const plan = onFloor("3F");
    expect(plan.skip).toBeNull();
    expect(plan).toMatchObject({ quests: [], joined: [], beasts: [] });
    expect(wasWokenFor(plan.effects, "wind-temple", "3F", "1F")).toBe(true);
  });

  it("a Game Master's profile wakes nothing on any floor", () => {
    for (const floor of ["1F", "2F"]) expect(onFloor(floor, { hero: hero({ isAdult: true }) })).toMatchObject({ skip: "gameMaster", quests: [], effects: null });
  });

  it("a floor the temple does not have wakes nothing and remembers nothing", () => {
    expect(onFloor("9F")).toMatchObject({ skip: "noFloor", quests: [], joined: [], beasts: [], effects: null });
  });

  it("a beast the hero already fights from another floor stirs nothing here", () => {
    const layout = tower();
    layout.rooms!.U1 = monsterRoom("beast-cushion-croc");
    const first = wakeOnEntryPlan(input({ layout, floor: "1F" }));
    const plan = wakeOnEntryPlan(input({ layout, floor: "2F", hero: hero({ questEffects: first.effects ?? undefined }), quests: first.quests }));
    expect(beastsOf(plan.quests)).toEqual(["beast-droop-dryad", "beast-zoomie-zephyr"]);
  });

  it("takes the hero into a quest a temple already woke for another hero, on the floor they arrive on", () => {
    const theirs = quest(wakeQuestId("wind-temple", UPSTAIRS[0]), { assignee: [MIA], beastId: UPSTAIRS[0] });
    const plan = onFloor("2F", { quests: [theirs] });
    expect(plan.joined).toEqual([{ ...theirs, assignee: [MIA, KIA] }]);
    expect(beastsOf(plan.quests)).toEqual([UPSTAIRS[1], UPSTAIRS[2]].sort());
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// A layout refresh: wake only the new beasts
// ---------------------------------------------------------------------------------------------------------------------

/** Beast ids as the `tq-<temple>-<slug>` quest id spells them, in a fixed order */
const slugsOf = (beastIds: readonly string[]) => beastIds.map((beastId) => beastId.replace(/^beast-/, "")).sort();

/** The Spire with a monster room of a new beast built into its top-left corner, a wall in the layout it replaces */
const spireWithNewRoom = (): PlayedLayout => {
  const layout = spire();
  layout.rooms = { ...layout.rooms, N1: monsterRoom("beast-dish-goblin") };
  (layout.maze as Record<string, string[][]>)["1F"][0][0] = "N1";
  return layout;
};

/** The tower with the Cushion Croc's room moved up from 1F to the corner of 2F that U1 held */
const towerWithCrocUpstairs = (): PlayedLayout => {
  const layout = tower();
  const maze = layout.maze as Record<string, string[][]>;
  maze["1F"] = maze["1F"].map((row) => row.map((symbol) => (symbol === "M0201" ? "_____" : symbol)));
  maze["2F"] = [["M0201", "U2"], ["U3", "_____"]];
  return layout;
};

describe("rememberWokenBeasts", () => {
  const woken = (layout: PlayedLayout, floor = "1F") => wakeOnEntryPlan(input({ layout, floor })).effects as HeroQuestEffects;

  it("keeps the beasts of the floors the hero was woken on, and forgets that temple's floors", () => {
    const before: HeroQuestEffects = {
      ...rememberWake(woken(tower()), "fire-temple", "1F", WED),
      snoozedOn: { q1: "2026-10-14" },
    };
    const after = rememberWokenBeasts(before, "wind-temple", tower());

    expect(after?.[WOKEN_BEASTS_FIELD]).toEqual({ "wind-temple": slugsOf(MONSTERS) });
    // Only the floors the hero was woken on: 2F's beasts were never woken
    for (const beastId of UPSTAIRS) expect(after?.[WOKEN_BEASTS_FIELD]?.["wind-temple"]).not.toContain(beastId.replace(/^beast-/, ""));
    expect(after?.[WOKEN_TEMPLES_FIELD]).toEqual({ "fire-temple@1F": WED.toISOString() });
    expect(wasWokenFor(after, "wind-temple", "1F", "1F")).toBe(false);
    expect(wasWokenFor(after, "fire-temple", "1F", "1F")).toBe(true);
    expect(after?.snoozedOn).toEqual({ q1: "2026-10-14" });
    // The effects it was handed are not changed in place
    expect(before[WOKEN_TEMPLES_FIELD]).toHaveProperty(["wind-temple@1F"]);
    expect(before[WOKEN_BEASTS_FIELD]).toBeUndefined();
  });

  it("keeps the beasts of every floor that was woken", () => {
    const both = rememberWake(woken(tower()), "wind-temple", "2F", WED);
    const after = rememberWokenBeasts(both, "wind-temple", tower());
    expect(after?.[WOKEN_BEASTS_FIELD]).toEqual({ "wind-temple": slugsOf([...MONSTERS, ...UPSTAIRS]) });
    expect(after?.[WOKEN_TEMPLES_FIELD]).toEqual({});
  });

  it("reads a wake remembered by temple alone as the old layout's entrance floor", () => {
    const legacy = { [WOKEN_TEMPLES_FIELD]: { "wind-temple": "2026-10-01T00:00:00.000Z" } };
    expect(rememberWokenBeasts(legacy, "wind-temple", tower())?.[WOKEN_BEASTS_FIELD]).toEqual({ "wind-temple": slugsOf(MONSTERS) });
    // An entrance on 2F: the legacy wake was 2F's
    const startsUpstairs: PlayedLayout = { ...tower(), entrance: [1, 0, 0] };
    const after = rememberWokenBeasts(legacy, "wind-temple", startsUpstairs);
    expect(after?.[WOKEN_BEASTS_FIELD]).toEqual({ "wind-temple": slugsOf(UPSTAIRS) });
    expect(after?.[WOKEN_TEMPLES_FIELD]).toEqual({});
  });

  it("adds to what an earlier refresh remembered, once each, and leaves other temples' memory alone", () => {
    const before: HeroQuestEffects = {
      ...woken(spire()),
      [WOKEN_BEASTS_FIELD]: { "wind-temple": ["old-one", "cushion-croc"], "fire-temple": ["ember-imp"] },
    };
    const after = rememberWokenBeasts(before, "wind-temple", spire());
    expect(after?.[WOKEN_BEASTS_FIELD]).toEqual({
      "wind-temple": slugsOf(["beast-old-one", ...MONSTERS]),
      "fire-temple": ["ember-imp"],
    });
  });

  it("forgets a floor with no monster room without inventing a memory for it", () => {
    const after = rememberWokenBeasts(woken(tower(), "3F"), "wind-temple", tower());
    expect(after?.[WOKEN_TEMPLES_FIELD]).toEqual({});
    expect(after?.[WOKEN_BEASTS_FIELD]).toBeUndefined();
  });

  it("changes nothing for a hero with no floor of the temple woken", () => {
    expect(rememberWokenBeasts({}, "wind-temple", tower())).toBeNull();
    expect(rememberWokenBeasts(undefined, "wind-temple", tower())).toBeNull();
    expect(rememberWokenBeasts(rememberWake({}, "fire-temple", "1F", WED), "wind-temple", tower())).toBeNull();
    // A temple whose name starts like this one is another temple
    expect(rememberWokenBeasts(rememberWake({}, "wind-temple-2", "1F", WED), "wind-temple", tower())).toBeNull();
  });

  it("reads a memory that is not a record of lists as none (a profile is family data)", () => {
    expect(wokenBeastsOf(undefined, "wind-temple")).toEqual([]);
    expect(wokenBeastsOf({ [WOKEN_BEASTS_FIELD]: "cushion-croc" } as unknown as HeroQuestEffects, "wind-temple")).toEqual([]);
    expect(wokenBeastsOf({ [WOKEN_BEASTS_FIELD]: { "wind-temple": "cushion-croc" } } as unknown as HeroQuestEffects, "wind-temple")).toEqual([]);
    expect(wokenBeastsOf({ [WOKEN_BEASTS_FIELD]: { "wind-temple": ["cushion-croc", 3, null] } } as unknown as HeroQuestEffects, "wind-temple")).toEqual(["cushion-croc"]);
  });
});

describe("waking after a layout refresh", () => {
  /** A hero woken on the old layout's entrance floor, carried across the refresh the way the seed sync carries them */
  const refreshedHero = (old: PlayedLayout = spire()) => {
    const first = wakeOnEntryPlan(input({ layout: old, floor: "1F" }));
    return { hero: hero({ questEffects: rememberWokenBeasts(first.effects, "wind-temple", old) ?? undefined }), quests: first.quests };
  };

  it("wakes a room that is new in the new layout, on a floor the old layout woke", () => {
    // None of the old quests are left (the Game Master deleted them), so only the memory keeps the old beasts asleep
    const { hero: kia } = refreshedHero();
    const plan = wakeOnEntryPlan(input({ layout: spireWithNewRoom(), floor: "1F", hero: kia, quests: [] }));

    expect(plan.skip).toBeNull();
    expect(beastsOf(plan.quests)).toEqual(["beast-dish-goblin"]);
    expect(plan.quests[0]).toMatchObject({ id: wakeQuestId("wind-temple", "beast-dish-goblin"), type: "individual", assignee: [KIA] });
    // The floor is remembered again, beside what the old layout woke
    expect(wasWokenFor(plan.effects, "wind-temple", "1F", "1F")).toBe(true);
    expect(plan.effects?.[WOKEN_BEASTS_FIELD]).toEqual({ "wind-temple": slugsOf(MONSTERS) });
  });

  it("does not make a quest again for a beast the old layout woke, though the Game Master deleted its quest", () => {
    const { hero: kia, quests } = refreshedHero();
    const withoutCroc = quests.filter((made) => made.beastId !== "beast-cushion-croc");
    expect(withoutCroc).toHaveLength(MONSTERS.length - 1);

    const plan = wakeOnEntryPlan(input({ layout: spire(), floor: "1F", hero: kia, quests: withoutCroc }));
    expect(plan.skip).toBeNull();
    expect(plan.quests).toEqual([]);
    expect(plan.joined).toEqual([]);
    expect(plan.beasts).toEqual([]);

    // Not even when every quest is gone
    expect(wakeOnEntryPlan(input({ layout: spire(), floor: "1F", hero: kia, quests: [] })).quests).toEqual([]);
  });

  it("does not take the hero into a beast the old layout woke for them, though another hero's quest for it is live", () => {
    const { hero: kia } = refreshedHero();
    const theirs = quest(wakeQuestId("wind-temple", "beast-cushion-croc"), { assignee: [MIA], beastId: "beast-cushion-croc" });
    const plan = wakeOnEntryPlan(input({ layout: spire(), floor: "1F", hero: kia, quests: [theirs] }));
    expect(plan.joined).toEqual([]);
    expect(plan.quests).toEqual([]);
  });

  it("does not wake a beast that moved to another floor, and still wakes the rooms that are new upstairs", () => {
    const { hero: kia } = refreshedHero();
    const layout = towerWithCrocUpstairs();

    // The Cushion Croc's quest is gone, so only the memory keeps it asleep
    const upstairs = wakeOnEntryPlan(input({ layout, floor: "2F", hero: kia, quests: [] }));
    expect(upstairs.skip).toBeNull();
    expect(beastsOf(upstairs.quests)).toEqual([UPSTAIRS[1], UPSTAIRS[2]].sort());

    // The old floor was forgotten with the refresh, so the entrance floor reads again, and finds nothing new
    const downstairs = wakeOnEntryPlan(input({ layout, floor: "1F", hero: kia, quests: [] }));
    expect(downstairs.skip).toBeNull();
    expect(downstairs.quests).toEqual([]);
  });

  it("wakes every beast for a hero the temple's old layout never woke, as before", () => {
    const stranger = hero({ questEffects: rememberWokenBeasts(rememberWake({}, "fire-temple", "1F", WED), "fire-temple", spire()) ?? undefined });
    const plan = wakeOnEntryPlan(input({ layout: spireWithNewRoom(), floor: "1F", hero: stranger }));
    expect(beastsOf(plan.quests)).toEqual([...MONSTERS, "beast-dish-goblin"].sort());
  });

  it("reads a temple's memory for that temple alone", () => {
    const elsewhere = hero({ questEffects: { [WOKEN_BEASTS_FIELD]: { "fire-temple": slugsOf(MONSTERS) } } });
    expect(beastsOf(wakeOnEntryPlan(input({ hero: elsewhere })).quests)).toEqual([...MONSTERS].sort());
  });

  it("keeps an old save that no refresh has touched as it was: the floor stays woken and a new room stays asleep", () => {
    const first = wakeOnEntryPlan(input({ layout: spire(), floor: "1F" }));
    const oldSave = hero({ questEffects: first.effects ?? undefined });
    expect(oldSave.questEffects?.[WOKEN_BEASTS_FIELD]).toBeUndefined();
    expect(wakeOnEntryPlan(input({ layout: spireWithNewRoom(), floor: "1F", hero: oldSave })).skip).toBe("alreadyWoken");
    // and a floor it never woke wakes whole, with no memory to hold a beast back
    expect(beastsOf(wakeOnEntryPlan(input({ layout: tower(), floor: "2F", hero: oldSave })).quests)).toEqual([...UPSTAIRS].sort());
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
    expect(done).toMatchObject({ remembered: true, changed: true, floor: "1F" });
    expect(done.woken).toHaveLength(MONSTERS.length - 1);
    expect(done.joined.map((joined) => joined.assignee)).toEqual([[MIA, KIA]]);
    // The beasts that stir are the quests made and the quests joined
    expect(done.stirred).toBe(MONSTERS.length);
    expect(wasWokenFor(saved.effects[KIA], "wind-temple", "1F", "1F")).toBe(true);
  });

  it("remembers the wake even when there was nothing to make, so the next walk in stays quiet", async () => {
    const layout: QuestLayout = { maze: [["E"]], rooms: { E: { type: "entrance" } as Room } };
    const { calls, writers } = recorder();
    const done = await commitEntryWake(wakeOnEntryPlan(input({ layout })), KIA, writers);
    expect(calls).toEqual([`effects:${KIA}`]);
    expect(done).toMatchObject({ remembered: true, changed: false, stirred: 0 });
  });

  it("writes nothing for a plan that skipped", async () => {
    const { calls, writers } = recorder();
    const done = await commitEntryWake(wakeOnEntryPlan(input({ hero: hero({ isAdult: true }) })), KIA, writers);
    expect(calls).toEqual([]);
    expect(done).toEqual({ woken: [], joined: [], adopted: [], floor: "1F", stirred: 0, remembered: false, changed: false });
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
        return templeId === "wind-temple" ? tower() : null;
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
      // The user store holds what setQuestEffects last wrote
      hero: (id) => (heroes[id] ? { ...heroes[id], questEffects: saved.effects[id] ?? heroes[id].questEffects } : undefined),
      saveEffects: async (heroId, effects) => {
        // A slow write: a second wake that does not wait for this one reads the hero before it lands
        await new Promise((resolve) => setTimeout(resolve, 5));
        await writers.saveEffects(heroId, effects);
      },
    };
    return { wired, calls, saved, reads };
  };

  it("wakes the entrance floor for the hero who walks in and remembers it", async () => {
    const { wired, saved } = deps({ [KIA]: { id: KIA } });
    const done = await wakeTempleOnEntry("wind-temple", KIA, wired, WED);
    expect(done?.woken).toHaveLength(MONSTERS.length);
    expect(done).toMatchObject({ floor: "1F", stirred: MONSTERS.length, changed: true });
    expect(wasWokenFor(saved.effects[KIA], "wind-temple", "1F", "1F")).toBe(true);
    expect(wasWokenFor(saved.effects[KIA], "wind-temple", "2F", "1F")).toBe(false);
  });

  it("wakes the floor the hero arrives on", async () => {
    const { wired, saved } = deps({ [KIA]: { id: KIA } });
    await wakeTempleOnEntry("wind-temple", KIA, wired, WED);
    const done = await wakeTempleOnEntry("wind-temple", KIA, wired, WED, "2F");
    expect(done?.woken.map((made) => String(made.beastId)).sort()).toEqual([...UPSTAIRS].sort());
    expect(done).toMatchObject({ floor: "2F", stirred: UPSTAIRS.length, changed: true });
    expect(wasWokenFor(saved.effects[KIA], "wind-temple", "1F", "1F")).toBe(true);
    expect(wasWokenFor(saved.effects[KIA], "wind-temple", "2F", "1F")).toBe(true);
    // Back on 2F another day: nothing is woken
    const again = await wakeTempleOnEntry("wind-temple", KIA, wired, WED, "2F");
    expect(again).toBeNull();
  });

  it("a floor with no monster rooms stirs nothing and is remembered", async () => {
    const { wired, saved } = deps({ [KIA]: { id: KIA } });
    const done = await wakeTempleOnEntry("wind-temple", KIA, wired, WED, "3F");
    expect(done).toMatchObject({ floor: "3F", stirred: 0, changed: false, remembered: true });
    expect(wasWokenFor(saved.effects[KIA], "wind-temple", "3F", "1F")).toBe(true);
  });

  it("wakes floors that are arrived on one after another without one forgetting the other", async () => {
    const { wired, saved } = deps({ [KIA]: { id: KIA } });
    // Walking in and taking the stairs at once: both wakes are under way together
    const [entry, upstairs] = await Promise.all([
      wakeTempleOnEntry("wind-temple", KIA, wired, WED),
      wakeTempleOnEntry("wind-temple", KIA, wired, WED, "2F"),
    ]);
    expect(entry?.stirred).toBe(MONSTERS.length);
    expect(upstairs?.stirred).toBe(UPSTAIRS.length);
    expect(wasWokenFor(saved.effects[KIA], "wind-temple", "1F", "1F")).toBe(true);
    expect(wasWokenFor(saved.effects[KIA], "wind-temple", "2F", "1F")).toBe(true);
    expect(saved.quests).toHaveLength(MONSTERS.length + UPSTAIRS.length);
  });

  it("shares one wake between two asks for the same floor", async () => {
    const { wired, saved } = deps({ [KIA]: { id: KIA } });
    const first = wakeTempleOnEntry("wind-temple", KIA, wired, WED, "2F");
    const second = wakeTempleOnEntry("wind-temple", KIA, wired, WED, "2F");
    expect(await second).toBe(await first);
    expect(saved.quests).toHaveLength(UPSTAIRS.length);
  });

  it("reads nothing for a temple that is not shipped, a Game Master or a hero who is not in the family", async () => {
    const { wired, reads, calls } = deps({ [KIA]: { id: KIA, isAdult: true } });
    expect(await wakeTempleOnEntry("gen-move-house", KIA, wired, WED)).toBeNull();
    expect(await wakeTempleOnEntry("wind-temple", KIA, wired, WED)).toBeNull();
    expect(await wakeTempleOnEntry("wind-temple", "nobody", wired, WED)).toBeNull();
    expect(reads).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("reads only the layout for a hero already woken on that floor", async () => {
    const woken = { id: MIA, questEffects: rememberWake({}, "wind-temple", "1F", WED) };
    const { wired, reads, calls } = deps({ [MIA]: woken });
    expect(await wakeTempleOnEntry("wind-temple", MIA, wired, WED)).toBeNull();
    expect(reads).toEqual(["layout:wind-temple"]);
    expect(calls).toEqual([]);
  });
});

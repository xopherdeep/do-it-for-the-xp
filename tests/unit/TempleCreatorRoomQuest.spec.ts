/**
 * The room-record rules of the quest room flow in the temple editor (hooks/grid/roomQuest): what the room's content
 * says once a quest is picked, how a room stops being a quest room, which entry the type picker shows for a room,
 * what the room's quest card reads (with the other chores of a list room) and which quest the picker opens on.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Room } from "@/lib/engine/core/dungeons/types";
import {
  QUEST_ROOM_KEY,
  applyQuestPick,
  describeRoomQuest,
  heldBeastId,
  heldQuest,
  moreChoresLine,
  pickerTypeOf,
  preselectedQuestId,
  releaseQuest,
} from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/hooks/grid/roomQuest";

const quest = (id: string, difficulty: number, overrides: Partial<Achievement> = {}) =>
  ({ id, achievementName: `Quest ${id}`, difficulty, beastId: "beast-dish-goblin", ...overrides }) as Achievement;

describe("applyQuestPick", () => {
  it("writes the quest's id into the room's content and returns the tier its difficulty makes", () => {
    const room: Room = { type: "empty" };
    expect(applyQuestPick(room, quest("q1", 2))).toBe("monster");
    expect(room.content?.questId).toBe("q1");
  });

  it("sets the room type from the quest's tier: 1-2 monster, 3-5 miniboss, 8 and up boss", () => {
    const types = [1, 2, 3, 5, 8, 13, 21].map((difficulty) => {
      const room: Room = { type: "trap" };
      applyQuestPick(room, quest("q", difficulty));
      return room.type;
    });
    expect(types).toEqual(["monster", "monster", "miniboss", "miniboss", "boss", "boss", "boss"]);
  });

  it("changes the tier when a different quest replaces the first", () => {
    const room: Room = { type: "empty" };
    applyQuestPick(room, quest("small", 1));
    applyQuestPick(room, quest("big", 13));
    expect(room.type).toBe("boss");
    expect(room.content?.questId).toBe("big");
  });

  it("seals a miniboss or boss room on entry unless the Game Master already chose, and leaves a monster room as it is", () => {
    const boss: Room = { type: "empty" };
    applyQuestPick(boss, quest("b", 13));
    expect(boss.content?.lockOnEnter).toBe(true);

    const mini: Room = { type: "empty" };
    applyQuestPick(mini, quest("m", 3));
    expect(mini.content?.lockOnEnter).toBe(true);

    const chosenOpen: Room = { type: "boss", content: { lockOnEnter: false } };
    applyQuestPick(chosenOpen, quest("b", 13));
    expect(chosenOpen.content?.lockOnEnter).toBe(false);

    const monster: Room = { type: "empty" };
    applyQuestPick(monster, quest("s", 1));
    expect(monster.content?.lockOnEnter).toBeUndefined();
    const sealedMonster: Room = { type: "monster", content: { lockOnEnter: true } };
    applyQuestPick(sealedMonster, quest("s", 1));
    expect(sealedMonster.content?.lockOnEnter).toBe(true);
  });

  it("keeps everything else the room holds: classic beasts, authored rewards, sides and a shipped template", () => {
    const template = { beastId: "beast-dish-goblin", difficulty: 2, basicSchedule: "daily" };
    const sides = { north: "door", east: "locked", south: "door", west: "door" };
    const room: Room = {
      type: "monster",
      sides,
      content: { beasts: ["b1"], xp: 200, gp: 20, ap: 2, quest: template },
    };
    applyQuestPick(room, quest("q1", 2));
    expect(room.content).toEqual({ beasts: ["b1"], xp: 200, gp: 20, ap: 2, quest: template, questId: "q1" });
    expect(room.sides).toBe(sides);
  });

  it("rebuilds a room that was another type from the tier's template: a chest's Boss Key and a boss's seal do not ride along", () => {
    const chest: Room = {
      type: "loot",
      sides: { north: "locked", east: "door", south: "door", west: "door" },
      content: { name: "Vault", chest: "dungeon", dungeon: "master-key", gold: 50, items: ["potion"] },
    };
    expect(applyQuestPick(chest, quest("m", 3))).toBe("miniboss");
    expect(chest.type).toBe("miniboss");
    expect(chest.content).toEqual({ name: "Vault", questId: "m", lockOnEnter: true });
    expect(chest.sides).toEqual({ north: "locked", east: "door", south: "door", west: "door" });

    const boss: Room = { type: "boss", content: { lockOnEnter: true, beasts: ["b1"] } };
    applyQuestPick(boss, quest("s", 1));
    expect(boss.type).toBe("monster");
    expect(boss.content).toEqual({ beasts: ["b1"], questId: "s" });
  });

  it("keeps the fight and the shipped template when the tier moves between combat types", () => {
    const template = { beastId: "beast-dish-goblin", difficulty: 2, basicSchedule: "daily" };
    const room: Room = { type: "monster", content: { beasts: ["b1"], xp: 200, quest: template, lockOnEnter: false } };
    applyQuestPick(room, quest("q1", 13));
    expect(room.type).toBe("boss");
    expect(room.content).toEqual({ beasts: ["b1"], xp: 200, quest: template, questId: "q1", lockOnEnter: true });
  });

  it("turns a list room into a one-quest room: the pick replaces the list", () => {
    const room: Room = { type: "monster", content: { questIds: ["mugs", "dishes"], beasts: ["b1"] } };
    applyQuestPick(room, quest("mugs", 2));
    expect(room.content?.questId).toBe("mugs");
    expect(room.content).not.toHaveProperty("questIds");
    expect(room.content?.beasts).toEqual(["b1"]);
  });

  it("stores the id as text", () => {
    const room: Room = { type: "empty" };
    applyQuestPick(room, { id: 42, difficulty: 2 } as Achievement);
    expect(room.content?.questId).toBe("42");
  });
});

describe("releaseQuest", () => {
  it("takes the quest and the shipped template out of a room, so it is a classic room again", () => {
    const room: Room = {
      type: "monster",
      content: { questId: "q1", quest: { beastId: "b", difficulty: 2, basicSchedule: "daily" }, beasts: ["b1"], lockOnEnter: true },
    };
    releaseQuest(room);
    expect(room.content).toEqual({ beasts: ["b1"], lockOnEnter: true });
  });

  it("takes a list of quests out too", () => {
    const room: Room = { type: "monster", content: { questIds: ["mugs", "dishes"], questId: "mugs", beasts: ["b1"] } };
    releaseQuest(room);
    expect(room.content).toEqual({ beasts: ["b1"] });
    const onlyList: Room = { type: "monster", content: { questIds: ["mugs", "dishes"] } };
    releaseQuest(onlyList);
    expect(onlyList.content).toEqual({});
  });

  it("does nothing to a room with no content or no quest", () => {
    const bare: Room = { type: "empty" };
    releaseQuest(bare);
    expect(bare).toEqual({ type: "empty" });
    const classic: Room = { type: "monster", content: { beasts: ["b1"] } };
    releaseQuest(classic);
    expect(classic.content).toEqual({ beasts: ["b1"] });
  });
});

describe("pickerTypeOf", () => {
  it("shows a room that holds a quest, or a shipped quest template, as the quest room", () => {
    expect(QUEST_ROOM_KEY).toBe("quest");
    expect(pickerTypeOf({ type: "boss", content: { questId: "q1" } })).toBe("quest");
    expect(pickerTypeOf({ type: "monster", content: { quest: { beastId: "b", difficulty: 1, basicSchedule: "daily" } } })).toBe("quest");
  });

  it("shows any other room as its own type", () => {
    expect(pickerTypeOf({ type: "monster", content: { beasts: ["b1"] } })).toBe("monster");
    expect(pickerTypeOf({ type: "loot" })).toBe("loot");
    expect(pickerTypeOf(null)).toBe("");
    expect(pickerTypeOf(undefined)).toBe("");
  });
});

describe("describeRoomQuest", () => {
  const quests = [quest("q1", 5), quest("wip", 2, { draft: true }), quest("filler", 3, { beastId: "beast-fluffalo" })];
  const template = { beastId: "beast-fluffalo", difficulty: 2, basicSchedule: "daily" };

  it("is the quest the Game Master picked", () => {
    expect(describeRoomQuest({ type: "miniboss", content: { questId: "q1" } }, quests)).toEqual({ kind: "picked", quest: quests[0] });
  });

  it("is the biggest live quest a room lists, with the other live chores counted", () => {
    const listed = [quest("mugs", 3), quest("dishes", 13)];
    expect(describeRoomQuest({ type: "boss", content: { questIds: ["mugs", "dishes"] } }, listed)).toEqual({
      kind: "picked",
      quest: listed[1],
      moreChores: 1,
    });
  });

  it("counts only the live chores of a list: a draft or a gone quest is not one more", () => {
    const listed = [quest("mugs", 3), quest("dishes", 13), quest("wip", 2, { draft: true })];
    const room = { type: "boss", content: { questIds: ["dishes", "mugs", "wip", "gone"] } };
    expect(describeRoomQuest(room, listed)).toEqual({ kind: "picked", quest: listed[1], moreChores: 1 });
    expect(describeRoomQuest({ type: "boss", content: { questIds: ["dishes", "wip"] } }, listed)).toEqual({ kind: "picked", quest: listed[1] });
  });

  it("flags a list whose quests are all gone or drafts, with the template when the room has one", () => {
    expect(describeRoomQuest({ type: "monster", content: { questIds: ["gone", "wip"] } }, quests)).toEqual({ kind: "missing" });
    expect(describeRoomQuest({ type: "monster", content: { questIds: ["gone"], quest: template } }, quests)).toEqual({ kind: "missing", template });
  });

  it("flags a pick whose quest was deleted or is only a draft, with the template when the room has one", () => {
    expect(describeRoomQuest({ type: "monster", content: { questId: "gone" } }, quests)).toEqual({ kind: "missing" });
    expect(describeRoomQuest({ type: "monster", content: { questId: "wip" } }, quests)).toEqual({ kind: "missing" });
    expect(describeRoomQuest({ type: "monster", content: { questId: "gone", quest: template } }, quests)).toEqual({
      kind: "missing",
      template,
    });
  });

  it("reads a shipped template: the live quest that has its beast fills it, else it is waiting to be woken", () => {
    expect(describeRoomQuest({ type: "monster", content: { quest: template } }, quests)).toEqual({ kind: "template", template, filler: quests[2] });
    expect(describeRoomQuest({ type: "monster", content: { quest: template } }, [quests[0]])).toEqual({ kind: "template", template });
  });

  it("leaves a template waiting when the quest that has its beast is below the template's tier", () => {
    const bossTemplate = { ...template, difficulty: 8 };
    expect(describeRoomQuest({ type: "boss", content: { quest: bossTemplate } }, quests)).toEqual({ kind: "template", template: bossTemplate });
    const minibossTemplate = { ...template, difficulty: 3 };
    expect(describeRoomQuest({ type: "miniboss", content: { quest: minibossTemplate } }, quests)).toEqual({
      kind: "template",
      template: minibossTemplate,
      filler: quests[2],
    });
  });

  it("is none for a classic or empty room", () => {
    expect(describeRoomQuest({ type: "monster", content: { beasts: ["b1"] } }, quests)).toEqual({ kind: "none" });
    expect(describeRoomQuest({ type: "empty" }, quests)).toEqual({ kind: "none" });
    expect(describeRoomQuest(null, quests)).toEqual({ kind: "none" });
  });
});

describe("the card line for a room's other chores", () => {
  const picked = quest("q1", 5);

  it("says how many more chores a list room holds besides the one on the card", () => {
    expect(moreChoresLine({ kind: "picked", quest: picked, moreChores: 2 })).toBe("+2 more chores here");
    expect(moreChoresLine({ kind: "picked", quest: picked, moreChores: 1 })).toBe("+1 more chore here");
  });

  it("says nothing for a one-quest room, a template, a missing quest or a room with no quest", () => {
    expect(moreChoresLine({ kind: "picked", quest: picked })).toBe("");
    expect(moreChoresLine({ kind: "template", template: { beastId: "b", difficulty: 2, basicSchedule: "daily" } })).toBe("");
    expect(moreChoresLine({ kind: "missing" })).toBe("");
    expect(moreChoresLine({ kind: "none" })).toBe("");
  });

  it("reads off the room: a kitchen of three live chores shows its biggest and '+2 more chores here'", () => {
    const kitchen = [quest("dishes", 2), quest("pantry", 5), quest("mugs", 1)];
    const holding = describeRoomQuest({ type: "miniboss", content: { questIds: ["dishes", "pantry", "mugs"] } }, kitchen);
    expect(heldQuest(holding)).toBe(kitchen[1]);
    expect(moreChoresLine(holding)).toBe("+2 more chores here");
  });
});

describe("which quest the picker opens on", () => {
  const listed = [quest("mugs", 3), quest("dishes", 13)];

  it("is the headline quest of a list room, not only a questId", () => {
    expect(preselectedQuestId({ type: "boss", content: { questIds: ["mugs", "dishes"] } }, listed)).toBe("dishes");
  });

  it("is a one-quest room's questId, as before, whether or not the quests are loaded or the quest is live", () => {
    expect(preselectedQuestId({ type: "monster", content: { questId: "mugs" } }, listed)).toBe("mugs");
    expect(preselectedQuestId({ type: "monster", content: { questId: "mugs" } }, [])).toBe("mugs");
    expect(preselectedQuestId({ type: "monster", content: { questId: "gone" } }, listed)).toBe("gone");
  });

  it("is nothing for a room with no quest", () => {
    expect(preselectedQuestId({ type: "monster", content: { beasts: ["b1"] } }, listed)).toBe("");
    expect(preselectedQuestId(null, listed)).toBe("");
  });
});

describe("what a quest room's card and Test fight read", () => {
  const picked = quest("q1", 5);
  const filler = quest("filler", 3, { beastId: "beast-fluffalo" });
  const template = { beastId: "beast-dust-dervish", difficulty: 2, basicSchedule: "daily" };

  it("takes the card's quest from the pick, or from the quest that fills the template", () => {
    expect(heldQuest({ kind: "picked", quest: picked })).toBe(picked);
    expect(heldQuest({ kind: "template", template, filler })).toBe(filler);
    expect(heldQuest({ kind: "template", template })).toBeUndefined();
    expect(heldQuest({ kind: "missing" })).toBeUndefined();
    expect(heldQuest({ kind: "none" })).toBeUndefined();
  });

  it("fights the quest's beast, the filler's beast, or the template's own, in that order of who is there", () => {
    expect(heldBeastId({ kind: "picked", quest: picked })).toBe("beast-dish-goblin");
    expect(heldBeastId({ kind: "template", template, filler })).toBe("beast-fluffalo");
    expect(heldBeastId({ kind: "template", template })).toBe("beast-dust-dervish");
    expect(heldBeastId({ kind: "missing", template })).toBe("beast-dust-dervish");
  });

  it("has no beast to fight for a deleted quest with no template, a room with no quest, or a quest without a beast", () => {
    expect(heldBeastId({ kind: "missing" })).toBeUndefined();
    expect(heldBeastId({ kind: "none" })).toBeUndefined();
    expect(heldBeastId({ kind: "picked", quest: quest("q2", 2, { beastId: "", noBeast: true, achievementName: "zzz qqq" }) })).toBeUndefined();
  });
});

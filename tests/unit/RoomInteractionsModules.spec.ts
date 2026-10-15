import * as entry from "@/lib/services/temples/RoomInteractions";
import { DIRECTIONS, roomKind, SFX, titleWords, words } from "@/lib/services/temples/roomInteractions/vocabulary";
import {
  hasHappened,
  pick,
  randomInt,
  rememberOnce,
  resetVisitMemory,
  rngOf,
  roomKey,
  templeKey,
} from "@/lib/services/temples/roomInteractions/visitMemory";
import { trapDamage } from "@/lib/services/temples/roomInteractions/hazards";
import { publicRiddle, riddleFor } from "@/lib/services/temples/roomInteractions/puzzle";
import { gateRewardOf } from "@/lib/services/temples/roomInteractions/treasure";

// Characterization: what the pure pieces of RoomInteractions return today, pinned when they left that file

const ctx = { userId: "u1", templeId: "t1", level: "1F", position: [2, 3] as [number, number] };

describe("the entry point RoomInteractions.ts", () => {
  it("still exports everything it exported before the split", () => {
    const names = [
      "DIRECTIONS",
      "SFX",
      "rememberOnce",
      "hasHappened",
      "resetVisitMemory",
      "templeKey",
      "roomKind",
      "randomInt",
      "readPoints",
      "readGold",
      "earnGold",
      "hurtHero",
      "healHero",
      "restoreMana",
      "readExits",
      "doorActions",
      "isChestEmptyIn",
      "shopWares",
      "buyWare",
      "answerRiddle",
      "onEnterRoom",
      "roomActions",
      "clearTemple",
    ];
    names.forEach((name) => expect(typeof (entry as Record<string, unknown>)[name]).toMatch(/function|object/));
    expect(names.filter((name) => (entry as Record<string, unknown>)[name] === undefined)).toEqual([]);
  });

  it("shares one visit memory with the module it came from", () => {
    resetVisitMemory();
    expect(entry.rememberOnce("shared")).toBe(true);
    expect(hasHappened("shared")).toBe(true);
    resetVisitMemory();
    expect(entry.hasHappened("shared")).toBe(false);
  });
});

describe("vocabulary", () => {
  it("looks clockwise from the top of the map", () => {
    expect(DIRECTIONS).toEqual(["north", "east", "south", "west"]);
  });

  it("keeps the secret sting as shhh and the teleport sound as okdesuka", () => {
    expect(SFX.secret).toBe("shhh");
    expect(SFX.teleport).toBe("okdesuka");
    expect(Object.keys(SFX)).toHaveLength(15);
  });

  it.each([
    ["exit", "entrance"],
    ["savepoint", "save"],
    ["stairs_up", "stairs-up"],
    ["stairs_down", "stairs-down"],
    ["dungeon_map", "map"],
    ["dungeon-map", "map"],
    ["trap", "trap"],
    ["somethingNew", "somethingNew"],
  ])("calls a %s room %s", (type, kind) => {
    expect(roomKind({ type } as never)).toBe(kind);
  });

  it("calls a missing room nothing, and a Pegasus room a loot room", () => {
    expect(roomKind(undefined)).toBe("");
    expect(roomKind({} as never)).toBe("");
    expect(roomKind({ type: "master" } as never)).toBe("loot");
  });

  it.each([
    ["blindingFlash", "blinding flash"],
    ["fire-ball_spike", "fire ball spike"],
    ["  Spikes  ", "spikes"],
    ["", ""],
  ])("turns %p into %p", (value, spoken) => {
    expect(words(value)).toBe(spoken);
  });

  it("title-cases the words", () => {
    expect(titleWords("healing-herb")).toBe("Healing Herb");
    expect(titleWords("magicEther")).toBe("Magic Ether");
  });
});

describe("visit memory and dice", () => {
  beforeEach(() => resetVisitMemory());

  it("remembers a thing once and says so the second time", () => {
    expect(hasHappened("a")).toBe(false);
    expect(rememberOnce("a")).toBe(true);
    expect(rememberOnce("a")).toBe(false);
    expect(hasHappened("a")).toBe(true);
    resetVisitMemory();
    expect(hasHappened("a")).toBe(false);
  });

  it("files a room's memory under hero, temple, floor, row,col and topic", () => {
    expect(roomKey(ctx, "trap")).toBe("u1|t1|1F|2,3|trap");
  });

  it("files a temple's memory under hero, temple and topic", () => {
    expect(templeKey("u1", "t1", "bottles")).toBe("u1|t1|bottles");
  });

  it("rolls whole numbers between min and max, both ends included", () => {
    expect(randomInt(3, 7, () => 0)).toBe(3);
    expect(randomInt(3, 7, () => 0.5)).toBe(5);
    expect(randomInt(3, 7, () => 0.999)).toBe(7);
  });

  it("picks from a list, never past the end", () => {
    expect(pick(["a", "b", "c"], () => 0)).toBe("a");
    expect(pick(["a", "b", "c"], () => 0.5)).toBe("b");
    expect(pick(["a", "b", "c"], () => 1)).toBe("c");
  });

  it("rolls the dice the context brings, else Math.random", () => {
    const fixed = () => 0.25;
    expect(rngOf({ ...ctx, rng: fixed })).toBe(fixed);
    expect(rngOf(ctx)).toBe(Math.random);
  });
});

describe("traps", () => {
  it("bites for the damage the room names, else 5", () => {
    expect(trapDamage({ type: "trap", content: { damage: 12 } } as never)).toBe(12);
    expect(trapDamage({ type: "trap", content: { damage: "7" } } as never)).toBe(7);
    expect(trapDamage({ type: "trap", content: { damage: 0 } } as never)).toBe(5);
    expect(trapDamage({ type: "trap", content: { damage: -3 } } as never)).toBe(5);
    expect(trapDamage({ type: "trap", content: { damage: "lots" } } as never)).toBe(5);
    expect(trapDamage({ type: "trap" } as never)).toBe(5);
  });
});

describe("riddles", () => {
  it("picks the riddle for the room's puzzle type, else the generic one", () => {
    expect(riddleFor({ type: "puzzle", content: { puzzleType: "prismAlignment" } } as never).answer).toBe(1);
    expect(riddleFor({ type: "puzzle", content: { puzzleType: "stonePillars" } } as never).id).toBe("stonePillars");
    expect(riddleFor({ type: "puzzle", content: { puzzleType: "nope" } } as never).id).toBe("generic");
    expect(riddleFor({ type: "puzzle" } as never).id).toBe("generic");
  });

  it("shows the screen the question and choices, never the answer", () => {
    const shown = publicRiddle(riddleFor({ type: "puzzle" } as never));
    expect(shown).toEqual({
      id: "generic",
      question: "I have keys but open no doors. What am I?",
      choices: ["A map", "A piano", "A chest"],
    });
    expect(shown).not.toHaveProperty("answer");
  });

  it("hands out a copy of the choices", () => {
    const room = { type: "puzzle" } as never;
    const shown = publicRiddle(riddleFor(room));
    shown.choices.push("A cheat");
    expect(riddleFor(room).choices).toHaveLength(3);
  });
});

describe("the gate's reward", () => {
  it("pays 150 XP, 50 GP and 3 AP when the gate names nothing", () => {
    expect(gateRewardOf(undefined)).toEqual({ xp: 150, gp: 50, ap: 3 });
    expect(gateRewardOf({})).toEqual({ xp: 150, gp: 50, ap: 3 });
  });

  it("takes the coins a gate names, from reward or from the content itself", () => {
    expect(gateRewardOf({ reward: { xp: 10, gp: 20, ap: 1 } } as never)).toEqual({ xp: 10, gp: 20, ap: 1 });
    expect(gateRewardOf({ xp: 400 } as never)).toEqual({ xp: 400, gp: 50, ap: 3 });
    expect(gateRewardOf({ reward: { gp: 0 }, xp: 5 } as never)).toEqual({ xp: 5, gp: 0, ap: 3 });
  });
});

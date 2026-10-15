import {
  escapeHtml,
  linksTo,
  unlink,
  usageNote,
  type QuestRef,
  type RoomRef,
  type TempleRef,
} from "@/lib/services/bestiary/beastLinks";

const quest = (id: string, extra: Partial<QuestRef> = {}): QuestRef => ({
  id,
  achievementName: `Quest ${id}`,
  beastId: "",
  adventureType: "simple",
  ...extra,
});

const temple = (id: string, rooms: Record<string, RoomRef>, layout = true): TempleRef =>
  layout ? { id, dungeonLayout: { rooms } } : { id, rooms };

const room = (content: RoomRef["content"], extra: Record<string, unknown> = {}): RoomRef => ({
  type: "monster",
  content,
  ...extra,
});

describe("linksTo", () => {
  it("finds nothing when no quest or room names the beast", () => {
    const quests = [quest("q1"), quest("q2", { beastId: "other" })];
    const temples = [temple("t1", { R1: room({ beasts: ["other"] }), R2: { type: "empty" } })];

    expect(linksTo("wolf", quests, temples)).toEqual({ quests: [], rooms: [] });
    expect(linksTo("wolf", [], [])).toEqual({ quests: [], rooms: [] });
  });

  it("never matches the empty id that a quest without a beast carries", () => {
    expect(linksTo("", [quest("q1")], [temple("t1", { R1: room({ beasts: [""] }) })])).toEqual({
      quests: [],
      rooms: [],
    });
  });

  it("lists the quests that point at the beast, by id and name", () => {
    const quests = [
      quest("q1", { beastId: "wolf", adventureType: "beast", achievementName: "Dishes" }),
      quest("q2", { beastId: "other" }),
      quest("q3", { beastId: "wolf", achievementName: "" }),
    ];

    expect(linksTo("wolf", quests, [])).toEqual({
      quests: [
        { id: "q1", name: "Dishes" },
        { id: "q3", name: "" },
      ],
      rooms: [],
    });
  });

  it("lists the temple rooms that hold the beast, in the beasts list or as the mimic", () => {
    const temples = [
      temple("t1", {
        R1: room({ beasts: ["bat", "wolf"] }),
        R2: room({ beasts: ["bat"] }),
        R3: room({ mimicBeastId: "wolf" }, { type: "chest" }),
      }),
      temple("t2", { R1: room({ beasts: ["wolf"] }) }, false),
    ];

    expect(linksTo("wolf", [], temples)).toEqual({
      quests: [],
      rooms: [
        { templeId: "t1", roomKey: "R1" },
        { templeId: "t1", roomKey: "R3" },
        { templeId: "t2", roomKey: "R1" },
      ],
    });
  });

  it("lists a room once when the beast is in it twice, or in both room maps", () => {
    const shared = room({ beasts: ["wolf", "wolf"], mimicBeastId: "wolf" });
    const temples: TempleRef[] = [{ id: "t1", dungeonLayout: { rooms: { R1: shared } }, rooms: { R1: shared } }];

    expect(linksTo("wolf", [], temples).rooms).toEqual([{ templeId: "t1", roomKey: "R1" }]);
  });

  it("ignores rooms with no content or a beasts value that is not a list", () => {
    const temples = [temple("t1", { R1: { type: "empty" }, R2: room({ beasts: "wolf" }) })];

    expect(linksTo("wolf", [], temples).rooms).toEqual([]);
  });
});

describe("unlink", () => {
  it("returns nothing to save when the beast is not used", () => {
    const quests = [quest("q1", { beastId: "other" })];
    const temples = [temple("t1", { R1: room({ beasts: ["other"] }) })];

    expect(unlink("wolf", quests, temples)).toEqual({ quests: [], temples: [] });
    expect(unlink("", [quest("q1")], temples)).toEqual({ quests: [], temples: [] });
  });

  it("clears the beast on its quests and turns a beast quest back into a plain one", () => {
    const quests = [
      quest("q1", { beastId: "wolf", adventureType: "beast", achievementName: "Dishes" }),
      quest("q2", { beastId: "wolf", adventureType: "chain" }),
      quest("q3", { beastId: "other", adventureType: "beast" }),
    ];

    const changed = unlink("wolf", quests, []).quests;

    expect(changed).toEqual([
      { id: "q1", achievementName: "Dishes", beastId: "", adventureType: "simple" },
      { id: "q2", achievementName: "Quest q2", beastId: "", adventureType: "chain" },
    ]);
  });

  it("keeps every other field on the quest and leaves the original untouched", () => {
    const original = { ...quest("q1", { beastId: "wolf", adventureType: "beast" }), xp: 200, assignee: ["kid"] };

    const [changed] = unlink("wolf", [original], []).quests as (typeof original)[];

    expect(changed).toMatchObject({ xp: 200, assignee: ["kid"] });
    expect(original.beastId).toBe("wolf");
    expect(original.adventureType).toBe("beast");
  });

  it("does not invent an adventure type on a quest that had none", () => {
    const [changed] = unlink("wolf", [{ id: "q1", beastId: "wolf" }], []).quests;

    expect(changed).toEqual({ id: "q1", beastId: "" });
  });

  it("drops the beast from the rooms that list it and clears it as a mimic", () => {
    const temples = [
      temple("t1", {
        R1: room({ beasts: ["bat", "wolf"], xp: 10 }),
        R2: room({ beasts: ["bat"] }),
        R3: room({ mimicBeastId: "wolf", mimicType: "pick" }, { type: "chest" }),
      }),
    ];

    const [changed] = unlink("wolf", [], temples).temples;
    const rooms = changed.dungeonLayout?.rooms as Record<string, RoomRef>;

    expect(rooms.R1.content).toEqual({ beasts: ["bat"], xp: 10 });
    expect(rooms.R3.content).toEqual({ mimicBeastId: null, mimicType: "pick" });
    expect(rooms.R2).toBe(temples[0].dungeonLayout?.rooms?.R2);
  });

  it("removes a beast that is in one room twice, and from both room maps", () => {
    const doubled = room({ beasts: ["wolf", "bat", "wolf"], mimicBeastId: "wolf" });
    const temples: TempleRef[] = [{ id: "t1", dungeonLayout: { rooms: { R1: doubled } }, rooms: { R1: doubled } }];

    const [changed] = unlink("wolf", [], temples).temples;

    expect(changed.dungeonLayout?.rooms?.R1.content).toEqual({ beasts: ["bat"], mimicBeastId: null });
    expect(changed.rooms?.R1.content).toEqual({ beasts: ["bat"], mimicBeastId: null });
    expect(linksTo("wolf", [], [changed]).rooms).toEqual([]);
  });

  it("changes only the temples that use the beast, and never the originals", () => {
    const used = temple("t1", { R1: room({ beasts: ["wolf"] }) });
    const untouched = temple("t2", { R1: room({ beasts: ["bat"] }) });

    const result = unlink("wolf", [], [used, untouched]);

    expect(result.temples.map((t) => t.id)).toEqual(["t1"]);
    expect(used.dungeonLayout?.rooms?.R1.content?.beasts).toEqual(["wolf"]);
  });

  it("leaves nothing for linksTo to find once the changed records replace the old ones", () => {
    const quests = [quest("q1", { beastId: "wolf", adventureType: "beast" }), quest("q2")];
    const temples = [temple("t1", { R1: room({ beasts: ["wolf"] }) }, false)];

    const changed = unlink("wolf", quests, temples);

    expect(linksTo("wolf", changed.quests, changed.temples)).toEqual({ quests: [], rooms: [] });
  });
});

describe("usageNote", () => {
  it("is empty when nothing links to the beast", () => {
    expect(usageNote({ quests: [], rooms: [] })).toBe("");
  });

  it("names the quests and counts the rooms", () => {
    const links = {
      quests: [
        { id: "q1", name: "Dishes" },
        { id: "q2", name: "Laundry" },
      ],
      rooms: [{ templeId: "t1", roomKey: "R1" }],
    };

    expect(usageNote(links)).toBe("Used by 2 quests (Dishes, Laundry) and 1 temple room");
  });

  it("speaks of rooms alone, and of a single quest, in the right number", () => {
    const rooms = [
      { templeId: "t1", roomKey: "R1" },
      { templeId: "t1", roomKey: "R2" },
    ];

    expect(usageNote({ quests: [], rooms })).toBe("Used by 2 temple rooms");
    expect(usageNote({ quests: [{ id: "q1", name: "Dishes" }], rooms: [] })).toBe("Used by 1 quest (Dishes)");
  });

  it("shortens a long list of quests and names the unnamed ones", () => {
    const quests = Array.from({ length: 7 }, (_, i) => ({ id: `q${i}`, name: i === 0 ? "" : `Chore ${i}` }));

    expect(usageNote({ quests, rooms: [] })).toBe(
      "Used by 7 quests (Unnamed quest, Chore 1, Chore 2, Chore 3, Chore 4, +2 more)"
    );
  });
});

describe("escapeHtml", () => {
  it("escapes what an Ionic alert would otherwise render as markup", () => {
    expect(escapeHtml(`<b onclick="x">Tom & 'Jerry'</b>`)).toBe(
      "&lt;b onclick=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/b&gt;"
    );
  });
});

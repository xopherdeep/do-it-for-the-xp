import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import type { HeroQuestEffects } from "@/lib/engine/quests/QuestSchedule";
import {
  QUEST_AMBUSH_COOLDOWN_MS,
  ambushAlertCopy,
  libraryBeastName,
  pickQuestAmbush,
  withAmbushStamped,
} from "@/lib/services/battle/questAmbush";

const MIN = 60_000;
/** Monday 12 October 2026, noon. */
const NOW = new Date(2026, 9, 12, 12, 0, 0, 0);

/** A daily quest for hero-1 due at `dueByTime`, with the Dish Goblin as its beast. */
const makeQuest = (id: string, overrides: Partial<Achievement> = {}): Achievement =>
  ({
    id,
    achievementName: `Chore ${id}`,
    categoryId: "",
    bonusAchievement: false,
    requiresApproval: false,
    beastId: "beast-dish-goblin",
    type: "individual",
    assignee: ["hero-1"],
    basicSchedule: "daily",
    scheduleType: "",
    customFrequency: 1,
    customPeriodType: "day",
    customPeriodNumber: 1,
    dueByTime: "08:00",
    endsOn: "",
    startsOn: "",
    repeatOnDays: [],
    showDailyUntilComplete: false,
    difficulty: 1,
    xp: 100,
    gp: 10,
    ap: 1,
    adventureType: "",
    ...overrides,
  }) as Achievement;

/** A board row the way the board builds one for an open quest. */
const row = (quest: Achievement, overrides: Partial<QuestBoardItem> = {}): QuestBoardItem => ({
  quest,
  status: "open",
  progress: null,
  pending: false,
  overdue: true,
  ...overrides,
});

const openQuest = (id: string, overrides: Partial<Achievement> = {}) => row(makeQuest(id, overrides));

describe("pickQuestAmbush", () => {
  describe("which quest ambushes", () => {
    it("picks an open quest whose deadline has passed, with its beast and deadline", () => {
      const pick = pickQuestAmbush([openQuest("q1")], undefined, {}, NOW);

      expect(pick?.quest.id).toBe("q1");
      expect(pick?.beastId).toBe("beast-dish-goblin");
      expect(pick?.deadline).toEqual(new Date(2026, 9, 12, 8, 0, 0, 0));
    });

    it("finds nothing on an empty board", () => {
      expect(pickQuestAmbush([], undefined, {}, NOW)).toBeNull();
    });

    it("leaves a quest alone until its deadline has passed", () => {
      const notYet = openQuest("q1", { dueByTime: "18:00" });
      expect(pickQuestAmbush([notYet], undefined, {}, NOW)).toBeNull();
      expect(pickQuestAmbush([notYet], undefined, {}, new Date(2026, 9, 12, 18, 0, 0, 0))).toBeNull();
      expect(pickQuestAmbush([notYet], undefined, {}, new Date(2026, 9, 12, 18, 1, 0, 0))?.quest.id).toBe("q1");
    });

    it("never ambushes for a quest with no due time", () => {
      expect(pickQuestAmbush([openQuest("q1", { dueByTime: "" })], undefined, {}, NOW)).toBeNull();
      expect(pickQuestAmbush([openQuest("q2", { dueByTime: "soon" })], undefined, {}, NOW)).toBeNull();
    });

    it("leaves quests that are done, not due or waiting on the Game Master", () => {
      const done = row(makeQuest("done"), { status: "done" });
      const notDue = row(makeQuest("notDue"), { status: "notDue" });
      const waiting = row(makeQuest("waiting"), { pending: true });

      expect(pickQuestAmbush([done, notDue, waiting], undefined, {}, NOW)).toBeNull();
    });

    it("leaves a draft alone", () => {
      expect(pickQuestAmbush([openQuest("q1", { draft: true })], undefined, {}, NOW)).toBeNull();
    });

    it("sends the quest with the oldest deadline first, whatever order the board lists them", () => {
      const board = [
        openQuest("late", { dueByTime: "10:30" }),
        openQuest("oldest", { dueByTime: "07:15" }),
        openQuest("middle", { dueByTime: "09:00" }),
      ];

      expect(pickQuestAmbush(board, undefined, {}, NOW)?.quest.id).toBe("oldest");
      expect(pickQuestAmbush([...board].reverse(), undefined, {}, NOW)?.quest.id).toBe("oldest");
    });

    it("breaks a tie by board order, and does not reorder the board", () => {
      const board = [openQuest("first"), openQuest("second")];
      const before = board.map((item) => item.quest.id);

      expect(pickQuestAmbush(board, undefined, {}, NOW)?.quest.id).toBe("first");
      expect(board.map((item) => item.quest.id)).toEqual(before);
    });

    it("passes over a quest that is not overdue for one that is", () => {
      const board = [openQuest("fine", { dueByTime: "20:00" }), openQuest("overdue", { dueByTime: "11:00" })];

      expect(pickQuestAmbush(board, undefined, {}, NOW)?.quest.id).toBe("overdue");
    });
  });

  describe("the one due-date rule", () => {
    it("holds a weekly quest back until its window's last day", () => {
      const weekly = openQuest("weekly", { basicSchedule: "weekly", startsOn: "2026-10-12T00:00:00", dueByTime: "08:00" });

      // Midweek: past 08:00, but the week is not over
      expect(pickQuestAmbush([weekly], undefined, {}, new Date(2026, 9, 14, 12, 0))).toBeNull();
      // The window's last day, Sunday 18 October
      expect(pickQuestAmbush([weekly], undefined, {}, new Date(2026, 9, 18, 7, 0))).toBeNull();
      expect(pickQuestAmbush([weekly], undefined, {}, new Date(2026, 9, 18, 12, 0))?.quest.id).toBe("weekly");
    });

    it("stands still while Chronos' Clock holds time", () => {
      const effects: HeroQuestEffects = {
        pause: { from: new Date(2026, 9, 12, 11, 0).toISOString(), until: new Date(2026, 9, 12, 13, 0).toISOString() },
      };

      expect(pickQuestAmbush([openQuest("q1")], effects, {}, NOW)).toBeNull();
    });

    it("pushes the deadline back by the time Chronos paused before it", () => {
      const pausedFor = (hours: number): HeroQuestEffects => ({
        pause: {
          from: new Date(2026, 9, 12, 7, 30).toISOString(),
          until: new Date(2026, 9, 12, 7, 30 + hours * 60).toISOString(),
        },
      });

      // 08:00 + 3.5h = 11:30, already behind noon
      expect(pickQuestAmbush([openQuest("q1")], pausedFor(3.5), {}, NOW)?.quest.id).toBe("q1");
      // 08:00 + 4.25h = 12:15, still ahead
      expect(pickQuestAmbush([openQuest("q1")], pausedFor(4.25), {}, NOW)).toBeNull();
    });

    it("waits for the later deadline an Ice Wand set", () => {
      const effects: HeroQuestEffects = { extendedUntil: { q1: new Date(2026, 9, 12, 14, 0).toISOString() } };

      expect(pickQuestAmbush([openQuest("q1")], effects, {}, NOW)).toBeNull();
      expect(pickQuestAmbush([openQuest("q1")], effects, {}, new Date(2026, 9, 12, 14, 5))?.quest.id).toBe("q1");
    });

    it("sends nothing while Gale's Wind holds the day off", () => {
      const effects: HeroQuestEffects = { dayOffUntil: new Date(2026, 9, 12, 20, 0).toISOString() };

      expect(pickQuestAmbush([openQuest("q1")], effects, {}, NOW)).toBeNull();
      expect(pickQuestAmbush([openQuest("q1")], effects, {}, new Date(2026, 9, 12, 20, 1))?.quest.id).toBe("q1");
    });
  });

  describe("the cooldown", () => {
    it("is 60 minutes", () => {
      expect(QUEST_AMBUSH_COOLDOWN_MS).toBe(60 * MIN);
    });

    it("keeps a quest that ambushed this hero in the last hour quiet", () => {
      const grudges = { q1: { lastAmbushAt: NOW.getTime() - 30 * MIN } };

      expect(pickQuestAmbush([openQuest("q1")], undefined, grudges, NOW)).toBeNull();
    });

    it("lets the quest ambush again once the hour is up", () => {
      const justUnder = { q1: { lastAmbushAt: NOW.getTime() - (60 * MIN - 1) } };
      const exactly = { q1: { lastAmbushAt: NOW.getTime() - 60 * MIN } };

      expect(pickQuestAmbush([openQuest("q1")], undefined, justUnder, NOW)).toBeNull();
      expect(pickQuestAmbush([openQuest("q1")], undefined, exactly, NOW)?.quest.id).toBe("q1");
    });

    it("is per quest: the next overdue quest takes the slot while the first one rests", () => {
      const board = [openQuest("old", { dueByTime: "07:00" }), openQuest("newer", { dueByTime: "09:00" })];
      const grudges = { old: { lastAmbushAt: NOW.getTime() - 5 * MIN } };

      expect(pickQuestAmbush(board, undefined, grudges, NOW)?.quest.id).toBe("newer");
    });

    it("is per hero, because the record handed in is the hero's own", () => {
      expect(pickQuestAmbush([openQuest("q1")], undefined, {}, NOW)?.quest.id).toBe("q1");
    });

    it("reads ISO stamps and numbers, and ignores a stamp it cannot read or one from the future", () => {
      const iso = { q1: { lastAmbushAt: new Date(NOW.getTime() - 10 * MIN).toISOString() } };
      const garbage = { q1: { lastAmbushAt: "yesterday-ish" } };
      const future = { q1: { lastAmbushAt: NOW.getTime() + 5 * 60 * MIN } };
      const empty = { q1: { lastAmbushAt: null }, q2: undefined };

      expect(pickQuestAmbush([openQuest("q1")], undefined, iso, NOW)).toBeNull();
      expect(pickQuestAmbush([openQuest("q1")], undefined, garbage, NOW)?.quest.id).toBe("q1");
      expect(pickQuestAmbush([openQuest("q1")], undefined, future, NOW)?.quest.id).toBe("q1");
      expect(pickQuestAmbush([openQuest("q1")], undefined, empty, NOW)?.quest.id).toBe("q1");
    });

    it("ignores the other fields of a grudge record (marks, lastFledAt)", () => {
      // The shape slice 9 gives a grudge entry: marks, and the two stamps it keeps
      const grudges: Record<string, { marks: number; lastFledAt?: string; lastAmbushAt?: string }> = {
        q1: { marks: 2, lastFledAt: new Date(NOW.getTime() - MIN).toISOString() },
      };

      expect(pickQuestAmbush([openQuest("q1")], undefined, grudges, NOW)?.quest.id).toBe("q1");
    });

    it("takes a cooldown of the caller's choosing", () => {
      const grudges = { q1: { lastAmbushAt: NOW.getTime() - 10 * MIN } };

      expect(pickQuestAmbush([openQuest("q1")], undefined, grudges, NOW, 5 * MIN)?.quest.id).toBe("q1");
      expect(pickQuestAmbush([openQuest("q1")], undefined, grudges, NOW, 15 * MIN)).toBeNull();
    });
  });

  describe("the quest's beast", () => {
    it("uses the beast the Game Master chose", () => {
      expect(pickQuestAmbush([openQuest("q1", { beastId: "beast-mustwisp" })], undefined, {}, NOW)?.beastId).toBe(
        "beast-mustwisp"
      );
    });

    it("uses the library's suggestion for a quest with no beast of its own", () => {
      const dishes = openQuest("q1", { beastId: undefined, achievementName: "Load the dishwasher" });

      expect(pickQuestAmbush([dishes], undefined, {}, NOW)?.beastId).toBe("beast-dish-goblin");
    });

    it("never ambushes for a quest the Game Master marked 'No beast'", () => {
      const noBeast = openQuest("q1", { beastId: undefined, noBeast: true, achievementName: "Load the dishwasher" });

      expect(pickQuestAmbush([noBeast], undefined, {}, NOW)).toBeNull();
    });

    it("never ambushes for a quest the library has no beast for", () => {
      const nothingFits = openQuest("q1", { beastId: undefined, achievementName: "Zzxq" });

      expect(pickQuestAmbush([nothingFits], undefined, {}, NOW)).toBeNull();
    });

    it("hands the slot to the next overdue quest when the oldest one has no beast", () => {
      const board = [
        openQuest("beastless", { beastId: undefined, noBeast: true, dueByTime: "07:00" }),
        openQuest("armed", { dueByTime: "09:00" }),
      ];

      expect(pickQuestAmbush(board, undefined, {}, NOW)?.quest.id).toBe("armed");
    });
  });
});

/** The ambush stamp lives on the hero's grudge record (docs/Quest-Rooms-Spec.md 5.7), beside the marks. */
describe("withAmbushStamped", () => {
  it("stamps the quest on the record without touching the one it was given", () => {
    const before = { old: { marks: 1, lastAmbushAt: NOW.getTime() - 10 * MIN } };
    const after = withAmbushStamped(before, "q1", NOW.getTime());

    expect(after).toEqual({ old: { marks: 1, lastAmbushAt: NOW.getTime() - 10 * MIN }, q1: { marks: 0, lastAmbushAt: NOW.getTime() } });
    expect(before).toEqual({ old: { marks: 1, lastAmbushAt: NOW.getTime() - 10 * MIN } });
  });

  it("keeps the marks a quest holds and the moment the hero fled, and restarts the hour", () => {
    const after = withAmbushStamped(
      { q1: { marks: 2, lastFledAt: NOW.getTime() - 5 * MIN, lastAmbushAt: NOW.getTime() - 50 * MIN } },
      "q1",
      NOW.getTime()
    );

    expect(after).toEqual({ q1: { marks: 2, lastFledAt: NOW.getTime() - 5 * MIN, lastAmbushAt: NOW.getTime() } });
  });

  it("forgets quests that are done with: no marks and their hour is up, so the record stays small", () => {
    const record = {
      stale: { marks: 0, lastAmbushAt: NOW.getTime() - 61 * MIN },
      edge: { marks: 0, lastAmbushAt: NOW.getTime() - 60 * MIN },
      fresh: { marks: 0, lastAmbushAt: NOW.getTime() - 59 * MIN },
    };

    expect(withAmbushStamped(record, "q1", NOW.getTime())).toEqual({
      fresh: { marks: 0, lastAmbushAt: NOW.getTime() - 59 * MIN },
      q1: { marks: 0, lastAmbushAt: NOW.getTime() },
    });
  });

  it("never forgets a grudge, however old its ambush stamp is", () => {
    const record = { grudging: { marks: 3, lastFledAt: NOW.getTime() - 5000 * MIN, lastAmbushAt: NOW.getTime() - 9999 * MIN } };

    expect(withAmbushStamped(record, "q1", NOW.getTime()).grudging).toEqual(record.grudging);
  });

  it("starts a record for a hero from before grudges, and drops entries it cannot read", () => {
    expect(withAmbushStamped(undefined, "q1", NOW.getTime())).toEqual({ q1: { marks: 0, lastAmbushAt: NOW.getTime() } });
    expect(withAmbushStamped("junk", "q1", NOW.getTime())).toEqual({ q1: { marks: 0, lastAmbushAt: NOW.getTime() } });
    const record = { bad: null, worse: 4, nan: { marks: 0, lastAmbushAt: "x" } };

    expect(withAmbushStamped(record, "q1", NOW.getTime())).toEqual({ q1: { marks: 0, lastAmbushAt: NOW.getTime() } });
  });

  it("is read back by the ambush rule: the quest rests for the hour, then comes back", () => {
    const board = [row(makeQuest("q1"))];
    const stamped = withAmbushStamped({ q1: { marks: 2 } }, "q1", NOW.getTime());

    expect(pickQuestAmbush(board, undefined, stamped, new Date(NOW.getTime() + 30 * MIN))).toBeNull();
    expect(pickQuestAmbush(board, undefined, stamped, new Date(NOW.getTime() + 60 * MIN))?.quest.id).toBe("q1");
  });
});

describe("libraryBeastName", () => {
  it("names a chore beast and a classic beast the family renamed", () => {
    expect(libraryBeastName("beast-dish-goblin")).toBe("Dish Goblin");
    expect(libraryBeastName("beast-classic-050")).toBe("Moanin Ronan");
  });

  it("has no name for a placeholder classic beast or an unknown id", () => {
    expect(libraryBeastName("beast-classic-012")).toBeUndefined();
    expect(libraryBeastName("beast-not-a-thing")).toBeUndefined();
  });
});

describe("ambushAlertCopy", () => {
  it("names the beast and the chore", () => {
    expect(ambushAlertCopy({ beastName: "Dish Goblin", questName: "Load the dishwasher" })).toEqual({
      title: "⚔️ The Dish Goblin blocks your path!",
      body: "Load the dishwasher is overdue. Come back and fight!",
    });
  });

  it("does not double a leading The", () => {
    expect(ambushAlertCopy({ beastName: "The Great Sock", questName: "Socks" }).title).toBe(
      "⚔️ The Great Sock blocks your path!"
    );
  });

  it("falls back to a plain beast and a plain call when it has no names", () => {
    expect(ambushAlertCopy({})).toEqual({ title: "⚔️ A beast blocks your path!", body: "Come back and fight!" });
    expect(ambushAlertCopy({ questName: "  " }).body).toBe("Come back and fight!");
  });
});

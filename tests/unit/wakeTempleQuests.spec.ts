/**
 * Wake quests (docs/Quest-Rooms-Spec.md section 9): the Game Master picks heroes and ticks the dormant templates of a
 * temple, and the quests the templates describe are made for them: `tq-<templeId>-<slug>`, a Solo Mission for the
 * picked heroes, starting this Monday, with the library's beast adopted. A beast that already has a live family quest
 * is skipped and listed as "uses your quest". The plan is pure; only `commitWake` writes, through the writers it is
 * handed, and it never writes over a record.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { Room, RoomQuestTemplate } from "@/lib/engine/core/dungeons/types";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import type { QuestLayout } from "@/lib/services/temples/templeQuestRows";
import {
  commitWake,
  mondayOf,
  planWake,
  questFromTemplate,
  wakeChoices,
  wakeProblem,
  wakeQuestId,
  type WakeInput,
} from "@/lib/services/temples/wakeTempleQuests";

const KIA = "hero-1";
const MIA = "hero-2";
const WED = new Date("2026-10-14T15:30:00");

const chore = (slug: string) => BEAST_LIBRARY.find((beast) => beast.slug === slug)!.chore;

const template = (overrides: Partial<RoomQuestTemplate> = {}): RoomQuestTemplate => ({
  beastId: "beast-dish-goblin",
  difficulty: 2,
  basicSchedule: "daily",
  ...overrides,
});

const makeQuest = (id: string, overrides: Partial<Achievement> = {}): Achievement =>
  ({
    id,
    achievementName: `Quest ${id}`,
    type: "individual",
    assignee: [KIA],
    basicSchedule: "daily",
    customFrequency: 1,
    customPeriodType: "day",
    customPeriodNumber: 1,
    repeatOnDays: [],
    startsOn: "2026-01-01T00:00:00.000Z",
    endsOn: "",
    dueByTime: "",
    difficulty: 2,
    beastId: "beast-dish-goblin",
    ...overrides,
  }) as unknown as Achievement;

const owned = (id: string, name: string): Beast => ({ id, name, avatar: 1, bg1: 1, bg2: 2, aspectRatio: 48, checklist: [] }) as unknown as Beast;

const input = (overrides: Partial<WakeInput> = {}): WakeInput => ({
  templeId: "shadow-temple",
  templates: [template()],
  heroIds: [KIA],
  quests: [],
  beasts: [],
  now: WED,
  ...overrides,
});

describe("wakeQuestId", () => {
  it("is tq-<templeId>-<slug>, the slug being the beast's id without the library's beast- prefix", () => {
    expect(wakeQuestId("shadow-temple", "beast-dish-goblin")).toBe("tq-shadow-temple-dish-goblin");
    expect(wakeQuestId("wind-temple", "beast-dust-dervish")).toBe("tq-wind-temple-dust-dervish");
  });

  it("keeps the whole id of a beast the library does not own", () => {
    expect(wakeQuestId("shadow-temple", "my-own-beast")).toBe("tq-shadow-temple-my-own-beast");
  });
});

describe("mondayOf", () => {
  it("is the Monday of the week, at midnight", () => {
    expect(mondayOf(WED)).toEqual(new Date("2026-10-12T00:00:00"));
  });

  it("is today on a Monday, and the week's Monday on a Sunday", () => {
    expect(mondayOf(new Date("2026-10-12T23:59:00"))).toEqual(new Date("2026-10-12T00:00:00"));
    expect(mondayOf(new Date("2026-10-18T08:00:00"))).toEqual(new Date("2026-10-12T00:00:00"));
  });
});

describe("questFromTemplate", () => {
  const made = (t: RoomQuestTemplate, heroes = [KIA, MIA], name = chore("dish-goblin")) =>
    questFromTemplate("shadow-temple", t, heroes, name, WED);

  it("makes a Solo Mission for the picked heroes, named for the beast's chore and bound to the beast", () => {
    const quest = made(template());
    expect(quest).toMatchObject({
      id: "tq-shadow-temple-dish-goblin",
      achievementName: "Load the dishwasher",
      beastId: "beast-dish-goblin",
      adventureType: "beast",
      type: "individual",
      assignee: [KIA, MIA],
      requiresApproval: false,
      bonusAchievement: false,
      endsOn: "",
    });
    expect(quest.draft).toBeUndefined();
  });

  it("starts this Monday, so a weekly quest's windows begin there", () => {
    expect(new Date(made(template()).startsOn)).toEqual(new Date("2026-10-12T00:00:00"));
  });

  it("pays as the quest form pays: xp 100x, gp 10x, ap 1x the difficulty", () => {
    expect(made(template({ difficulty: 2 }))).toMatchObject({ difficulty: 2, xp: 200, gp: 30, ap: 2 });
    expect(made(template({ difficulty: 13 }))).toMatchObject({ difficulty: 13, xp: 1300, gp: 195, ap: 13 });
  });

  it("carries a daily template's times: due time, parts of the day, minutes", () => {
    const quest = made(template({ basicSchedule: "daily", dueByTime: "19:00", timesOfDay: ["morning", "night"], estimatedMinutes: 6 }));
    expect(quest).toMatchObject({
      basicSchedule: "daily",
      scheduleType: "basic",
      showDailyUntilComplete: true,
      dueByTime: "19:00",
      timesOfDay: ["morning", "night"],
      estimatedMinutes: 6,
    });
  });

  it("carries a weekday template: weekly on the listed days", () => {
    const quest = made(template({ basicSchedule: "weekly", repeatOnDays: ["mon", "tue", "wed", "thu", "fri"] }));
    expect(quest).toMatchObject({ basicSchedule: "weekly", scheduleType: "basic", repeatOnDays: ["mon", "tue", "wed", "thu", "fri"] });
    expect(quest.showDailyUntilComplete).toBe(false);
  });

  it("carries a monthly template as a custom schedule of one month", () => {
    const quest = made(template({ basicSchedule: "custom", customPeriodType: "month" }));
    expect(quest).toMatchObject({
      basicSchedule: "custom",
      scheduleType: "custom",
      customPeriodType: "month",
      customFrequency: 1,
      customPeriodNumber: 1,
    });
  });

  it("leaves out the fields a template does not set, so the strike clock falls back to the difficulty's default", () => {
    const quest = made(template());
    expect(quest.dueByTime).toBe("");
    expect(quest.repeatOnDays).toEqual([]);
    expect("timesOfDay" in quest).toBe(false);
    expect("estimatedMinutes" in quest).toBe(false);
  });

  it("does not share the template's arrays with the quest", () => {
    const t = template({ repeatOnDays: ["mon"], timesOfDay: ["morning"] });
    const quest = made(t);
    quest.repeatOnDays.push("tue");
    quest.timesOfDay!.push("night");
    expect(t.repeatOnDays).toEqual(["mon"]);
    expect(t.timesOfDay).toEqual(["morning"]);
  });
});

describe("wakeProblem", () => {
  it("wants a hero and a quest to wake", () => {
    expect(wakeProblem([], [template()])).toBe("Pick at least one hero.");
    expect(wakeProblem([KIA], [])).toBe("Tick at least one quest to wake.");
    expect(wakeProblem([], [])).toBe("Pick at least one hero.");
    expect(wakeProblem([KIA], [template()])).toBeNull();
  });
});

describe("planWake", () => {
  it("makes a quest for each ticked template", () => {
    const plan = planWake(input({ templates: [template(), template({ beastId: "beast-crumb-gremlin", difficulty: 1 })] }));
    expect(plan.problem).toBeNull();
    expect(plan.skipped).toEqual([]);
    expect(plan.quests.map((q) => q.id)).toEqual(["tq-shadow-temple-dish-goblin", "tq-shadow-temple-crumb-gremlin"]);
    expect(plan.quests.map((q) => q.achievementName)).toEqual([chore("dish-goblin"), chore("crumb-gremlin")]);
    expect(plan.quests.every((q) => q.assignee.join() === KIA)).toBe(true);
  });

  it("assigns every picked hero", () => {
    expect(planWake(input({ heroIds: [KIA, MIA] })).quests[0].assignee).toEqual([KIA, MIA]);
  });

  it("adopts the library beasts the family's bestiary lacks, once each", () => {
    const plan = planWake(input({ templates: [template(), template({ beastId: "beast-crumb-gremlin" })], beasts: [] }));
    expect(plan.beasts.map((b) => b.id)).toEqual(["beast-dish-goblin", "beast-crumb-gremlin"]);
    expect(plan.beasts[0]).toMatchObject({ name: "Dish Goblin", theme: "shadow" });
  });

  it("does not touch a beast the family already has (it may be edited), nor invent one the library lacks", () => {
    const plan = planWake(
      input({
        templates: [template(), template({ beastId: "beast-made-up" })],
        beasts: [owned("beast-dish-goblin", "Dishy")],
      })
    );
    expect(plan.beasts).toEqual([]);
    expect(plan.quests.map((q) => q.id)).toEqual(["tq-shadow-temple-dish-goblin", "tq-shadow-temple-made-up"]);
  });

  it("names a quest for a beast the library lacks after the beast the family owns", () => {
    const plan = planWake(input({ templates: [template({ beastId: "mine" })], beasts: [owned("mine", "Sock Dragon")] }));
    expect(plan.quests[0].achievementName).toBe("Sock Dragon");
  });

  describe("a beast that already has a live family quest", () => {
    it("is skipped and listed as 'uses your quest'", () => {
      const theirs = makeQuest("q-theirs", { achievementName: "Banish the Dish Goblin", assignee: [KIA, MIA] });
      const plan = planWake(input({ heroIds: [KIA, MIA], quests: [theirs] }));
      expect(plan.quests).toEqual([]);
      expect(plan.beasts).toEqual([]);
      expect(plan.skipped).toHaveLength(1);
      expect(plan.skipped[0]).toMatchObject({
        beastId: "beast-dish-goblin",
        reason: "usesQuest",
        quest: theirs,
        line: 'Dish Goblin: uses your quest "Banish the Dish Goblin"',
      });
    });

    it("also knows the quest by the beast the library suggests for a quest with no beast of its own", () => {
      const nameOnly = makeQuest("q-name", { beastId: "", achievementName: "Banish the Dish Goblin" });
      const plan = planWake(input({ quests: [nameOnly] }));
      expect(plan.skipped.map((s) => s.reason)).toEqual(["usesQuest"]);
    });

    it("still wakes the others", () => {
      const theirs = makeQuest("q-theirs", { achievementName: "Banish the Dish Goblin" });
      const plan = planWake(input({ templates: [template(), template({ beastId: "beast-crumb-gremlin" })], quests: [theirs] }));
      expect(plan.quests.map((q) => q.id)).toEqual(["tq-shadow-temple-crumb-gremlin"]);
      expect(plan.skipped.map((s) => s.beastId)).toEqual(["beast-dish-goblin"]);
    });

    it("says so when that quest is not for everyone who was picked, so the Game Master can add them", () => {
      const soloKia = makeQuest("q-theirs", { achievementName: "Banish the Dish Goblin", assignee: [KIA] });
      const plan = planWake(input({ heroIds: [KIA, MIA], quests: [soloKia] }));
      expect(plan.skipped[0].line).toBe(
        'Dish Goblin: uses your quest "Banish the Dish Goblin" (not for everyone you picked: add them there)'
      );
    });

    it("counts an Open Bounty as for everyone", () => {
      const bounty = makeQuest("q-bounty", { achievementName: "Banish the Dish Goblin", type: "asNeeded", assignee: [] });
      const plan = planWake(input({ heroIds: [KIA, MIA], quests: [bounty] }));
      expect(plan.skipped[0].line).toBe('Dish Goblin: uses your quest "Banish the Dish Goblin"');
    });

    it("is not a draft: heroes never see one, so it does not fill the room", () => {
      const draft = makeQuest("q-draft", { draft: true });
      const plan = planWake(input({ quests: [draft] }));
      expect(plan.quests.map((q) => q.id)).toEqual(["tq-shadow-temple-dish-goblin"]);
      expect(plan.skipped).toEqual([]);
    });
  });

  describe("a record that already has the id", () => {
    it("is never written over: a quest the family already woke is left as it is", () => {
      const woken = makeQuest("tq-shadow-temple-dish-goblin", { beastId: "beast-socktopus", achievementName: "Edited by a parent" });
      const plan = planWake(input({ quests: [woken] }));
      expect(plan.quests).toEqual([]);
      expect(plan.skipped[0]).toMatchObject({ reason: "idTaken", quest: woken });
      expect(plan.skipped[0].line).toBe("Dish Goblin: already woken, left as it is");
    });

    it("tells a draft apart: finish it in the Compendium", () => {
      const draft = makeQuest("tq-shadow-temple-dish-goblin", { draft: true });
      const plan = planWake(input({ quests: [draft] }));
      expect(plan.quests).toEqual([]);
      expect(plan.skipped[0].reason).toBe("idTaken");
      expect(plan.skipped[0].line).toBe("Dish Goblin: a draft of it waits in the Compendium, left as it is");
    });
  });

  it("wakes a beast once however many rooms ask for it; the repeat uses the quest just planned", () => {
    const plan = planWake(input({ templates: [template(), template({ difficulty: 5 })] }));
    expect(plan.quests).toHaveLength(1);
    expect(plan.skipped).toHaveLength(1);
    expect(plan.skipped[0]).toMatchObject({ reason: "usesQuest" });
    expect(plan.skipped[0].quest?.id).toBe("tq-shadow-temple-dish-goblin");
  });

  it("does nothing, and says why, without a hero or without a template", () => {
    expect(planWake(input({ heroIds: [] }))).toEqual({ quests: [], beasts: [], skipped: [], problem: "Pick at least one hero." });
    expect(planWake(input({ templates: [] }))).toEqual({ quests: [], beasts: [], skipped: [], problem: "Tick at least one quest to wake." });
  });

  it("does not change what it is given", () => {
    const t = template();
    const quests = [makeQuest("q-1", { beastId: "beast-socktopus" })];
    const before = JSON.stringify({ t, quests });
    planWake(input({ templates: [t], quests }));
    expect(JSON.stringify({ t, quests })).toBe(before);
  });
});

describe("commitWake", () => {
  const writers = () => {
    const calls: string[] = [];
    return {
      calls,
      saveBeast: jest.fn(async (beast: Beast) => void calls.push(`beast:${beast.id}`)),
      saveQuest: jest.fn(async (quest: Achievement) => void calls.push(`quest:${quest.id}`)),
    };
  };

  it("adopts the beasts first so a fight can load them, then saves the quests", async () => {
    const w = writers();
    const plan = planWake(input({ templates: [template(), template({ beastId: "beast-crumb-gremlin" })] }));
    const done = await commitWake(plan, w);
    expect(w.calls).toEqual([
      "beast:beast-dish-goblin",
      "beast:beast-crumb-gremlin",
      "quest:tq-shadow-temple-dish-goblin",
      "quest:tq-shadow-temple-crumb-gremlin",
    ]);
    expect(done.woken.map((q) => q.id)).toEqual(["tq-shadow-temple-dish-goblin", "tq-shadow-temple-crumb-gremlin"]);
    expect(done.adopted).toHaveLength(2);
  });

  it("writes nothing for a plan with a problem or nothing to do", async () => {
    const w = writers();
    expect(await commitWake(planWake(input({ heroIds: [] })), w)).toEqual({ woken: [], adopted: [] });
    const theirs = makeQuest("q-theirs");
    expect(await commitWake(planWake(input({ quests: [theirs] })), w)).toEqual({ woken: [], adopted: [] });
    expect(w.saveQuest).not.toHaveBeenCalled();
    expect(w.saveBeast).not.toHaveBeenCalled();
  });

  it("stops at the first write that fails and lets the caller say so", async () => {
    const w = writers();
    w.saveQuest.mockRejectedValueOnce(new Error("disk full"));
    const plan = planWake(input({ templates: [template(), template({ beastId: "beast-crumb-gremlin" })] }));
    await expect(commitWake(plan, w)).rejects.toThrow("disk full");
    expect(w.saveQuest).toHaveBeenCalledTimes(1);
  });
});

describe("wakeChoices", () => {
  const room = (type: string, content: Room["content"]): Room => ({ type, content });
  const layout: QuestLayout = {
    maze: [
      ["b", "m", "s"],
      ["s", "g", "c"],
    ],
    rooms: {
      b: room("boss", { quest: template({ beastId: "beast-grease-gorgon", difficulty: 8, basicSchedule: "weekly" }) }),
      m: room("miniboss", { quest: template({ beastId: "beast-stickyfoot-slime", difficulty: 5, basicSchedule: "weekly" }) }),
      s: room("monster", { quest: template() }),
      g: room("monster", { questId: "q-pick", quest: template({ beastId: "beast-crumb-gremlin", difficulty: 1 }) }),
      c: room("monster", { beasts: ["beast-socktopus"] }),
    },
  };

  it("lists each template once, boss rooms first, with what the quest would be", () => {
    const choices = wakeChoices(layout, [], []);
    // the monster token "s" covers two cells: one choice, two rooms; the gone pick falls back to its template
    expect(choices.map((c) => [c.beastId, c.rooms, c.tier])).toEqual([
      ["beast-grease-gorgon", 1, "boss"],
      ["beast-stickyfoot-slime", 1, "miniboss"],
      ["beast-dish-goblin", 2, "monster"],
      ["beast-crumb-gremlin", 1, "monster"],
    ]);
    expect(choices[2]).toMatchObject({
      beastName: "Dish Goblin",
      questName: chore("dish-goblin"),
      difficulty: 2,
      schedule: "Daily",
      quest: undefined,
    });
  });

  it("shows a template the family's quest already fills as 'uses your quest', not tickable", () => {
    const theirs = makeQuest("q-theirs", { achievementName: "Banish the Dish Goblin" });
    const choice = wakeChoices(layout, [theirs], []).find((c) => c.beastId === "beast-dish-goblin")!;
    expect(choice.quest).toBe(theirs);
  });

  it("leaves out a room whose picked quest is live: nothing to wake there", () => {
    const pick = makeQuest("q-pick", { beastId: "beast-socktopus" });
    expect(wakeChoices(layout, [pick], []).map((c) => c.beastId)).not.toContain("beast-crumb-gremlin");
  });

  it("names a beast the family's bestiary calls something else with the family's name", () => {
    const choice = wakeChoices(layout, [], [owned("beast-dish-goblin", "Dishy")]).find((c) => c.beastId === "beast-dish-goblin")!;
    expect(choice.beastName).toBe("Dishy");
  });

  it("is empty for a classic temple", () => {
    expect(wakeChoices({ maze: [["c"]], rooms: { c: room("monster", { beasts: ["x"] }) } }, [], [])).toEqual([]);
    expect(wakeChoices(undefined, [], [])).toEqual([]);
  });
});

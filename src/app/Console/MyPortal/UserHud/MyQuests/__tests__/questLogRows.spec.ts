import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { questListFor } from "@/lib/services/quests/QuestList";
import type { QuestListRow } from "@/lib/services/quests/QuestList";
import { browseLibrary } from "@/lib/services/bestiary/librarySuggest";
import {
  boardStatusOf,
  linkedQuestRow,
  sectionsByWindow,
  stepsLabel,
  subtitleOf,
  toLogRow,
  windowOf,
} from "../questLogRows";

// 2026-10-10 is a Saturday; the hero reads the log at noon.
const NOON = new Date(2026, 9, 10, 12, 0, 0);

const makeQuest = (overrides: Partial<Achievement> = {}): Achievement => ({
  id: "quest-1",
  achievementName: "clean the kitchen",
  categoryId: "",
  noBeast: true,
  bonusAchievement: false,
  requiresApproval: false,
  type: "individual",
  assignee: ["hero-1"],
  basicSchedule: "daily",
  scheduleType: "basic",
  customFrequency: 1,
  customPeriodType: "day",
  customPeriodNumber: 1,
  dueByTime: "",
  endsOn: "",
  startsOn: "2026-10-01T09:00:00",
  repeatOnDays: [],
  showDailyUntilComplete: false,
  difficulty: 1,
  xp: 100,
  gp: 10,
  ap: 1,
  adventureType: "simple",
  ...overrides,
});

const onBoard = (
  quest: Achievement,
  status: QuestBoardItem["status"] = "open",
  flags: Partial<Pick<QuestBoardItem, "pending" | "overdue">> = {}
): QuestBoardItem => ({
  quest,
  status,
  progress: status === "notDue" ? null : { done: status === "done" ? 1 : 0, allowance: 1, isOpen: status === "open" },
  pending: false,
  overdue: false,
  ...flags,
});

const users = {
  "hero-1": { id: "hero-1", name: { nick: "Max" } },
  "hero-2": { id: "hero-2", name: { nick: "Zoe" } },
};

const rowsOf = (...items: QuestBoardItem[]): QuestListRow[] => questListFor("hero-1", NOON, items, users);

const portraitUrl = (avatar?: number | null) => (avatar ? `portrait-${avatar}.webp` : null);
const nickOf = (id: string) => ({ jack: "Jack" })[id as "jack"] ?? "";
const context = (beasts: Beast[] = []) => ({ beasts, heroNick: "Max", portraitUrl, nickOf });

describe("the Board's due windows", () => {
  it("sorts the rows into Overdue, Today, This week, Later and Done, and leaves empty windows out", () => {
    const rows = rowsOf(
      onBoard(makeQuest({ id: "late", dueByTime: "08:00" }), "open", { overdue: true }),
      onBoard(makeQuest({ id: "today" })),
      onBoard(makeQuest({ id: "weekly", basicSchedule: "weekly", startsOn: "2026-10-07T09:00:00", dueByTime: "18:00" })),
      onBoard(makeQuest({ id: "tamed" }), "done"),
      onBoard(makeQuest({ id: "waiting", requiresApproval: true }), "done", { pending: true })
    );

    const sections = sectionsByWindow(rows, NOON);

    expect(sections.map(({ key }) => key)).toEqual(["overdue", "today", "week", "done"]);
    expect(sections.map(({ label }) => label)).toEqual(["Overdue", "Today", "This week", "Done"]);
    expect(sections.find(({ key }) => key === "done")!.rows.map(({ id }) => id)).toEqual(["waiting", "tamed"]);
  });

  it("puts a one-off task that starts in a few days under This week and one that starts in a month under Later", () => {
    const task = (id: string, startsOn: string) =>
      onBoard(makeQuest({ id, basicSchedule: "once", startsOn, dueByTime: "17:00" }), "notDue");
    const rows = rowsOf(task("next-month", "2026-11-12T00:00:00"), task("wednesday", "2026-10-14T00:00:00"), task("tomorrow", "2026-10-11T00:00:00"));

    const sections = sectionsByWindow(rows, NOON);

    expect(rows.map(({ status }) => status)).toEqual(["later", "later", "later"]);
    expect(sections.map(({ key }) => key)).toEqual(["week", "later"]);
    expect(sections[0].rows.map(({ id }) => id)).toEqual(["tomorrow", "wednesday"]);
    expect(sections[1].rows.map(({ id }) => id)).toEqual(["next-month"]);
  });

  it("reads a quest with a far deadline as Later and a quest open all day as Today", () => {
    const [monthly] = rowsOf(
      onBoard(
        makeQuest({
          id: "monthly",
          basicSchedule: "custom",
          scheduleType: "custom",
          customPeriodType: "month",
          startsOn: "2026-10-01T09:00:00",
          dueByTime: "18:00",
        })
      )
    );
    const [daily] = rowsOf(onBoard(makeQuest({ id: "daily" })));

    expect(windowOf(daily, NOON)).toBe("today");
    expect(windowOf(monthly, NOON)).toBe("later");
  });

  it("opens the quest with the status the board expects", () => {
    expect(boardStatusOf("open")).toBe("open");
    expect(boardStatusOf("overdue")).toBe("open");
    expect(boardStatusOf("pending")).toBe("done");
    expect(boardStatusOf("done")).toBe("done");
    expect(boardStatusOf("later")).toBe("notDue");
  });
});

describe("a row's subtitle", () => {
  it("counts the steps, names the schedule and says when it is due", () => {
    const [row] = rowsOf(
      onBoard(makeQuest({ subAchievementIds: ["a", "b", "c"], dueByTime: "18:00" }))
    );

    expect(subtitleOf(row)).toBe("3 steps · Daily · due 6:00pm");
  });

  it("leaves out what a plain quest does not have", () => {
    const [plain] = rowsOf(onBoard(makeQuest()));
    const [oneOff] = rowsOf(onBoard(makeQuest({ basicSchedule: "once", startsOn: "2026-10-10T00:00:00", dueByTime: "16:00" })));

    expect(subtitleOf(plain)).toBe("Daily");
    expect(subtitleOf(oneOff)).toBe("due 4:00pm");
  });

  it("says nothing about the due time of a quest that is used up", () => {
    const [tamed] = rowsOf(onBoard(makeQuest({ dueByTime: "07:00", subAchievementIds: ["a"] }), "done"));

    expect(subtitleOf(tamed)).toBe("1 step · Daily");
    expect(stepsLabel({ subAchievementIds: [] })).toBe("");
  });
});

describe("a row's tile and chips", () => {
  const library = browseLibrary().find((entry) => entry.avatar);

  it("wears the portrait of the family's own beast", () => {
    const beast = { id: "b1", name: "Dust Bunny King", checklist: [], avatar: 12 } as Beast;
    const [row] = rowsOf(onBoard(makeQuest({ beastId: "b1", noBeast: false })));

    expect(toLogRow(row, context([beast])).image).toBe("portrait-12.webp");
  });

  it("falls back to the beast's own picture, then the quest's picture", () => {
    const pictured = { id: "b2", name: "Pic", checklist: [], localImage: "data:image/png;base64,AAA" } as Beast;
    const [withBeast] = rowsOf(onBoard(makeQuest({ beastId: "b2", noBeast: false })));
    const [withImage] = rowsOf(onBoard(makeQuest({ imageUrl: "https://example.test/q.png" })));

    expect(toLogRow(withBeast, context([pictured])).image).toBe("data:image/png;base64,AAA");
    expect(toLogRow(withImage, context()).image).toBe("https://example.test/q.png");
  });

  it("draws the kid's own picture of a beast over a library portrait it also has", () => {
    const drawn = { id: "b3", name: "Sock Puppet", checklist: [], avatar: 12, localImage: "data:image/jpeg;base64,BBB" } as Beast;
    const [row] = rowsOf(onBoard(makeQuest({ beastId: "b3", noBeast: false })));

    expect(toLogRow(row, context([drawn])).image).toBe("data:image/jpeg;base64,BBB");
  });

  it("shows the status icon when the quest has no beast and no picture", () => {
    const rows = rowsOf(onBoard(makeQuest({ id: "a" })), onBoard(makeQuest({ id: "b" }), "open", { overdue: true }));
    const byId = new Map(rows.map((row) => [row.id, toLogRow(row, context())]));

    expect(byId.get("a")).toMatchObject({ image: "", icon: "scroll" });
    expect(byId.get("b")).toMatchObject({ image: "", icon: "alarm-exclamation" });
  });

  it("finds a library beast for a quest that only knows its id", () => {
    expect(library).toBeTruthy();
    const [row] = rowsOf(onBoard(makeQuest({ beastId: String(library!.id), noBeast: false })));

    expect(toLogRow(row, context()).image).toBe(`portrait-${library!.avatar}.webp`);
  });

  it("tags a shared quest and the approval, and offers Done only on open and overdue rows", () => {
    const [mine, shared, waiting, tamed] = rowsOf(
      onBoard(makeQuest({ id: "mine" })),
      onBoard(makeQuest({ id: "shared", assignee: ["hero-1", "hero-2"], type: "collaborate", requiresApproval: true })),
      onBoard(makeQuest({ id: "waiting" }), "done", { pending: true }),
      onBoard(makeQuest({ id: "tamed" }), "done")
    );
    const ids = new Map([mine, shared, waiting, tamed].map((row) => [row.id, toLogRow(row, context())]));

    expect(ids.get("mine")).toMatchObject({ who: "", canFinish: true, hasChips: true, stateLabel: "" });
    expect(ids.get("shared")).toMatchObject({ who: "Max +1", requiresApproval: true, canFinish: true });
    expect(ids.get("waiting")).toMatchObject({ stateLabel: "Pending", canFinish: false });
    expect(ids.get("tamed")).toMatchObject({ stateLabel: "Tamed", canFinish: false, title: "Clean The Kitchen" });
  });
});

describe("a row's credit", () => {
  const sentOn = "2026-10-20T10:00:00.000Z";

  it("names the hero who suggested a quest a Game Master approved", () => {
    const suggested = makeQuest({ createdBy: "jack", proposal: { by: "jack", on: sentOn, state: "approved" } });
    const [row] = rowsOf(onBoard(suggested));

    expect(toLogRow(row, context()).credit).toBe("Suggested by Jack");
  });

  it("gives no credit to a quest from the Compendium, even one that has a creator", () => {
    const [plain, wizard] = rowsOf(onBoard(makeQuest({ id: "plain" })), onBoard(makeQuest({ id: "wizard", createdBy: "jack" })));

    expect(toLogRow(plain, context()).credit).toBe("");
    expect(toLogRow(wizard, context()).credit).toBe("");
  });

  it("gives no credit when the maker is no hero the family knows", () => {
    const [row] = rowsOf(onBoard(makeQuest({ proposal: { by: "stranger", on: sentOn, state: "approved" } })));

    expect(toLogRow(row, context()).credit).toBe("");
  });
});

describe("linkedQuestRow", () => {
  const rows = ["quest-1", "quest-2"].map((id) =>
    questListFor("hero-1", NOON, [{ quest: makeQuest({ id, achievementName: id }), status: "open", pending: false, overdue: false } as QuestBoardItem], {}, undefined)[0]
  );

  it("finds the row a notification link points at, whatever the id's type", () => {
    expect(linkedQuestRow(rows, "quest-2")?.quest.id).toBe("quest-2");
    expect(linkedQuestRow([{ ...rows[0], quest: makeQuest({ id: 7 as unknown as string }) }], "7")?.quest.id).toBe(7);
  });

  it("answers null for a quest that is no longer on the board, and for no link at all", () => {
    expect(linkedQuestRow(rows, "gone")).toBeNull();
    expect(linkedQuestRow(rows, undefined)).toBeNull();
    expect(linkedQuestRow(rows, "")).toBeNull();
  });
});

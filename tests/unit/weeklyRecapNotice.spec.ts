import { pickWeeklyRecapNotice, recapLink, recapRefId } from "@/lib/services/insights/weeklyRecapNotice";
import type { RecapEntry } from "@/lib/services/insights/weeklyRecap";
import { iconOfKind } from "@/lib/services/notifications/Notifications";
import type { XpNotification } from "@/lib/services/notifications/Notifications";

// Monday 2026-10-19: the week that just ended is 10-12 .. 10-18
const MONDAY = new Date(2026, 9, 19, 8, 0, 0);
const HEROES = [
  { id: "mia", name: "Mia" },
  { id: "otto", name: "Otto" },
];

const done = (userId: string, dayKey: string, extra: Partial<RecapEntry> = {}): RecapEntry => ({
  userId,
  dayKey,
  status: "approved",
  questName: "Socktopus",
  rewards: { xp: 10, gp: 1, ap: 0 },
  ...extra,
});

const told = (refId: string): XpNotification => ({
  id: "n1",
  heroId: "mia",
  kind: "weekly-recap",
  refId,
  title: "",
  body: "",
  createdAt: "2026-10-19T08:00:00.000Z",
});

describe("pickWeeklyRecapNotice", () => {
  const entries = [done("mia", "2026-10-13"), done("mia", "2026-10-14"), done("otto", "2026-10-15")];

  it("tells about the week that just ended, linking to the recap", () => {
    const notice = pickWeeklyRecapNotice({ entries, heroes: HEROES, heroId: "mia", feed: [], now: MONDAY });
    expect(notice).toMatchObject({
      heroId: "mia",
      kind: "weekly-recap",
      refId: recapRefId("2026-10-12"),
      link: recapLink("mia"),
      title: "This week in the village",
    });
    expect(notice?.body).toContain("You finished 2 chores and earned 20 XP.");
  });

  it("is quiet when the week was already told, even on a later day", () => {
    const feed = [told(recapRefId("2026-10-12"))];
    expect(pickWeeklyRecapNotice({ entries, heroes: HEROES, heroId: "mia", feed, now: MONDAY })).toBeNull();
    const wednesday = new Date(2026, 9, 21, 20);
    expect(pickWeeklyRecapNotice({ entries, heroes: HEROES, heroId: "mia", feed, now: wednesday })).toBeNull();
  });

  it("tells again the next week", () => {
    const feed = [told(recapRefId("2026-10-05"))];
    expect(pickWeeklyRecapNotice({ entries, heroes: HEROES, heroId: "mia", feed, now: MONDAY })).not.toBeNull();
  });

  it("stays silent for a week nobody did a chore in", () => {
    expect(pickWeeklyRecapNotice({ entries: [], heroes: HEROES, heroId: "mia", feed: [], now: MONDAY })).toBeNull();
  });

  it("gives a hero with no chores the family line, not a zero", () => {
    const notice = pickWeeklyRecapNotice({ entries, heroes: HEROES, heroId: "zed", feed: [], now: MONDAY });
    expect(notice?.body).not.toContain("You finished");
    expect(notice?.body.length).toBeGreaterThan(0);
  });

  it("encodes the hero id in the link and has an icon", () => {
    expect(recapLink("a b")).toBe("/my-recap/a%20b/");
    expect(iconOfKind("weekly-recap")).toBe("fa-scroll-old");
  });
});

import {
  calculatePartyStreak,
  formatPartyActivityLine,
  formatTime,
  heroesFinishedOn,
  nicknameOf,
  partyActivityFeed,
  partyStreak,
  previousDayKey,
  toDayKey,
  type QuestLogEntryLike,
} from "@/lib/services/party/partyStats";

describe("partyStats", () => {
  describe("toDayKey & previousDayKey", () => {
    it("formats dates as YYYY-MM-DD", () => {
      const date = new Date(2026, 9, 13, 10, 0, 0); // Month is 0-indexed: 9 = October
      expect(toDayKey(date)).toBe("2026-10-13");
    });

    it("steps back one day across regular days", () => {
      expect(previousDayKey("2026-10-13")).toBe("2026-10-12");
    });

    it("steps back one day across month boundaries", () => {
      expect(previousDayKey("2026-10-01")).toBe("2026-09-30");
      expect(previousDayKey("2026-03-01")).toBe("2026-02-28");
    });

    it("steps back one day across year boundaries", () => {
      expect(previousDayKey("2026-01-01")).toBe("2025-12-31");
    });
  });

  describe("calculatePartyStreak", () => {
    const TODAY = "2026-10-13";
    const YESTERDAY = "2026-10-12";
    const TWO_DAYS_AGO = "2026-10-11";

    it("returns 0 when there are no entries", () => {
      expect(calculatePartyStreak([], TODAY)).toBe(0);
      expect(partyStreak([], TODAY)).toBe(0);
    });

    it("returns 0 when all entries are pending or rejected", () => {
      const entries: QuestLogEntryLike[] = [
        { id: "1", status: "pending", dayKey: TODAY },
        { id: "2", status: "rejected", dayKey: TODAY },
        { id: "3", status: "pending", dayKey: YESTERDAY },
      ];
      expect(calculatePartyStreak(entries, TODAY)).toBe(0);
    });

    it("returns 1 when there is an approved entry today", () => {
      const entries: QuestLogEntryLike[] = [
        { id: "1", status: "approved", dayKey: TODAY },
      ];
      expect(calculatePartyStreak(entries, TODAY)).toBe(1);
    });

    it("counts multiple approved entries on the same day as 1 day", () => {
      const entries: QuestLogEntryLike[] = [
        { id: "1", status: "approved", dayKey: TODAY, userId: "hero-1" },
        { id: "2", status: "approved", dayKey: TODAY, userId: "hero-2" },
      ];
      expect(calculatePartyStreak(entries, TODAY)).toBe(1);
    });

    it("calculates consecutive days up to today", () => {
      const entries: QuestLogEntryLike[] = [
        { id: "1", status: "approved", dayKey: TODAY },
        { id: "2", status: "approved", dayKey: YESTERDAY },
        { id: "3", status: "approved", dayKey: TWO_DAYS_AGO },
      ];
      expect(calculatePartyStreak(entries, TODAY)).toBe(3);
    });

    it("breaks streak when a day is missing", () => {
      const entries: QuestLogEntryLike[] = [
        { id: "1", status: "approved", dayKey: TODAY },
        // YESTERDAY missing
        { id: "3", status: "approved", dayKey: TWO_DAYS_AGO },
      ];
      expect(calculatePartyStreak(entries, TODAY)).toBe(1);
    });

    it("returns 0 when the latest approved entry was yesterday", () => {
      const entries: QuestLogEntryLike[] = [
        { id: "1", status: "approved", dayKey: YESTERDAY },
        { id: "2", status: "approved", dayKey: TWO_DAYS_AGO },
      ];
      expect(calculatePartyStreak(entries, TODAY)).toBe(0);
    });

    it("accepts a Date object for today parameter", () => {
      const entries: QuestLogEntryLike[] = [
        { id: "1", status: "approved", dayKey: TODAY },
        { id: "2", status: "approved", dayKey: YESTERDAY },
      ];
      const todayDate = new Date(2026, 9, 13, 14, 0, 0);
      expect(calculatePartyStreak(entries, todayDate)).toBe(2);
    });

    it("derives dayKey from completedAt when dayKey is absent", () => {
      const entries: QuestLogEntryLike[] = [
        { id: "1", status: "approved", completedAt: "2026-10-13T10:00:00.000Z" },
      ];
      expect(calculatePartyStreak(entries, TODAY)).toBe(1);
    });

    it("handles month and year boundaries correctly", () => {
      const monthBoundaryEntries: QuestLogEntryLike[] = [
        { id: "1", status: "approved", dayKey: "2026-10-01" },
        { id: "2", status: "approved", dayKey: "2026-09-30" },
      ];
      expect(calculatePartyStreak(monthBoundaryEntries, "2026-10-01")).toBe(2);

      const yearBoundaryEntries: QuestLogEntryLike[] = [
        { id: "1", status: "approved", dayKey: "2026-01-01" },
        { id: "2", status: "approved", dayKey: "2025-12-31" },
      ];
      expect(calculatePartyStreak(yearBoundaryEntries, "2026-01-01")).toBe(2);
    });
  });

  describe("nicknameOf", () => {
    const usersRecord = {
      "user-1": { id: "user-1", name: { nick: "Max", full: "Max Power" } },
      "user-2": { id: "user-2", name: { full: "Luna Power" } },
    };

    const usersArray = [
      { id: "user-1", name: { nick: "Max", full: "Max Power" } },
      { id: "user-2", name: { full: "Luna Power" } },
    ];

    it("resolves nickname from users Record", () => {
      expect(nicknameOf("user-1", usersRecord)).toBe("Max");
    });

    it("falls back to full name when nick is missing", () => {
      expect(nicknameOf("user-2", usersRecord)).toBe("Luna Power");
    });

    it("resolves nickname from users Array", () => {
      expect(nicknameOf("user-1", usersArray)).toBe("Max");
      expect(nicknameOf("user-2", usersArray)).toBe("Luna Power");
    });

    it("returns 'Hero' when user is not found or id is undefined", () => {
      expect(nicknameOf("user-unknown", usersRecord)).toBe("Hero");
      expect(nicknameOf(undefined, usersRecord)).toBe("Hero");
    });
  });

  describe("formatPartyActivityLine", () => {
    const users = {
      "user-1": { id: "user-1", name: { nick: "Luna" } },
    };

    it("formats '<nickname> finished <quest name> (+<xp> XP)'", () => {
      const entry: QuestLogEntryLike = {
        userId: "user-1",
        questName: "Tame the Socktopus",
        rewards: { xp: 120, gp: 30, ap: 2 },
      };
      expect(formatPartyActivityLine(entry, users)).toBe("Luna finished Tame the Socktopus (+120 XP)");
    });

    it("falls back to Untitled Quest when quest name is missing", () => {
      const entry: QuestLogEntryLike = {
        userId: "user-1",
        rewards: { xp: 50 },
      };
      expect(formatPartyActivityLine(entry, users)).toBe("Luna finished Untitled Quest (+50 XP)");
    });

    it("handles zero or missing xp", () => {
      const entry: QuestLogEntryLike = {
        userId: "user-1",
        questName: "Morning Routine",
      };
      expect(formatPartyActivityLine(entry, users)).toBe("Luna finished Morning Routine (+0 XP)");
    });
  });

  describe("partyActivityFeed", () => {
    const users = {
      "user-1": { id: "user-1", name: { nick: "Max" } },
      "user-2": { id: "user-2", name: { nick: "Luna" } },
    };

    it("returns empty array for empty entries", () => {
      expect(partyActivityFeed([], users)).toEqual([]);
    });

    it("filters out pending and rejected entries", () => {
      const entries: QuestLogEntryLike[] = [
        { id: "1", userId: "user-1", questName: "Dish Goblin", status: "pending", completedAt: "2026-10-13T10:00:00Z", rewards: { xp: 50 } },
        { id: "2", userId: "user-2", questName: "Feed Wolfhound", status: "rejected", completedAt: "2026-10-13T09:00:00Z", rewards: { xp: 60 } },
        { id: "3", userId: "user-2", questName: "Tame Socktopus", status: "approved", completedAt: "2026-10-13T08:00:00Z", rewards: { xp: 120 } },
      ];
      const feed = partyActivityFeed(entries, users);
      expect(feed).toHaveLength(1);
      expect(feed[0].text).toBe("Luna finished Tame Socktopus (+120 XP)");
    });

    it("sorts newest first by completedAt", () => {
      const entries: QuestLogEntryLike[] = [
        { id: "1", userId: "user-1", questName: "Earlier Quest", status: "approved", completedAt: "2026-10-13T08:00:00Z", rewards: { xp: 10 } },
        { id: "2", userId: "user-2", questName: "Later Quest", status: "approved", completedAt: "2026-10-13T12:00:00Z", rewards: { xp: 20 } },
      ];
      const feed = partyActivityFeed(entries, users);
      expect(feed[0].questName).toBe("Later Quest");
      expect(feed[1].questName).toBe("Earlier Quest");
    });

    it("caps results at newest 20 entries", () => {
      const entries: QuestLogEntryLike[] = Array.from({ length: 30 }, (_, i) => ({
        id: `log-${i}`,
        userId: "user-1",
        questName: `Quest ${i}`,
        status: "approved",
        completedAt: `2026-10-13T${String(i).padStart(2, "0")}:00:00Z`,
        rewards: { xp: i * 10 },
      }));
      const feed = partyActivityFeed(entries, users);
      expect(feed).toHaveLength(20);
      expect(feed[0].questName).toBe("Quest 29");
      expect(feed[19].questName).toBe("Quest 10");
    });

    it("attaches user object if found in userMap", () => {
      const entries: QuestLogEntryLike[] = [
        { id: "1", userId: "user-1", questName: "Quest", status: "approved", completedAt: "2026-10-13T10:00:00Z", rewards: { xp: 10 } },
      ];
      const feed = partyActivityFeed(entries, users);
      expect(feed[0].user).toEqual(users["user-1"]);
    });
  });

  describe("formatTime", () => {
    const NOW = new Date("2026-10-13T12:00:00Z");

    it("formats relative times", () => {
      expect(formatTime("2026-10-13T11:59:45Z", NOW)).toBe("Just now");
      expect(formatTime("2026-10-13T11:45:00Z", NOW)).toBe("15m ago");
      expect(formatTime("2026-10-13T09:00:00Z", NOW)).toBe("3h ago");
      expect(formatTime("2026-10-11T12:00:00Z", NOW)).toBe("2d ago");
    });
  });

  describe("heroesFinishedOn", () => {
    const DAY = "2026-10-28";
    const done = (userId: string, completedAt: string, status = "approved"): QuestLogEntryLike => ({ userId, completedAt, status });
    const local = (hour: number, day = 28): string => new Date(2026, 9, day, hour, 0, 0).toISOString();

    it("lists each hero with an approved chore that day, once, in the order they finished", () => {
      const entries = [done("ben", local(9)), done("ana", local(10)), done("ben", local(11))];
      expect(heroesFinishedOn(entries, DAY)).toEqual(["ben", "ana"]);
    });

    it("leaves out chores that are held, rejected or from another day", () => {
      const entries = [
        done("ana", local(9), "pending"),
        done("ben", local(9), "rejected"),
        done("cam", local(9, 27)),
        done("dev", local(9)),
      ];
      expect(heroesFinishedOn(entries, DAY)).toEqual(["dev"]);
    });

    it("trusts an entry's own day key over its time", () => {
      const entries: QuestLogEntryLike[] = [{ userId: "ana", status: "approved", completedAt: local(9, 27), dayKey: DAY }];
      expect(heroesFinishedOn(entries, DAY)).toEqual(["ana"]);
    });

    it("skips empty rows and entries with no hero or no time", () => {
      const entries = [null, undefined, { status: "approved", completedAt: local(9) }, { userId: "ana", status: "approved" }];
      expect(heroesFinishedOn(entries, DAY)).toEqual([]);
    });
  });
});

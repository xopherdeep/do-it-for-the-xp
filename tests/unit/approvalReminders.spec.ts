import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import {
  approvalAlertCopy,
  nextReminderAt,
  pendingApprovalReminders,
} from "@/lib/services/notifications/approvalReminders";
import { claimWaitingNotification, claimsWaitingSummary, dedupeKeyOf } from "@/lib/services/notifications/Notifications";
import { reminderLinkOf } from "@/lib/services/notifications/reminderTaps";

const HOUR = 60 * 60 * 1000;
const NOW = new Date("2026-10-17T12:00:00Z");
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * HOUR).toISOString();
const entry = (id: string, completedAt: string, status = "pending") =>
  ({ id, userId: "kid", questName: `Chore ${id}`, completedAt, status } as unknown as QuestLogEntry);

describe("pendingApprovalReminders", () => {
  it("is empty while every claim is fresh", () => {
    expect(pendingApprovalReminders([entry("a", hoursAgo(1))], NOW)).toEqual([]);
  });

  it("holds the claims past the default two hours, the longest wait first", () => {
    const list = pendingApprovalReminders([entry("a", hoursAgo(3)), entry("b", hoursAgo(5)), entry("c", hoursAgo(1))], NOW);
    expect(list.map((reminder) => reminder.entryId)).toEqual(["b", "a"]);
    expect(list[0]).toMatchObject({ heroId: "kid", questName: "Chore b", waitedMs: 5 * HOUR });
  });

  it("follows the wait it is given and ignores settled claims", () => {
    const entries = [entry("a", hoursAgo(1.5)), entry("done", hoursAgo(9), "approved")];
    expect(pendingApprovalReminders(entries, NOW, HOUR).map((reminder) => reminder.entryId)).toEqual(["a"]);
  });
});

describe("nextReminderAt", () => {
  it("is when the oldest claim not yet past the wait crosses it", () => {
    const entries = [entry("a", hoursAgo(1)), entry("b", hoursAgo(0.5)), entry("late", hoursAgo(4))];
    expect(nextReminderAt(entries, NOW, 2 * HOUR)?.toISOString()).toBe("2026-10-17T13:00:00.000Z");
  });

  it("is null when nothing is coming", () => {
    expect(nextReminderAt([entry("late", hoursAgo(4))], NOW, 2 * HOUR)).toBeNull();
  });
});

describe("the copy and the tap", () => {
  it("counts the chores in the alert and links to the approvals", () => {
    const list = pendingApprovalReminders([entry("a", hoursAgo(3)), entry("b", hoursAgo(5))], NOW);
    expect(approvalAlertCopy(list)).toEqual({
      title: "2 chores await your word",
      body: "The longest has waited over 5 h. Tap to check it.",
      link: "/game-master/approvals",
    });
  });

  it("opens the approvals from a tapped alert, but nothing unknown", () => {
    expect(reminderLinkOf({ link: "/game-master/approvals" })).toBe("/game-master/approvals");
    expect(reminderLinkOf({ link: "/somewhere/else" })).toBeNull();
  });

  it("dedupes a claim's notice per entry and the summary per count", () => {
    const first = claimWaitingNotification("mum", { id: "e1", questName: "Dishes" }, "Max", NOW);
    const second = claimWaitingNotification("mum", { id: "e2", questName: "Bins" }, "Max", NOW);
    expect(first).toMatchObject({ heroId: "mum", kind: "claim-waiting", link: "/game-master/approvals" });
    expect(dedupeKeyOf(first.kind, first.refId, NOW)).not.toBe(dedupeKeyOf(second.kind, second.refId, NOW));
    expect(claimsWaitingSummary("mum", 3, NOW).title).toBe("3 chores await your word");
    expect(claimsWaitingSummary("mum", 1, NOW).title).toBe("A chore awaits your word");
  });
});

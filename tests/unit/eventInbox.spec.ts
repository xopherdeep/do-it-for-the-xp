import {
  RewardToPay,
  markPaid,
  newestSeq,
  rewardsToPay,
  trimPaid,
} from "@/lib/services/multiplayer/eventInbox";
import type { ReceivedEvent } from "@/lib/services/multiplayer/familyServer";

describe("eventInbox pure functions", () => {
  const makeEvent = (
    id: string,
    kind: any,
    seq: number,
    data: Record<string, unknown> = {},
    heroId = "h-1"
  ): ReceivedEvent => ({
    id,
    heroId,
    deviceId: "d-1",
    kind,
    at: new Date().toISOString(),
    data,
    seq,
    scope: "family",
    receivedAt: new Date().toISOString(),
  });

  describe("rewardsToPay", () => {
    it("extracts rewards from reward.granted events and skips non-reward kinds", () => {
      const events = [
        makeEvent("ev-1", "reward.granted", 1, { xp: 100, ap: 25, reason: "Quest Together" }),
        makeEvent("ev-2", "hero.card", 2, { nickname: "Mia" }),
        makeEvent("ev-3", "quest.done", 3, { xp: 50 }),
      ];

      const result = rewardsToPay(events, []);
      expect(result).toEqual([
        { id: "ev-1", heroId: "h-1", xp: 100, ap: 25, reason: "Quest Together" },
      ]);
    });

    it("skips reward ids that are already in the paid list", () => {
      const events = [
        makeEvent("ev-1", "reward.granted", 1, { xp: 100, ap: 25, reason: "Quest Together" }),
        makeEvent("ev-2", "reward.granted", 2, { xp: 200, ap: 50, reason: "Party Raid" }),
      ];
      const paid = [{ id: "ev-1", at: new Date().toISOString() }];

      const result = rewardsToPay(events, paid);
      expect(result).toEqual([
        { id: "ev-2", heroId: "h-1", xp: 200, ap: 50, reason: "Party Raid" },
      ]);
    });
  });

  describe("newestSeq", () => {
    it("returns the highest seq among events and lastSeq", () => {
      const events = [
        makeEvent("ev-1", "hero.card", 10),
        makeEvent("ev-2", "reward.granted", 25),
        makeEvent("ev-3", "hero.card", 18),
      ];

      expect(newestSeq(events, 5)).toBe(25);
      expect(newestSeq(events, 30)).toBe(30);
    });

    it("returns lastSeq when event list is empty", () => {
      expect(newestSeq([], 42)).toBe(42);
    });
  });

  describe("markPaid", () => {
    it("adds newly paid ids with timestamp", () => {
      const now = new Date("2026-10-13T12:00:00Z");
      const paid = [{ id: "ev-1", at: "2026-10-12T12:00:00Z" }];

      const updated = markPaid(paid, ["ev-2", "ev-3"], now);
      expect(updated).toEqual([
        { id: "ev-1", at: "2026-10-12T12:00:00Z" },
        { id: "ev-2", at: "2026-10-13T12:00:00.000Z" },
        { id: "ev-3", at: "2026-10-13T12:00:00.000Z" },
      ]);
    });
  });

  describe("trimPaid", () => {
    it("keeps entries up to 90 days old and drops entries at 91 days", () => {
      const now = new Date("2026-10-13T12:00:00Z");
      const dayMs = 24 * 60 * 60 * 1000;

      const recent = new Date(now.getTime() - 10 * dayMs).toISOString();
      const ninetyDaysOld = new Date(now.getTime() - 90 * dayMs).toISOString();
      const ninetyOneDaysOld = new Date(now.getTime() - 91 * dayMs).toISOString();

      const paid = [
        { id: "recent", at: recent },
        { id: "day-90", at: ninetyDaysOld },
        { id: "day-91", at: ninetyOneDaysOld },
      ];

      const trimmed = trimPaid(paid, now);
      expect(trimmed.map((p) => p.id)).toEqual(["recent", "day-90"]);
    });
  });
});

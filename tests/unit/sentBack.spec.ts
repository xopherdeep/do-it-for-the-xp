import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { checkClaimWindow } from "@/lib/services/quests/QuestClaimGuard";
import { questListFor } from "@/lib/services/quests/QuestList";
import { sentBackFor, sentBackLine } from "@/lib/services/quests/sentBack";
import { cardActions } from "@/app/Console/MyPortal/UserHud/MyQuests/beastCard";
import { stateLabelOf } from "@/app/Console/MyPortal/UserHud/MyQuests/questLogRows";

// 2026-10-10 is a Saturday; the hero reads the board at noon.
const NOON = new Date(2026, 9, 10, 12, 0, 0);

const quest = (overrides: Partial<Achievement> = {}): Achievement =>
  ({
    id: "q1",
    achievementName: "Dishes",
    type: "individual",
    assignee: ["hero"],
    basicSchedule: "daily",
    scheduleType: "basic",
    startsOn: "2026-10-01T09:00:00",
    repeatOnDays: [],
    requiresApproval: true,
    ...overrides,
  } as unknown as Achievement);

const entry = (overrides: Partial<QuestLogEntry> = {}): QuestLogEntry =>
  ({
    id: "e1",
    questId: "q1",
    questName: "Dishes",
    userId: "hero",
    completedAt: new Date(2026, 9, 10, 8, 0).toISOString(),
    dayKey: "2026-10-10",
    status: "rejected",
    source: "claim",
    rewards: { xp: 100, gp: 10, ap: 1 },
    rewardsApplied: false,
    note: "Wipe the sides too",
    reviewedBy: "mum",
    reviewedAt: new Date(2026, 9, 10, 9, 0).toISOString(),
    ...overrides,
  } as QuestLogEntry);

const open = (q: Achievement = quest(), flags: Partial<QuestBoardItem> = {}): QuestBoardItem =>
  ({ quest: q, status: "open", progress: { done: 0, allowance: 1, isOpen: true }, pending: false, overdue: false, ...flags } as QuestBoardItem);

describe("sentBackFor", () => {
  it("marks an open chore whose latest claim of the window was rejected, with the note", () => {
    expect(sentBackFor([entry()], [open()], "hero", NOON)).toEqual({ q1: { note: "Wipe the sides too" } });
  });

  it("keeps the record of who and when on the rejected entry itself", () => {
    const [kept] = [entry()];
    expect(kept).toMatchObject({ status: "rejected", note: "Wipe the sides too", reviewedBy: "mum" });
    expect(typeof kept.reviewedAt).toBe("string");
  });

  it("ends when the hero claims again (pending), is approved, or the chore is no longer open", () => {
    const later = entry({ id: "e2", status: "pending", completedAt: new Date(2026, 9, 10, 10, 0).toISOString(), note: undefined });
    expect(sentBackFor([entry(), later], [open()], "hero", NOON)).toEqual({});
    const approved = entry({ id: "e3", status: "approved", completedAt: new Date(2026, 9, 10, 11, 0).toISOString() });
    expect(sentBackFor([entry(), approved], [open()], "hero", NOON)).toEqual({});
    expect(sentBackFor([entry()], [open(quest(), { status: "done" })], "hero", NOON)).toEqual({});
    expect(sentBackFor([entry()], [open(quest(), { pending: true })], "hero", NOON)).toEqual({});
  });

  it("uses the MOST RECENT claim, so an older rejection hides behind a newer one that was rejected too", () => {
    const newer = entry({ id: "e4", completedAt: new Date(2026, 9, 10, 10, 0).toISOString(), note: "Still greasy" });
    expect(sentBackFor([entry(), newer], [open()], "hero", NOON).q1.note).toBe("Still greasy");
  });

  it("ignores another hero, another chore and yesterday's claim", () => {
    const entries = [
      entry({ id: "a", userId: "zoe" }),
      entry({ id: "b", questId: "other" }),
      entry({ id: "c", completedAt: new Date(2026, 9, 9, 8, 0).toISOString() }),
    ];
    expect(sentBackFor(entries, [open()], "hero", NOON)).toEqual({});
  });

  it("is still sent back without a note", () => {
    const result = sentBackFor([entry({ note: undefined })], [open()], "hero", NOON);
    expect(result).toEqual({ q1: { note: "" } });
    expect(sentBackLine(result.q1)).toBe("Sent back");
    expect(sentBackLine({ note: "Redo" })).toBe("Sent back: Redo");
  });
});

describe("a rejected chore stays claimable", () => {
  it("the claim guard does not treat a rejected entry as used up", () => {
    const check = checkClaimWindow(quest(), [entry()], "hero", NOON);
    expect(check).toMatchObject({ canClaim: true, isUsedUp: false, awaitingApproval: false });
  });
});

describe("where the hero reads it", () => {
  const sentBack = { q1: { note: "Wipe the sides too" } };

  it("puts 'Sent back' on the quest list row and the Quest Log label of an open chore", () => {
    const [row] = questListFor("hero", NOON, [open()], {}, undefined, {}, sentBack);
    expect(row.sentBack).toEqual({ note: "Wipe the sides too" });
    expect(stateLabelOf(row)).toBe("Sent back");
    const [plain] = questListFor("hero", NOON, [open()], {});
    expect(plain.sentBack).toBeUndefined();
    expect(stateLabelOf(plain)).toBe("");
  });

  it("never marks a tamed or waiting row", () => {
    const [done] = questListFor("hero", NOON, [open(quest(), { status: "done", pending: true })], {}, undefined, {}, sentBack);
    expect(done.sentBack).toBeUndefined();
  });

  it("shows 'Sent back: <note>' on the beast card of a workable chore only", () => {
    expect(cardActions("open", [], "adventure", "", sentBack.q1).note).toBe("Sent back: Wipe the sides too");
    expect(cardActions("overdue", [], "adventure", "", sentBack.q1).note).toBe("Sent back: Wipe the sides too");
    expect(cardActions("pending", [], "adventure", "", sentBack.q1).note).not.toContain("Sent back");
    expect(cardActions("open", []).note).toBe("");
  });
});

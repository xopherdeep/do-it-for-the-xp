import type { ReceivedEvent } from "@/lib/services/multiplayer/familyServer";
import type { SheetQuest } from "@/lib/services/multiplayer/heroSheet";
import { sheetEvent, sheetFromEvent, sheetKey, statsOf, MAX_SHEET_QUESTS } from "@/lib/services/multiplayer/heroSheet";
import { isPhoneClaim } from "@/lib/services/multiplayer/phoneClaimIntake";
import {
  addClaim,
  applyReceived,
  claimableQuests,
  emptyPhoneState,
  readPhoneState,
  refuseClaims,
  trimClaims,
  MAX_SETTLED_CLAIMS,
  type HeroPhoneState,
} from "@/lib/services/multiplayer/phoneClaims";

const quest = (questId: string, extra: Partial<SheetQuest> = {}): SheetQuest => ({
  questId,
  name: `Quest ${questId}`,
  difficulty: 2,
  xp: 10,
  gp: 5,
  ap: 1,
  needsApproval: true,
  photo: false,
  overdue: false,
  ...extra,
});

const received = (seq: number, kind: ReceivedEvent["kind"], data: Record<string, unknown>, heroId = "mia"): ReceivedEvent => ({
  seq,
  id: `e${seq}`,
  heroId,
  deviceId: "HOME",
  kind,
  scope: "family",
  at: "2026-10-18T09:00:00.000Z",
  receivedAt: "2026-10-18T09:00:01.000Z",
  data,
});

const sheetAt = (seq: number, quests: SheetQuest[], gp = 0, heroId = "mia"): ReceivedEvent =>
  received(seq, "hero.sheet", { stats: { level: 2, xp: 5, nextLevelXp: 100, gp, ap: 3, hp: 9, maxHp: 10, mp: 1, maxMp: 2 }, quests }, heroId);

const settled = (seq: number, claimId: string, status: string, extra: Record<string, unknown> = {}): ReceivedEvent =>
  received(seq, "claim.settled", { claimId, questId: "q1", status, note: "", xp: 10, gp: 5, ap: 1, ...extra });

const withSheet = (): HeroPhoneState => applyReceived(emptyPhoneState(), [sheetAt(3, [quest("q1"), quest("q2")])], "mia");

describe("hero sheet", () => {
  it("reads a profile's numbers, missing ones as 0", () => {
    expect(statsOf({ stats: { level: 3, xp: { now: 40, next_level: 300 }, gp: { wallet: 12.4 }, ap: { total: 7 }, hp: { now: 5, max: 9 } } })).toEqual({
      level: 3,
      xp: 40,
      nextLevelXp: 300,
      gp: 12,
      ap: 7,
      hp: 5,
      maxHp: 9,
      mp: 0,
      maxMp: 0,
    });
    expect(statsOf(undefined).level).toBe(1);
  });

  it("round-trips through the wire, and drops quests that are not quests", () => {
    const e = sheetEvent("mia", "HOME", statsOf({ stats: { level: 2 } }), [quest("q1")]);
    const back = sheetFromEvent({ ...e, seq: 4, scope: "family", receivedAt: e.at, data: { ...e.data, quests: [...(e.data.quests as unknown[]), { name: "no id" }, null] } });
    expect(back).toMatchObject({ heroId: "mia", seq: 4, stats: { level: 2 }, quests: [quest("q1")] });
  });

  it("caps the quests and their names so the event stays small", () => {
    const many = Array.from({ length: MAX_SHEET_QUESTS + 5 }, (_, i) => quest(`q${i}`, { name: "x".repeat(200) }));
    const quests = sheetEvent("mia", "HOME", statsOf({}), many).data.quests as SheetQuest[];
    expect(quests).toHaveLength(MAX_SHEET_QUESTS);
    expect(quests[0].name).toHaveLength(80);
  });

  it("keys a sheet by its content", () => {
    expect(sheetKey(statsOf({}), [quest("q1")])).toBe(sheetKey(statsOf({}), [quest("q1")]));
    expect(sheetKey(statsOf({}), [quest("q1")])).not.toBe(sheetKey(statsOf({}), [quest("q2")]));
  });
});

describe("the phone's claims", () => {
  it("keeps the newest sheet by the server's number, for this hero only", () => {
    const state = applyReceived(emptyPhoneState(), [sheetAt(5, [quest("q1")], 40), sheetAt(4, [], 10), sheetAt(6, [], 99, "sam")], "mia");
    expect(state.sheet).toMatchObject({ seq: 5, stats: { gp: 40 } });
    expect(state.lastSeq).toBe(6);
  });

  it("hides a waiting claim's quest, and a taken claim's quest until a newer sheet", () => {
    let state = addClaim(withSheet(), "c1", quest("q1"), "2026-10-18T09:05:00.000Z");
    expect(claimableQuests(state).map((q) => q.questId)).toEqual(["q2"]);
    state = applyReceived(state, [settled(7, "c1", "pending")], "mia");
    expect(claimableQuests(state).map((q) => q.questId)).toEqual(["q2"]);
    // The family device's next sheet already counts the claim; a repeatable chore comes back on it
    state = applyReceived(state, [sheetAt(8, [quest("q1"), quest("q2")])], "mia");
    expect(claimableQuests(state).map((q) => q.questId)).toEqual(["q1", "q2"]);
  });

  it("a turned-away claim hides nothing", () => {
    let state = addClaim(withSheet(), "c1", quest("q1"), "2026-10-18T09:05:00.000Z");
    state = applyReceived(state, [settled(7, "c1", "rejected", { note: "Not yet" })], "mia");
    expect(state.claims[0]).toMatchObject({ status: "rejected", note: "Not yet" });
    expect(claimableQuests(state).map((q) => q.questId)).toEqual(["q1", "q2"]);
  });

  it("moves a claim forward only: a late `pending` after the verdict changes nothing", () => {
    let state = addClaim(withSheet(), "c1", quest("q1"), "2026-10-18T09:05:00.000Z");
    state = applyReceived(state, [settled(9, "c1", "approved"), settled(8, "c1", "pending")], "mia");
    expect(state.claims[0]).toMatchObject({ status: "approved", paid: { xp: 10, gp: 5, ap: 1 }, settledSeq: 9 });
  });

  it("ignores answers for claims it did not make, or with an unknown status", () => {
    let state = addClaim(withSheet(), "c1", quest("q1"), "2026-10-18T09:05:00.000Z");
    state = applyReceived(state, [settled(7, "other", "approved"), settled(8, "c1", "paid")], "mia");
    expect(state.claims[0].status).toBe("waiting");
  });

  it("adds a claim once", () => {
    const state = addClaim(addClaim(withSheet(), "c1", quest("q1"), "t"), "c1", quest("q1"), "t");
    expect(state.claims).toHaveLength(1);
  });

  it("marks claims the site refused, and only waiting ones", () => {
    let state = addClaim(addClaim(withSheet(), "c1", quest("q1"), "t"), "c2", quest("q2"), "t");
    state = applyReceived(state, [settled(7, "c2", "pending")], "mia");
    state = refuseClaims(state, ["c1", "c2"]);
    expect(state.claims.map((c) => c.status)).toEqual(["pending", "refused"]);
  });

  it("keeps every open claim and the newest settled ones", () => {
    let state = withSheet();
    for (let i = 0; i < MAX_SETTLED_CLAIMS + 5; i++) state = addClaim(state, `c${i}`, quest("q1"), "t");
    state = applyReceived(state, Array.from({ length: MAX_SETTLED_CLAIMS + 4 }, (_, i) => settled(10 + i, `c${i}`, "approved")), "mia");
    const trimmed = trimClaims(state);
    expect(trimmed.claims.filter((c) => c.status === "waiting")).toHaveLength(1);
    expect(trimmed.claims.filter((c) => c.status === "approved")).toHaveLength(MAX_SETTLED_CLAIMS);
  });

  it("reads an old or broken save as empty", () => {
    expect(readPhoneState(null)).toEqual(emptyPhoneState());
    expect(readPhoneState({ claims: [{ id: "c1", status: "nope" }, { id: "c2", status: "waiting" }], lastSeq: "x" })).toMatchObject({ lastSeq: 0, claims: [{ id: "c2" }] });
  });
});

describe("the family device's intake", () => {
  const claimFrom = (deviceId: string, data: Record<string, unknown>): ReceivedEvent => ({ ...received(4, "quest.claimed", data), deviceId });

  it("takes a claim made on another device, never its own", () => {
    expect(isPhoneClaim(claimFrom("PHONE", { questId: "q1", difficulty: 2, requiresApproval: true }), "HOME")).toBe(true);
    expect(isPhoneClaim(claimFrom("HOME", { questId: "q1", difficulty: 2, requiresApproval: true }), "HOME")).toBe(false);
  });

  it("a synced claim is not taken as a phone claim", () => {
    // its quest log entry arrives as a record; taking it too would log the claim twice
    expect(isPhoneClaim(claimFrom("TABLET", { questId: "q1", difficulty: 2, requiresApproval: true, synced: true }), "HOME")).toBe(false);
  });
});

/**
 * The creation rules (creations.ts): a beast or quest a kid makes carries a proposal block, stays out of play until a
 * Game Master approves it, can be sent back with a note and sent again, and a hero may have only so many waiting at
 * once. Everything here is pure: records go in, new records come out.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import {
  MAKER_CAP,
  approveCreation,
  approveQuest,
  canPropose,
  canProposeAny,
  creationAp,
  creationRows,
  creditLine,
  isLive,
  isLiveBeast,
  isReturned,
  isWaiting,
  makerOf,
  openCount,
  propose,
  resend,
  returnCreation,
} from "@/lib/services/creations/creations";
import type { Proposal, Proposed } from "@/lib/services/creations/creations";
import { suggestedRewards } from "@/lib/services/quests/sizeRewards";

const NOW = new Date("2026-10-27T10:00:00.000Z");
const LATER = new Date("2026-10-28T08:30:00.000Z");

const beast = (id: string, patch: Partial<Beast> = {}): Beast => ({ id, name: `Beast ${id}`, checklist: [], ...patch });
const quest = (id: string, patch: Partial<Achievement> = {}): Achievement =>
  ({ id, achievementName: `Quest ${id}`, assignee: [], draft: true, ...patch }) as Achievement;
const inState = (state: Proposal["state"], by = "ronan", on = NOW.toISOString()): Proposal => ({ by, on, state });

describe("propose", () => {
  it("marks a record proposed by the hero, on the day it was sent", () => {
    const proposed = propose(beast("b1"), "ronan", NOW);
    expect(proposed.proposal).toEqual({ by: "ronan", on: "2026-10-27T10:00:00.000Z", state: "proposed" });
  });

  it("remembers the quest a kid made together with a beast", () => {
    const proposed = propose(beast("b1"), "ronan", NOW, "quest-1");
    expect(proposed.proposal).toEqual({ by: "ronan", on: NOW.toISOString(), state: "proposed", questId: "quest-1" });
  });

  it("keeps the rest of the record and does not change the one it was given", () => {
    const original = beast("b1", { avatar: 12 });
    const proposed = propose(original, "ronan", NOW);
    expect(proposed).toMatchObject({ id: "b1", name: "Beast b1", avatar: 12 });
    expect(original.proposal).toBeUndefined();
  });
});

describe("what is live", () => {
  it("is true for a record with no proposal (everything made before kids could make things)", () => {
    expect(isLive(beast("old"))).toBe(true);
    expect(isLiveBeast(beast("old"))).toBe(true);
  });

  it("is true once the proposal is approved", () => {
    expect(isLive({ proposal: inState("approved") })).toBe(true);
    expect(isLiveBeast(beast("b1", { proposal: inState("approved") }))).toBe(true);
  });

  it("is false while the proposal waits or after it was sent back", () => {
    expect(isLive({ proposal: inState("proposed") })).toBe(false);
    expect(isLive({ proposal: inState("returned") })).toBe(false);
    expect(isLiveBeast(beast("b1", { proposal: inState("proposed") }))).toBe(false);
    expect(isLiveBeast(beast("b2", { proposal: inState("returned") }))).toBe(false);
  });

  it("is false for no record at all, so a list with a hole in it comes out clean", () => {
    expect(isLive(null)).toBe(false);
    expect(isLiveBeast(undefined)).toBe(false);
    expect([beast("a"), null, beast("b", { proposal: inState("proposed") })].filter(isLiveBeast)).toHaveLength(1);
  });

  it("tells a waiting record from a returned one", () => {
    expect(isWaiting({ proposal: inState("proposed") })).toBe(true);
    expect(isWaiting({ proposal: inState("returned") })).toBe(false);
    expect(isReturned({ proposal: inState("returned") })).toBe(true);
    expect(isReturned({ proposal: inState("proposed") })).toBe(false);
    expect(isWaiting({})).toBe(false);
    expect(isReturned({})).toBe(false);
  });
});

describe("approveCreation", () => {
  it("sets the state and who looked at it, and when", () => {
    const approved = approveCreation(propose(beast("b1"), "ronan", NOW), "mom", LATER);
    expect(approved.proposal).toEqual({
      by: "ronan",
      on: NOW.toISOString(),
      state: "approved",
      reviewedBy: "mom",
      reviewedOn: LATER.toISOString(),
    });
    expect(isLiveBeast(approved)).toBe(true);
  });

  it("hands back the same record when it is already approved, so a replay changes (and pays) nothing", () => {
    const approved = approveCreation(propose(beast("b1"), "ronan", NOW), "mom", LATER);
    const again = approveCreation(approved, "dad", new Date("2026-11-01T00:00:00.000Z"));
    expect(again).toBe(approved);
    expect(again.proposal?.reviewedBy).toBe("mom");
  });

  it("leaves a record with no proposal alone: there is nothing to approve", () => {
    const old = beast("old");
    expect(approveCreation(old, "mom", NOW)).toBe(old);
  });

  it("approves a returned record too, and drops the note: there is nothing left to fix", () => {
    const sentBack = returnCreation(propose(beast("b1"), "ronan", NOW), "mom", "Bigger teeth", NOW);
    const approved = approveCreation(sentBack, "mom", LATER);
    expect(approved.proposal?.state).toBe("approved");
    expect(approved.proposal).not.toHaveProperty("note");
  });
});

describe("approveQuest", () => {
  it("approves the quest and takes it out of the drafts, so heroes see it", () => {
    const approved = approveQuest(propose(quest("q1"), "jack", NOW), "mom", LATER);
    expect(approved.proposal?.state).toBe("approved");
    expect(approved.draft).toBe(false);
  });

  it("gives the quest to the heroes the Game Master chose", () => {
    const approved = approveQuest(propose(quest("q1"), "jack", NOW), "mom", LATER, ["jack", "ronan"]);
    expect(approved.assignee).toEqual(["jack", "ronan"]);
  });

  it("keeps the assignee the kid asked for when the Game Master chose nobody", () => {
    const approved = approveQuest(propose(quest("q1", { assignee: ["jack"] }), "jack", NOW), "mom", LATER);
    expect(approved.assignee).toEqual(["jack"]);
  });

  it("does nothing to a quest that is already approved", () => {
    const approved = approveQuest(propose(quest("q1"), "jack", NOW), "mom", LATER, ["jack"]);
    expect(approveQuest(approved, "dad", LATER, ["ronan"])).toBe(approved);
  });
});

describe("returnCreation", () => {
  it("sends the record back with the Game Master's note, trimmed", () => {
    const sentBack = returnCreation(propose(beast("b1"), "ronan", NOW), "mom", "  Give it a name  ", LATER);
    expect(sentBack.proposal).toEqual({
      by: "ronan",
      on: NOW.toISOString(),
      state: "returned",
      note: "Give it a name",
      reviewedBy: "mom",
      reviewedOn: LATER.toISOString(),
    });
    expect(isLiveBeast(sentBack)).toBe(false);
  });

  it("drops a note that is empty or only spaces", () => {
    const blank = returnCreation(propose(beast("b1"), "ronan", NOW), "mom", "   ", LATER);
    const missing = returnCreation(propose(beast("b2"), "ronan", NOW), "mom", undefined, LATER);
    expect(blank.proposal?.note).toBeUndefined();
    expect(missing.proposal?.note).toBeUndefined();
    expect(blank.proposal?.state).toBe("returned");
  });

  it("does not take back a record that is already approved", () => {
    const approved = approveCreation(propose(beast("b1"), "ronan", NOW), "mom", LATER);
    expect(returnCreation(approved, "dad", "Changed my mind", LATER)).toBe(approved);
  });
});

describe("resend", () => {
  it("sends a returned record again: waiting, dated now, with the old note cleared", () => {
    const sentBack = returnCreation(propose(beast("b1"), "ronan", NOW), "mom", "Give it a name", NOW);
    const again = resend(sentBack, LATER);
    expect(again.proposal?.state).toBe("proposed");
    expect(again.proposal?.on).toBe(LATER.toISOString());
    expect(again.proposal?.note).toBeUndefined();
    expect(again.proposal?.by).toBe("ronan");
  });

  it("changes nothing for a record that was not sent back", () => {
    const waiting = propose(beast("b1"), "ronan", NOW);
    const approved = approveCreation(waiting, "mom", NOW);
    const old = beast("old");
    expect(resend(waiting, LATER)).toBe(waiting);
    expect(resend(approved, LATER)).toBe(approved);
    expect(resend(old, LATER)).toBe(old);
  });
});

describe("the cap on what one hero has waiting", () => {
  const waitingFor = (by: string, count: number): Proposed[] =>
    Array.from({ length: count }, (_, i) => ({ proposal: inState("proposed", by, `2026-10-${10 + i}T00:00:00.000Z`) }));

  it("is ten", () => {
    expect(MAKER_CAP).toBe(10);
  });

  it("lets a hero propose at nine and not at ten", () => {
    expect(canPropose(waitingFor("ronan", 9), "ronan")).toBe(true);
    expect(canPropose(waitingFor("ronan", 10), "ronan")).toBe(false);
  });

  it("counts beasts and quests together, skips a hole in storage, and lets an approved one go", () => {
    const beasts = [...waitingFor("ronan", 5), null];
    const quests = [...waitingFor("ronan", 4), { proposal: inState("approved", "ronan") }, undefined];
    expect(canProposeAny(beasts, quests, "ronan")).toBe(true);
    expect(canProposeAny(beasts, [...quests, { proposal: inState("returned", "ronan") }], "ronan")).toBe(false);
    expect(canProposeAny(waitingFor("ronan", 5), waitingFor("ronan", 5), "ronan")).toBe(false);
    expect(canProposeAny(waitingFor("ronan", 5), waitingFor("jack", 5), "ronan")).toBe(true);
    expect(canProposeAny([], [], "ronan")).toBe(true);
  });

  it("counts a returned creation as still open, and an approved one as done", () => {
    const records: Proposed[] = [
      ...waitingFor("ronan", 8),
      { proposal: inState("returned", "ronan") },
      { proposal: inState("approved", "ronan") },
      {},
    ];
    expect(openCount(records, "ronan")).toBe(9);
    expect(canPropose(records, "ronan")).toBe(true);
    expect(canPropose([...records, { proposal: inState("returned", "ronan") }], "ronan")).toBe(false);
  });

  it("counts each hero's own creations only", () => {
    const records = [...waitingFor("ronan", 10), ...waitingFor("jack", 2)];
    expect(openCount(records, "jack")).toBe(2);
    expect(canPropose(records, "jack")).toBe(true);
    expect(canPropose(records, "ronan")).toBe(false);
  });
});

describe("creationAp", () => {
  it("pays a beast what a size 3 wizard quest pays, and a quest what a size 1 quest pays", () => {
    expect(creationAp("beast")).toBe(suggestedRewards(3).ap);
    expect(creationAp("quest")).toBe(suggestedRewards(1).ap);
    expect(creationAp("beast")).toBeGreaterThan(creationAp("quest"));
  });
});

describe("who made it", () => {
  it("prefers the maker kept on the record, then the proposer, then the quest's creator", () => {
    expect(makerOf({ madeBy: "ronan", proposal: inState("approved", "jack"), createdBy: "mom" })).toBe("ronan");
    expect(makerOf({ proposal: inState("proposed", "jack"), createdBy: "mom" })).toBe("jack");
    expect(makerOf({ createdBy: "mom" })).toBe("mom");
    expect(makerOf({})).toBe("");
  });

  const nickOf = (id: string) => ({ ronan: "Ronan", jack: "Jack" })[id] ?? "";

  it("says Drawn by for a beast with a picture, Made by for one with a library look", () => {
    expect(creditLine({ madeBy: "ronan", localImage: "data:image/png;base64,AAAA" }, "beast", nickOf)).toBe("Drawn by Ronan");
    expect(creditLine({ madeBy: "ronan" }, "beast", nickOf)).toBe("Made by Ronan");
  });

  it("says Suggested by for a quest, whatever its picture", () => {
    expect(creditLine({ proposal: inState("approved", "jack") }, "quest", nickOf)).toBe("Suggested by Jack");
    expect(creditLine({ createdBy: "jack", localImage: "data:image/png;base64,AAAA" }, "quest", nickOf)).toBe("Suggested by Jack");
  });

  it("gives nothing when nobody made it, or the maker is no hero we know", () => {
    expect(creditLine({}, "beast", nickOf)).toBe("");
    expect(creditLine({ madeBy: "stranger" }, "beast", nickOf)).toBe("");
  });
});

describe("creationRows", () => {
  const proposedBeast = (id: string, on: string, patch: Partial<Beast> = {}) =>
    beast(id, { proposal: { by: "ronan", on, state: "proposed" }, ...patch });
  const proposedQuest = (id: string, on: string, patch: Partial<Achievement> = {}) =>
    quest(id, { proposal: { by: "jack", on, state: "proposed" }, ...patch });

  it("makes one row per waiting beast or quest, keyed by kind and id, oldest first", () => {
    const rows = creationRows(
      [proposedBeast("b2", "2026-10-26T00:00:00.000Z"), proposedBeast("b1", "2026-10-24T00:00:00.000Z")],
      [proposedQuest("q1", "2026-10-25T00:00:00.000Z")]
    );
    expect(rows.map((row) => row.key)).toEqual(["beast:b1", "quest:q1", "beast:b2"]);
    expect(rows[1]).toMatchObject({ kind: "quest", id: "q1", name: "Quest q1", by: "jack", state: "proposed" });
    expect(rows[0]).toMatchObject({ kind: "beast", id: "b1", name: "Beast b1", by: "ronan", on: "2026-10-24T00:00:00.000Z" });
  });

  it("hands over the record itself so the review screen can show it", () => {
    const b = proposedBeast("b1", "2026-10-24T00:00:00.000Z");
    const q = proposedQuest("q1", "2026-10-25T00:00:00.000Z");
    const [beastRow, questRow] = creationRows([b], [q]);
    expect(beastRow.beast).toBe(b);
    expect(questRow.quest).toBe(q);
  });

  it("pairs a beast with the quest the kid made along with it, and gives that quest no row of its own", () => {
    const b = proposedBeast("b1", "2026-10-24T00:00:00.000Z", {
      proposal: { by: "ronan", on: "2026-10-24T00:00:00.000Z", state: "proposed", questId: "q1" },
    });
    const paired = proposedQuest("q1", "2026-10-24T00:00:05.000Z");
    const alone = proposedQuest("q2", "2026-10-25T00:00:00.000Z");
    const rows = creationRows([b], [paired, alone]);
    expect(rows.map((row) => row.key)).toEqual(["beast:b1", "quest:q2"]);
    expect(rows[0].pairedQuest).toBe(paired);
  });

  it("shows only the states asked for, waiting ones by default", () => {
    const sentBack = beast("b2", { proposal: { by: "ronan", on: "2026-10-25T00:00:00.000Z", state: "returned", note: "Rename it" } });
    const approved = beast("b3", { proposal: { by: "ronan", on: "2026-10-26T00:00:00.000Z", state: "approved" } });
    const waiting = proposedBeast("b1", "2026-10-24T00:00:00.000Z");
    const all = [waiting, sentBack, approved, beast("old")];
    expect(creationRows(all, []).map((row) => row.id)).toEqual(["b1"]);
    expect(creationRows(all, [], ["returned"]).map((row) => row.id)).toEqual(["b2"]);
    expect(creationRows(all, [], ["returned"])[0].note).toBe("Rename it");
    expect(creationRows(all, [], ["proposed", "returned", "approved"]).map((row) => row.id)).toEqual(["b1", "b2", "b3"]);
  });

  it("gives a quest its own row when its beast is not in the rows asked for", () => {
    const approvedBeast = beast("b1", {
      proposal: { by: "ronan", on: "2026-10-24T00:00:00.000Z", state: "approved", questId: "q1" },
    });
    const rows = creationRows([approvedBeast], [proposedQuest("q1", "2026-10-25T00:00:00.000Z")]);
    expect(rows.map((row) => row.key)).toEqual(["quest:q1"]);
  });

  it("pairs a beast that was sent back with the quest the kid sent again on its own: one row in the waiting lane, the beast's", () => {
    const sentBack = beast("b1", {
      proposal: { by: "ronan", on: "2026-10-24T00:00:00.000Z", state: "returned", note: "Bigger teeth", questId: "q1" },
    });
    const resent = proposedQuest("q1", "2026-10-26T00:00:00.000Z", { beastId: "b1" });
    const rows = creationRows([sentBack], [resent]);
    expect(rows.map((row) => row.key)).toEqual(["beast:b1"]);
    expect(rows[0]).toMatchObject({ state: "returned", note: "Bigger teeth" });
    expect(rows[0].pairedQuest).toBe(resent);
    // and the same one row in the history lane
    expect(creationRows([sentBack], [resent], ["returned"]).map((row) => row.key)).toEqual(["beast:b1"]);
  });

  it("pairs a quest with the waiting beast it fights, even when the beast does not name it back", () => {
    const waiting = proposedBeast("b1", "2026-10-24T00:00:00.000Z");
    const onIt = proposedQuest("q1", "2026-10-25T00:00:00.000Z", { beastId: "b1" });
    const rows = creationRows([waiting], [onIt]);
    expect(rows.map((row) => row.key)).toEqual(["beast:b1"]);
    expect(rows[0].pairedQuest).toBe(onIt);
  });

  it("pairs the beast with the quest its proposal names first; a second quest on the same beast is its own row", () => {
    const b = proposedBeast("b1", "2026-10-24T00:00:00.000Z", {
      proposal: { by: "ronan", on: "2026-10-24T00:00:00.000Z", state: "proposed", questId: "q1" },
    });
    const first = proposedQuest("q1", "2026-10-24T00:00:05.000Z", { beastId: "b1" });
    const second = proposedQuest("q2", "2026-10-25T00:00:00.000Z", { beastId: "b1" });
    const rows = creationRows([b], [second, first]);
    expect(rows.map((row) => row.key)).toEqual(["beast:b1", "quest:q2"]);
    expect(rows[0].pairedQuest).toBe(first);
  });

  it("gives a quest its own row when the beast it fights is in the game, or a Game Master's", () => {
    const live = beast("b1", { proposal: { by: "ronan", on: "2026-10-24T00:00:00.000Z", state: "approved" } });
    const gm = beast("gm");
    const rows = creationRows(
      [live, gm],
      [proposedQuest("q1", "2026-10-25T00:00:00.000Z", { beastId: "b1" }), proposedQuest("q2", "2026-10-26T00:00:00.000Z", { beastId: "gm" })]
    );
    expect(rows.map((row) => row.key)).toEqual(["quest:q1", "quest:q2"]);
  });

  it("pairs only a quest still to be approved: a beast sent back whose quest is in the game stands alone", () => {
    const sentBack = beast("b1", { proposal: { by: "ronan", on: "2026-10-24T00:00:00.000Z", state: "returned", questId: "q1" } });
    const live = quest("q1", { beastId: "b1", draft: false, proposal: { by: "ronan", on: "2026-10-24T00:00:05.000Z", state: "approved" } });
    const rows = creationRows([sentBack], [live], ["returned"]);
    expect(rows.map((row) => row.key)).toEqual(["beast:b1"]);
    expect(rows[0].pairedQuest).toBeUndefined();
  });
});

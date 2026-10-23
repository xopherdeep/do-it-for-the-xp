import { DEFAULT_LOOK } from "@/lib/hero-look/types";
import { cardOf } from "@/lib/services/multiplayer/heroCard";
import {
  cardEvent,
  EVENT_KINDS,
  leveledEvent,
  newEvent,
  questClaimedEvent,
  questDoneEvent,
  questReviewedEvent,
} from "@/lib/services/multiplayer/familyEvents";

const now = new Date("2026-10-13T12:00:00Z");
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("EVENT_KINDS", () => {
  it("mirrors the server's kinds", () =>
    expect(EVENT_KINDS).toEqual({
      "hero.card": { scope: "public", writer: "home", fields: ["nickname", "look", "jobClass", "level"] },
      "hero.leveled": { scope: "public", writer: "home", fields: ["level", "jobClass"] },
      "quest.done": { scope: "public", writer: "home", fields: ["difficulty", "xp", "fight"] },
      "quest.claimed": { scope: "family", writer: "home-or-phone", fields: ["questId", "difficulty", "requiresApproval", "synced"] },
      "quest.approved": { scope: "family", writer: "home", fields: ["questId", "note"] },
      "quest.rejected": { scope: "family", writer: "home", fields: ["questId", "note"] },
      "reward.granted": { scope: "family", writer: "server", fields: ["xp", "ap", "reason", "sourceId"] },
      "hero.sheet": { scope: "family", writer: "home", fields: ["stats", "quests"] },
      "claim.settled": { scope: "family", writer: "home", fields: ["claimId", "questId", "status", "note", "xp", "gp", "ap"] },
    }));
});

describe("newEvent", () => {
  it("drops unlisted fields", () =>
    expect(newEvent("quest.done", "h-1", "d1", { xp: 40, questName: "Take medicine", difficulty: 2, fight: false }).data).toEqual({ xp: 40, difficulty: 2, fight: false }));

  it("never builds a server kind", () => expect(() => newEvent("reward.granted", "h-1", "d1", {})).toThrow());

  it("stamps a v4 id, the ISO time and the ids", () => {
    const e = newEvent("quest.done", "h-1", "d1", { xp: 1, difficulty: 1, fight: true }, now);
    expect(e.id).toMatch(UUID_V4);
    expect(e).toMatchObject({ heroId: "h-1", deviceId: "d1", kind: "quest.done", at: "2026-10-13T12:00:00.000Z" });
  });

  it("takes the id it is given", () => expect(newEvent("quest.done", "h-1", "d1", {}, now, "fixed-id").id).toBe("fixed-id"));
  it("two events never share an id", () => expect(newEvent("quest.done", "h-1", "d1", {}).id).not.toBe(newEvent("quest.done", "h-1", "d1", {}).id));
});

describe("event builders", () => {
  const card = cardOf({ id: "h-1", name: { nick: "Mia", full: "Mia Pollard" }, look: DEFAULT_LOOK, jobClass: "warrior", stats: { level: 4 } }, now)!;

  it("cardEvent carries the card's public fields and nothing else", () => {
    const e = cardEvent(card, "d1");
    expect(e.kind).toBe("hero.card");
    expect(e.heroId).toBe("h-1");
    expect(e.data).toEqual({ nickname: "Mia", look: DEFAULT_LOOK, jobClass: "warrior", level: 4 });
  });

  it("cardEvent sends only the look fields the server keeps", () => {
    const e = cardEvent({ ...card, look: { ...card.look, secret: "x" } as typeof card.look }, "d1");
    expect(Object.keys(e.data.look as object)).not.toContain("secret");
  });

  it("leveledEvent", () => {
    const e = leveledEvent("h-1", 5, "warrior", "d1");
    expect(e).toMatchObject({ kind: "hero.leveled", heroId: "h-1", deviceId: "d1", data: { level: 5, jobClass: "warrior" } });
  });

  it("questDoneEvent has no quest name", () => {
    const e = questDoneEvent("h-1", "d1", { difficulty: 2, xp: 40, fight: true });
    expect(e).toMatchObject({ kind: "quest.done", data: { difficulty: 2, xp: 40, fight: true } });
    expect(Object.keys(e.data).sort()).toEqual(["difficulty", "fight", "xp"]);
  });
});

describe("the approval loop's events", () => {
  it("quest.claimed carries the quest, its difficulty and whether it waits, never its name", () => {
    const e = questClaimedEvent("h-1", "d1", { questId: "q-9", difficulty: 3, requiresApproval: true });
    expect(e).toMatchObject({ kind: "quest.claimed", heroId: "h-1", deviceId: "d1" });
    expect(e.data).toEqual({ questId: "q-9", difficulty: 3, requiresApproval: true });
  });

  it("quest.claimed keeps synced", () => {
    const synced = questClaimedEvent("h-1", "d1", { questId: "q-9", difficulty: 3, requiresApproval: true, synced: true });
    expect(synced.data).toEqual({ questId: "q-9", difficulty: 3, requiresApproval: true, synced: true });
    // a claim with no mark (a free kid phone's, a takeover's re-send) carries none
    const unmarked = questClaimedEvent("h-1", "d1", { questId: "q-9", difficulty: 3, requiresApproval: true, synced: false });
    expect(unmarked.data).toEqual({ questId: "q-9", difficulty: 3, requiresApproval: true });
  });

  it("a verdict is quest.approved or quest.rejected with the note the hero read", () => {
    expect(questReviewedEvent("h-1", "d1", { questId: "q-9", approved: true, note: "" })).toMatchObject({
      kind: "quest.approved",
      data: { questId: "q-9", note: "" },
    });
    expect(questReviewedEvent("h-1", "d1", { questId: "q-9", approved: false, note: "Under the bed too" })).toMatchObject({
      kind: "quest.rejected",
      data: { questId: "q-9", note: "Under the bed too" },
    });
  });
});

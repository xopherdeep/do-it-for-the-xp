import { activityOf, heroIdsToday, memberKey, ownHeroIn, rosterOf } from "@/lib/services/party/partyFeedView";
import type { WireEvent, WireParty } from "@/lib/services/party/partyWire";

/**
 * How an outside party reads on the Roster, Activity and Synergies tabs. Pure: the site's answer in, display rows out.
 */

jest.mock("@/lib/services/temples/templeQuestRows", () => ({
  libraryEntryOf: (id: string) => (id === "beast-fluffalo" ? { name: "Fluffalo" } : undefined),
}));

const card = (heroId: string, nickname: string, level = 3, jobClass = "knight") => ({ heroId, nickname, level, jobClass, look: null });

const PARTY: WireParty = {
  id: "p1",
  name: "Raiders",
  emblem: "dragon",
  inviteRule: "leader",
  leader: { familyId: "f1", heroId: "ana" },
  members: [
    { familyId: "f1", heroId: "ana", card: card("ana", "Ana", 5, "paladin"), role: "leader", joinedAt: "2026-10-28T08:00:00Z" },
    { familyId: "f2", heroId: "ben", card: card("ben", "Ben", 2, "mage"), role: "member", joinedAt: "2026-10-28T09:00:00Z" },
  ],
  raid: null,
  seq: 5,
};

const event = (seq: number, kind: string, who: [string, string] | null, data: Record<string, unknown> = {}): WireEvent => ({
  seq,
  kind,
  familyId: who ? who[0] : null,
  heroId: who ? who[1] : null,
  data,
  at: `2026-10-28T10:0${seq}:00Z`,
});

describe("memberKey", () => {
  it("names a hero by family and hero, since hero ids are only unique inside a family", () => {
    expect(memberKey("f2", "ben")).toBe("f2|ben");
  });
});

describe("rosterOf", () => {
  it("turns the members into rows the Roster tab draws, the leader marked", () => {
    expect(rosterOf(PARTY)).toEqual([
      { id: "f1|ana", name: { nick: "Ana" }, jobClass: "paladin", role: "leader", stats: { level: 5 } },
      { id: "f2|ben", name: { nick: "Ben" }, jobClass: "mage", role: "member", stats: { level: 2 } },
    ]);
  });
});

describe("activityOf", () => {
  it("words each kind of event, newest first", () => {
    const lines = activityOf(
      [
        event(1, "join", ["f2", "ben"]),
        event(2, "leave", ["f2", "ben"]),
        event(3, "raid", null, { beastId: "beast-fluffalo" }),
        event(4, "strike", ["f1", "ana"], { damage: 30 }),
        event(5, "defeat", ["f1", "ana"]),
      ],
      PARTY
    );
    expect(lines.map((line) => line.text)).toEqual([
      "The beast was defeated! Ana landed the last hit.",
      "Ana struck for 30",
      "A raid began on Fluffalo",
      "Ben left the party",
      "Ben joined the party",
    ]);
  });

  it("words the fixed words, and cheers and pokes aimed at someone", () => {
    const lines = activityOf(
      [
        event(1, "preset", ["f1", "ana"], { preset: "gg" }),
        event(2, "preset", ["f1", "ana"], { preset: "cheer", toFamily: "f2", toHero: "ben" }),
        event(3, "preset", ["f2", "ben"], { preset: "poke", toFamily: "f1", toHero: "ana" }),
        event(4, "preset", ["f2", "ben"], { preset: "heart" }),
      ],
      PARTY
    );
    expect(lines.map((line) => line.text)).toEqual(["Ben: ❤️", "Ben pokes Ana", "Ana cheers on Ben", "Ana: Good game!"]);
  });

  it("calls a hero it does not know a hero, and leaves out what is not worth a line", () => {
    const lines = activityOf([event(1, "strike", ["f9", "zed"], { damage: 10 }), event(2, "unstrike", ["f1", "ana"]), event(3, "mystery", null)], PARTY);
    expect(lines.map((line) => line.text)).toEqual(["A hero struck for 10"]);
  });

  it("gives each line a stable id, the hero it is about and when it happened", () => {
    const [line] = activityOf([event(4, "strike", ["f1", "ana"], { damage: 30 })], PARTY);
    expect(line).toMatchObject({ id: "p1:4", userId: "f1|ana", nickname: "Ana", completedAt: "2026-10-28T10:04:00Z" });
  });
});

describe("ownHeroIn", () => {
  it("prefers the hero asked for when that hero is ours and in the party", () => {
    expect(ownHeroIn(PARTY, "f2", "ben")).toBe("ben");
  });

  it("falls back to the first of our heroes in the party", () => {
    expect(ownHeroIn(PARTY, "f1", "zed")).toBe("ana");
    expect(ownHeroIn(PARTY, "f2", "")).toBe("ben");
  });

  it("does not take another family's hero of the same name for ours", () => {
    expect(ownHeroIn(PARTY, "f9", "ana")).toBe("");
  });

  it("answers nothing when none of ours is in the party", () => {
    expect(ownHeroIn({ ...PARTY, members: [] }, "f1", "ana")).toBe("");
  });
});

describe("heroIdsToday", () => {
  const raid = (days: string[]) => ({
    id: "r1",
    beastId: "beast-fluffalo",
    window: "quick" as const,
    maxHp: 180,
    memberCount: 2,
    startedAt: "",
    endsAt: "",
    hp: 100,
    status: "active" as const,
    top: null,
    last: null,
    strikes: days.map((day, i) => ({ key: `k${i}`, familyId: i === 0 ? "f1" : "f2", heroId: i === 0 ? "ana" : "ben", damage: 10, day, at: "" })),
  });

  it("lists the heroes who struck the raid on this day, once each", () => {
    const party = { ...PARTY, raid: raid(["2026-10-28", "2026-10-28", "2026-10-27"]) };
    expect(heroIdsToday(party, "2026-10-28")).toEqual(["f1|ana", "f2|ben"]);
    expect(heroIdsToday(party, "2026-10-27")).toEqual(["f2|ben"]);
  });

  it("is empty for a party with no raid", () => {
    expect(heroIdsToday(PARTY, "2026-10-28")).toEqual([]);
  });
});

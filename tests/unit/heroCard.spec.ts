import { DEFAULT_LOOK } from "@/lib/hero-look/types";
import { cardKey, cardOf, type HeroCard } from "@/lib/services/multiplayer/heroCard";

const today = new Date("2026-10-13T12:00:00");
const profile = {
  id: "h-1",
  name: { nick: "Mia", full: "Mia Pollard" },
  birthday: "2015-01-01",
  email: "x@y.z",
  look: DEFAULT_LOOK,
  jobClass: "warrior",
  stats: { level: 4 },
};
const card = cardOf(profile, today)!;

describe("cardOf", () => {
  it("a card holds only its fields", () => {
    expect(Object.keys(card).sort()).toEqual(["heroId", "jobClass", "level", "look", "nickname", "updatedAt"]);
    expect(card.level).toBe(4);
    expect(card.nickname).toBe("Mia");
    expect(card.heroId).toBe("h-1");
    expect(card.jobClass).toBe("warrior");
    expect(card.updatedAt).toBe(today.toISOString());
  });

  it("no nickname, no card", () => expect(cardOf({ id: "h-1", name: { nick: "" } })).toBeNull());
  it("a blank nickname is no nickname", () => expect(cardOf({ id: "h-1", name: { nick: "   " } })).toBeNull());
  it("no name, no card", () => expect(cardOf({ id: "h-1" })).toBeNull());
  it("no id, no card", () => expect(cardOf({ name: { nick: "Mia" } })).toBeNull());
  it("level defaults to 1", () => expect(cardOf({ id: "h-1", name: { nick: "Mia" } }, today)!.level).toBe(1));
  it("the default look stands in for a missing one", () => expect(cardOf({ id: "h-1", name: { nick: "Mia" } }, today)!.look).toEqual(DEFAULT_LOOK));
  it("an odd look is replaced by the default", () => expect(cardOf({ id: "h-1", name: { nick: "Mia" }, look: "nope" }, today)!.look).toEqual(DEFAULT_LOOK));
  it("trims the nickname", () => expect(cardOf({ id: "h-1", name: { nick: "  Mia " } }, today)!.nickname).toBe("Mia"));
});

describe("cardKey", () => {
  it("ignores the time", () => expect(cardKey({ ...card, updatedAt: "x" })).toBe(cardKey({ ...card, updatedAt: "y" })));
  it("changes with the level", () => expect(cardKey({ ...card, level: 5 })).not.toBe(cardKey(card)));
  it("changes with the look", () => expect(cardKey({ ...card, look: { ...card.look, hair: "bun" } })).not.toBe(cardKey(card)));
  it("does not depend on the order of the look's keys", () => {
    const reordered: HeroCard = { ...card, look: Object.fromEntries(Object.entries(card.look).reverse()) as unknown as HeroCard["look"] };
    expect(cardKey(reordered)).toBe(cardKey(card));
  });
});

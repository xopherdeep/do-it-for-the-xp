import { emptyDraft, preTick, SETUP_STEPS } from "@/lib/services/setup/setupSteps";
import type { SetupDraft } from "@/lib/services/setup/setupSteps";
import { bandOf, suggestedChores } from "@/lib/services/setup/setupPlan";
import type { SetupHero } from "@/lib/services/setup/setupPlan";

const hero = (id: string, name: string, age: number | null, extra: Partial<SetupHero> = {}): SetupHero => ({
  id,
  name,
  age,
  existing: false,
  isParent: false,
  ...extra,
});
const draft = (extra: Partial<SetupDraft> = {}): SetupDraft => ({ heroes: [], rooms: [], chores: {}, extras: true, ...extra });
const step = (id: string) => SETUP_STEPS.find((s) => s.id === id)!;

describe("setup steps", () => {
  it("lists the five steps in order", () => {
    expect(SETUP_STEPS.map((s) => s.id)).toEqual(["family", "house", "review", "extras", "summary"]);
  });

  it("family step is invalid with no heroes, a blank or duplicate name, or a missing age (parent excepted)", () => {
    const family = step("family");
    expect(family.isValid(draft())).toBe("Name at least one hero");
    expect(family.isValid(draft({ heroes: [hero("a", "  ", 8)] }))).toEqual(expect.any(String));
    expect(family.isValid(draft({ heroes: [hero("a", "Ann", 8), hero("b", "ann", 9)] }))).toEqual(expect.any(String));
    expect(family.isValid(draft({ heroes: [hero("a", "Ann", null)] }))).toBe("Every hero needs an age");
    expect(family.isValid(draft({ heroes: [hero("a", "Ann", 8)] }))).toBe(true);
    const parent = hero("p", "Mom", null, { isParent: true, existing: true });
    expect(family.isValid(draft({ heroes: [parent, hero("a", "Ann", 8)] }))).toBe(true);
  });

  it("family step needs a Game Master name and 4-digit PIN when a new parent is added", () => {
    const family = step("family");
    const heroes = [hero("p", "Mom", null, { isParent: true }), hero("a", "Ann", 8)];
    expect(family.isValid(draft({ heroes }))).toBe("Add your name as the Game Master");
    expect(family.isValid(draft({ heroes, gameMaster: { name: "Mom", passcode: "12" } }))).toEqual(expect.any(String));
    expect(family.isValid(draft({ heroes, gameMaster: { name: "Mom", passcode: "1234" } }))).toBe(true);
  });

  it("house step is invalid with no rooms", () => {
    expect(step("house").isValid(draft())).toBe("Pick at least one room");
    expect(step("house").isValid(draft({ rooms: ["kitchen"] }))).toBe(true);
  });

  it("review step is invalid when a hero has no chores", () => {
    const heroes = [hero("a", "Ann", 8), hero("b", "Ben", 9)];
    const review = step("review");
    expect(review.isValid(draft({ heroes, chores: { a: ["x"], b: [] } }))).toBe("Every hero needs a chore");
    expect(review.isValid(draft({ heroes, chores: { a: ["x"] } }))).toBe("Every hero needs a chore");
    expect(review.isValid(draft({ heroes, chores: { a: ["x"], b: ["y"] } }))).toBe(true);
  });

  it("extras and summary steps are always valid", () => {
    expect(step("extras").isValid(draft())).toBe(true);
    expect(step("summary").isValid(draft())).toBe(true);
  });

  it("preTick fills chores per hero from their band and rooms, and a second call keeps the parent's unticks", () => {
    const heroes = [hero("a", "Ann", 5), hero("b", "Ben", 15)];
    const ticked = preTick(draft({ heroes, rooms: ["kitchen"] }));
    const ids = (h: SetupHero) => suggestedChores(bandOf(h), ["kitchen"]).map((b) => b.id);
    expect(ticked.chores.a).toEqual(ids(heroes[0]));
    expect(ticked.chores.b).toEqual(ids(heroes[1]));
    expect(ticked.chores.a.length).toBeGreaterThan(0);
    const edited = { ...ticked, chores: { ...ticked.chores, a: [] } };
    expect(preTick(edited).chores.a).toEqual([]);
    expect(preTick(edited).chores.b).toEqual(ticked.chores.b);
  });

  it("emptyDraft marks extras true and carries the existing heroes with existing: true", () => {
    const d = emptyDraft([hero("a", "Ann", 8)]);
    expect(d.extras).toBe(true);
    expect(d.rooms).toEqual([]);
    expect(d.heroes).toEqual([expect.objectContaining({ id: "a", existing: true })]);
  });
});

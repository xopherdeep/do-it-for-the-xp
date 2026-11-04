import {
  bandForAge, bandOf, categoryForRoom, suggestedChores, choreQuest, setupPlan,
} from "@/lib/services/setup/setupPlan";
import type { SetupAnswers, SetupHero } from "@/lib/services/setup/setupPlan";
import { libraryRooms } from "@/lib/services/bestiary/librarySuggest";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import { STARTER_CATEGORIES } from "@/lib/services/core/StarterWorld";

const hero = (over: Partial<SetupHero> = {}): SetupHero => ({
  id: "h1", name: "Ada", age: 10, existing: false, isParent: false, ...over,
});
const now = new Date("2026-11-04T10:00:00.000Z");
const counter = () => { let n = 0; return () => `id-${++n}`; };
const keysOf = (plan: ReturnType<typeof setupPlan>, store: string) =>
  (plan.backup.stores[store] ?? []).map((e) => e.key);

describe("setupPlan", () => {
  it("bandForAge maps 7 to little, 8 and 12 to kid, 13 to teen", () => {
    expect(bandForAge(7)).toBe("little");
    expect(bandForAge(8)).toBe("kid");
    expect(bandForAge(12)).toBe("kid");
    expect(bandForAge(13)).toBe("teen");
  });

  it("bandOf makes the parent teen whatever the age and an unset age kid", () => {
    expect(bandOf(hero({ isParent: true, age: 5 }))).toBe("teen");
    expect(bandOf(hero({ age: null }))).toBe("kid");
    expect(bandOf(hero({ age: 6 }))).toBe("little");
  });

  it("categoryForRoom maps every room to a starter category", () => {
    for (const room of ["bedroom", "laundry", "living"]) expect(categoryForRoom(room)).toBe("cat-chamber");
    expect(categoryForRoom("kitchen")).toBe("cat-mess-hall");
    expect(categoryForRoom("yard")).toBe("cat-grounds");
    expect(categoryForRoom("school")).toBe("cat-tower");
    for (const room of ["bathroom", "pets"]) expect(categoryForRoom(room)).toBe("cat-upkeep");
    expect(categoryForRoom("self")).toBe("cat-health");
    expect(categoryForRoom("family")).toBe("cat-family");
    const ids = STARTER_CATEGORIES.map((c) => c.id);
    for (const room of libraryRooms()) expect(ids).toContain(categoryForRoom(room));
  });

  it("suggestedChores returns only chore beasts of that band in those rooms", () => {
    const found = suggestedChores("kid", ["kitchen", "yard"]);
    expect(found.length).toBeGreaterThan(0);
    for (const b of found) {
      expect(b.age).toBe("kid");
      expect(["kitchen", "yard"]).toContain(b.room);
      expect("classic" in b).toBe(false);
    }
  });

  it("suggestedChores returns [] for a room with no chores of that band", () => {
    expect(suggestedChores("kid", ["nowhere"])).toEqual([]);
  });

  it("choreQuest is an individual quest assigned to the given heroes", () => {
    const beast = BEAST_LIBRARY[0];
    const quest = choreQuest(beast, "kid", ["a", "b"]);
    expect(quest.type).toBe("individual");
    expect(quest.assignee).toEqual(["a", "b"]);
    expect(quest.beastId).toBe(beast.id);
    expect(quest.id).toBe(`quest-${beast.slug}`);
    expect(quest.categoryId).toBe(categoryForRoom(beast.room));
    expect(quest.adventureType).toBe("beast");
  });

  it("choreQuest scales difficulty by band", () => {
    const beast = BEAST_LIBRARY[0];
    expect(choreQuest(beast, "little", []).difficulty).toBe(1);
    expect(choreQuest(beast, "kid", []).difficulty).toBe(2);
    const teen = choreQuest(beast, "teen", []);
    expect(teen.difficulty).toBe(3);
    expect(teen.basicSchedule).toBe("weekly");
  });

  it("setupPlan: two heroes ticking the same beast make one quest assigned to both", () => {
    const beast = BEAST_LIBRARY[0];
    const answers: SetupAnswers = {
      heroes: [hero({ id: "a" }), hero({ id: "b", name: "Bo" })],
      rooms: [], chores: { a: [beast.id], b: [beast.id] }, extras: false,
    };
    const plan = setupPlan(answers, new Map(), now, counter());
    const quests = plan.backup.stores.__achievements;
    expect(quests).toHaveLength(1);
    expect((quests[0].value as { assignee: string[] }).assignee).toEqual(["id-1", "id-2"]);
    expect(plan.newProfiles.map((p) => p.id)).toEqual(["id-1", "id-2"]);
  });

  it("setupPlan: running twice gives the same quest and beast ids", () => {
    const [x, y] = BEAST_LIBRARY;
    const answers: SetupAnswers = {
      heroes: [hero({ id: "a" })], rooms: [], chores: { a: [x.id, y.id] }, extras: false,
    };
    const one = setupPlan(answers, new Map(), now, counter());
    const two = setupPlan(answers, new Map(), now, counter());
    expect(keysOf(one, "__achievements")).toEqual(keysOf(two, "__achievements"));
    expect(keysOf(one, "__beasts")).toEqual(keysOf(two, "__beasts"));
  });

  it("setupPlan: existing heroes create no profiles; new ones do; a new parent makes a Game Master", () => {
    const base = { rooms: [], chores: {}, extras: false };
    const none = setupPlan({ ...base, heroes: [hero({ existing: true })] }, new Map(), now, counter());
    expect(none.newProfiles).toHaveLength(0);
    const kid = setupPlan({ ...base, heroes: [hero()] }, new Map(), now, counter());
    expect(kid.newProfiles).toHaveLength(1);
    expect(kid.newProfiles[0].isAdult).toBe(false);
    const parent = setupPlan(
      { ...base, heroes: [hero({ id: "p", name: "Mum", isParent: true }), hero()], gameMaster: { name: "Mum", passcode: "1234" } },
      new Map(), now, counter()
    );
    expect(parent.newProfiles).toHaveLength(2);
    expect(parent.newProfiles.filter((p) => p.isAdult)).toHaveLength(1);
    expect(keysOf(parent, "__profiles")).toHaveLength(2);
  });

  it("setupPlan: extras off leaves the extra stores out; on includes them; a shop already there is kept", () => {
    const base = { heroes: [hero()], rooms: [], chores: {} };
    const extraStores = ["__abilities", "__accessories", "__shops", "__dosDonts"];
    const off = setupPlan({ ...base, extras: false }, new Map(), now, counter());
    for (const s of extraStores) expect(off.backup.stores[s]).toBeUndefined();
    const on = setupPlan({ ...base, extras: true }, new Map(), now, counter());
    for (const s of extraStores) expect(on.backup.stores[s]?.length).toBeGreaterThan(0);
    const shopId = on.backup.stores.__shops[0].key;
    const kept = setupPlan({ ...base, extras: true }, new Map([[shopId, {}]]), now, counter());
    expect(keysOf(kept, "__shops")).not.toContain(shopId);
  });

  it("setupPlan always carries STARTER_CATEGORIES and the ticked beasts as plain records", () => {
    const beast = BEAST_LIBRARY[3];
    const plan = setupPlan(
      { heroes: [hero({ id: "a" })], rooms: [], chores: { a: [beast.id] }, extras: false },
      new Map(), now, counter()
    );
    expect(keysOf(plan, "__achievementCategories")).toEqual(STARTER_CATEGORIES.map((c) => c.id));
    const beasts = plan.backup.stores.__beasts;
    expect(beasts.map((e) => e.key)).toEqual([beast.id]);
    expect(beasts[0].value).not.toHaveProperty("chore");
    expect(beasts[0].value).not.toHaveProperty("room");
  });
});

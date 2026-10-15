import { AGE_GROUPS, ageGroupOf, needsAgePick, type AgeGroup } from "@/lib/services/multiplayer/ageGroup";

const today = new Date("2026-10-13T12:00:00");

describe("ageGroupOf", () => {
  it("lists the groups the server knows", () => expect(AGE_GROUPS).toEqual(["child", "teen", "adult"]));

  it.each([
    [{ isAdult: true }, undefined, "adult"],
    [{ birthday: "2013-10-14" }, undefined, "child"],
    [{ birthday: "2013-10-13" }, undefined, "teen"],
    [{ birthday: "2008-10-13" }, undefined, "adult"],
    [{}, "teen", "teen"],
    [{}, undefined, "child"],
    [{ birthday: "soon" }, "teen", "teen"],
  ])("ageGroupOf(%j, %s) is %s", (profile, picked, group) => expect(ageGroupOf(profile, picked as AgeGroup | undefined, today)).toBe(group));

  it("a readable birthday beats the pick", () => expect(ageGroupOf({ birthday: "2020-01-01" }, "adult", today)).toBe("child"));
  it("a Game Master is an adult whatever the pick", () => expect(ageGroupOf({ isAdult: true, birthday: "2020-01-01" }, "child", today)).toBe("adult"));
  it("a birthday in the future reads as unknown", () => expect(ageGroupOf({ birthday: "2030-01-01" }, "teen", today)).toBe("teen"));
  it("17 is a teen", () => expect(ageGroupOf({ birthday: "2009-10-14" }, undefined, today)).toBe("teen"));
  it("an unknown pick is ignored", () => expect(ageGroupOf({}, "toddler" as AgeGroup, today)).toBe("child"));
});

describe("needsAgePick", () => {
  it("a hero with no birthday needs a pick", () => expect(needsAgePick({}, today)).toBe(true));
  it("a hero with a readable birthday does not", () => expect(needsAgePick({ birthday: "2015-03-02" }, today)).toBe(false));
  it("a Game Master does not", () => expect(needsAgePick({ isAdult: true }, today)).toBe(false));
  it("an unreadable birthday needs a pick", () => expect(needsAgePick({ birthday: "soon" }, today)).toBe(true));
});

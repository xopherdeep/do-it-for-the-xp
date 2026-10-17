import {
  NEW_HERO_STEPS,
  firstBlockedStep,
  stepIndex,
  stepProblem,
  stepProgress,
  type NewHeroDraft,
} from "@/lib/services/profile/newHeroSteps";

const draft = (over: Partial<NewHeroDraft> = {}): NewHeroDraft => ({
  fullName: "Sam",
  jobClass: "Mage",
  favoriteFood: "Pizza",
  passcode: "",
  isGameMaster: false,
  ...over,
});

describe("newHeroSteps", () => {
  it("needs a name that is not just spaces", () => {
    expect(stepProblem("name", draft({ fullName: "   " }))).toBeTruthy();
    expect(stepProblem("name", draft())).toBeNull();
  });

  it("needs a class and a food", () => {
    expect(stepProblem("class", draft({ jobClass: "" }))).toBeTruthy();
    expect(stepProblem("food", draft({ favoriteFood: "" }))).toBeTruthy();
  });

  it("lets the look step be skipped", () => {
    expect(stepProblem("look", draft())).toBeNull();
  });

  it("makes the passcode optional for a hero but exact when given", () => {
    expect(stepProblem("secret", draft({ passcode: "" }))).toBeNull();
    expect(stepProblem("secret", draft({ passcode: "12" }))).toBeTruthy();
    expect(stepProblem("secret", draft({ passcode: "1234" }))).toBeNull();
  });

  it("requires a 4-digit passcode for a Game Master", () => {
    expect(stepProblem("secret", draft({ isGameMaster: true }))).toBeTruthy();
    expect(stepProblem("secret", draft({ isGameMaster: true, passcode: "1234" }))).toBeNull();
  });

  it("finds the first blocked step in order", () => {
    expect(firstBlockedStep(draft())).toBeNull();
    expect(firstBlockedStep(draft({ favoriteFood: "", isGameMaster: true }))).toBe("food");
    expect(firstBlockedStep(draft({ fullName: "", jobClass: "" }))).toBe("name");
  });

  it("reports progress from the first step to the last", () => {
    expect(stepProgress(NEW_HERO_STEPS[0].id)).toBe(0);
    expect(stepProgress(NEW_HERO_STEPS[NEW_HERO_STEPS.length - 1].id)).toBe(1);
    expect(stepIndex("class")).toBe(3);
  });
});

import { CATALOG } from "@/lib/services/copy/catalog";
import { copyFor, hasCopy } from "@/lib/services/copy/copy";
import { CLERK } from "@/lib/services/hometown/hometownPrompts";
import { familyNotice, homeQuestionPrompt } from "@/lib/services/multiplayer/familyPrompts";

/** The clerk's family lines, word for word (the plan, Task 11) */
const LINES: Record<string, string> = {
  "family.homeElsewhere": "This family's home is another device. Make this one home?",
  "family.otherFamily":
    "This account already runs another family. Bring it here with a backup file, or link this phone as a hero's phone with a code from the family's device.",
  "family.taken": "This family is registered to another account.",
  "family.notMember": "The site doesn't know your family yet. Register the family with me first.",
  "family.offline": "The courier hasn't arrived. I'll keep trying.",
  "family.needsNickname": "{name} needs a nickname first. Friends will see it, so not their full name.",
  "family.codeInvalid": "That code didn't work. Ask your Game Master for a new one.",
  "family.unlinked": "This phone was unlinked. Ask your Game Master to link it again.",
  "family.questsElsewhere": "Your quests are on the family device.",
  "family.linked": "Welcome, {nickname}! This phone is yours now.",
  "family.removePhone": "Unlink {label}? It stops working right away.",
};

describe("the clerk's family lines", () => {
  it.each(Object.entries(LINES))("%s is in the catalogue in the adventure voice", (key, line) => {
    expect(hasCopy(key)).toBe(true);
    expect(CATALOG[key as keyof typeof CATALOG].adventure).toBe(line);
  });

  it.each(["simple", "classic"] as const)("the %s voice falls back to the adventure line", (voice) => {
    expect(copyFor("family.taken", voice)).toBe(LINES["family.taken"]);
  });

  it("fills the placeholders", () => {
    expect(copyFor("family.linked", "adventure", { nickname: "Mia" })).toBe("Welcome, Mia! This phone is yours now.");
    expect(copyFor("family.removePhone", "adventure", { label: "Mia's iPhone" })).toBe("Unlink Mia's iPhone? It stops working right away.");
  });
});

describe("the family prompts", () => {
  it("familyNotice is a Town Clerk notice with the tablet rising", () => {
    const prompt = familyNotice("family.taken");
    expect(prompt.speaker).toBe(CLERK);
    expect(prompt.accent).toBe("townHall");
    expect(prompt.sprite).toBe("tablet");
    expect(prompt.lines).toEqual([LINES["family.taken"]]);
    expect(prompt.choices?.map((choice) => choice.id)).toEqual(["ok"]);
  });

  it.each(Object.keys(LINES))("renders %s through copyFor", (key) => {
    const vars = { name: "Mia", nickname: "Mia", label: "Mia's iPhone" };
    const prompt = familyNotice(key as Parameters<typeof familyNotice>[0], vars);
    expect(prompt.lines).toEqual([copyFor(key, "adventure", vars)]);
    expect(prompt.lines?.[0]).not.toBe(key);
    expect(prompt.lines?.[0]).not.toMatch(/\{\w+\}/);
  });

  it("names the hero in the nickname line", () => {
    expect(familyNotice("family.needsNickname", { name: "Bo" }).lines).toEqual(["Bo needs a nickname first. Friends will see it, so not their full name."]);
  });

  it("reads a notice in the voice it is given", () => {
    expect(familyNotice("family.taken", undefined, "classic").lines).toEqual([copyFor("family.taken", "classic")]);
  });

  it("the home question has Yes and No, and No is Escape", () => {
    const prompt = homeQuestionPrompt();
    expect(prompt.speaker).toBe(CLERK);
    expect(prompt.accent).toBe("townHall");
    expect(prompt.sprite).toBe("tablet");
    expect(prompt.lines).toEqual([LINES["family.homeElsewhere"]]);
    expect(prompt.choices?.map((choice) => choice.id)).toEqual(["yes", "no"]);
    expect(prompt.cancelId).toBe("no");
  });
});

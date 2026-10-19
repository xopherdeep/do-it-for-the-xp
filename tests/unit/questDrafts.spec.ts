/**
 * The draft rules (questDrafts.ts): a quest made through New Quest is a draft until the Game Master taps Ready on the
 * last step, heroes never see a draft, a quest saved before the marker existed is published, and opening New Quest
 * while a draft waits asks to resume or discard it instead of minting another quest (GitHub issue #126).
 */
import {
  draftAction,
  findUnfinishedDraft,
  hideDrafts,
  isDraft,
  isDraftOnSave,
  newQuestOpening,
  unfinishedDraftPrompt,
  unfinishedDrafts,
} from "@/lib/services/quests/questDrafts";

const quest = (id: string, patch: { achievementName?: string; draft?: boolean } = {}) => ({ id, achievementName: `Quest ${id}`, ...patch });

describe("isDraft", () => {
  it("is true only for a quest marked draft", () => {
    expect(isDraft(quest("a", { draft: true }))).toBe(true);
    expect(isDraft(quest("b", { draft: false }))).toBe(false);
  });

  it("treats a quest saved before the marker existed as published", () => {
    expect(isDraft(quest("old"))).toBe(false);
  });

  it("is false for nothing at all", () => {
    expect(isDraft(null)).toBe(false);
    expect(isDraft(undefined)).toBe(false);
  });
});

describe("hideDrafts", () => {
  it("keeps every quest a hero may see, in order, and leaves the drafts out", () => {
    const quests = [quest("live", { draft: false }), quest("draft", { draft: true }), quest("old"), quest("draft-2", { draft: true })];
    expect(hideDrafts(quests).map((q) => q.id)).toEqual(["live", "old"]);
  });

  it("does not touch the list it was given (the Game Master's Compendium reads the same records)", () => {
    const quests = [quest("live"), quest("draft", { draft: true })];
    hideDrafts(quests);
    expect(quests.map((q) => q.id)).toEqual(["live", "draft"]);
  });
});

describe("isDraftOnSave: what an autosave writes", () => {
  it("keeps a quest that was never made Ready a draft, even once every step has its answer", () => {
    expect(isDraftOnSave({ isPublished: false, isComplete: false })).toBe(true);
    expect(isDraftOnSave({ isPublished: false, isComplete: true })).toBe(true);
  });

  it("keeps a published quest live while it is complete", () => {
    expect(isDraftOnSave({ isPublished: true, isComplete: true })).toBe(false);
  });

  it("hides a published quest while an edit leaves it incomplete", () => {
    expect(isDraftOnSave({ isPublished: true, isComplete: false })).toBe(true);
  });
});

describe("the unfinished drafts New Quest finds", () => {
  it("lists the drafts in the order stored, skipping live quests, old quests and empty rows", () => {
    const quests = [quest("live"), null, quest("d1", { draft: true }), undefined, quest("d2", { draft: true }), quest("off", { draft: false })];
    expect(unfinishedDrafts(quests).map((q) => q.id)).toEqual(["d1", "d2"]);
    expect(findUnfinishedDraft(quests)?.id).toBe("d1");
  });

  it("finds none when every quest is live", () => {
    expect(findUnfinishedDraft([quest("live"), quest("old", { draft: false })])).toBeNull();
    expect(findUnfinishedDraft([])).toBeNull();
  });
});

describe("newQuestOpening", () => {
  it("starts a fresh quest only when no draft waits", () => {
    expect(newQuestOpening([quest("live"), quest("old")])).toEqual({ kind: "fresh" });
  });

  it("asks about the first draft, and says how many wait in all", () => {
    const opening = newQuestOpening([quest("live"), quest("d1", { draft: true }), quest("d2", { draft: true })]);
    expect(opening.kind).toBe("ask");
    const isAsking = opening.kind === "ask";
    if (isAsking) {
      expect(opening.draft.id).toBe("d1");
      expect(opening.waiting).toBe(2);
    }
  });
});

describe("draftAction: what the Game Master's answer means", () => {
  it("resumes or discards when those are picked", () => {
    expect(draftAction("resume")).toBe("resume");
    expect(draftAction("discard")).toBe("discard");
  });

  it("backs out, changing nothing, for Not now, Escape or anything else", () => {
    expect(draftAction("back")).toBe("back");
    expect(draftAction("")).toBe("back");
    expect(draftAction("whatever")).toBe("back");
  });
});

describe("unfinishedDraftPrompt", () => {
  it("names the draft, says heroes can't see it, and offers Resume, Discard and a way out", () => {
    const prompt = unfinishedDraftPrompt(quest("d1", { achievementName: "Feed The Dog", draft: true }), 1);
    const said = prompt.lines.join(" ");
    expect(said).toContain("Feed The Dog");
    expect(said).toMatch(/can't see it/);
    expect(prompt.choices.map((choice) => choice.id)).toEqual(["resume", "discard", "back"]);
    expect(prompt.choices.map((choice) => choice.label)).toEqual(["Resume", "Discard", "Not now"]);
    expect(prompt.choices[0].tone).toBe("primary");
    expect(prompt.choices[2].tone).toBe("ghost");
  });

  it("backs out on Escape or a back gesture, never discards", () => {
    expect(unfinishedDraftPrompt(quest("d1", { draft: true }), 1).cancelId).toBe("back");
  });

  it("says how many more drafts wait when there are others", () => {
    expect(unfinishedDraftPrompt(quest("d1", { draft: true }), 1).lines.join(" ")).not.toMatch(/more/);
    expect(unfinishedDraftPrompt(quest("d1", { draft: true }), 2).lines.join(" ")).toMatch(/1 more unfinished quest waits/);
    expect(unfinishedDraftPrompt(quest("d1", { draft: true }), 4).lines.join(" ")).toMatch(/3 more unfinished quests wait/);
  });

  it("speaks of a draft with no name as this quest", () => {
    expect(unfinishedDraftPrompt({ id: "d1", achievementName: "  ", draft: true }, 1).lines[0]).toMatch(/^This quest/);
  });

  it("takes the screen's own look (the quest app's accent)", () => {
    expect(unfinishedDraftPrompt(quest("d1", { draft: true }), 1, { accent: "#8a63d2" }).accent).toBe("#8a63d2");
  });

  it("never uses an em dash", () => {
    const prompt = unfinishedDraftPrompt(quest("d1", { draft: true }), 3);
    const words = [...prompt.lines, ...prompt.choices.map((choice) => `${choice.label} ${choice.hint ?? ""}`), prompt.title ?? ""];
    expect(words.join(" ")).not.toContain(String.fromCharCode(0x2014));
  });
});

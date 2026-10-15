/**
 * The Game Master's temple forms as steps of the shared wizard shell (docs: compendium-wizards-design, sections 1, 3
 * and 5.6): the Config > General card (Name and theme, then Check and open) and the Generate modal (Seed, Size and
 * floors, Theme, Preview and save). Pure rules only: the steps with their guide line and the one-line reason, the
 * drafts, what goes back to the stored temple, the real id a new temple is given (bug 6: a second "new" temple
 * overwrote the first), and the audit icons the Check step and the Audit tab share.
 */
import {
  AUDIT_ICONS,
  attributesOpeningIndex,
  attributesWizardSteps,
  draftFromTemple,
  ELEMENT_CHOICES,
  FLOOR_CHOICES,
  generateKey,
  generateOptionsOf,
  generateWizardSteps,
  iconClassOf,
  LOCK_CHOICES,
  mintTempleId,
  newGenerateDraft,
  normalizeIcon,
  previewFailure,
  previewVerdict,
  rerolledSeed,
  saveVerb,
  SIZE_CHOICES,
  sizeLines,
  TEMPLE_ICON_CHOICES,
  templePatch,
  themeSuggestions,
  toggleCategory,
} from "@/app/Admin/XpCompendium/views/XpTemples/templeWizard";
import type { AttributesDraft, GenerateDraft } from "@/app/Admin/XpCompendium/views/XpTemples/templeWizard";
import { blockedBy, canNext, isLast, isReady, lastIndex, firstIndex, progressOf } from "@/lib/services/wizard/wizardSteps";

// ---------------------------------------------------------------------------------------------------------------------
// Config > General: Name and theme, Check and open
// ---------------------------------------------------------------------------------------------------------------------

const attributeSteps = attributesWizardSteps();

const named = (patch: Partial<AttributesDraft> = {}): AttributesDraft => ({
  name: "The Howling Spire",
  description: "A tower lashed to the top of the world.",
  categoryIds: ["c1"],
  icon: "fa-wind",
  ...patch,
});

describe("the attribute steps", () => {
  it("are two, in the parent's words: Name and theme, then Check and open", () => {
    expect(attributeSteps.map((step) => step.id)).toEqual(["name", "check"]);
    expect(attributeSteps.map((step) => step.title)).toEqual(["Name and theme", "Check and open"]);
  });

  it("each carry a guide line for the Game Master and a picture, and none is ever skipped", () => {
    for (const step of attributeSteps) {
      expect(step.guide.length).toBeGreaterThan(20);
      expect(step.guide.length).toBeLessThan(140);
      expect(step.icon).toBeTruthy();
      expect(step.isSkipped?.(named())).toBeFalsy();
    }
  });

  it("ask for a name first: blank or only spaces says why in one line", () => {
    expect(attributeSteps[0].isValid(named({ name: "" }))).toBe("Name the temple");
    expect(attributeSteps[0].isValid(named({ name: "   " }))).toBe("Name the temple");
    expect(attributeSteps[0].isValid(named())).toBe(true);
  });

  it("do not need a description, a domain or an icon to move on", () => {
    expect(attributeSteps[0].isValid(named({ description: "", categoryIds: [], icon: "" }))).toBe(true);
  });

  it("never block the audit: Check and open is valid whatever the temple lacks, so Save opens once it is named", () => {
    expect(attributeSteps[1].isValid(named())).toBe(true);
    expect(isReady(attributeSteps, named())).toBe(true);
    expect(canNext(attributeSteps, named(), 1)).toBe(true);
  });

  it("shut Save with the first reason while the name is missing, even from the last step", () => {
    const draft = named({ name: "" });
    expect(isLast(attributeSteps, draft, 1)).toBe(true);
    expect(canNext(attributeSteps, draft, 1)).toBe(false);
    expect(blockedBy(attributeSteps, draft, 1)).toBe("Name the temple");
    expect(blockedBy(attributeSteps, draft, 0)).toBe("Name the temple");
  });

  it("count 1 / 2 and 2 / 2", () => {
    expect(progressOf(attributeSteps, named(), 0)).toEqual({ n: 1, total: 2 });
    expect(progressOf(attributeSteps, named(), 1)).toEqual({ n: 2, total: 2 });
  });
});

describe("where the attribute wizard opens", () => {
  it("opens a temple that is not stored yet on its first step", () => {
    expect(attributesOpeningIndex(attributeSteps, named(), false)).toBe(firstIndex(attributeSteps, named()));
    expect(attributesOpeningIndex(attributeSteps, named(), false)).toBe(0);
  });

  it("opens a stored temple on the check, with the dots to go back by", () => {
    expect(attributesOpeningIndex(attributeSteps, named(), true)).toBe(lastIndex(attributeSteps, named()));
    expect(attributesOpeningIndex(attributeSteps, named(), true)).toBe(1);
  });
});

describe("the attribute draft", () => {
  it("shows the name the temple goes by: the Game Master's own, else the shipped one", () => {
    expect(draftFromTemple({ id: "wind-temple", name: "Wind", customName: "Mine", categoryIds: [] }, "fa-wind").name).toBe("Mine");
    expect(draftFromTemple({ id: "wind-temple", name: "Wind", categoryIds: [] }, "fa-wind").name).toBe("Wind");
    expect(draftFromTemple({ id: "temple-x", categoryIds: [] }, "fa-dungeon").name).toBe("");
  });

  it("shows the icon the temple wears: the chosen one without its style prefix, else the one its id has", () => {
    expect(draftFromTemple({ id: "t", customIcon: "fad fa-skull", categoryIds: [] }, "fa-dungeon").icon).toBe("fa-skull");
    expect(draftFromTemple({ id: "t", categoryIds: [] }, "fa-dungeon").icon).toBe("fa-dungeon");
  });

  it("copies the domains, so editing the draft never touches the stored temple", () => {
    const stored = { id: "t", categoryIds: ["a", "b"], customDescription: "Old" };
    const draft = draftFromTemple(stored, "fa-dungeon");
    draft.categoryIds.push("c");
    expect(stored.categoryIds).toEqual(["a", "b"]);
    expect(draft.description).toBe("Old");
  });

  it("copes with a stored temple that has no domains", () => {
    expect(draftFromTemple({ id: "t" } as never, "fa-dungeon").categoryIds).toEqual([]);
  });
});

describe("what goes back to the stored temple", () => {
  const stored = { id: "wind-temple", name: "The Howling Spire", categoryIds: ["c1"] };

  it("leaves the shipped name and icon alone when they were not changed, so a later refresh of them still lands", () => {
    const patch = templePatch(stored, draftFromTemple(stored, "fa-wind"), "fa-wind");
    expect(patch).toEqual({ categoryIds: ["c1"] });
    expect("customName" in patch).toBe(false);
    expect("customIcon" in patch).toBe(false);
  });

  it("writes a new name trimmed, and an icon with the duotone prefix the creator store keeps", () => {
    const draft = { ...draftFromTemple(stored, "fa-wind"), name: "  Spire of Chores ", icon: "fa-skull" };
    expect(templePatch(stored, draft, "fa-wind")).toEqual({
      categoryIds: ["c1"],
      customName: "Spire of Chores",
      customIcon: "fad fa-skull",
    });
  });

  it("writes the description only when it changed, trimmed", () => {
    const draft = { ...draftFromTemple(stored, "fa-wind"), description: "  Wind, stairs. " };
    expect(templePatch(stored, draft, "fa-wind").customDescription).toBe("Wind, stairs.");
    expect("customDescription" in templePatch(stored, draftFromTemple(stored, "fa-wind"), "fa-wind")).toBe(false);
  });

  it("lets a description be cleared", () => {
    const withText = { ...stored, customDescription: "Old" };
    const draft = { ...draftFromTemple(withText, "fa-wind"), description: "   " };
    expect(templePatch(withText, draft, "fa-wind").customDescription).toBe("");
  });

  it("gives the patch its own copy of the domains", () => {
    const draft = draftFromTemple(stored, "fa-wind");
    const patch = templePatch(stored, draft, "fa-wind");
    expect(patch.categoryIds).not.toBe(draft.categoryIds);
    expect(patch.categoryIds).toEqual(draft.categoryIds);
  });
});

describe("the domains and the icons", () => {
  it("toggle a domain on and off, without touching the list it was given", () => {
    const list = ["a"];
    expect(toggleCategory(list, "b")).toEqual(["a", "b"]);
    expect(toggleCategory(["a", "b"], "a")).toEqual(["b"]);
    expect(list).toEqual(["a"]);
  });

  it("offer a few dozen duotone icons with a label each, none twice, and the nine elements among them", () => {
    const ids = TEMPLE_ICON_CHOICES.map((choice) => choice.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(20);
    for (const choice of TEMPLE_ICON_CHOICES) {
      expect(choice.id).toMatch(/^fa-[a-z0-9-]+$/);
      expect(choice.label.length).toBeGreaterThan(2);
    }
    expect(ids).toEqual(expect.arrayContaining(["fa-wind", "fa-leaf", "fa-water", "fa-flame", "fa-snowflake", "fa-sun", "fa-moon", "fa-bolt"]));
  });

  it("normalise an icon to its fa- name whatever style prefix it came with", () => {
    expect(normalizeIcon("fad fa-wind")).toBe("fa-wind");
    expect(normalizeIcon("fas   fa-skull")).toBe("fa-skull");
    expect(normalizeIcon("fa-leaf")).toBe("fa-leaf");
    expect(normalizeIcon(undefined)).toBe("");
    expect(normalizeIcon("")).toBe("");
  });

  it("draw an icon as the duotone classes the kit uses", () => {
    expect(iconClassOf("fa-wind")).toEqual(["fad", "fa-wind"]);
    expect(iconClassOf("")).toEqual(["fad", "fa-dungeon"]);
  });

  it("give every audit check an icon", () => {
    const ids = ["entrance", "exit", "boss", "bossKey", "masterRoom", "map", "compass", "size", "stairs"] as const;
    for (const id of ids) expect(AUDIT_ICONS[id]).toMatch(/^fa-/);
    expect(Object.keys(AUDIT_ICONS).sort()).toEqual([...ids].sort());
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// A new temple gets a real id (bug 6)
// ---------------------------------------------------------------------------------------------------------------------

describe("mintTempleId", () => {
  it("gives every new temple an id of its own, so a second one never overwrites the first", () => {
    const ids = new Set(Array.from({ length: 50 }, () => mintTempleId()));
    expect(ids.size).toBe(50);
  });

  it("is never the old placeholder, and never reads as a shipped (-temple) or generated (gen-) temple", () => {
    const id = mintTempleId();
    expect(id).not.toBe("new");
    expect(id.startsWith("temple-")).toBe(true);
    expect(id.endsWith("-temple")).toBe(false);
    expect(id.startsWith("gen-")).toBe(false);
  });

  it("takes its random part from the maker it is given", () => {
    expect(mintTempleId(() => "abc-123")).toBe("temple-abc-123");
  });

  it("is a safe address: lowercase letters, digits and dashes", () => {
    expect(mintTempleId()).toMatch(/^[a-z0-9-]+$/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The Generate modal: Seed, Size and floors, Theme, Preview and save
// ---------------------------------------------------------------------------------------------------------------------

const generateSteps = generateWizardSteps();

const solvedPreview = { solvable: true, problem: "" };

const generating = (patch: Partial<GenerateDraft> = {}): GenerateDraft => ({
  ...newGenerateDraft("attic-417"),
  preview: solvedPreview,
  ...patch,
});

describe("the generate steps", () => {
  it("are four, in the parent's words", () => {
    expect(generateSteps.map((step) => step.id)).toEqual(["seed", "size", "theme", "preview"]);
    expect(generateSteps.map((step) => step.title)).toEqual(["Seed", "Size and floors", "Theme", "Preview and save"]);
  });

  it("each carry a guide line for the Game Master and a picture, and none is ever skipped", () => {
    for (const step of generateSteps) {
      expect(step.guide.length).toBeGreaterThan(20);
      expect(step.guide.length).toBeLessThan(160);
      expect(step.icon).toBeTruthy();
      expect(step.isSkipped?.(generating())).toBeFalsy();
    }
  });

  it("ask for a seed: blank or only spaces says why in one line", () => {
    expect(generateSteps[0].isValid(generating({ seed: "" }))).toBe("Give it a seed");
    expect(generateSteps[0].isValid(generating({ seed: "  " }))).toBe("Give it a seed");
    expect(generateSteps[0].isValid(generating())).toBe(true);
  });

  it("have a size and floors and locks from the start, so that step is always open", () => {
    expect(generateSteps[1].isValid(generating())).toBe(true);
    expect(generating().size).toBe("medium");
    expect(generating().floors).toBe(2);
    expect(generating().locks).toBe(2);
  });

  it("ask for a theme: blank says Pick a theme", () => {
    expect(generateSteps[2].isValid(generating({ theme: "" }))).toBe("Pick a theme");
    expect(generateSteps[2].isValid(generating({ theme: "   " }))).toBe("Pick a theme");
    expect(generateSteps[2].isValid(generating({ theme: "Yard" }))).toBe(true);
  });

  it("hold the verb until the temple is built and the solver says the heroes can win", () => {
    expect(generateSteps[3].isValid(generating({ preview: null }))).toBe(false);
    expect(generateSteps[3].isValid(generating({ preview: previewVerdict(false) }))).toMatch(/cannot reach the boss/i);
    expect(generateSteps[3].isValid(generating())).toBe(true);
  });

  it("are ready when every step is answered and the temple is solvable", () => {
    expect(isReady(generateSteps, generating())).toBe(true);
    expect(isReady(generateSteps, generating({ theme: "" }))).toBe(false);
    expect(isReady(generateSteps, generating({ preview: previewVerdict(false) }))).toBe(false);
  });

  it("say, on the verb, the first thing that is wrong", () => {
    expect(blockedBy(generateSteps, generating({ theme: "" }), 3)).toBe("Pick a theme");
    expect(blockedBy(generateSteps, generating({ seed: "" }), 3)).toBe("Give it a seed");
    expect(blockedBy(generateSteps, generating({ preview: previewVerdict(false) }), 3)).toMatch(/cannot reach the boss/i);
    expect(blockedBy(generateSteps, generating({ preview: null }), 3)).toBe("");
    expect(blockedBy(generateSteps, generating(), 3)).toBe("");
  });

  it("count 1 / 4 to 4 / 4", () => {
    expect(progressOf(generateSteps, generating(), 0)).toEqual({ n: 1, total: 4 });
    expect(progressOf(generateSteps, generating(), 3)).toEqual({ n: 4, total: 4 });
  });
});

describe("the generate draft", () => {
  it("starts on the seed it is given, a medium temple of two floors and two locks, with no preview", () => {
    const draft = newGenerateDraft("kitchen-512");
    expect(draft).toEqual({
      seed: "kitchen-512",
      size: "medium",
      floors: 2,
      locks: 2,
      theme: "Kitchen",
      element: "wind",
      preview: null,
    });
  });

  it("turns into the generator's options: the theme trimmed, the rest as chosen", () => {
    const options = generateOptionsOf(generating({ theme: "  Yard ", size: "large", floors: 3, locks: 1, element: "fire" }));
    expect(options).toEqual({ theme: "Yard", size: "large", floors: 3, locks: 1, element: "fire" });
  });

  it("knows when the preview is stale: the key moves with every input and ignores the preview and stray spaces", () => {
    const base = generating();
    expect(generateKey(base)).toBe(generateKey({ ...base, preview: null }));
    expect(generateKey(base)).toBe(generateKey({ ...base, seed: " attic-417 ", theme: "Kitchen  " }));
    for (const change of [
      { seed: "attic-418" },
      { size: "small" as const },
      { floors: 3 as const },
      { locks: 0 as const },
      { theme: "Yard" },
      { element: "moon" },
    ]) {
      expect(generateKey({ ...base, ...change })).not.toBe(generateKey(base));
    }
  });

  it("rerolls to the next seed, and to the fallback when the seed is blank", () => {
    expect(rerolledSeed("attic-417", "yard-100")).toBe("attic-418");
    expect(rerolledSeed("  attic-417 ", "yard-100")).toBe("attic-418");
    expect(rerolledSeed("pantry", "yard-100")).toBe("pantry-2");
    expect(rerolledSeed("   ", "yard-100")).toBe("yard-100");
  });
});

describe("the preview verdict", () => {
  it("is open to save when the solver passes the temple", () => {
    expect(previewVerdict(true)).toEqual({ solvable: true, problem: "" });
  });

  it("says in one line that the heroes cannot reach the boss, and what to do", () => {
    const verdict = previewVerdict(false);
    expect(verdict.solvable).toBe(false);
    expect(verdict.problem).toMatch(/cannot reach the boss/i);
    expect(verdict.problem).toMatch(/seed/i);
  });

  it("says in one line that the seed grew nothing when the generator threw", () => {
    const verdict = previewFailure();
    expect(verdict.solvable).toBe(false);
    expect(verdict.problem).toMatch(/seed/i);
  });
});

describe("the save verb", () => {
  it("names the id the temple is saved under", () => {
    expect(saveVerb("gen-attic-417")).toBe("Save as gen-attic-417");
  });

  it("is plain Save while there is no id yet", () => {
    expect(saveVerb("")).toBe("Save");
  });
});

describe("what the size step adds up to", () => {
  it("says how wide, how many floors and how many locks, one line each", () => {
    expect(sizeLines(generating({ size: "small", floors: 1, locks: 1 }))).toEqual([
      "About 5 to 6 rooms across a floor",
      "1 floor",
      "1 locked door before the mini-boss",
    ]);
    expect(sizeLines(generating({ size: "large", floors: 3, locks: 3 }))).toEqual([
      "About 7 to 9 rooms across a floor",
      "3 floors, joined by stairs",
      "3 locked doors before the mini-boss",
    ]);
  });

  it("says plainly that no lock stands on the way", () => {
    expect(sizeLines(generating({ locks: 0 }))[2]).toBe("No locked doors on the way");
  });
});

describe("the choices", () => {
  it("offer small, medium and large with a hint each", () => {
    expect(SIZE_CHOICES.map((choice) => choice.id)).toEqual(["small", "medium", "large"]);
    for (const choice of SIZE_CHOICES) {
      expect(choice.label.length).toBeGreaterThan(2);
      expect(choice.hint.length).toBeGreaterThan(5);
    }
  });

  it("offer 1 to 3 floors, 0 to 3 locks and the nine elements", () => {
    expect(FLOOR_CHOICES).toEqual([1, 2, 3]);
    expect(LOCK_CHOICES).toEqual([0, 1, 2, 3]);
    expect(ELEMENT_CHOICES).toEqual(["wind", "earth", "water", "fire", "ice", "light", "shadow", "storm", "moon"]);
  });

  it("suggest rooms of the house first, then the worlds, each once", () => {
    const suggestions = themeSuggestions(["Plains", "Kitchen", "Moon"]);
    expect(suggestions.slice(0, 3)).toEqual(["Kitchen", "Yard", "Homework"]);
    expect(suggestions).toEqual(expect.arrayContaining(["Plains", "Moon"]));
    expect(new Set(suggestions).size).toBe(suggestions.length);
  });
});

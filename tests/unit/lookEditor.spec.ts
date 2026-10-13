import {
  DEFAULT_LOOK,
  FACE_STYLES,
  HAIR_STYLES,
  HAT_STYLES,
  OUTFIT_STYLES,
  SKIN_TONES,
} from "@/lib/hero-look/types";
import {
  EYE_COLORS,
  NATURAL_HAIR,
  TABS,
  handIcon,
  popHistory,
  pushHistory,
  randomLook,
  sameLook,
  stageLook,
  starterLineup,
  tabById,
  tileLook,
  withHands,
  withoutHands,
  type Rng,
} from "@/components/organisms/HeroModel/lookEditor";

/** The look editor's pure rules: tabs, tile looks, random heroes and the undo history. No Vue, no WebGL. */

const seeded = (seed: number): Rng => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

describe("lookEditor helpers", () => {
  it("handIcon reads the first item's icon and nothing else", () => {
    expect(handIcon([{ faIcon: "fa-sword" }, { faIcon: "fa-axe" }])).toBe("fa-sword");
    expect(handIcon([])).toBeUndefined();
    expect(handIcon([{ name: "no icon" }])).toBeUndefined();
    expect(handIcon("fa-sword")).toBeUndefined();
    expect(handIcon(undefined)).toBeUndefined();
  });

  it("withHands adds the hands and withoutHands takes them off again", () => {
    const held = withHands(DEFAULT_LOOK, { leftHand: [{ faIcon: "fa-shield" }] });
    expect(held.leftHand).toBe("fa-shield");
    expect(withoutHands(held)).toEqual(DEFAULT_LOOK);
    expect("leftHand" in withoutHands(held)).toBe(false);
  });
});

describe("the tabs", () => {
  it("gives every tab a focus and only Body has no styles", () => {
    expect(TABS.map((t) => [t.id, t.focus])).toEqual([
      ["body", "full"],
      ["hair", "bust"],
      ["face", "bust"],
      ["outfit", "full"],
      ["hat", "bust"],
    ]);
    expect(TABS.filter((t) => !t.styles).map((t) => t.id)).toEqual(["body"]);
    expect(tabById("outfit").colors.map((c) => c.label)).toEqual(["Main", "Trim"]);
  });

  it("draws hair tiles bare-headed and other tiles with the hat on", () => {
    const draft = { ...DEFAULT_LOOK, hat: "crown" as const };

    expect(tileLook(draft, tabById("hair"), "mohawk")).toMatchObject({ hair: "mohawk", hat: "none" });
    expect(tileLook(draft, tabById("face"), "wink")).toMatchObject({ face: "wink", hat: "crown" });
    expect(stageLook(draft, tabById("hair")).hat).toBe("none");
    expect(stageLook(draft, tabById("hat")).hat).toBe("crown");
    expect(draft.hat).toBe("crown"); // the draft itself is never changed
  });
});

describe("random heroes", () => {
  it("rolls valid looks that follow the taste rules", () => {
    const rng = seeded(7);
    const looks = Array.from({ length: 500 }, () => randomLook(rng));

    for (const l of looks) {
      expect(HAIR_STYLES).toContain(l.hair);
      expect(OUTFIT_STYLES).toContain(l.outfit);
      expect(HAT_STYLES).toContain(l.hat);
      expect(FACE_STYLES).toContain(l.face);
      expect(Object.keys(SKIN_TONES)).toContain(l.skin);
      expect(EYE_COLORS).toContain(l.eyeColor);
      expect(l.outfitAccent).not.toBe(l.outfitColor);
    }
    const bare = looks.filter((l) => l.hat === "none").length / 500;
    expect(bare).toBeGreaterThan(0.4);
    expect(bare).toBeLessThan(0.6);
    expect(looks.filter((l) => NATURAL_HAIR.includes(l.hairColor)).length / 500).toBeGreaterThan(0.65);
  });

  it("deals nine different starters", () => {
    const lineup = starterLineup(9, seeded(3));

    expect(lineup).toHaveLength(9);
    for (let i = 0; i < 9; i++) for (let j = i + 1; j < 9; j++) expect(sameLook(lineup[i], lineup[j])).toBe(false);
  });

  it("terminates with a random source that never changes", () => {
    expect(starterLineup(9, () => 0)).toHaveLength(9);
  });
});

describe("the undo history", () => {
  it("ignores repeats and stops at the cap", () => {
    const a = DEFAULT_LOOK;
    const b = { ...DEFAULT_LOOK, hair: "bob" as const };

    expect(pushHistory([a], { ...a, leftHand: "fa-sword" })).toEqual([a]);
    expect(pushHistory([a], b)).toEqual([a, b]);

    const full = Array.from({ length: 50 }, (_, i) => ({ ...a, hairColor: `#0000${String(i).padStart(2, "0")}` }));
    const next = pushHistory(full, b);
    expect(next).toHaveLength(50);
    expect(next[49]).toBe(b);
    expect(next[0]).toBe(full[1]);

    expect(popHistory([a, b])).toEqual({ history: [a], look: b });
    expect(popHistory([])).toEqual({ history: [], look: undefined });
  });
});

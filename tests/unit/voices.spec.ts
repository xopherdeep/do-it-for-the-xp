import { CATALOG, CATALOG_PARTS } from "@/lib/services/copy/catalog";
import {
  SIMPLE_MAX_WORDS,
  copyFor,
  copyFrom,
  formatCopy,
  hasCopy,
  lineFor,
  wordCount,
} from "@/lib/services/copy/copy";
import {
  TEXT_STYLE_CHOICES,
  autoReadsFor,
  autoVoiceFor,
  isVoice,
  voiceFor,
  voiceLabel,
} from "@/lib/services/copy/voices";
import type { CopyCatalog } from "@/lib/services/copy/voices";

/** A fixed "today" so the ages do not drift: 2026-10-13 */
const TODAY = new Date(2026, 9, 13);

/** A birthday that makes a hero exactly `age` on TODAY (their birthday is today) */
const bornAged = (age: number) => `${2026 - age}-10-13`;

describe("voiceFor: the voice a hero reads", () => {
  it.each([
    [6, "simple"],
    [8, "simple"],
    [9, "adventure"],
    [12, "adventure"],
    [13, "classic"],
    [19, "classic"],
  ])("a hero aged %i reads %s", (age, voice) => {
    expect(voiceFor({ birthday: bornAged(age) }, TODAY)).toBe(voice);
  });

  it("counts the birthday itself: the day before turning 9 is still 8", () => {
    expect(voiceFor({ birthday: "2017-10-14" }, TODAY)).toBe("simple");
    expect(voiceFor({ birthday: "2017-10-13" }, TODAY)).toBe("adventure");
    expect(voiceFor({ birthday: "2013-10-14" }, TODAY)).toBe("adventure");
    expect(voiceFor({ birthday: "2013-10-13" }, TODAY)).toBe("classic");
  });

  it("reads an adult as classic at any age", () => {
    expect(voiceFor({ isAdult: true, birthday: bornAged(6) }, TODAY)).toBe("classic");
    expect(voiceFor({ isAdult: true }, TODAY)).toBe("classic");
    expect(voiceFor({ isAdult: false, birthday: bornAged(6) }, TODAY)).toBe("simple");
  });

  it("lets the profile's pick win over the birthday and over isAdult", () => {
    expect(voiceFor({ birthday: bornAged(6), voice: "classic" }, TODAY)).toBe("classic");
    expect(voiceFor({ birthday: bornAged(19), voice: "simple" }, TODAY)).toBe("simple");
    expect(voiceFor({ isAdult: true, voice: "adventure" }, TODAY)).toBe("adventure");
  });

  it("ignores a pick that is not one of the three voices (Auto)", () => {
    expect(voiceFor({ birthday: bornAged(6), voice: "auto" }, TODAY)).toBe("simple");
    expect(voiceFor({ birthday: bornAged(6), voice: "" }, TODAY)).toBe("simple");
    expect(voiceFor({ birthday: bornAged(6), voice: undefined }, TODAY)).toBe("simple");
    expect(voiceFor({ birthday: bornAged(19), voice: "pirate" }, TODAY)).toBe("classic");
  });

  it("reads adventure when the birthday is unknown, unreadable or in the future", () => {
    expect(voiceFor({}, TODAY)).toBe("adventure");
    expect(voiceFor({ birthday: "" }, TODAY)).toBe("adventure");
    expect(voiceFor({ birthday: "not a date" }, TODAY)).toBe("adventure");
    expect(voiceFor({ birthday: "2030-01-01" }, TODAY)).toBe("adventure");
    expect(voiceFor(null, TODAY)).toBe("adventure");
    expect(voiceFor(undefined, TODAY)).toBe("adventure");
  });

  it("reads the age without the time zone shifting it", () => {
    // a bare date is a local day: born on TODAY's date 6 years ago is 6 whatever the offset
    expect(voiceFor({ birthday: "2020-10-13" }, new Date(2026, 9, 13, 0, 0, 1))).toBe("simple");
    expect(voiceFor({ birthday: "2020-10-13" }, new Date(2026, 9, 13, 23, 59, 59))).toBe("simple");
  });

  it("autoVoiceFor is the voice Auto gives, ignoring the pick", () => {
    expect(autoVoiceFor({ birthday: bornAged(6), voice: "classic" }, TODAY)).toBe("simple");
    expect(autoVoiceFor({ birthday: bornAged(12), voice: "simple" }, TODAY)).toBe("adventure");
    expect(autoVoiceFor(null, TODAY)).toBe("adventure");
  });

  it("knows the voices and their labels", () => {
    expect(["simple", "adventure", "classic"].every(isVoice)).toBe(true);
    expect(isVoice("auto")).toBe(false);
    expect(isVoice(undefined)).toBe(false);
    expect(voiceLabel("adventure")).toBe("Adventure");
    expect(TEXT_STYLE_CHOICES.map((choice) => choice.id)).toEqual(["auto", "simple", "adventure", "classic"]);
  });

  it("auto-reads only in the simple voice, until the hero turns it off", () => {
    expect(autoReadsFor("simple")).toBe(true);
    expect(autoReadsFor("simple", true)).toBe(true);
    expect(autoReadsFor("simple", false)).toBe(false);
    expect(autoReadsFor("adventure")).toBe(false);
    expect(autoReadsFor("classic", true)).toBe(false);
  });
});

describe("the copy catalogue", () => {
  const catalog: CopyCatalog = {
    "t.three": { simple: "Do it. Get {xp} XP!", adventure: "The {beast} rises. {xp} XP.", classic: "{beast}. {xp} XP." },
    "t.onlyAdventure": { adventure: "Only an adventure line." },
    "t.blankSimple": { simple: "   ", adventure: "Blank falls back." },
    "t.plain": { adventure: "No placeholders here." },
  };

  it("reads each voice's own wording", () => {
    const vars = { beast: "Lich", xp: 200 };
    expect(copyFrom(catalog, "t.three", "simple", vars)).toBe("Do it. Get 200 XP!");
    expect(copyFrom(catalog, "t.three", "adventure", vars)).toBe("The Lich rises. 200 XP.");
    expect(copyFrom(catalog, "t.three", "classic", vars)).toBe("Lich. 200 XP.");
  });

  it("falls back to adventure when a voice has no wording (or a blank one)", () => {
    expect(copyFrom(catalog, "t.onlyAdventure", "simple")).toBe("Only an adventure line.");
    expect(copyFrom(catalog, "t.onlyAdventure", "classic")).toBe("Only an adventure line.");
    expect(copyFrom(catalog, "t.blankSimple", "simple")).toBe("Blank falls back.");
    expect(lineFor({ adventure: "A", classic: "C" }, "simple")).toBe("A");
  });

  it("returns the key itself for a line the catalogue lacks (and never an inherited property)", () => {
    expect(copyFrom(catalog, "t.missing", "simple")).toBe("t.missing");
    expect(copyFrom(catalog, "toString", "simple")).toBe("toString");
    expect(hasCopy("t.missing")).toBe(false);
  });

  it("fills placeholders: numbers as digits, repeats, and leaves an unfilled one as written", () => {
    expect(formatCopy("{a} + {a} = {b}", { a: 1, b: 2 })).toBe("1 + 1 = 2");
    expect(formatCopy("Get {xp} XP", { xp: 1200 })).toBe("Get 1200 XP");
    expect(formatCopy("Hi {name}!", {})).toBe("Hi {name}!");
    expect(formatCopy("Hi {name}!", { name: undefined })).toBe("Hi {name}!");
    expect(formatCopy("Hi {name}!", { name: null })).toBe("Hi {name}!");
    expect(formatCopy("{n} left", { n: 0 })).toBe("0 left");
    expect(formatCopy("No holes.")).toBe("No holes.");
  });

  it("serves the game's catalogue through copyFor, with the demo line in each voice", () => {
    const vars = { beast: "Laundry Lich", xp: 200 };
    expect(copyFor("demo.questDone", "simple", vars)).toBe("You did it! Get 200 XP!");
    expect(copyFor("demo.questDone", "adventure", vars)).toBe("The Laundry Lich falls! 200 XP is yours, and it earned every point.");
    expect(copyFor("demo.questDone", "classic", vars)).toBe("Laundry Lich defeated. 200 XP.");
    expect(copyFor("demo.hello", "simple", { name: "Ava" })).toBe("Welcome back, Ava. The quests missed you.");
    expect(hasCopy("demo.questDone")).toBe(true);
  });

  it("counts words: placeholders count as one, markup and bare marks do not", () => {
    expect(wordCount("Clean your room. Get 200 XP!")).toBe(6);
    expect(wordCount("You did it! Get {xp} XP!")).toBe(6);
    expect(wordCount("<b>Go</b> now - fast")).toBe(3);
    expect(wordCount("  ")).toBe(0);
  });

  it("holds every simple line to the short-line rule", () => {
    const tooLong = Object.entries(CATALOG as CopyCatalog)
      .filter(([, entry]) => entry.simple !== undefined && wordCount(entry.simple) > SIMPLE_MAX_WORDS)
      .map(([key, entry]) => `${key}: ${wordCount(entry.simple as string)} words`);
    expect(tooLong).toEqual([]);
    expect(SIMPLE_MAX_WORDS).toBe(10);
  });

  it("writes every line's adventure wording, and no key twice", () => {
    const entries = Object.entries(CATALOG as CopyCatalog);
    expect(entries.filter(([, entry]) => !entry.adventure || !entry.adventure.trim())).toEqual([]);
    const written = CATALOG_PARTS.reduce((total, part) => total + Object.keys(part).length, 0);
    expect(entries.length).toBe(written);
  });
});

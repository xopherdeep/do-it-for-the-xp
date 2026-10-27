import fs from "fs";
import path from "path";

/**
 * Hex colour ratchet. The battle screens moved their colours onto the --gs-* theme tokens
 * (docs/superpowers/specs/2026-10-22-battle-theme-tokens-design.md, section 10); the rest of the app is swept area by area.
 * Until that is done the count of hex colour literals in src/app and src/components may only go down:
 * tests/unit/hexLiteralBaseline.json records the total and the count per file.
 *
 * Counted: `#` + exactly 3, 4, 6 or 8 hex digits, inside the <style> blocks of a .vue file and anywhere in a .scss file,
 * comments skipped. Gameplay colours (element tints, rarity colours) count too; nothing is allow-listed yet.
 */

const ROOT = path.join(__dirname, "../..");
const SCAN_DIRS = ["src/app", "src/components"];
const BASELINE_FILE = path.join(__dirname, "hexLiteralBaseline.json");
const TOKENS = "window, frame, text, text-dim, accent, divider, select, good, danger, button, button-edge";

type Counts = Record<string, number>;
type Baseline = { total: number; files: Counts };
type Change = { file: string; was: number; now: number };

// Not part of a longer word, a `-name` id selector or an `&#9733;` entity
const HEX_COLOUR = /(?<![\w&])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![\w-])/g;
// A block comment or a `//` line comment (the one after `http:` is part of a URL)
const COMMENT = /\/\*[\s\S]*?\*\/|(?<!:)\/\/[^\n]*/g;
const STYLE_BLOCK = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;

/** The number of hex colour literals in the styles of one file; a .vue file counts only its <style> blocks. */
const countHexLiterals = (source: string, isVue: boolean): number => {
  const css = isVue ? [...source.matchAll(STYLE_BLOCK)].map((block) => block[1]).join("\n") : source;
  return (css.replace(COMMENT, "").match(HEX_COLOUR) ?? []).length;
};

/** Sets the current counts against the baseline: what grew, what shrank, and whether the ratchet is broken. */
const compareToBaseline = (counts: Counts, baseline: Baseline) => {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const was = (file: string) => baseline.files[file] ?? 0;
  const grew: Change[] = Object.keys(counts)
    .filter((file) => counts[file] > was(file))
    .map((file) => ({ file, was: was(file), now: counts[file] }));
  const shrank: Change[] = Object.keys(baseline.files)
    .filter((file) => (counts[file] ?? 0) < was(file))
    .map((file) => ({ file, was: was(file), now: counts[file] ?? 0 }));
  const newFiles = grew.filter((change) => !(change.file in baseline.files));
  return { total, grew, shrank, newFiles, broken: total > baseline.total || newFiles.length > 0 };
};

const describeChanges = (changes: Change[]): string =>
  [...changes]
    .sort((a, b) => b.now - b.was - (a.now - a.was))
    .map((change) => `  ${change.file}: ${change.was} -> ${change.now}`)
    .join("\n");

const growthMessage = (verdict: ReturnType<typeof compareToBaseline>, baseline: Baseline): string =>
  [
    `Hex colour literals went up: ${baseline.total} -> ${verdict.total} (baseline in tests/unit/hexLiteralBaseline.json).`,
    verdict.newFiles.length ? `Files that were clean and now carry hex colours:\n${describeChanges(verdict.newFiles)}` : "",
    verdict.grew.length ? `Files that grew:\n${describeChanges(verdict.grew)}` : "",
    `Use the --gs-* theme tokens instead of a hex colour: var(--gs-<name>) with name one of ${TOKENS}.`,
  ]
    .filter(Boolean)
    .join("\n");

const shrinkMessage = (verdict: ReturnType<typeof compareToBaseline>, baseline: Baseline): string =>
  [
    `Hex colour literals went down: ${baseline.total} -> ${verdict.total}. Lower tests/unit/hexLiteralBaseline.json so it stays down:`,
    `  "total": ${verdict.total}`,
    describeChanges(verdict.shrank),
  ].join("\n");

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(vue|scss)$/.test(entry.name) ? [full] : [];
  });

const countTree = (): Counts => {
  const counts: Counts = {};
  for (const dir of SCAN_DIRS) {
    for (const file of sourceFiles(path.join(ROOT, dir))) {
      const n = countHexLiterals(fs.readFileSync(file, "utf8"), file.endsWith(".vue"));
      if (n > 0) counts[path.relative(ROOT, file).split(path.sep).join("/")] = n;
    }
  }
  return counts;
};

describe("countHexLiterals", () => {
  it("counts 3, 4, 6 and 8 digit colours in a stylesheet", () => {
    const scss = ".a { color: #fff; background: #FFFA; border-color: #1a2b3c; box-shadow: 0 0 2px #11223344; }";
    expect(countHexLiterals(scss, false)).toBe(4);
  });

  it("counts every colour in a value list and in a gradient", () => {
    expect(countHexLiterals("background: linear-gradient(#000, #123456), #abc;", false)).toBe(3);
  });

  it("skips lengths that are not colours and things that only look like hex", () => {
    const scss = "#app { a: #12; b: #12345; c: #1234567; d: #123456789; e: #ghost; f: #zzz; }";
    expect(countHexLiterals(scss, false)).toBe(0);
  });

  it("skips id selectors with a hyphen, interpolation and html entities", () => {
    const scss = '#add-btn, .a #face-card { content: "&#9733;"; width: #{$w}; a#fade { top: 0 } }';
    expect(countHexLiterals(scss, false)).toBe(0);
  });

  it("skips line comments and block comments, however many lines they span", () => {
    const scss = "// old: #fff\n.a { /* was #000 */ top: 0; }\n/* multi\n line #123456 */\n.b { left: 0; } // #abc";
    expect(countHexLiterals(scss, false)).toBe(0);
  });

  it("does not take the // of a URL for a comment", () => {
    expect(countHexLiterals('.a { background: url("https://x.test/a.png"); color: #fff; }', false)).toBe(1);
  });

  it("counts a colour on the line after a comment and one before it", () => {
    expect(countHexLiterals("a: #111; // note\nb: #222;", false)).toBe(2);
  });

  it("counts only the <style> blocks of a .vue file, all of them", () => {
    const vue = [
      '<template><div style="color: #fff" :style="{ color: \'#000\' }">#abc</div></template>',
      '<script setup lang="ts">const tint = "#123456";</script>',
      "<style scoped>.a { color: #fff; }</style>",
      '<style lang="scss">.b { color: #000; /* #111 */ }</style>',
    ].join("\n");
    expect(countHexLiterals(vue, true)).toBe(2);
  });

  it("counts a .vue file without styles, or with an external stylesheet, as clean", () => {
    expect(countHexLiterals("<template><i>#fff</i></template>", true)).toBe(0);
    expect(countHexLiterals('<style lang="scss" src="./_Page.scss"></style>', true)).toBe(0);
  });
});

describe("compareToBaseline", () => {
  const baseline: Baseline = { total: 10, files: { "src/a.scss": 6, "src/b.vue": 4 } };

  it("passes when nothing changed", () => {
    const verdict = compareToBaseline({ "src/a.scss": 6, "src/b.vue": 4 }, baseline);
    expect(verdict.broken).toBe(false);
    expect(verdict.grew).toEqual([]);
    expect(verdict.shrank).toEqual([]);
  });

  it("passes and reports a shrink, including a file that is gone", () => {
    const verdict = compareToBaseline({ "src/a.scss": 5 }, baseline);
    expect(verdict.broken).toBe(false);
    expect(verdict.total).toBe(5);
    expect(verdict.shrank).toEqual([
      { file: "src/a.scss", was: 6, now: 5 },
      { file: "src/b.vue", was: 4, now: 0 },
    ]);
  });

  it("fails when the total grows, and names the file", () => {
    const verdict = compareToBaseline({ "src/a.scss": 7, "src/b.vue": 4 }, baseline);
    expect(verdict.broken).toBe(true);
    expect(verdict.grew).toEqual([{ file: "src/a.scss", was: 6, now: 7 }]);
    expect(growthMessage(verdict, baseline)).toContain("src/a.scss: 6 -> 7");
    expect(growthMessage(verdict, baseline)).toContain("--gs-*");
  });

  it("fails when a clean file gains a hex colour even though the total went down", () => {
    const verdict = compareToBaseline({ "src/a.scss": 2, "src/b.vue": 4, "src/new.vue": 1 }, baseline);
    expect(verdict.total).toBe(7);
    expect(verdict.broken).toBe(true);
    expect(verdict.newFiles).toEqual([{ file: "src/new.vue", was: 0, now: 1 }]);
  });

  it("lets one file take a colour another gave up while the total holds", () => {
    expect(compareToBaseline({ "src/a.scss": 7, "src/b.vue": 3 }, baseline).broken).toBe(false);
  });
});

describe("the hex colour ratchet", () => {
  it("never lets src/app and src/components carry more hex colour literals than the baseline", () => {
    const baseline: Baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8"));
    const verdict = compareToBaseline(countTree(), baseline);
    if (verdict.broken) throw new Error(growthMessage(verdict, baseline));
    if (verdict.total < baseline.total || verdict.shrank.length) process.stdout.write(`\n${shrinkMessage(verdict, baseline)}\n`);
  });
});

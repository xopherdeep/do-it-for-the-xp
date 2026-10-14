/**
 * A generated temple in the shape the Temple Creator stores (`TempleInterface` in TempleDb), so
 * `registerCustomTemples` loads it and TempleGrounds opens it at `/temple/gen-<seed-slug>/<userId>`.
 */
import type { TempleInterface } from "@/lib/databases/TempleDb";
import type { GeneratedTemple } from "./templeGenerator";

/** "Sunday Chores 42" → "sunday-chores-42" */
export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "temple";

/** The id a generated temple is saved under: the seed, slugged, behind "gen-". */
export const generatedTempleId = (seed: number | string): string => `gen-${slugify(String(seed))}`;

/** Does this stored temple come from the generator? */
export const isGeneratedTempleId = (id: string): boolean => id.startsWith("gen-");

const WORDS = ["kitchen", "yard", "attic", "cellar", "garden", "laundry", "pantry", "garage", "hallway", "study", "porch", "tower"];

/** A readable seed for the creator's form: a word and a number, e.g. "attic-417". */
export const randomSeed = (random: () => number = Math.random): string =>
  `${WORDS[Math.floor(random() * WORDS.length)]}-${100 + Math.floor(random() * 900)}`;

/** The seed after this one, for the Reroll button: the trailing number plus one, or "-2" appended. */
export const nextSeed = (seed: string): string => {
  const match = /^(.*?)(\d+)$/.exec(seed);
  return match ? `${match[1]}${Number(match[2]) + 1}` : `${seed}-2`;
};

/** The stored record: the layout under `dungeonLayout`, the generator's provenance beside it. */
export const toTempleRecord = (temple: GeneratedTemple): TempleInterface => ({
  id: generatedTempleId(temple.seed),
  name: temple.name,
  customName: temple.name,
  categoryIds: [],
  level: 1,
  seed: temple.seed,
  themeId: temple.themeId,
  element: temple.element,
  generated: true,
  dungeonLayout: {
    entrance: [...temple.entrance],
    maze: JSON.parse(JSON.stringify(temple.maze)),
    rooms: JSON.parse(JSON.stringify(temple.rooms)),
  },
});

/** The first free id for a copy of a generated temple: `base` as it is when free, else `base-2`, `base-3` ... */
export const uniqueGeneratedTempleId = (existingIds: Iterable<string>, base: string): string => {
  const taken = new Set(existingIds);
  if (!taken.has(base)) return base;
  let copyNumber = 2;
  while (taken.has(`${base}-${copyNumber}`)) copyNumber++;
  return `${base}-${copyNumber}`;
};

/** What the Game Master answers when the id of a generated temple already holds a temple */
export type TakenIdAnswer = "replace" | "copy" | "cancel";

/**
 * What to write for a freshly generated `record`, or null for nothing. The id is the seed's slug and ignores the
 * options, so saving a seed again can land on a temple the Game Master has since edited in the Temple Creator: that
 * one is never written over without `ask` saying so. A free id, or one that already holds exactly this generation
 * (a second press of Save), needs no answer. "copy" saves under the first free `gen-<seed>-2`, `-3` ...
 */
export const recordToSave = async (
  record: TempleInterface,
  store: { getTempleById(id: string): Promise<TempleInterface | null>; keys(): Promise<string[]> },
  ask: (takenId: string) => Promise<TakenIdAnswer>
): Promise<TempleInterface | null> => {
  const stored = await store.getTempleById(record.id);
  const isFreeOrUnchanged = !stored || JSON.stringify(stored) === JSON.stringify(record);
  if (isFreeOrUnchanged) return record;

  const answer = await ask(record.id);
  if (answer === "replace") return record;
  if (answer === "copy") return { ...record, id: uniqueGeneratedTempleId(await store.keys(), record.id) };
  return null;
};

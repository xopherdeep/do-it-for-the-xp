/**
 * The beast library as suggestions: which library beasts fit a quest a Game Master is writing, and how one
 * of them becomes a beast in the family's bestiary. Pure: the screens call these and store the result.
 */
import type { Beast } from "@/lib/databases/BestiaryDb";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import type { LibraryBeast } from "@/lib/services/core/beastLibrary";

const STOPWORDS = new Set([
  "the", "a", "an", "your", "my", "our", "up", "out", "of", "in", "on", "to", "and", "for", "with", "from", "into",
  "off", "by", "it", "its", "do", "be", "at", "or", "all", "every", "some", "them", "this", "that", "put", "get",
]);

/** Words a Game Master is likely to write that the library phrases differently */
const SYNONYMS: Record<string, string[]> = {
  dishwasher: ["dish"], dishes: ["dish"], trash: ["garbage", "bin"], garbage: ["trash"], bin: ["trash"], bins: ["trash"],
  rubbish: ["trash", "garbage"], teeth: ["tooth"], tooth: ["teeth"], dog: ["pet", "walk"], cat: ["pet", "litter"], pet: ["dog", "cat"],
  lawn: ["grass", "mow"], mow: ["lawn"], grass: ["lawn"], clothes: ["laundry", "hamper", "hang"], laundry: ["clothes", "wash"],
  tidy: ["clean", "pick"], clean: ["tidy", "wipe", "scrub"], hoover: ["vacuum"], vacuum: ["floor"], garden: ["plants", "weeds"],
  pajamas: ["dressed"], pyjamas: ["dressed"], bedtime: ["bed", "sleep"], sleep: ["bed"], wake: ["alarm"], poop: ["scoop"],
  recycling: ["boxes", "recycle"], towels: ["towel"], toys: ["toy"], books: ["book", "bookshelf"], shoes: ["shoe"],
  socks: ["sock"], snow: ["shovel"], leaves: ["rake", "leaf"], phone: ["screen", "device"], tablet: ["screen", "device"],
};

/** A word longer than `longerThan` letters that ends in `suffix`, so short words keep their last letters ("bus", "red") */
const hasSuffix = (word: string, suffix: string, longerThan: number): boolean =>
  word.length > longerThan && word.endsWith(suffix);

const stem = (word: string): string => {
  if (hasSuffix(word, "ing", 5)) return word.slice(0, -3);
  if (hasSuffix(word, "ies", 4)) return `${word.slice(0, -3)}y`;
  if (hasSuffix(word, "es", 4)) return word.slice(0, -2);
  if (hasSuffix(word, "ed", 3)) return word.slice(0, -2);
  if (hasSuffix(word, "s", 3)) return word.slice(0, -1);
  return word;
};

/** The meaningful words of a phrase, lowercased, stemmed, without stopwords */
export const keywords = (text: string): string[] => {
  const words = text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/[\s-]+/).filter((w) => w && !STOPWORDS.has(w));
  return Array.from(new Set(words.map(stem)));
};

const expand = (words: string[]): string[] =>
  Array.from(new Set(words.flatMap((w) => [w, ...(SYNONYMS[w] ?? []).map(stem)])));

const WEIGHTS = { chore: 3, name: 2, checklist: 1 } as const;

/** How well a library beast fits a phrase: chore words count most, its name next, its task list a little */
export const matchScore = (beast: LibraryBeast, text: string): number => {
  const wanted = expand(keywords(text));
  if (!wanted.length) return 0;
  const fields = { chore: keywords(beast.chore), name: keywords(beast.name), checklist: keywords(beast.checklist.join(" ")) };
  return wanted.reduce((score, word) => {
    if (fields.chore.includes(word)) return score + WEIGHTS.chore;
    if (fields.name.includes(word)) return score + WEIGHTS.name;
    if (fields.checklist.includes(word)) return score + WEIGHTS.checklist;
    return score;
  }, 0);
};

export interface LibraryFilter {
  text?: string;
  room?: string;
  age?: LibraryBeast["age"];
  /** Beast ids already in the family's bestiary, left out of the results */
  exclude?: Iterable<string>;
}

/** The library beasts that fit a quest name (or any phrase), best first; nothing when nothing fits */
export const suggestBeasts = (text: string, limit = 6, filter: Omit<LibraryFilter, "text"> = {}): LibraryBeast[] => {
  const skip = new Set(filter.exclude ?? []);
  return BEAST_LIBRARY
    .filter((b) => !skip.has(String(b.id)) && (!filter.room || b.room === filter.room) && (!filter.age || b.age === filter.age))
    .map((beast, order) => ({ beast, order, score: matchScore(beast, text) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map((m) => m.beast);
};

/** The library to browse: a text search over name, chore and task list, narrowed by room and age band */
export const browseLibrary = (filter: LibraryFilter = {}): LibraryBeast[] => {
  const skip = new Set(filter.exclude ?? []);
  const needle = filter.text?.trim().toLowerCase() ?? "";
  return BEAST_LIBRARY.filter((b) =>
    !skip.has(String(b.id)) &&
    (!filter.room || b.room === filter.room) &&
    (!filter.age || b.age === filter.age) &&
    (!needle || [b.name, b.chore, ...b.checklist].some((s) => s.toLowerCase().includes(needle))));
};

/** Every room the library covers, in library order */
export const libraryRooms = (): string[] => Array.from(new Set(BEAST_LIBRARY.map((b) => b.room)));

/**
 * A library beast as the family's own: the same id every time, so adopting it twice updates rather than
 * duplicates, and only the fields the bestiary stores.
 */
export const adoptLibraryBeast = (beast: LibraryBeast): Beast => ({
  id: beast.id,
  name: beast.name,
  element: beast.element,
  avatar: beast.avatar,
  ...(beast.variantAvatar ? { variantAvatar: beast.variantAvatar } : {}),
  bg1: beast.bg1,
  bg2: beast.bg2,
  aspectRatio: beast.aspectRatio,
  checklist: [...beast.checklist],
});

/**
 * The beast library as suggestions: which library beasts fit a quest a Game Master is writing, and how one
 * of them becomes a beast in the family's bestiary. Pure: the screens call these and store the result.
 *
 * The library is the hundred chore beasts plus the classic beasts (the family's original monster art). Classic
 * beasts have no chore, room or age band, so they show up when browsing, searching by name and adopting, and in
 * suggestions only by a name the family has given them.
 */
import type { Beast } from "@/lib/databases/BestiaryDb";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import type { LibraryBeast } from "@/lib/services/core/beastLibrary";
import { CLASSIC_BEASTS } from "@/lib/services/core/classicBeasts";
import type { ClassicBeast } from "@/lib/services/core/classicBeasts";
import type { TempleTheme } from "@/lib/services/temples/templeThemes";

/** Anything the family can pick from the library: a chore beast or a classic one */
export type LibraryEntry = LibraryBeast | ClassicBeast;

const LIBRARY_ENTRIES: readonly LibraryEntry[] = [...BEAST_LIBRARY, ...CLASSIC_BEASTS];

export const isClassicBeast = (beast: LibraryEntry): beast is ClassicBeast => "classic" in beast;

/** "Classic Beast 012": a name waiting to be replaced says nothing about the beast, so it is not matched */
const PLACEHOLDER_NAME = /^Classic Beast \d+$/;

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
  lego: ["toy", "block", "brick"], legos: ["toy", "block", "brick"],
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

/** What a phrase is matched against: a chore beast by chore, name and task list; a classic one only by a real name */
const matchFields = (beast: LibraryEntry): Record<keyof typeof WEIGHTS, string[]> =>
  isClassicBeast(beast)
    ? { chore: [], name: PLACEHOLDER_NAME.test(beast.name) ? [] : keywords(beast.name), checklist: [] }
    : { chore: keywords(beast.chore), name: keywords(beast.name), checklist: keywords(beast.checklist.join(" ")) };

/** How well a library beast fits a phrase: chore words count most, its name next, its task list a little */
export const matchScore = (beast: LibraryEntry, text: string): number => {
  const wanted = expand(keywords(text));
  const hasNoWords = !wanted.length;
  if (hasNoWords) return 0;
  const fields = matchFields(beast);
  return wanted.reduce((score, word) => {
    const isChoreWord = fields.chore.includes(word);
    if (isChoreWord) return score + WEIGHTS.chore;
    const isNameWord = fields.name.includes(word);
    if (isNameWord) return score + WEIGHTS.name;
    const isChecklistWord = fields.checklist.includes(word);
    if (isChecklistWord) return score + WEIGHTS.checklist;
    return score;
  }, 0);
};

export interface LibraryFilter {
  text?: string;
  room?: string;
  age?: LibraryBeast["age"];
  /** Only the chore beasts of this temple theme (kitchen is "shadow"); the classic beasts have no theme */
  theme?: TempleTheme;
  /** True: only the classic beasts. False: only the chore beasts. Left out: both */
  classic?: boolean;
  /** Beast ids already in the family's bestiary, left out of the results */
  exclude?: Iterable<string>;
}

/** The room, age and theme filters only fit chore beasts, so asking for any of them leaves the classic beasts out */
const fitsFilter = (beast: LibraryEntry, filter: LibraryFilter, skip: ReadonlySet<string>): boolean =>
  !skip.has(String(beast.id)) &&
  (!filter.room || beast.room === filter.room) &&
  (!filter.age || beast.age === filter.age) &&
  (!filter.theme || (!isClassicBeast(beast) && beast.theme === filter.theme)) &&
  (filter.classic === undefined || isClassicBeast(beast) === filter.classic);

/** The library beasts that fit a quest name (or any phrase), best first; nothing when nothing fits */
export const suggestBeasts = (text: string, limit = 6, filter: Omit<LibraryFilter, "text"> = {}): LibraryEntry[] => {
  const skip = new Set(filter.exclude ?? []);
  return LIBRARY_ENTRIES
    .filter((b) => fitsFilter(b, filter, skip))
    .map((beast, order) => ({ beast, order, score: matchScore(beast, text) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map((m) => m.beast);
};

/** What a text search reads: a classic beast's task list is the same filler for all of them, so only its name counts */
const searchableText = (beast: LibraryEntry): string[] =>
  isClassicBeast(beast) ? [beast.name] : [beast.name, beast.chore, ...beast.checklist];

/** The library to browse: a text search over name, chore and task list, narrowed by room, age band, theme and kind */
export const browseLibrary = (filter: LibraryFilter = {}): LibraryEntry[] => {
  const skip = new Set(filter.exclude ?? []);
  const needle = filter.text?.trim().toLowerCase() ?? "";
  return LIBRARY_ENTRIES.filter((b) =>
    fitsFilter(b, filter, skip) &&
    (!needle || searchableText(b).some((s) => s.toLowerCase().includes(needle))));
};

/** Every room the library covers, in library order */
export const libraryRooms = (): string[] => Array.from(new Set(BEAST_LIBRARY.map((b) => b.room)));

/**
 * A library beast as the family's own: the same id every time, so adopting it twice updates rather than
 * duplicates, and only the fields the bestiary stores.
 */
export const adoptLibraryBeast = (beast: LibraryEntry): Beast => ({
  id: beast.id,
  name: beast.name,
  ...(beast.element ? { element: beast.element } : {}),
  ...(beast.theme ? { theme: beast.theme } : {}),
  avatar: beast.avatar,
  ...(beast.variantAvatar ? { variantAvatar: beast.variantAvatar } : {}),
  bg1: beast.bg1,
  bg2: beast.bg2,
  aspectRatio: beast.aspectRatio,
  checklist: [...beast.checklist],
});

const LIBRARY_BY_ID: ReadonlyMap<string, LibraryEntry> = new Map(LIBRARY_ENTRIES.map((b) => [String(b.id), b]));

/**
 * The temple theme of a beast in the family's bestiary: its own `theme`, or else the library's for the same id.
 * A beast adopted before themes existed has none stored, and the starter world seeds plain beasts, so this is how
 * the temple editor tells the theme of any library beast the family owns. A custom beast has none.
 */
export const beastTheme = (beast: Pick<Beast, "id" | "theme">): TempleTheme | undefined =>
  beast.theme ?? LIBRARY_BY_ID.get(String(beast.id))?.theme;

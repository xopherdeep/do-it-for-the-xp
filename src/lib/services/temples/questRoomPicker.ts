/**
 * The quest picker of the temple room editor as pure rules (docs/Quest-Rooms-Spec.md section 9): the rows the
 * full-screen picker shows for the family's quests, what its three segments and the search keep, which library
 * beasts "From the library" offers, the quest it creates from one of them, and the temple size meter that previews
 * the pick. No storage, no Vue: the screen loads the quests and calls these.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { Room, RoomQuestTemplate } from "@/lib/engine/core/dungeons/types";
import { dueTimeOn } from "@/lib/engine/quests/QuestSchedule";
import {
  adoptLibraryBeast,
  beastTheme,
  browseLibrary,
  isClassicBeast,
  type LibraryEntry,
} from "@/lib/services/bestiary/librarySuggest";
import type { LibraryBeast } from "@/lib/services/core/beastLibrary";
import { DIFFICULTY_NAMES, TIER_NAMES, assigneeLabel, scheduleLabel } from "@/lib/services/quests/QuestLabels";
import type { FamilyMember } from "@/lib/services/quests/QuestList";
import {
  TEMPLE_FULL_SIZE,
  headlineQuest,
  questBeastId,
  questTier,
  templeSize,
  type QuestTier,
  type SizedRoom,
} from "@/lib/services/temples/questRooms";
import type { TempleTheme } from "@/lib/services/temples/templeThemes";

// ---------------------------------------------------------------------------------------------------------------------
// The beasts the picker can show
// ---------------------------------------------------------------------------------------------------------------------

let libraryById: Map<string, LibraryEntry> | null = null;

/** A library beast (chore or classic) by id; the library never changes while the app runs. */
const libraryEntryOf = (id: string): LibraryEntry | undefined => {
  libraryById ??= new Map(browseLibrary().map((entry) => [String(entry.id), entry]));
  return libraryById.get(id);
};

// ---------------------------------------------------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------------------------------------------------

/** One quest as the picker (and the room's quest card) shows it. */
export interface PickerRow {
  id: string;
  quest: Achievement;
  name: string;
  /** The quest's beast: its own, else the library's suggestion for its name; none when the Game Master chose none */
  beastId?: string;
  beastName: string;
  /** The portrait number (NNN.webp), when the beast has one */
  avatar?: number;
  /** The temple theme of the quest's beast (templeThemes); none for a custom beast */
  theme?: TempleTheme;
  difficulty: number;
  /** "Moderate"; empty when the difficulty is not a step of the slider */
  difficultyName: string;
  tier: QuestTier;
  /** "Monster", "Miniboss" or "Boss" */
  tierName: string;
  /** scheduleLabel: "Daily", "Weekly on Mon, Wed" */
  schedule: string;
  /** assigneeLabel: "Mia, Sam", "Anyone" */
  heroes: string;
  requiresApproval: boolean;
  /** The quest has no due time, so it ambushes at any random encounter (5.9) */
  isAnytime: boolean;
}

/** A quest has a due time when the time picker holds a readable clock time (the rule the deadline reads). */
const hasDueTime = (quest: Pick<Achievement, "dueByTime">): boolean => dueTimeOn(quest.dueByTime, new Date(0)) !== null;

/** The row for one quest. `beasts` is the family's bestiary; a beast it lacks is read from the library. */
export function pickerRowOf(quest: Achievement, beasts: readonly Beast[], users: readonly FamilyMember[]): PickerRow {
  const beastId = questBeastId(quest);
  const owned = beastId ? beasts.find((beast) => String(beast.id) === beastId) : undefined;
  const shown = owned ?? (beastId ? libraryEntryOf(beastId) : undefined);
  const difficulty = Number(quest.difficulty) || 0;
  const tier = questTier(difficulty);
  return {
    id: String(quest.id),
    quest,
    name: quest.achievementName,
    beastId,
    beastName: shown?.name ?? "No beast",
    avatar: shown?.avatar || undefined,
    theme: beastId ? beastTheme({ id: beastId, theme: owned?.theme }) : undefined,
    difficulty,
    difficultyName: DIFFICULTY_NAMES[difficulty] ?? "",
    tier,
    tierName: TIER_NAMES[tier],
    schedule: scheduleLabel(quest),
    heroes: assigneeLabel(quest, [...users]),
    requiresApproval: Boolean(quest.requiresApproval),
    isAnytime: !hasDueTime(quest),
  };
}

/** Every live quest as a picker row, by name. A draft is left out: it cannot hold a room. */
export function buildPickerRows(
  quests: readonly Achievement[],
  beasts: readonly Beast[],
  users: readonly FamilyMember[]
): PickerRow[] {
  return quests
    .filter((quest) => !quest.draft)
    .map((quest) => pickerRowOf(quest, beasts, users))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------------------------------------------------

/** What one card of the picker (and the room's quest card) says: a quest row, or a library beast to make one from. */
export interface QuestCard {
  key: string;
  name: string;
  /** The portrait number (NNN.webp) */
  avatar?: number;
  portraitAlt: string;
  /** The tier chip; a library beast has none until its quest has a difficulty */
  tier?: QuestTier;
  tierName?: string;
  /** "Challenging 8 · Dish Goblin" */
  facts: string;
  /** "Daily · Mia, Sam" */
  when: string;
  approval: boolean;
  /** "no due time: ambushes any time" */
  note?: string;
}

/** What a quest room says when no quest fills its shipped template: "Dormant: Dust Dervish, no quest yet". */
export function dormantLine(template: Pick<RoomQuestTemplate, "beastId">, beasts: readonly Beast[]): string {
  const id = String(template.beastId);
  const name = beasts.find((beast) => String(beast.id) === id)?.name ?? libraryEntryOf(id)?.name ?? "a beast";
  return `Dormant: ${name}, no quest yet`;
}

/** The note on a quest that has no due time (5.9). */
export const ANYTIME_AMBUSH_NOTE = "no due time: ambushes any time";
/** Backwards compatible alias */
export const NEVER_AMBUSHES_NOTE = ANYTIME_AMBUSH_NOTE;

/** "Challenging 8" for a step of the slider, "8" for a value between the steps, "" when unset. */
const difficultyText = (row: Pick<PickerRow, "difficulty" | "difficultyName">): string => {
  const number = row.difficulty > 0 ? String(row.difficulty) : "";
  return [row.difficultyName, number].filter(Boolean).join(" ");
};

/** The card for a quest: portrait, name, tier, difficulty, schedule, heroes, approval, and the ambush note. */
export function questCardOf(row: PickerRow): QuestCard {
  return {
    key: row.id,
    name: row.name,
    avatar: row.avatar,
    portraitAlt: row.beastName,
    tier: row.tier,
    tierName: row.tierName,
    facts: [difficultyText(row), row.beastName].filter(Boolean).join(" · "),
    when: [row.schedule, row.heroes].filter(Boolean).join(" · "),
    approval: row.requiresApproval,
    note: row.isAnytime ? ANYTIME_AMBUSH_NOTE : undefined,
  };
}

const AGE_NAMES: Record<LibraryBeast["age"], string> = { little: "Little heroes", kid: "Kids", teen: "Teens" };

const titleCase = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** The card for a library beast: its chore is the quest's name, and the beast says where the chore lives and for whom. */
export function libraryCardOf(beast: LibraryBeast): QuestCard {
  return {
    key: String(beast.id),
    name: beast.chore,
    avatar: beast.avatar,
    portraitAlt: beast.name,
    facts: beast.name,
    when: [titleCase(beast.room), AGE_NAMES[beast.age]].filter(Boolean).join(" · "),
    approval: false,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Segments and search
// ---------------------------------------------------------------------------------------------------------------------

export type PickerSegment = "theme" | "all" | "library";

export const PICKER_SEGMENTS: ReadonlyArray<{ id: PickerSegment; label: string }> = [
  { id: "theme", label: "This temple's theme" },
  { id: "all", label: "All quests" },
  { id: "library", label: "From the library" },
];

/** The segments a temple offers: the theme segment only when the temple has a theme. */
export const pickerSegmentsFor = (theme?: TempleTheme) =>
  PICKER_SEGMENTS.filter((segment) => segment.id !== "theme" || Boolean(theme));

/** The theme's quests when the temple has a theme, else all of them. */
export const defaultPickerSegment = (theme?: TempleTheme): PickerSegment => (theme ? "theme" : "all");

const searchTextOf = (row: PickerRow): string =>
  [row.name, row.beastName, row.heroes, row.schedule, row.tierName, row.difficultyName].join(" ").toLowerCase();

export interface PickerFilter {
  segment: PickerSegment;
  /** The temple's theme, when it has one */
  theme?: TempleTheme;
  search: string;
}

/**
 * The rows a segment keeps, narrowed by the search (the quest, its beast, heroes, schedule and tier). The theme
 * segment keeps the quests whose beast belongs to the temple's theme; the library segment lists beasts, not rows.
 */
export function filterPickerRows(rows: readonly PickerRow[], filter: PickerFilter): PickerRow[] {
  if (filter.segment === "library") return [];
  const needle = filter.search.trim().toLowerCase();
  return rows.filter((row) => {
    const isInSegment = filter.segment === "all" || (Boolean(filter.theme) && row.theme === filter.theme);
    return isInSegment && (!needle || searchTextOf(row).includes(needle));
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// From the library
// ---------------------------------------------------------------------------------------------------------------------

/**
 * The library's chore beasts that no live quest uses yet, narrowed to the temple's theme (all themes when the temple
 * has none) and by the search. A quest with no beast of its own uses the one the library suggests for it, because
 * that is how a room finds its quest (5.2), so that beast is taken too.
 */
export function libraryChoices(
  quests: readonly Achievement[],
  { theme, search }: { theme?: TempleTheme; search: string }
): LibraryBeast[] {
  const taken = quests
    .filter((quest) => !quest.draft)
    .map((quest) => questBeastId(quest))
    .filter((id): id is string => Boolean(id));
  return browseLibrary({ theme, text: search, classic: false, exclude: taken }).filter(
    (entry): entry is LibraryBeast => !isClassicBeast(entry)
  );
}

/** The steps of the difficulty slider (the quest form's Why tab). */
export const LIBRARY_DIFFICULTIES: readonly number[] = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

/** What the small "From the library" form asks. */
export interface LibraryQuestForm {
  /** Hero ids */
  heroes: string[];
  schedule: "daily" | "weekly";
  difficulty: number;
  requiresApproval: boolean;
}

/** The form's first look: every hero, daily, Simple, no approval. */
export const defaultLibraryForm = (heroIds: readonly string[]): LibraryQuestForm => ({
  heroes: [...heroIds],
  schedule: "daily",
  difficulty: 2,
  requiresApproval: false,
});

/** Why the form cannot be saved yet, in words; null when it can. */
export function libraryFormProblem(form: LibraryQuestForm): string | null {
  if (!form.heroes.length) return "Pick at least one hero.";
  if (!LIBRARY_DIFFICULTIES.includes(form.difficulty)) return "Pick a difficulty.";
  return null;
}

/**
 * The quest "From the library" creates for a beast: named for the beast's chore, a Solo Mission for the heroes
 * chosen, paid as the quest form pays (xp 100x, gp 10x, ap 1x the difficulty). The beast is the quest's beast; the
 * screen adopts it into the family's bestiary (beastToAdopt).
 */
export function questFromLibraryBeast(beast: LibraryBeast, form: LibraryQuestForm, id: string, now: Date): Achievement {
  const { difficulty, schedule } = form;
  return {
    id,
    achievementName: beast.chore,
    categoryId: "",
    beastId: String(beast.id),
    subAchievementIds: [],
    requiresApproval: form.requiresApproval,
    bonusAchievement: false,
    type: "individual",
    assignee: [...form.heroes],
    startsOn: now.toISOString(),
    endsOn: "",
    dueByTime: "",
    basicSchedule: schedule,
    scheduleType: "basic",
    showDailyUntilComplete: schedule === "daily",
    customFrequency: 1,
    customPeriodType: "day",
    customPeriodNumber: 1,
    repeatOnDays: [],
    difficulty,
    xp: difficulty * 100,
    gp: difficulty * 10,
    ap: difficulty,
    adventureType: "beast",
  };
}

/**
 * The library beast to put into the family's bestiary so a fight can load it: the beast of `beastId` when the library
 * has it and the bestiary does not. Null for a beast the family owns, a custom one, or no beast.
 */
export function beastToAdopt(beastId: string | undefined, ownedIds: Iterable<string | number>): Beast | null {
  if (!beastId) return null;
  const owned = new Set([...ownedIds].map(String));
  if (owned.has(beastId)) return null;
  const entry = libraryEntryOf(beastId);
  return entry ? adoptLibraryBeast(entry) : null;
}

// ---------------------------------------------------------------------------------------------------------------------
// The size meter
// ---------------------------------------------------------------------------------------------------------------------

/**
 * One room's part in the size of its temple, as the editor knows it (it has no hero and no board): the quest the
 * room is set to (the biggest live one when it lists several), else the live quest that has the template's beast,
 * else the template's own difficulty, dormant.
 * Classic beast rooms, empty lairs (a deleted quest, no template) and every other room are left out (null).
 */
export function roomSizeShare(room: Partial<Room> | undefined, quests: readonly Achievement[]): SizedRoom | null {
  const content = room?.content;
  const live = quests.filter((quest) => !quest.draft);
  const picked = headlineQuest(room, live);
  if (picked) return { difficulty: Number(picked.difficulty) || 0 };
  const template = content?.quest;
  if (!template) return null;
  const filler = live.find((quest) => questBeastId(quest) === String(template.beastId));
  if (filler) return { difficulty: Number(filler.difficulty) || 0 };
  return { difficulty: Number(template.difficulty) || 0, dormant: true };
}

type Maze = string[][] | Record<string, string[][]>;

/** The cell of the room being edited, so its share can be swapped for the pick. */
export interface EditedCell {
  level: string;
  row: number;
  col: number;
}

/**
 * The size of a temple as saved: the sum over every cell of every floor (a token many cells share counts for each,
 * the way the audit reads rooms), and the part the edited cell makes. Dormant rooms count at their template.
 */
export function layoutSize(
  maze: Maze | undefined,
  rooms: Record<string, Room> | undefined,
  quests: readonly Achievement[],
  edited?: EditedCell
): { total: number; here: number } {
  const floors: Array<[string, string[][]]> = Array.isArray(maze) ? [["1F", maze]] : Object.entries(maze ?? {});
  const sized: SizedRoom[] = [];
  let here = 0;
  for (const [level, grid] of floors) {
    grid.forEach((cells, row) =>
      (cells ?? []).forEach((token, col) => {
        const share = roomSizeShare(rooms?.[token], quests);
        if (!share) return;
        sized.push(share);
        const isEdited = edited && edited.level === level && edited.row === row && edited.col === col;
        if (isEdited) here = share.difficulty;
      })
    );
  }
  return { total: templeSize(sized).total, here };
}

export interface SizePreview {
  /** The temple as saved */
  before: number;
  /** The temple with the pick in this room */
  after: number;
  full: number;
  /** The temple with the pick is full */
  isFull: boolean;
  /** "Size 14 → 22 · full at 21"; just "Size 14 · full at 21" when nothing is picked or the pick changes nothing */
  label: string;
}

/** The size meter at the foot of the picker: the temple now, and with the pick in place of what the room holds. */
export function previewSize(size: { total: number; here: number }, pickDifficulty?: number): SizePreview {
  const before = size.total;
  const after = pickDifficulty === undefined ? before : before - size.here + pickDifficulty;
  const changes = after !== before;
  const label = `Size ${before}${changes ? ` → ${after}` : ""} · full at ${TEMPLE_FULL_SIZE}`;
  return { before, after, full: TEMPLE_FULL_SIZE, isFull: after >= TEMPLE_FULL_SIZE, label };
}

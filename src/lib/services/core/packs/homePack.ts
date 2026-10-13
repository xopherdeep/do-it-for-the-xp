/**
 * The Home pack: a curated set of everyday chores for a working home, picked by the rooms the family has and by how
 * old each hero plays (little about 6, kid about 12, grown-up).
 *
 * Pure: no storage, no Vue. `buildHomePack(answers)` turns the setup answers (the start date, the rooms in the home,
 * who is playing) into quest categories, beasts and quests, and `homePackBackup(pack, ownedBeasts)` wraps them as a
 * backup file for `restoreBackup(file, { mode: "merge" })`, so loading the pack never wipes anything.
 *
 * The beasts are the library's (BEAST_LIBRARY): each chore is the library chore of its beast and the fight uses the
 * beast's four-step checklist, so a beast keeps its library id and the temple theme the library gave it. Quests and
 * categories are the pack's own (`home-`, `cat-home-`), so loading the pack again with the same answers replaces only
 * its own quests and the library beasts it names. A beast the family already owns keeps the family's own copy (name,
 * art, checklist); only the strike clock (`attackCooldown`) is set on it.
 *
 * A quest has no end date: an unfinished chore never vanishes from the board. Daily chores list their time of day,
 * weekly ones the weekdays they are due, and most carry a due time (QuestSchedule.deadlineDayOf reads the day).
 * Quests are sized by age: little 1-2, kid 2-5, grown-up 5-13 on the Fibonacci scale; a chore several bands share
 * is sized for the youngest of them.
 */
import { addDays, format, startOfDay } from "date-fns";
import type { Achievement, AchievementCategoryInterface } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { BackupFile } from "@/lib/services/core/BackupService";
import { DAY_TOKENS } from "@/lib/engine/quests/QuestSchedule";
import type { TimeOfDay } from "@/lib/engine/quests/QuestSchedule";
import { adoptLibraryBeast } from "@/lib/services/bestiary/librarySuggest";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import { defaultMinutes } from "@/lib/services/quests/questClock";
import { PACK_BANDS, cooldownOf, dateKey, heroBandFor, packBackup, parseLocalDate, plural, rewardsFor } from "./packCommon";
import type { PackBand, PackBeast, PackHero, PackRole } from "./packCommon";

export { dateKey, parseLocalDate };

export type HomeRole = PackRole;
export type HomeHero = PackHero;
export const HOME_BANDS = PACK_BANDS;
export const homeBandFor = heroBandFor;

export type HomeRoomId = "kitchen" | "bathroom" | "bedroom" | "living" | "laundry" | "yard" | "car" | "dog" | "cat" | "tank";

/** A room the setup asks about; `counted` ones take a number (bedrooms, bathrooms) and `pet` ones are the pets of the home */
export interface HomeRoom {
  id: HomeRoomId;
  label: string;
  counted?: boolean;
  max?: number;
  pet?: boolean;
}

export const HOME_ROOMS: readonly HomeRoom[] = [
  { id: "kitchen", label: "Kitchen" },
  { id: "bathroom", label: "Bathrooms", counted: true, max: 5 },
  { id: "bedroom", label: "Bedrooms", counted: true, max: 8 },
  { id: "living", label: "Living room" },
  { id: "laundry", label: "Laundry room" },
  { id: "yard", label: "Yard" },
  { id: "car", label: "Car" },
  { id: "dog", label: "Dog", pet: true },
  { id: "cat", label: "Cat", pet: true },
  { id: "tank", label: "Fish tank or small pet cage", pet: true },
];

/** What the setup starts with: a typical family home with three bedrooms and two bathrooms, no pets */
export const DEFAULT_HOME_ROOMS: Partial<Record<HomeRoomId, number>> = {
  kitchen: 1, bathroom: 2, bedroom: 3, living: 1, laundry: 1, yard: 1, car: 1,
};

/** The quest that marks the move day when the Moving House pack is loaded (see movingPack, "load-van": opens that day) */
export const MOVE_DAY_QUEST_ID = "move-load-van";

/** The start date the setup offers: the day after the move when the Moving House pack is loaded and the move is not over, else today. */
export const homeStartDate = (moveDayStartsOn: string | undefined, today: Date = new Date()): string => {
  const moveDay = moveDayStartsOn ? new Date(moveDayStartsOn) : null;
  const dayAfter = moveDay && !Number.isNaN(moveDay.getTime()) ? addDays(startOfDay(moveDay), 1) : null;
  return dateKey(dayAfter && dayAfter > startOfDay(today) ? dayAfter : today);
};

// ---------------------------------------------------------------------------------------------------------------
// The content. One template makes one quest and takes its beast, checklist and art from the library.

type HomeGroup = "kitchen" | "bathrooms" | "bedrooms" | "living" | "laundry" | "yard" | "car" | "pets";
type DayToken = (typeof DAY_TOKENS)[number];

export const HOME_GROUPS: readonly { id: HomeGroup; name: string }[] = [
  { id: "kitchen", name: "Kitchen" },
  { id: "bathrooms", name: "Bathrooms" },
  { id: "bedrooms", name: "Bedrooms" },
  { id: "living", name: "Living Room" },
  { id: "laundry", name: "Laundry" },
  { id: "yard", name: "Yard" },
  { id: "car", name: "Car" },
  { id: "pets", name: "Pets" },
];

const categoryIdOf = (group: HomeGroup): string => `cat-home-${group}`;
const GROUP_NAMES = Object.fromEntries(HOME_GROUPS.map((group) => [group.id, group.name])) as Record<HomeGroup, string>;

interface HomeTemplate {
  /** The library beast's slug: the beast is `beast-<slug>`, the quest `home-<slug>` and, unless `quest` says otherwise, its name the library chore */
  slug: string;
  quest?: string;
  group: HomeGroup;
  /** The bands that get the chore; a band with no hero is skipped, and with no hero at all there is no quest */
  who: PackBand[];
  /** team: one Team Effort the whole party shares (one clear clears it for all); solo: every hero does their own */
  mode: "team" | "solo";
  /** The quest exists only if the home has any of these rooms */
  rooms: HomeRoomId[];
  difficulty: number;
  /** About how long it takes; the difficulty's default (questClock.defaultMinutes) when absent */
  minutes?: number;
  /** More minutes for each room of a kind past the first */
  scale?: { room: HomeRoomId; perRoom: number };
  /** "daily", or the weekdays the chore is due */
  when: "daily" | DayToken[];
  /** The parts of the day a daily chore belongs to; two make it a chore done twice a day */
  times?: TimeOfDay[];
  /** Due by this time ("HH:mm") on the day it is due; left out for a chore done twice a day */
  due?: string;
}

export const HOME_TEMPLATES: readonly HomeTemplate[] = [
  // Kitchen
  { slug: "cupboard-kobold", group: "kitchen", who: ["kid"], mode: "team", rooms: ["kitchen"], difficulty: 3, when: "daily", times: ["morning"], due: "09:00" },
  { slug: "dish-goblin", quest: "Dishes after dinner", group: "kitchen", who: ["kid", "grownup"], mode: "team", rooms: ["kitchen"], difficulty: 3, when: "daily", times: ["evening"], due: "20:00" },
  { slug: "gravy-ghoul", group: "kitchen", who: ["little"], mode: "team", rooms: ["kitchen"], difficulty: 1, when: "daily", times: ["evening"], due: "19:30" },
  { slug: "garbage-gargoyle", group: "kitchen", who: ["kid", "grownup"], mode: "team", rooms: ["kitchen"], difficulty: 2, when: "daily", times: ["evening"], due: "20:30" },
  { slug: "grease-gorgon", group: "kitchen", who: ["grownup"], mode: "team", rooms: ["kitchen"], difficulty: 5, when: ["wed"], due: "19:00" },
  { slug: "leftover-lich", group: "kitchen", who: ["grownup"], mode: "team", rooms: ["kitchen"], difficulty: 8, when: ["thu"], due: "19:00" },
  { slug: "stickyfoot-slime", quest: "Mop the kitchen floor", group: "kitchen", who: ["grownup"], mode: "team", rooms: ["kitchen"], difficulty: 5, minutes: 15, when: ["fri"], due: "18:00" },

  // Bathrooms
  { slug: "fang-fairy", group: "bathrooms", who: ["little", "kid"], mode: "solo", rooms: ["bathroom"], difficulty: 1, when: "daily", times: ["morning", "night"] },
  { slug: "potty-poltergeist", group: "bathrooms", who: ["grownup"], mode: "team", rooms: ["bathroom"], difficulty: 5, scale: { room: "bathroom", perRoom: 10 }, when: ["sat"], due: "12:00" },
  { slug: "soap-scum-slime", group: "bathrooms", who: ["grownup"], mode: "team", rooms: ["bathroom"], difficulty: 8, scale: { room: "bathroom", perRoom: 10 }, when: ["sat"], due: "12:00" },
  { slug: "drain-drake", group: "bathrooms", who: ["kid"], mode: "team", rooms: ["bathroom"], difficulty: 5, scale: { room: "bathroom", perRoom: 5 }, when: ["sat"], due: "12:00" },

  // Bedrooms
  { slug: "bed-basilisk", quest: "Make your bed", group: "bedrooms", who: ["little", "kid"], mode: "solo", rooms: ["bedroom"], difficulty: 1, when: "daily", times: ["morning"], due: "09:00" },
  { slug: "pajama-pooka", group: "bedrooms", who: ["little"], mode: "solo", rooms: ["bedroom"], difficulty: 1, when: "daily", times: ["morning"], due: "08:30" },
  { slug: "night-owlbear", group: "bedrooms", who: ["little", "kid"], mode: "solo", rooms: ["bedroom"], difficulty: 2, when: "daily", times: ["evening"], due: "21:00" },
  { slug: "clutter-chimera", group: "bedrooms", who: ["kid"], mode: "solo", rooms: ["bedroom"], difficulty: 5, minutes: 20, when: ["sat"], due: "11:00" },
  { slug: "bedsheet-banshee", quest: "Change your sheets", group: "bedrooms", who: ["kid", "grownup"], mode: "solo", rooms: ["bedroom"], difficulty: 5, when: ["sun"], due: "12:00" },

  // Living room
  { slug: "toybox-troll", group: "living", who: ["little"], mode: "solo", rooms: ["living"], difficulty: 1, when: "daily", times: ["evening"], due: "18:30" },
  { slug: "fluffalo", group: "living", who: ["kid", "grownup"], mode: "team", rooms: ["living"], difficulty: 5, scale: { room: "bedroom", perRoom: 4 }, when: ["wed", "sat"], due: "17:00" },
  { slug: "droop-dryad", group: "living", who: ["little"], mode: "team", rooms: ["living"], difficulty: 1, when: ["sun"], due: "17:00" },

  // Laundry
  { slug: "laundry-lurker", group: "laundry", who: ["kid", "grownup"], mode: "team", rooms: ["laundry"], difficulty: 5, when: ["mon", "thu"], due: "18:00" },
  { slug: "wrinkle-wyvern", group: "laundry", who: ["kid"], mode: "team", rooms: ["laundry"], difficulty: 3, when: ["tue", "fri"], due: "19:00" },
  { slug: "socktopus", group: "laundry", who: ["little"], mode: "team", rooms: ["laundry"], difficulty: 1, when: ["sat"], due: "11:00" },

  // Yard
  { slug: "meadow-minotaur", group: "yard", who: ["grownup"], mode: "team", rooms: ["yard"], difficulty: 8, minutes: 45, when: ["sun"], due: "15:00" },
  { slug: "weed-wyrm", group: "yard", who: ["kid"], mode: "team", rooms: ["yard"], difficulty: 3, minutes: 15, when: ["sun"], due: "14:00" },
  { slug: "trash-troll", group: "yard", who: ["kid", "grownup"], mode: "team", rooms: ["yard"], difficulty: 3, when: ["sun"], due: "19:00" },

  // Car
  { slug: "grime-griffin", group: "car", who: ["grownup"], mode: "team", rooms: ["car"], difficulty: 8, minutes: 30, when: ["sat"], due: "16:00" },
  { slug: "backseat-beastie", group: "car", who: ["kid"], mode: "team", rooms: ["car"], difficulty: 3, minutes: 15, when: ["sat"], due: "15:00" },

  // Pets
  { slug: "kibble-kobold", group: "pets", who: ["little"], mode: "team", rooms: ["dog", "cat", "tank"], difficulty: 1, when: "daily", times: ["morning", "evening"] },
  { slug: "zoomie-zephyr", group: "pets", who: ["kid", "grownup"], mode: "team", rooms: ["dog"], difficulty: 3, minutes: 25, when: "daily", times: ["evening"], due: "18:00" },
  { slug: "plop-golem", group: "pets", who: ["kid"], mode: "team", rooms: ["dog"], difficulty: 3, when: ["wed", "sat"], due: "17:00" },
  { slug: "furball-fiend", group: "pets", who: ["little"], mode: "team", rooms: ["dog", "cat"], difficulty: 1, when: ["sat"], due: "12:00" },
  { slug: "clumpling", group: "pets", who: ["kid"], mode: "team", rooms: ["cat"], difficulty: 2, when: "daily", times: ["evening"], due: "19:00" },
  { slug: "algae-ooze", group: "pets", who: ["kid"], mode: "team", rooms: ["tank"], difficulty: 3, minutes: 15, when: ["sat"], due: "12:00" },
];

// ---------------------------------------------------------------------------------------------------------------
// The builder.

/** The library's four steps get at least a minute each, so no clock is shorter than this */
export const HOME_MIN_MINUTES = 4;

const BEAST_BY_SLUG = new Map(BEAST_LIBRARY.map((beast) => [beast.slug, beast]));

export interface HomeAnswers {
  /** The first day the chores are on the board, "YYYY-MM-DD" */
  startDate: string;
  /** How many of each room the home has; absent or 0 means none. A tick box is 1. */
  rooms: Partial<Record<HomeRoomId, number>>;
  heroes: HomeHero[];
}

/** One line of the quest list for the Game Master */
export interface HomePackRow {
  questId: string;
  group: string;
  name: string;
  who: string;
  /** "Team Effort" or "Solo" */
  mode: string;
  difficulty: number;
  minutes: number;
  /** "Daily, morning and night" or "Sat" or "Mon, Thu" */
  schedule: string;
  /** "09:00", or "" when the chore has no due time */
  due: string;
  beastId: string;
  beast: string;
  steps: number;
  approval: boolean;
  /** True when the chore is due on the start date */
  onStart: boolean;
}

export interface HomePack {
  categories: AchievementCategoryInterface[];
  beasts: PackBeast[];
  quests: Achievement[];
  rows: HomePackRow[];
  /** Playing heroes */
  heroCount: number;
  /** The first day on the board, "YYYY-MM-DD" */
  startDate: string;
}

const WHO_LABELS: Record<PackBand, string> = { little: "little", kid: "kid", grownup: "grown-up" };
const DAY_NAMES: Record<DayToken, string> = { sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat" };

const scheduleLabel = (template: HomeTemplate): string => {
  const days = template.when === "daily" ? null : template.when;
  if (days) return days.map((day) => DAY_NAMES[day]).join(", ");
  const times = template.times ?? [];
  return times.length ? `Daily, ${times.length > 1 ? `${times.slice(0, -1).join(", ")} and ${times[times.length - 1]}` : times[0]}` : "Daily";
};

const isDueOn = (template: HomeTemplate, day: Date): boolean =>
  template.when === "daily" || template.when.includes(DAY_TOKENS[day.getDay()]);

export const buildHomePack = (answers: HomeAnswers): HomePack => {
  const start = parseLocalDate(answers.startDate);
  const heroes = answers.heroes.filter((hero): hero is HomeHero & { band: PackBand } => hero.band !== "out");
  const roomCount = (room: HomeRoomId): number => Math.max(0, Math.floor(Number(answers.rooms[room]) || 0));

  const quests: Achievement[] = [];
  const beasts: PackBeast[] = [];
  const rows: HomePackRow[] = [];
  const usedGroups = new Set<HomeGroup>();

  for (const template of HOME_TEMPLATES) {
    const library = BEAST_BY_SLUG.get(template.slug);
    if (!library) continue;
    const hasRoom = template.rooms.some((room) => roomCount(room) > 0);
    const party = heroes.filter((hero) => template.who.includes(hero.band));
    const isPlayed = party.length > 0;
    if (!hasRoom || !isPlayed) continue;

    const extraRooms = template.scale ? Math.max(0, roomCount(template.scale.room) - 1) : 0;
    const minutes = Math.max(
      HOME_MIN_MINUTES,
      Math.round((template.minutes ?? defaultMinutes(template.difficulty)) + (template.scale ? template.scale.perRoom * extraRooms : 0))
    );
    const isKidOnly = template.who.length === 1 && template.who[0] === "kid";
    const approval = isKidOnly && template.difficulty >= 5;
    const isDaily = template.when === "daily";
    // A Team Effort of one hero is just their own quest
    const type = template.mode === "team" && party.length > 1 ? "collaborate" : "individual";
    const name = template.quest ?? library.chore;
    const id = `home-${template.slug}`;

    usedGroups.add(template.group);
    beasts.push({ ...adoptLibraryBeast(library), attackCooldown: cooldownOf(minutes, library.checklist.length) });
    quests.push({
      id,
      achievementName: name,
      categoryId: categoryIdOf(template.group),
      beastId: String(library.id),
      subAchievementIds: [],
      requiresApproval: approval,
      bonusAchievement: false,
      type,
      assignee: party.map((hero) => hero.id),
      startsOn: start.toISOString(),
      endsOn: "",
      dueByTime: template.due ?? "",
      ...(template.times?.length ? { timesOfDay: [...template.times] } : {}),
      basicSchedule: isDaily ? "daily" : "weekly",
      scheduleType: "basic",
      showDailyUntilComplete: isDaily,
      customFrequency: 1,
      customPeriodType: "day",
      customPeriodNumber: 1,
      repeatOnDays: template.when === "daily" ? [] : [...template.when],
      difficulty: template.difficulty,
      estimatedMinutes: minutes,
      ...rewardsFor(template.difficulty),
      adventureType: "beast",
    });
    rows.push({
      questId: id,
      group: GROUP_NAMES[template.group],
      name,
      who: template.who.map((band) => WHO_LABELS[band]).join(" + "),
      mode: type === "collaborate" ? "Team Effort" : "Solo",
      difficulty: template.difficulty,
      minutes,
      schedule: scheduleLabel(template),
      due: template.due ?? "",
      beastId: String(library.id),
      beast: library.name,
      steps: library.checklist.length,
      approval,
      onStart: isDueOn(template, start),
    });
  }

  const categories = HOME_GROUPS.filter((group) => usedGroups.has(group.id)).map((group) => ({
    id: categoryIdOf(group.id),
    name: `Home: ${group.name}`,
  }));
  return { categories, beasts, quests, rows, heroCount: heroes.length, startDate: dateKey(start) };
};

/**
 * The pack as a backup file for a merge restore; it names only categories, beasts and quests. A beast the family
 * already owns keeps the family's copy (name, art, checklist) and only gets the pack's strike clock, spread over its
 * own checklist.
 */
export const homePackBackup = (pack: HomePack, ownedBeasts: readonly Beast[] = [], now: Date = new Date()): BackupFile => {
  const owned = new Map(ownedBeasts.map((beast) => [String(beast.id), beast]));
  const minutesOf = new Map(pack.rows.map((row) => [row.beastId, row.minutes]));
  const beasts = pack.beasts.map((beast) => {
    const mine = owned.get(String(beast.id));
    if (!mine) return beast;
    const steps = Array.isArray(mine.checklist) && mine.checklist.length ? mine.checklist.length : beast.checklist.length;
    return { ...mine, attackCooldown: cooldownOf(minutesOf.get(String(beast.id)) ?? HOME_MIN_MINUTES, steps) };
  });
  return packBackup({ categories: pack.categories, beasts, quests: pack.quests }, now);
};

/** The chore a hero meets first on the start date: the earliest due time of what is due that day, else the first row */
const firstUp = (pack: HomePack): HomePackRow | undefined => {
  const today = pack.rows.filter((row) => row.onStart);
  const byTime = (a: HomePackRow, b: HomePackRow): number => (a.due || "99:99").localeCompare(b.due || "99:99");
  return today.slice().sort(byTime)[0] ?? pack.rows[0];
};

/** "Added 27 quests and 27 beasts for 3 heroes, starting Tue Oct 13. First up: Unload the dishwasher." */
export const homePackSummary = (pack: HomePack): string => {
  const first = firstUp(pack);
  const heroes = `${pack.heroCount} ${pack.heroCount === 1 ? "hero" : "heroes"}`;
  const starting = format(parseLocalDate(pack.startDate), "EEE MMM d");
  const parts = [`Added ${plural(pack.quests.length, "quest")} and ${plural(pack.beasts.length, "beast")} for ${heroes}, starting ${starting}.`];
  if (first) parts.push(`First up: ${first.name}.`);
  return parts.join(" ");
};

/** The quest list as plain text, grouped by room, for the Game Master to read */
export const homePackList = (pack: HomePack): string => {
  const lines: string[] = [];
  for (const group of HOME_GROUPS) {
    const rows = pack.rows.filter((row) => row.group === group.name);
    const isEmpty = rows.length === 0;
    if (isEmpty) continue;
    lines.push("", `## ${group.name}`, "", "| Quest | Who | Type | Diff | Min | When | Due by | Beast |", "|---|---|---|---|---|---|---|---|");
    for (const row of rows) {
      lines.push(
        `| ${row.name}${row.approval ? " (GM approves)" : ""} | ${row.who} | ${row.mode} | ${row.difficulty} | ${row.minutes} | ${row.schedule} | ${row.due || "-"} | ${row.beast} |`
      );
    }
  }
  return lines.join("\n");
};

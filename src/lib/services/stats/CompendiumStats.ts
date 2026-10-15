/**
 * Compendium Stats
 *
 * The figures on the Game Master's Setup XP slideshow, worked out from plain data (the hero
 * profiles, the quest board, the bestiary, the quest log and the temples). Nothing here reads a
 * store or a database: EngineStatsService loads the data and hands it over, so every figure is
 * testable and an empty family is all zeros, never NaN.
 *
 * Where each figure comes from:
 * - Hero totals (XP sown, GP held, AP unlocked, HP/MP, level) are read off the profiles.
 * - AP earned over time comes from the hero's own AP history (every source records into it).
 * - XP and GP earned over time come from the quest log, the only record of them: approved
 *   completions at the quest's own rate. Temple chests and free fights are not in it.
 * - "Average per quest" is the average rate posted on the quest board.
 * - Averages are whole numbers, because the stat boxes count whole numbers.
 */

export interface PointsLike {
  now?: number;
  max?: number;
}

export interface ApRecordLike {
  amount?: number;
  timestamp?: string;
}

/** The part of a hero profile the Compendium reads (the store holds profiles as plain objects). */
export interface HeroLike {
  id?: string;
  isAdult?: boolean;
  stats?: {
    level?: number;
    hp?: PointsLike | null;
    mp?: PointsLike | null;
    gp?: { wallet?: number; savings?: number } | null;
    xp?: { now?: number } | null;
    ap?: { total?: number; history?: ApRecordLike[] } | null;
  } | null;
}

export interface QuestLike {
  id?: unknown;
  xp?: number;
  gp?: number;
  ap?: number;
  beastId?: string;
  /** An unfinished quest: heroes never see it, so it is not on the board. */
  draft?: boolean;
}

export interface BeastLike {
  id?: unknown;
  checklist?: string[];
  achievementIds?: string[];
}

export interface QuestLogLike {
  questId: string;
  userId: string;
  /** ISO timestamp */
  completedAt: string;
  status: string;
  rewards?: { xp?: number; gp?: number; ap?: number };
}

export interface RoomLike {
  type?: string;
}

export interface LayoutLike {
  maze?: unknown;
  rooms?: Record<string, RoomLike | undefined> | null;
}

export interface TempleLike {
  id: string;
  dungeonLayout?: LayoutLike | null;
  // Older records keep the layout at the top level
  maze?: unknown;
  rooms?: Record<string, RoomLike | undefined> | null;
}

export type RewardKind = "xp" | "gp" | "ap";

/** An amount per period; "week" is the last seven days, "month" the current calendar month so far. */
export interface PeriodTotals {
  today: number;
  week: number;
  month: number;
}

export interface VitalsFigures {
  heroes: number;
  avgHp: number;
  avgMaxHp: number;
  /** Share of full health across the family, 0 to 1 (all current HP over all max HP) */
  hpFill: number;
  avgMp: number;
  avgMaxMp: number;
  mpFill: number;
  avgLevel: number;
  /** Heroes below full HP */
  wounded: number;
}

export interface GoldFigures {
  heroes: number;
  /** GP in the heroes' wallets (a wallet in debt counts as nothing) */
  wallets: number;
  savings: number;
  /** Wallets plus savings: all the GP the family holds */
  treasury: number;
  avgPerHero: number;
  avgPerQuest: number;
  /** GP from approved quest completions, at the quest's posted rate */
  earned: PeriodTotals;
}

export interface ExperienceFigures {
  heroes: number;
  /** XP the heroes have gathered in all (the profile's running XP) */
  totalXp: number;
  avgPerHero: number;
  avgPerQuest: number;
  /** XP from approved quest completions, at the quest's posted rate */
  earned: PeriodTotals;
}

export interface AbilityFigures {
  heroes: number;
  /** AP the heroes have unlocked in all */
  totalAp: number;
  avgPerHero: number;
  avgPerQuest: number;
  /** AP from every source, read off the heroes' AP history */
  earned: PeriodTotals;
}

export interface BeastFigures {
  beasts: number;
  /** Average checks on a beast's list */
  avgChecklist: number;
  /** Quests on the board tied to a beast */
  linkedQuests: number;
  /** Linked quests per beast, to one decimal */
  questsPerBeast: number;
  /** Approved completions of a beast's quest: one beast beaten each time */
  tamed: PeriodTotals;
}

export interface TempleFigures {
  /** Every temple, shipped or custom, once per id */
  total: number;
  /** Temples with a maze and rooms to count; the averages are over these */
  laidOut: number;
  foeRooms: number;
  treasureRooms: number;
  avgFoes: number;
  avgTreasure: number;
}

export interface CompendiumInput {
  /** Every profile; the heroes are the ones who are not adults */
  profiles: ReadonlyArray<HeroLike | null | undefined>;
  quests: ReadonlyArray<QuestLike | null | undefined>;
  beasts: ReadonlyArray<BeastLike | null | undefined>;
  questLog: ReadonlyArray<QuestLogLike | null | undefined>;
  temples: ReadonlyArray<TempleLike | null | undefined>;
}

export interface CompendiumStats {
  vitals: VitalsFigures;
  gold: GoldFigures;
  experience: ExperienceFigures;
  abilities: AbilityFigures;
  beasts: BeastFigures;
  temples: TempleFigures;
}

// --- small helpers ---------------------------------------------------------------------------

const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const positive = (value: unknown): number => Math.max(0, num(value));
const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);
const mean = (values: number[]): number => (values.length ? sum(values) / values.length : 0);
const whole = (value: number): number => Math.round(value);
const tenths = (value: number): number => Math.round(value * 10) / 10;
const idOf = (value: unknown): string => (value === undefined || value === null ? "" : String(value));
const present = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;
const fill = (now: number, max: number): number => (max > 0 ? Math.min(1, Math.max(0, now / max)) : 0);
const compactFormat = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** A figure short enough for a stat box ribbon: 950, 1.2K, 3.4M. */
export const compact = (value: number): string => compactFormat.format(Number.isFinite(value) ? value : 0);

// --- heroes and periods ----------------------------------------------------------------------

/** A hero is any profile that is not an adult (the Game Masters are the adults). */
export const heroesOf = <T extends { isAdult?: boolean }>(profiles: ReadonlyArray<T | null | undefined>): T[] =>
  profiles.filter((profile): profile is T => present(profile) && profile.isAdult !== true);

/** When today, the last seven days and this month began, in the local calendar (ms). */
export const periodStarts = (now: Date): { today: number; week: number; month: number } => {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  return {
    today: new Date(year, month, day).getTime(),
    week: new Date(year, month, day - 6).getTime(),
    month: new Date(year, month, 1).getTime(),
  };
};

/** Sum amounts by when they happened; anything undated, unparseable or after `now` is left out. */
export const totalsByPeriod = (records: ReadonlyArray<{ at: unknown; amount: number }>, now: Date): PeriodTotals => {
  const starts = periodStarts(now);
  const end = now.getTime();
  const totals: PeriodTotals = { today: 0, week: 0, month: 0 };
  for (const { at, amount } of records) {
    const when = Date.parse(String(at));
    const isUndatedOrFuture = !Number.isFinite(when) || when > end;
    if (isUndatedOrFuture) continue;
    const isToday = when >= starts.today;
    if (isToday) totals.today += amount;
    const isThisWeek = when >= starts.week;
    if (isThisWeek) totals.week += amount;
    const isThisMonth = when >= starts.month;
    if (isThisMonth) totals.month += amount;
  }
  return totals;
};

const heroIdsOf = (heroes: ReadonlyArray<HeroLike>): Set<string> =>
  new Set(heroes.map((hero) => idOf(hero.id)).filter(Boolean));

/** Quest log entries a hero finished and the Game Master did not hold back or void. */
const approvedEntries = (log: ReadonlyArray<QuestLogLike | null | undefined>, heroes: ReadonlyArray<HeroLike>) => {
  const ids = heroIdsOf(heroes);
  return log.filter(
    (entry): entry is QuestLogLike => present(entry) && entry.status === "approved" && ids.has(idOf(entry.userId))
  );
};

/** XP, GP or AP the heroes were paid for approved quests, by period (the quest log is the record). */
export const questLogTotals = (
  log: ReadonlyArray<QuestLogLike | null | undefined>,
  heroes: ReadonlyArray<HeroLike>,
  reward: RewardKind,
  now: Date
): PeriodTotals =>
  totalsByPeriod(
    approvedEntries(log, heroes).map((entry) => ({ at: entry.completedAt, amount: positive(entry.rewards?.[reward]) })),
    now
  );

/** AP the heroes gained, by period, from the AP history their profiles keep. */
export const apHistoryTotals = (heroes: ReadonlyArray<HeroLike>, now: Date): PeriodTotals => {
  const records: { at: unknown; amount: number }[] = [];
  for (const hero of heroes) {
    for (const record of hero.stats?.ap?.history ?? []) {
      const isPresent = present(record);
      if (isPresent) records.push({ at: record.timestamp, amount: positive(record.amount) });
    }
  }
  return totalsByPeriod(records, now);
};

/** The quest board: every quest a hero can see (drafts are not on it). */
const boardOf = (quests: ReadonlyArray<QuestLike | null | undefined>): QuestLike[] =>
  quests.filter((quest): quest is QuestLike => present(quest) && quest.draft !== true);

/** The average XP, GP or AP a quest on the board posts. */
export const averageQuestReward = (quests: ReadonlyArray<QuestLike | null | undefined>, reward: RewardKind): number =>
  whole(mean(boardOf(quests).map((quest) => positive(quest[reward]))));

// --- the slides ------------------------------------------------------------------------------

export const vitalsFigures = (heroes: ReadonlyArray<HeroLike>): VitalsFigures => {
  const hp = heroes.map((hero) => hero.stats?.hp).filter(present);
  const mp = heroes.map((hero) => hero.stats?.mp).filter(present);
  const withStats = heroes.filter((hero) => present(hero.stats));
  const hpNow = hp.map((points) => positive(points.now));
  const hpMax = hp.map((points) => positive(points.max));
  const mpNow = mp.map((points) => positive(points.now));
  const mpMax = mp.map((points) => positive(points.max));
  return {
    heroes: heroes.length,
    avgHp: whole(mean(hpNow)),
    avgMaxHp: whole(mean(hpMax)),
    hpFill: fill(sum(hpNow), sum(hpMax)),
    avgMp: whole(mean(mpNow)),
    avgMaxMp: whole(mean(mpMax)),
    mpFill: fill(sum(mpNow), sum(mpMax)),
    avgLevel: whole(mean(withStats.map((hero) => positive(hero.stats?.level) || 1))),
    wounded: hp.filter((points) => positive(points.max) > 0 && positive(points.now) < positive(points.max)).length,
  };
};

export const goldFigures = (
  heroes: ReadonlyArray<HeroLike>,
  quests: ReadonlyArray<QuestLike | null | undefined>,
  log: ReadonlyArray<QuestLogLike | null | undefined>,
  now: Date
): GoldFigures => {
  const wallets = sum(heroes.map((hero) => positive(hero.stats?.gp?.wallet)));
  const savings = sum(heroes.map((hero) => positive(hero.stats?.gp?.savings)));
  return {
    heroes: heroes.length,
    wallets,
    savings,
    treasury: wallets + savings,
    avgPerHero: heroes.length ? whole((wallets + savings) / heroes.length) : 0,
    avgPerQuest: averageQuestReward(quests, "gp"),
    earned: questLogTotals(log, heroes, "gp", now),
  };
};

export const experienceFigures = (
  heroes: ReadonlyArray<HeroLike>,
  quests: ReadonlyArray<QuestLike | null | undefined>,
  log: ReadonlyArray<QuestLogLike | null | undefined>,
  now: Date
): ExperienceFigures => {
  const totalXp = sum(heroes.map((hero) => positive(hero.stats?.xp?.now)));
  return {
    heroes: heroes.length,
    totalXp,
    avgPerHero: heroes.length ? whole(totalXp / heroes.length) : 0,
    avgPerQuest: averageQuestReward(quests, "xp"),
    earned: questLogTotals(log, heroes, "xp", now),
  };
};

export const abilityFigures = (
  heroes: ReadonlyArray<HeroLike>,
  quests: ReadonlyArray<QuestLike | null | undefined>,
  now: Date
): AbilityFigures => {
  const totalAp = sum(heroes.map((hero) => positive(hero.stats?.ap?.total)));
  return {
    heroes: heroes.length,
    totalAp,
    avgPerHero: heroes.length ? whole(totalAp / heroes.length) : 0,
    avgPerQuest: averageQuestReward(quests, "ap"),
    earned: apHistoryTotals(heroes, now),
  };
};

export const beastFigures = (
  beasts: ReadonlyArray<BeastLike | null | undefined>,
  quests: ReadonlyArray<QuestLike | null | undefined>,
  log: ReadonlyArray<QuestLogLike | null | undefined>,
  heroes: ReadonlyArray<HeroLike>,
  now: Date
): BeastFigures => {
  const list = beasts.filter(present);
  const beastIds = new Set(list.map((beast) => idOf(beast.id)).filter(Boolean));
  const attachedIds = new Set<string>();
  for (const beast of list) {
    for (const questId of beast.achievementIds ?? []) {
      const questKey = idOf(questId);
      if (questKey) attachedIds.add(questKey);
    }
  }
  // A quest is tied to a beast from either side: its own beastId, or the beast's list of quests
  const linked = boardOf(quests).filter((quest) => beastIds.has(idOf(quest.beastId)) || attachedIds.has(idOf(quest.id)));
  const linkedIds = new Set(linked.map((quest) => idOf(quest.id)));
  const tamed = approvedEntries(log, heroes)
    .filter((entry) => linkedIds.has(idOf(entry.questId)))
    .map((entry) => ({ at: entry.completedAt, amount: 1 }));
  return {
    beasts: list.length,
    avgChecklist: whole(mean(list.map((beast) => (Array.isArray(beast.checklist) ? beast.checklist.length : 0)))),
    linkedQuests: linked.length,
    questsPerBeast: list.length ? tenths(linked.length / list.length) : 0,
    tamed: totalsByPeriod(tamed, now),
  };
};

// --- temples ---------------------------------------------------------------------------------

export const FOE_ROOM_TYPES = ["monster", "miniboss", "boss"];
export const TREASURE_ROOM_TYPES = ["loot", "secret"];

const isFoeRoom = (type: string | undefined): boolean => Boolean(type && FOE_ROOM_TYPES.includes(type));
const isTreasureRoom = (type: string | undefined): boolean => Boolean(type && TREASURE_ROOM_TYPES.includes(type));

/** A temple's maze and room table, from the layout or the older top-level fields; null without both. */
export const layoutOf = (temple: TempleLike): { maze: unknown; rooms: Record<string, RoomLike | undefined> } | null => {
  for (const candidate of [temple.dungeonLayout, { maze: temple.maze, rooms: temple.rooms }]) {
    const maze = candidate?.maze;
    const rooms = candidate?.rooms;
    const hasLayout = maze && rooms;
    if (hasLayout) return { maze, rooms };
  }
  return null;
};

/** The floors of a maze: one grid of rows, or several grids keyed by floor name. */
const floorsOf = (maze: unknown): unknown[] => {
  if (Array.isArray(maze)) return [maze];
  const hasNamedFloors = maze && typeof maze === "object";
  if (hasNamedFloors) return Object.values(maze);
  return [];
};

/** Every cell token of a maze. */
const cellsOf = (maze: unknown): string[] => {
  const cells: string[] = [];
  for (const floor of floorsOf(maze)) {
    if (!Array.isArray(floor)) continue;
    for (const row of floor) {
      if (!Array.isArray(row)) continue;
      for (const cell of row) {
        const isTile = typeof cell === "string";
        if (isTile) cells.push(cell);
      }
    }
  }
  return cells;
};

/** Temples once per id, the first one listed winning; records without an id are dropped. */
export const uniqueTemples = (temples: ReadonlyArray<TempleLike | null | undefined>): TempleLike[] => {
  const seen = new Set<string>();
  const unique: TempleLike[] = [];
  for (const temple of temples) {
    const id = idOf(temple?.id);
    const shouldSkipTemple = !temple || !id || seen.has(id);
    if (shouldSkipTemple) continue;
    seen.add(id);
    unique.push(temple);
  }
  return unique;
};

/** How many different ids there are across the lists (empty ids do not count). */
export const countDistinctIds = (...lists: ReadonlyArray<ReadonlyArray<unknown>>): number => {
  const ids = new Set<string>();
  for (const list of lists) {
    for (const id of list) {
      const key = idOf(id);
      if (key) ids.add(key);
    }
  }
  return ids.size;
};

export const templeFigures = (temples: ReadonlyArray<TempleLike | null | undefined>): TempleFigures => {
  const all = uniqueTemples(temples);
  let laidOut = 0;
  let foeRooms = 0;
  let treasureRooms = 0;
  for (const temple of all) {
    const layout = layoutOf(temple);
    if (!layout) continue;
    laidOut += 1;
    for (const cell of cellsOf(layout.maze)) {
      const type = Object.prototype.hasOwnProperty.call(layout.rooms, cell) ? layout.rooms[cell]?.type : undefined;
      if (isFoeRoom(type)) foeRooms += 1;
      else if (isTreasureRoom(type)) treasureRooms += 1;
    }
  }
  return {
    total: all.length,
    laidOut,
    foeRooms,
    treasureRooms,
    avgFoes: laidOut ? whole(foeRooms / laidOut) : 0,
    avgTreasure: laidOut ? whole(treasureRooms / laidOut) : 0,
  };
};

// --- all of it -------------------------------------------------------------------------------

export const compendiumStats = (input: CompendiumInput, now: Date = new Date()): CompendiumStats => {
  const heroes = heroesOf(input.profiles);
  return {
    vitals: vitalsFigures(heroes),
    gold: goldFigures(heroes, input.quests, input.questLog, now),
    experience: experienceFigures(heroes, input.quests, input.questLog, now),
    abilities: abilityFigures(heroes, input.quests, now),
    beasts: beastFigures(input.beasts, input.quests, input.questLog, heroes, now),
    temples: templeFigures(input.temples),
  };
};

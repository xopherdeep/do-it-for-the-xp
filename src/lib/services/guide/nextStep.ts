/**
 * The Guide: the one thing a hero should do next, read off their real progress so it moves on by itself.
 *
 * The path (owner's ask, 2026-10-16: "the game should tell the hero what to do next"):
 *   1. Open the Beast Log and meet today's chore beasts.
 *   2. Walk to the Wind Temple on the Plains (on foot, the Plains are the only region open).
 *   3. Clear the first room.
 *   4. Free Aura, the first Pegasus (it unlocks flying).
 *   5. Visit the shop and spend the temple's gold.
 *   6. Fly to the next temple and free its Pegasus, eight more times.
 *   7. All nine free: the Sky Champion celebration (a title and a one-time reward).
 *   8. After that the Guide never runs out: save a streak at risk, beat today's beasts, or come back tomorrow.
 *
 * Pure: no storage, no Vue, no stores. useGuide.ts gathers the progress and the portal shows the step.
 */

/** One stop on the temple path, in the order the Guide sends the hero. */
export interface GuideTemple {
  templeId: string;
  /** How the temple reads mid-sentence: "the Howling Spire", "Selene's Silent Court" */
  place: string;
  /** The region it stands in, mid-sentence: "the Plains" */
  region: string;
  /** The region page's route name */
  route: string;
  /** Index into `stats.pegasi` (PEGASI in TemplePegasus.ts) */
  pegasus: number;
  pegasusName: string;
}

/**
 * The nine temples in Guide order: the Wind Temple first (the only one reachable on foot), the Moon last as the finale.
 * Names follow TEMPLE_METADATA, routes WORLD_REGIONS and Pegasi PEGASI; guideSteps.spec.ts holds them together.
 */
export const GUIDE_TEMPLES: readonly GuideTemple[] = [
  { templeId: "wind-temple", place: "the Howling Spire", region: "the Plains", route: "world-plains", pegasus: 3, pegasusName: "Aura" },
  { templeId: "earth-temple", place: "the Rootvault Hollow", region: "the Forest", route: "world-forest", pegasus: 4, pegasusName: "Terra" },
  { templeId: "water-temple", place: "the Tidesong Palace", region: "the Islands", route: "world-islands", pegasus: 6, pegasusName: "Aqua" },
  { templeId: "fire-temple", place: "the Emberforge Citadel", region: "the Mountains", route: "world-mountains", pegasus: 1, pegasusName: "Ignis" },
  { templeId: "ice-temple", place: "the Glasswinter Keep", region: "the Tundra", route: "world-ice", pegasus: 5, pegasusName: "Glacie" },
  { templeId: "light-temple", place: "the Sunspire Sanctum", region: "the Sands", route: "world-sands", pegasus: 2, pegasusName: "Sol" },
  { templeId: "shadow-temple", place: "the Moonveil Shrine", region: "the Swamps", route: "world-swamps", pegasus: 7, pegasusName: "Venenum" },
  { templeId: "storm-temple", place: "the Thunderhead Aerie", region: "the Clouds", route: "world-clouds", pegasus: 0, pegasusName: "Ventus" },
  { templeId: "moon-temple", place: "Selene's Silent Court", region: "the Moon", route: "the-moon", pegasus: 8, pegasusName: "Umbra" },
];

export const PEGASUS_COUNT = 9;

/** The title an all-nine hero earns, and what it pays once. */
export const CHAMPION_TITLE = "Sky Champion";
export const CHAMPION_REWARD = Object.freeze({ xp: 500, gp: 300, ap: 9 });

/** Who speaks the Guide's lines (the same voice as the first-run tour). */
export const GUIDE_SPEAKER = "Guide";

/** What a hero's temple record says, boiled down. */
export interface GuideTempleProgress {
  /** Rooms the hero has stood in (the entrance counts) */
  visitedRooms: number;
  /** Rooms won (the "temple cleared" mark not counted) */
  clearedRooms: number;
  cleared: boolean;
}

export interface GuideProgress {
  /** Opened the Beast Log, or already finished a quest */
  questsSeen: boolean;
  /** Walked into a shop */
  shopSeen: boolean;
  /** Already had the Sky Champion celebration */
  champion: boolean;
  /** Nine flags in the order of `stats.pegasi` */
  pegasi: readonly boolean[];
  /** By temple id; a temple never entered may be missing */
  temples: Readonly<Record<string, GuideTempleProgress>>;
  /** Quests still open on today's board */
  openQuests: number;
  /** The daily streak's current run */
  streakDays: number;
  /** A run is going and today is not kept yet */
  streakAtRisk: boolean;
}

export type GuideStepId =
  | "quests"
  | "walk-to-temple"
  | "first-room"
  | "free-pegasus"
  | "shop"
  | "fly-to-temple"
  | "champion"
  | "save-streak"
  | "daily-beasts"
  | "rest";

/** Where the Go button leads: a route (the caller adds the hero's id), or the champion celebration. */
export type GuideGo =
  | { kind: "route"; name: string; params?: Record<string, string> }
  | { kind: "celebrate" };

export interface GuideStep {
  id: GuideStepId;
  /** Changes whenever the step does (two "free a Pegasus" steps differ by temple), for the tracker's pulse */
  key: string;
  /** The tracker's one line */
  title: string;
  /** What the Guide says when the tracker is tapped */
  lines: string[];
  goLabel: string;
  go: GuideGo;
  /** Pegasi freed so far, for the "3 / 9" chip */
  freed: number;
  /** The hero is a Sky Champion */
  champion: boolean;
}

/** The nine flags from a profile: a list, an index-keyed map from older saves, or nothing. */
export const normalPegasi = (slots: unknown): boolean[] => {
  const flags = Array.from({ length: PEGASUS_COUNT }, () => false);
  const isList = Array.isArray(slots);
  const isMap = !isList && Boolean(slots) && typeof slots === "object";
  const hasSlots = isList || isMap;
  if (!hasSlots) return flags;
  const source = slots as Record<number, unknown>;
  for (let i = 0; i < PEGASUS_COUNT; i += 1) flags[i] = Boolean(source[i]);
  return flags;
};

export const freedCount = (pegasi: readonly boolean[]): number => pegasi.filter(Boolean).length;

/** The mark TempleSystem keeps in clearedRooms for an opened gate (templeReset.ts TEMPLE_CLEARED_KEY). */
const TEMPLE_CLEARED_MARK = "temple:cleared";

/** A saved temple record (TempleProgressDb), boiled down for the Guide. */
export const templeProgressOf = (entry: {
  visitedRooms?: readonly string[];
  clearedRooms?: readonly string[];
  timesCleared?: number;
}): GuideTempleProgress => {
  const cleared = entry.clearedRooms ?? [];
  const hasClearMark = cleared.includes(TEMPLE_CLEARED_MARK);
  return {
    visitedRooms: entry.visitedRooms?.length ?? 0,
    clearedRooms: cleared.filter((room) => room !== TEMPLE_CLEARED_MARK).length,
    cleared: hasClearMark || (entry.timesCleared ?? 0) > 0,
  };
};

const NOT_ENTERED: GuideTempleProgress = Object.freeze({ visitedRooms: 0, clearedRooms: 0, cleared: false });

const capital = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? "" : "s"}`;


/**
 * Go never drops the hero inside a temple (owner, 2026-10-18): it leads to the region the temple stands in, and the hero
 * walks through the door themselves. A flight goes to the world map, where the hero picks the region and flies.
 */
const toRegion = (temple: GuideTemple): GuideGo => ({ kind: "route", name: temple.route });

const WORLD_MAP: GuideGo = { kind: "route", name: "world-map" };

const BEAST_LOG: GuideGo = { kind: "route", name: "my-tasks" };

/** The first temple on the path whose Pegasus is still trapped, or null when all nine fly. */
export const nextTemple = (pegasi: readonly boolean[]): GuideTemple | null =>
  GUIDE_TEMPLES.find((temple) => !pegasi[temple.pegasus]) ?? null;

/** The steps once all nine Pegasi are free: there is always something, so the Guide never dead-ends. */
const championStep = (progress: GuideProgress, freed: number): GuideStep => {
  const base = { freed, champion: true };
  const isStreakAtRisk = progress.streakAtRisk;
  if (isStreakAtRisk) {
    return {
      ...base,
      id: "save-streak",
      key: `save-streak:${progress.streakDays}`,
      title: `Save your ${progress.streakDays}-day streak`,
      lines: [
        `Champion, your ${progress.streakDays}-day streak needs you!`,
        "Beat one chore beast before bedtime to keep it alive.",
      ],
      goLabel: "Beast Log",
      go: BEAST_LOG,
    };
  }
  const hasOpenQuests = progress.openQuests > 0;
  if (hasOpenQuests) {
    return {
      ...base,
      id: "daily-beasts",
      key: `daily-beasts:${progress.openQuests}`,
      title: `Beat today's beasts (${progress.openQuests} left)`,
      lines: [
        "The Pegasi are safe, but chore beasts come back every day.",
        `${plural(progress.openQuests, "beast")} still ${progress.openQuests === 1 ? "waits" : "wait"} on today's board. A true champion keeps the village clean!`,
      ],
      goLabel: "Beast Log",
      go: BEAST_LOG,
    };
  }
  const streakLine =
    progress.streakDays > 0
      ? `Come back tomorrow to grow your streak to ${progress.streakDays + 1} days.`
      : "Come back tomorrow and start a new streak.";
  return {
    ...base,
    id: "rest",
    key: `rest:${progress.streakDays}`,
    title: "All done today, champion!",
    lines: ["Every beast on today's board is beaten. Nice work!", streakLine],
    goLabel: "Beast Log",
    go: BEAST_LOG,
  };
};

/** The one next step for this hero. */
export const nextGuideStep = (progress: GuideProgress): GuideStep => {
  const pegasi = normalPegasi(progress.pegasi);
  const freed = freedCount(pegasi);
  const base = { freed, champion: progress.champion };

  const isBrandNew = !progress.questsSeen && freed === 0;
  if (isBrandNew) {
    return {
      ...base,
      id: "quests",
      key: "quests",
      title: "Meet your chore beasts",
      lines: [
        "First, meet your chore beasts! Every chore is a beast, and your Beast Log lists today's.",
        "Finish a real chore, then tap it to win XP and GP!",
      ],
      goLabel: "Beast Log",
      go: BEAST_LOG,
    };
  }

  const temple = nextTemple(pegasi);
  if (!temple) {
    const isCrowned = progress.champion;
    if (isCrowned) return championStep(progress, freed);
    return {
      ...base,
      id: "champion",
      key: "champion",
      title: "All nine Pegasi are free!",
      lines: ["You did it! All nine Pegasi fly free again.", "Come and claim your reward, hero!"],
      goLabel: "Celebrate",
      go: { kind: "celebrate" },
    };
  }

  const isFirstPegasus = freed === 0;
  const needsShop = !isFirstPegasus && !progress.shopSeen;
  if (needsShop) {
    return {
      ...base,
      id: "shop",
      key: "shop",
      title: "Visit the shop",
      lines: [
        "You can fly now! But first, a hero needs good gear.",
        "Spend some of your GP at the Accessory Shop in Home Town.",
      ],
      goLabel: "Go shopping",
      go: { kind: "route", name: "shop" },
    };
  }

  const record = progress.temples[temple.templeId] ?? NOT_ENTERED;
  const hasEntered = record.visitedRooms > 0;
  if (!hasEntered) {
    if (isFirstPegasus) {
      return {
        ...base,
        id: "walk-to-temple",
        key: `walk-to-temple:${temple.templeId}`,
        title: `Walk to ${temple.place}`,
        lines: [
          `${capital(temple.place)} is the Wind Temple on ${temple.region}. ${temple.pegasusName}, the first Pegasus, is trapped inside!`,
          "Walk to the Plains and step through the temple doors.",
        ],
        goLabel: "To the Plains",
        go: toRegion(temple),
      };
    }
    return {
      ...base,
      id: "fly-to-temple",
      key: `fly-to-temple:${temple.templeId}`,
      title: `Fly to ${temple.place}`,
      lines: [
        `${temple.pegasusName} is trapped in ${temple.place} on ${temple.region}.`,
        "Open the world map, fly there with your Pegasus and step inside.",
      ],
      goLabel: "World map",
      go: WORLD_MAP,
    };
  }

  const hasWonARoom = record.clearedRooms > 0 || record.visitedRooms > 1;
  const needsFirstRoom = isFirstPegasus && !hasWonARoom;
  if (needsFirstRoom) {
    return {
      ...base,
      id: "first-room",
      key: `first-room:${temple.templeId}`,
      title: "Clear your first room",
      lines: [
        "Temples are mazes full of beasts, locked doors and treasure.",
        "Beat what waits in the room, then pick a door and keep exploring.",
      ],
      goLabel: `To ${temple.region}`,
      go: toRegion(temple),
    };
  }

  return {
    ...base,
    id: "free-pegasus",
    key: `free-pegasus:${temple.templeId}`,
    title: `Free ${temple.pegasusName}`,
    lines: [
      `${temple.pegasusName} waits behind the boss of ${temple.place}.`,
      "Find the boss, win, and open the Pegasus chest to set it free!",
    ],
    goLabel: `To ${temple.region}`,
    go: toRegion(temple),
  };
};

/** The heading over the Guide's first speech. */
export const GUIDE_INTRO_TITLE = "Your big quest";

/** What the Guide says right after the first-run tour: the goal of the whole game in plain steps. */
export const GUIDE_INTRO_LINES: readonly string[] = [
  "Welcome, hero! Let me tell you about your big quest.",
  "Nine Pegasi are trapped in nine temples across the world. Only you can set them free!",
  "Beat chore beasts in real life to earn XP and GP. That makes you strong enough for the temples.",
  "Then head to the Wind Temple on the Plains. Free Aura, the first Pegasus, and you can fly anywhere!",
  "Your next step always sits at the top of the screen. Tap it any time and I'll help.",
];

/** The Sky Champion celebration, said when the ninth Pegasus is free. */
export const CHAMPION_LINES: readonly string[] = [
  "Ventus, Ignis, Sol, Aura, Terra, Glacie, Aqua, Venenum and Umbra fly free again!",
  "The whole world is safe, and it's all thanks to you.",
  `From now on you are a ${CHAMPION_TITLE}!`,
  "But chore beasts never really go away. Keep beating them every day and keep your streak alive!",
];

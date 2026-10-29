export type WidgetThemeId = "earthbound" | "gameboy" | "lava" | "dungeon" | "gold";

export interface WidgetThemeConfig {
  id: WidgetThemeId;
  name: string;
  borderColor: string;
  backgroundColor: string;
  accentColor: string;
  textColor: string;
}

export const WIDGET_THEMES: Record<WidgetThemeId, WidgetThemeConfig> = {
  earthbound: {
    id: "earthbound",
    name: "Onett Blue",
    borderColor: "#4a75a0",
    backgroundColor: "#18233c",
    accentColor: "#ffd84a",
    textColor: "#ffffff"
  },
  gameboy: {
    id: "gameboy",
    name: "Retro Monochrome",
    borderColor: "#306230",
    backgroundColor: "#0f380f",
    accentColor: "#8bac0f",
    textColor: "#9bbc0f"
  },
  lava: {
    id: "lava",
    name: "Molten Ruby",
    borderColor: "#b71c1c",
    backgroundColor: "#2b0d0d",
    accentColor: "#ff5252",
    textColor: "#ffebee"
  },
  dungeon: {
    id: "dungeon",
    name: "Obsidian Deep",
    borderColor: "#424242",
    backgroundColor: "#121214",
    accentColor: "#9c27b0",
    textColor: "#f5f5f5"
  },
  gold: {
    id: "gold",
    name: "Hometown Royal",
    borderColor: "#ffb300",
    backgroundColor: "#261c02",
    accentColor: "#ffd700",
    textColor: "#fff8e1"
  }
};

/**
 * The payload version the native side reads. Bump it whenever a field the Java
 * relies on changes shape: `XpWidgetPlugin` keeps the raw JSON in SharedPreferences,
 * so a widget can wake up holding a payload written by an older build.
 */
export const WIDGET_PAYLOAD_VERSION = 2;

/** One quest row as a widget shows it. */
export interface WidgetQuestRowPayload {
  id: string;
  title: string;
  /** Epoch ms, so the native side can re-label a stale payload after midnight; null when the quest has no due time */
  dueAt: number | null;
  /** "6:00pm", "Tomorrow 6:00pm", "Anytime" - what the app itself would show right now */
  dueLabel: string;
  status: "open" | "overdue" | "later" | "pending" | "done";
  xpReward: number;
  gpReward: number;
  requiresPhoto: boolean;
  requiresApproval: boolean;
}

/** One hero's glanceable state. Every number is already finite: the extractor guarantees it. */
export interface WidgetHeroPayload {
  id: string;
  name: string;
  level: number;
  className: string;
  /** The avatar slug ("003-gamer"), not a number: profiles store it as a string */
  avatar: string;
  /** Rendered 3D voxel character snapshot PNG data URL or empty */
  avatarImage?: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  xp: number;
  nextLevelXp: number;
  /** The wallet */
  gp: number;
  savings: number;
  ap: number;
  streak: number;
  /** The streak day that opens the next chest (streakChests.ts), and what that chest pays */
  nextChestDay: number;
  nextChestXp: number;
  nextChestGp: number;
  /** questListCounts for this hero, so a widget can show a count without walking the rows */
  counts: {
    overdue: number;
    open: number;
    later: number;
    pending: number;
    done: number;
  };
}

/**
 * What the app hands the native widgets. Keyed by hero because the family shares a
 * tablet: a widget bound to a hero reads `heroes[boundId]`, and one that is not yet
 * bound falls back to `primaryHeroId` (whoever is signed in).
 */
export interface WidgetSyncPayload {
  version: number;
  /** The signed-in hero: the fallback for any widget with no hero of its own */
  primaryHeroId: string;
  heroes: Record<string, WidgetHeroPayload>;
  questsByHero: Record<string, WidgetQuestRowPayload[]>;
  timestamp: number;
  /** Active RPG game style (earthbound, finalFantasy, chronoTrigger, etc.) */
  gameStyle?: string;
}

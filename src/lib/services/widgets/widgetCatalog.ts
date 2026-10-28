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

export interface WidgetHeroPayload {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  xp: number;
  nextLevelXp: number;
  gp: number;
  streak: number;
  className?: string;
  avatarNumber?: number;
}

export interface WidgetQuestRowPayload {
  id: string;
  title: string;
  dueLabel: string;
  status: "open" | "overdue" | "later" | "pending" | "done";
  xpReward: number;
  gpReward: number;
  requiresPhoto: boolean;
}

export interface WidgetSyncPayload {
  hero: WidgetHeroPayload;
  quests: WidgetQuestRowPayload[];
  streak: {
    current: number;
    multiplier: number;
  };
  bank: {
    wallet: number;
    savings: number;
  };
  timestamp: number;
}

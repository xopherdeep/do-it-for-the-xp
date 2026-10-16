import type { GpEntryKind } from "@/lib/services/gp/gpLedger";
/**
 * Level-up information returned from updateUserXP
 */
export interface LevelUpInfo {
  didLevelUp: boolean;
  oldLevel: number;
  newLevel: number;
  levelsGained: number;
  hpGained: number;
  mpGained: number;
  newMaxHp: number;
  newMaxMp: number;
  statsGained?: Record<string, number>;
}

/**
 * Class Level-up information returned from updateClassXp
 */
export interface ClassLevelUpInfo {
  didLevelUp: boolean;
  oldLevel: number;
  newLevel: number;
  levelsGained: number;
  jobClassId: string;
}

/** What updateUserGP is given: the hero and the amounts to add to each part of the purse */
export interface GpPayload {
  userId: string;
  wallet?: number;
  savings?: number;
  debt?: number;
  /** A change to what the hero owes the Hospital (negative pays it down) */
  hospitalBill?: number;
  /** What the wallet's history calls the move ("Quest: Feed the cat"); left out, it reads "GP earned" or "GP spent" */
  note?: string;
  kind?: GpEntryKind;
  /** The other hero of a gift */
  withId?: string;
}

/** What recordAPGain is given: the hero, the AP, where it came from and (optionally) when */
export interface ApGainPayload {
  userId: string;
  amount: number;
  source: string;
  at?: string;
}

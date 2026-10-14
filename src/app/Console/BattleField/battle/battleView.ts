import type { QuestRewards } from "@/lib/databases/QuestLogDb";

/**
 * The shared vocabulary of the battle screen's components. Templates are not type-checked by
 * `tsc --noEmit`, so every component, composable and the page import these from one place
 * instead of inventing their own unions.
 */

/** Class the stage puts on the sprite container; "" means the idle float. */
export type EnemyAnimation = "" | "damaged" | "fadeout" | "victory-strobe" | "victory-fadeout";

export type EnemySize = "monster" | "miniboss" | "boss";

/** One hit on the beast: a new id floats a new "-amount" popup; `smash` is the final blow ("SMAAAASH!!"). */
export interface HitPopup {
  id: number;
  amount: number;
  smash?: boolean;
}

export type RewardTally = QuestRewards;

/** What the victory card shows while the loot counts up. */
export interface VictoryCardState {
  title: string;
  subtitle: string;
  rewards: RewardTally;
  questName?: string;
  /**
   * How many chores the hero finished in this fight and how long it took, for the "4 chores in 6:12" line. Left out
   * (a quest marked done from the Beast Log, not fought), the card has no such line.
   */
  choresDone?: number;
  elapsedMs?: number;
  /** The Game Master approves this quest before the loot lands: tiles count up locked, no level-up lines. */
  held: boolean;
  levelUp?: { from: number; to: number };
  /** The XP of `rewards.xp` that is the hunt bonus (a quest won by fighting it), for the "Hunt bonus +30 XP" line. */
  huntBonusXp?: number;
}

/** A line for the message box; `auto` lines move on by themselves once typed (chore results), tap-gated lines wait. */
export interface DialogLine {
  text: string;
  auto?: boolean;
}

/** The engine speaks in these; the page's dialog accepts strings, DialogLines and side effects. */
export type EngineMessage = string | DialogLine;

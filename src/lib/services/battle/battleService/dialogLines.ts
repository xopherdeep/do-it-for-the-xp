import type { DialogLine, EngineMessage } from "@/app/Console/BattleField/battle/battleView";
import type { Enemy, PartingDodge, PartingSoftener } from "./types";

/** A line that types out and moves on by itself, for results the hero does not need to tap through. */
export const autoLine = (text: string): DialogLine => ({ text, auto: true });

/** The chore the hero just finished, as it reads in the message box. */
export const choreUsedLines = (heroName: string, taskName: string, enemy: Enemy, damage: number): EngineMessage[] => [
  autoLine(`${heroName} used ${taskName}! ${enemy.name} took ${damage} damage!`)
];

/** One beast falls and the next steps forward. */
export const stepsForwardLines = (enemy: Enemy, next: Enemy): EngineMessage[] => [
  `${enemy.name} was defeated!`,
  `${next.name} steps forward!`
];

/** The beast's turn never waits on a tap: the brace, the strike and the hit all move on by themselves. */
export const bracesLines = (heroName: string): EngineMessage[] => [autoLine(`${heroName} braces!`)];

/**
 * A run always works: the run, whatever the beast lands on the way out (see partingStrikeLines), then the getaway.
 * A hero the strike sent to the Hospital did not get away safely, so `hasGotAway` is false and the line is left out.
 */
export const runAwayLines = (partingLines: EngineMessage[] = [], hasGotAway = true): EngineMessage[] => [
  autoLine("Running away..."),
  ...partingLines,
  ...(hasGotAway ? ["Got away safely!"] : [])
];

/**
 * The parting strike that landed. `softener` says who took the edge off (a brace, or a Thief's slip) and
 * `emptied` that the strike took the hero's last HP: they stagger away and wake up in the Hospital
 * (docs/Quest-Rooms-Spec.md 5.6).
 */
export const partingStrikeLines = (
  enemy: Enemy,
  heroName: string,
  damage: number,
  softener: PartingSoftener | null,
  emptied = false
): EngineMessage[] => {
  const lead = `${enemy.name} strikes as ${heroName} flees!`;
  if (emptied) return [`${lead} ${heroName} staggers away... and wakes up in the Hospital.`];
  const isBraced = softener === 'brace';
  if (isBraced) return [`${lead} ${heroName} braced: only ${damage} damage!`];
  const isSlipping = softener === 'slip';
  if (isSlipping) return [`${lead} ${heroName} slips most of it: only ${damage} damage!`];
  return [`${lead} ${heroName} takes ${damage} damage!`];
};

/** Trained agility: the parting strike finds nobody. */
export const nimbleDodgeLine = (enemy: Enemy, heroName: string): string =>
  `${enemy.name} lunges, but ${heroName} is too quick to catch!`;

/** Why the first strike of a Ninja's fight misses. */
export const shadowStrikeLine = (enemy: Enemy, heroName: string): string =>
  `${enemy.name} strikes at a shadow! ${heroName} is already elsewhere.`;

export const frozenStrikeLine = (enemy: Enemy): string => `${enemy.name} is frozen solid and cannot strike!`;

export const stunnedStrikeLine = (enemy: Enemy): string => `${enemy.name} is stunned and misses its strike!`;

/** The hit lands when this line moves on, by itself or on a tap: waiting on it never holds the strike back. */
export const attacksLines = (enemy: Enemy): EngineMessage[] => [autoLine(`${enemy.name} attacks!`)];

export const damageTakenLines = (heroName: string, damage: number, braced: boolean): EngineMessage[] => [
  autoLine(braced ? `${heroName} braced: only ${damage} damage!` : `${heroName} takes ${damage} damage!`)
];

export const fallenLines = (heroName: string): EngineMessage[] => [`${heroName} has fallen!`, 'You blacked out...'];

const PARTING_DODGE_LINES: Record<PartingDodge, (enemy: Enemy, heroName: string) => string> = {
  vanish: (enemy) => `${enemy.name} swings at empty air.`,
  shadow: shadowStrikeLine,
  frozen: frozenStrikeLine,
  hammer: stunnedStrikeLine,
  agility: nimbleDodgeLine,
};

/** Why the parting strike missed, as the message box says it. */
export const partingDodgeLine = (dodge: PartingDodge, enemy: Enemy, heroName: string): string =>
  PARTING_DODGE_LINES[dodge](enemy, heroName);

/** When the hero bribes the enemy with GP to escape safely without taking a parting strike. */
export const bribeLines = (
  enemy: Enemy,
  heroName: string,
  tier: "full" | "low",
  cost: number
): EngineMessage[] => {
  const isFullBribe = tier === "full";
  if (isFullBribe) {
    return [
      autoLine(`${heroName} bribed ${enemy.name} with ${cost} GP!`),
      `${enemy.name} happily took the gold and let them pass!`,
      "Got away safely!",
    ];
  }
  return [
    autoLine(`${heroName} tossed only ${cost} GP to ${enemy.name}!`),
    `${enemy.name} snatched the coins with a glare and holds a grudge!`,
    "Got away safely!",
  ];
};


import type { DialogLine, EngineMessage } from "@/app/Console/BattleField/battle/battleView";
import type { Enemy } from "./types";

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

export const bracesLines = (heroName: string): EngineMessage[] => [`${heroName} braces!`];

export const runAwayLines = (): EngineMessage[] => [autoLine("Running away..."), "Got away safely!"];

export const blockedPathLines = (enemy: Enemy | null): EngineMessage[] => [
  "Couldn't escape!",
  `${enemy?.name ?? 'The enemy'} blocks your path!`
];

/** Why the first strike of a Ninja's fight misses. */
export const shadowStrikeLine = (enemy: Enemy, heroName: string): string =>
  `${enemy.name} strikes at a shadow! ${heroName} is already elsewhere.`;

export const frozenStrikeLine = (enemy: Enemy): string => `${enemy.name} is frozen solid and cannot strike!`;

export const stunnedStrikeLine = (enemy: Enemy): string => `${enemy.name} is stunned and misses its strike!`;

export const attacksLines = (enemy: Enemy): EngineMessage[] => [`${enemy.name} attacks!`];

export const damageTakenLines = (heroName: string, damage: number, braced: boolean): EngineMessage[] => [
  braced ? `${heroName} braced: only ${damage} damage!` : `${heroName} takes ${damage} damage!`
];

export const fallenLines = (heroName: string): EngineMessage[] => [`${heroName} has fallen!`, 'You blacked out...'];

/**
 * Casting a Power on the Powers page when the Power bends the quest board (Snooze, Extra Time, Quiet Day, Trusted
 * Hour): ask which quest first when the effect needs one, check the effect can land before anything is charged,
 * cast, then land it. The rules are PowerBoardEffects; this module only orders the steps, and the page stays thin.
 *
 * Rule zero: no Power completes a chore or changes its rewards.
 */
import type { Ability } from "@/types/abilities";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import {
  POWER_BOARD_EFFECTS,
  applyPowerBoardEffect,
  boardEffectOfPower,
  powerBoardEffectBlocked,
} from "@/lib/services/abilities/PowerBoardEffects";

/** What the page hands in: the hero's quest picker, the real cast (it charges the MP and toasts its own refusals). */
export interface BoardCastDeps {
  /** The quests open on the hero's board today */
  openQuests(): Promise<QuestBoardItem[]>;
  /** Asks the hero which quest; resolves with its id, or null when they back out */
  selectQuest(choices: QuestBoardItem[], header: string): Promise<string | null>;
  cast(abilityId: string, userId: string): Promise<{ ok: boolean }>;
  now?: Date;
}

export interface BoardCastOutcome {
  /** cast: charged (a board Power also landed); cancelled: the hero backed out; refused: nothing charged, `line` says why; failed: the cast itself said no and has told the hero */
  status: "cast" | "cancelled" | "refused" | "failed";
  line?: string;
  /** A play$fx key */
  sound?: string;
}

/** Cast the Power; one that bends the board asks, checks and lands its effect around the cast. */
export const castWithBoardEffect = async (
  ability: Ability,
  userId: string,
  deps: BoardCastDeps
): Promise<BoardCastOutcome> => {
  const effect = boardEffectOfPower(ability);
  if (!effect) {
    const plain = await deps.cast(ability.id, userId);
    return { status: plain.ok ? "cast" : "failed" };
  }

  let questId: string | undefined;
  const asksForQuest = POWER_BOARD_EFFECTS[effect].picksQuest;
  if (asksForQuest) {
    const choices = await deps.openQuests();
    const isBoardEmpty = choices.length === 0;
    if (isBoardEmpty) return { status: "refused", line: "No open quests on the board." };
    const picked = await deps.selectQuest(choices, `${ability.name}: ${POWER_BOARD_EFFECTS[effect].label}`);
    const isBackedOut = picked === null;
    if (isBackedOut) return { status: "cancelled" };
    questId = picked;
  }

  // Asked before the cast, so a Power that cannot land costs nothing
  const context = { userId, questId, now: deps.now };
  const refusal = await powerBoardEffectBlocked(effect, context);
  if (refusal) return { status: "refused", line: refusal, sound: "no" };

  const casted = await deps.cast(ability.id, userId);
  const isCastRefused = !casted.ok;
  if (isCastRefused) return { status: "failed" };

  const landed = await applyPowerBoardEffect(effect, context);
  return { status: "cast", line: landed.line, sound: landed.sound };
};

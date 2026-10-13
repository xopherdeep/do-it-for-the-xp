import type { QuestLogEntry, QuestRewards } from "@/lib/databases/QuestLogDb";

/**
 * The hunt bonus: a quest finished by winning its fight pays more XP than claiming it from the beast card's checklist.
 * XP only (GP mirrors real money, AP gates Powers). Pure: no storage, no Vue, so the beast card, the fight's rewards and
 * the Game Master's approval all read one number.
 *
 * A quest that pays at once earns it on the win (battleRewards). A quest the Game Master approves is held by
 * `completeQuest(..., "battle")`, which writes the bonus on the hold (`QuestLogEntry.huntBonusXp`), and the approval
 * pays it on top, once. A claim from the card never carries it.
 */

/** The extra XP a hunt pays over a plain claim, as a fraction: 0.25 is +25%. */
export const HUNT_BONUS_XP = 0.25;

/** "Hunt bonus +25% XP": the second line of the Hunt button. */
export function huntBonusLabel(bonus: number = HUNT_BONUS_XP): string {
  return `Hunt bonus +${Math.round(bonus * 100)}% XP`;
}

/** The whole extra XP a hunt pays on top of `xp` (none for a quest that pays no XP). */
export function huntBonusXpOn(xp: number, bonus: number = HUNT_BONUS_XP): number {
  return xp > 0 ? Math.round(xp * bonus) : 0;
}

/** A held entry's rewards with the hunt bonus it will be paid on approval (the quest's rate when it carries none). */
export function withHuntBonus(entry: Pick<QuestLogEntry, "rewards" | "huntBonusXp">): QuestRewards {
  const bonus = Number(entry.huntBonusXp);
  const owed = Number.isFinite(bonus) && bonus > 0 ? Math.round(bonus) : 0;
  return owed ? { ...entry.rewards, xp: entry.rewards.xp + owed } : entry.rewards;
}

/**
 * Townsfolk point the way (owner, 2026-10-18: "tell you what to do next through NPCs, like a game"). The shopkeeper, the
 * hotel concierge and the banker each add one line of news to their greeting: the hero's next step as a rumor, in their
 * own voice, never a shortcut. Each says a piece of news once; the next visit they only greet, until the step moves on.
 *
 * Pure: the screens read the step from useGuide and remember what was heard through guideState.
 */
import type { GuideStep } from "./nextStep";

export type NpcRole = "shop" | "hotel" | "bank";

/** How each townsperson leads into the news. */
export const NPC_OPENERS: Readonly<Record<NpcRole, string>> = {
  shop: "Psst, a tip with your shopping.",
  hotel: "A traveler stopped by the desk with news.",
  bank: "Between you and me, a banker hears things.",
};

/** The line a townsperson adds to their greeting, or null when they already told this hero this piece of news. */
export const npcHintLine = (
  role: NpcRole,
  step: Pick<GuideStep, "key" | "hint">,
  heard: Readonly<Record<string, string>> | undefined
): string | null => {
  const isOldNews = heard?.[role] === step.key;
  return isOldNews ? null : `${NPC_OPENERS[role]} ${step.hint}`;
};

/** A greeting with the news slipped in before its last line (the line that asks what the hero wants). */
export const linesWithNews = (lines: readonly string[], news: string | null): string[] => {
  if (!news) return [...lines];
  const cut = Math.max(0, lines.length - 1);
  return [...lines.slice(0, cut), news, ...lines.slice(cut)];
};

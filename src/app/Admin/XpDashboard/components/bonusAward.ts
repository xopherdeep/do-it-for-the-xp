/**
 * The Game Master's Add Bonus / Take away Points sheet, as plain rules: what a typed or tapped
 * amount means, when the award button may be pressed, and what the wallet history says about it.
 * XpBonus.vue stays a thin screen over these.
 */

/** A note the Game Master writes is one short line in the wallet history */
export const MAX_NOTE_LENGTH = 120;

/** What the points fields hold: tapped presets are numbers, a typed amount may come back as text */
export interface AwardInput {
  gp: unknown;
  xp: unknown;
  ap: unknown;
}

export interface AwardAmounts {
  gp: number;
  xp: number;
  ap: number;
}

/** What the sheet hands back to the dashboard when it closes after an award */
export interface AwardResult extends AwardAmounts {
  isPenalty: boolean;
  members: string[];
  /** The Game Master's own words, empty when none were written */
  note: string;
}

/** An amount as a whole number: "" , null, text and NaN all read as 0 (and never -0) */
export const toAmount = (raw: unknown): number => {
  const amount = Math.round(Number(raw));
  return Number.isFinite(amount) ? amount || 0 : 0;
};

/** What each field pays: a penalty only takes GP away, so XP and AP are 0 and the GP is always negative */
export const awardAmounts = (isPenalty: boolean, input: AwardInput): AwardAmounts => {
  const gp = toAmount(input.gp);
  if (isPenalty) return { gp: -Math.abs(gp) || 0, xp: 0, ap: 0 };
  return { gp, xp: toAmount(input.xp), ap: toAmount(input.ap) };
};

/** The award button is open when someone is picked and something would actually move */
export const canAward = (memberCount: number, amounts: AwardAmounts): boolean => {
  const hasRecipients = memberCount > 0;
  const movesSomething = amounts.gp !== 0 || amounts.xp > 0 || amounts.ap > 0;
  return hasRecipients && movesSomething;
};

/** The Game Master's note as one trimmed line of at most MAX_NOTE_LENGTH characters */
export const tidyNote = (raw: unknown): string => {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_NOTE_LENGTH).trimEnd();
};

/** What the wallet history calls a Game Master's GP award: their note when given, else the default wording */
export const gmGpNote = (gp: number, note?: unknown): string => {
  const defaultWording = gp > 0 ? "Game Master bonus" : "Game Master penalty";
  return tidyNote(note) || defaultWording;
};

export const awardResult = (isPenalty: boolean, members: string[], amounts: AwardAmounts, note: unknown): AwardResult => ({
  isPenalty,
  members: [...members],
  ...amounts,
  note: tidyNote(note),
});

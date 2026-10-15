/**
 * The shapes and small rules behind the in-world prompt (XpRevealPrompt): what a building asks the hero, and how the
 * amount stepper behaves. Pure, so it is tested without a screen. A prompt is a speaker's lines, a menu of choices and,
 * for a number, a stepper with preset chips (never a keyboard).
 */

/** The pictures that can rise in the light above the dialog (revealSprites.ts). */
export type RevealSpriteName = 'chest' | 'chestOpen' | 'coins' | 'tablet' | 'heart' | 'bed' | 'atm';

/** The colour of the light behind the sprite. */
export type RevealGlow = 'gold' | 'sky' | 'mint' | 'rose' | 'amber';

/** How a choice reads: the thing to do (primary), a plain row, or the way out (ghost, dimmer). */
export type RevealTone = 'primary' | 'plain' | 'ghost';

export interface RevealChoice {
  id: string;
  label: string;
  /** A Font Awesome duotone name ("wallet", "piggy-bank"), drawn on the row whether or not the cursor is on it */
  icon?: string;
  /** A second, smaller line under the label */
  hint?: string;
  tone?: RevealTone;
  /** Shown but out of reach */
  disabled?: boolean;
}

export interface RevealPreset {
  label: string;
  value: number;
}

/** A number pick: a +/- stepper, and preset chips such as 10 / 50 / All. */
export interface RevealAmount {
  /** The least that can be picked (default 1) */
  min?: number;
  max: number;
  /** What one tap of + or - moves (default 1) */
  step?: number;
  /** Where the stepper starts (default `min`) */
  initial?: number;
  presets?: RevealPreset[];
  /** Printed after the number (default "GP") */
  unit?: string;
}

/**
 * The accent of each building, the colour its prompt takes in place of the minty ring of the Earthbound box (the same
 * rule the app sheets follow: `--xp-app-accent`, see ion-action-sheet.xp-app-sheet in XpApp/_xp-app.scss). Region shops
 * are keyed by region id.
 */
export const BUILDING_ACCENTS: Readonly<Record<string, string>> = {
  bank: '#d4a017',
  atm: '#d4a017',
  hospital: '#e05a7a',
  hotel: '#e2783c',
  townHall: '#b8864b',
  accessoryShop: '#3f6fd8',
  plains: '#6cbf4a',
  forest: '#2f8f4e',
  islands: '#2fb8c8',
  swamps: '#7f8f3a',
  mountains: '#8a94a8',
  sands: '#d9b25f',
  tundra: '#8fd3f0',
  clouds: '#a8c8f0',
  moon: '#b39ddb',
};

/**
 * The colour a prompt's `accent` stands for: a name from BUILDING_ACCENTS ("bank") becomes its colour, any other text is
 * taken as a CSS colour, and nothing (or blank) is no accent, so the box keeps its minty ring.
 */
export const accentOf = (accent: string | undefined): string | undefined => {
  const text = typeof accent === 'string' ? accent.trim() : '';
  if (!text) return undefined;
  return Object.prototype.hasOwnProperty.call(BUILDING_ACCENTS, text) ? BUILDING_ACCENTS[text] : text;
};

export interface RevealPromptOptions {
  /** The name over the dialog: "Bank Manager" */
  speaker?: string;
  /** A heading above the dialog, in the colour of the light */
  title?: string;
  sprite?: RevealSpriteName;
  /** Defaults to gold for chests and coins, sky blue otherwise */
  glow?: RevealGlow;
  /** The building's accent in place of the box's minty ring: a name from BUILDING_ACCENTS or a CSS colour. None keeps minty. */
  accent?: string;
  /** What is said, one box at a time; a tap finishes a line, then moves to the next */
  lines: string[];
  /** The menu that appears once the last line is typed; Escape picks `cancelId` */
  choices: RevealChoice[];
  amount?: RevealAmount;
  /** The choice Escape (and a back gesture) stands for; the last choice when not named */
  cancelId?: string;
  /** The sound as the prompt opens (a key of src/assets/fx; default openMenu) */
  sound?: string;
}

/** What the hero picked; `amount` is set when the prompt asked for a number. */
export interface RevealAnswer {
  id: string;
  amount: number | null;
}

/** A prompt on screen. `key` changes with each one, so a new prompt replays the reveal. */
export interface ActiveRevealPrompt {
  key: number;
  options: RevealPromptOptions;
}

const whole = (value: unknown, fallback: number): number => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? n : fallback;
};

/** The least a stepper can show. */
export const amountMin = (amount: RevealAmount): number => Math.max(0, whole(amount.min, 1));

/** The most a stepper can show; never below the least. */
export const amountMax = (amount: RevealAmount): number => Math.max(amountMin(amount), whole(amount.max, 0));

/** A number held to the stepper's range, as a whole number. */
export const clampAmount = (value: number, amount: RevealAmount): number =>
  Math.min(amountMax(amount), Math.max(amountMin(amount), whole(value, amountMin(amount))));

/** Where the stepper starts. */
export const initialAmount = (amount: RevealAmount): number => clampAmount(amount.initial ?? amountMin(amount), amount);

/** One tap of + (direction 1) or - (-1), `times` steps at once, held to the range. */
export const stepAmount = (current: number, direction: 1 | -1, amount: RevealAmount, times = 1): number =>
  clampAmount(current + direction * Math.max(1, whole(amount.step, 1)) * times, amount);

/**
 * Preset chips for a stepper that can reach `max`: a few round numbers below it (the smallest, a middle one and the
 * largest of 10 / 50 / 100 / 500 when more than three fit) and "All" for `max` itself.
 */
export const amountPresets = (max: number, marks: number[] = [10, 50, 100, 500]): RevealPreset[] => {
  const top = whole(max, 0);
  if (top <= 0) return [];
  const below = marks.filter((mark) => mark < top);
  const picked = below.length > 3 ? [below[0], below[Math.floor(below.length / 2)], below[below.length - 1]] : below;
  return [...picked.map((value) => ({ label: String(value), value })), { label: 'All', value: top }];
};

/** The choice Escape stands for: the one named, else the last. */
export const cancelIdOf = (options: RevealPromptOptions): string => options.cancelId ?? options.choices[options.choices.length - 1]?.id ?? 'cancel';

/** The lines to say: none empty, and never none at all. */
export const linesOf = (options: RevealPromptOptions): string[] => {
  const lines = options.lines.map((line) => String(line).trim()).filter(Boolean);
  return lines.length ? lines : ['...'];
};

/** The light behind the sprite: what was asked for, else gold for chests and coins, rose for the heart, amber for the bed and sky blue for the rest. */
export const glowOf = (options: RevealPromptOptions): RevealGlow => {
  if (options.glow) return options.glow;
  if (options.sprite === 'heart') return 'rose';
  if (options.sprite === 'bed') return 'amber';
  return options.sprite === 'chest' || options.sprite === 'chestOpen' || options.sprite === 'coins' ? 'gold' : 'sky';
};

/** The answer Escape gives. */
export const cancelAnswer = (options: RevealPromptOptions): RevealAnswer => ({ id: cancelIdOf(options), amount: null });

/** One or more lines from a speaker and one OK to dismiss them; Escape is OK too. */
export const noticeOf = (speaker: string, lines: string | string[], extra: Partial<RevealPromptOptions> = {}): RevealPromptOptions => ({
  speaker,
  lines: Array.isArray(lines) ? lines : [lines],
  choices: [{ id: 'ok', label: 'OK', icon: 'check', tone: 'primary' }],
  cancelId: 'ok',
  ...extra,
});

/** The words (and optional icons) on a yes/no question's two buttons */
interface YesNoLabels {
  yes: string;
  no: string;
  yesIcon?: string;
  noIcon?: string;
}

/** A question for a speaker, answered yes (id `yes`, primary) or no (id `no`, dim; Escape is no). */
export const yesNoOf = (
  speaker: string,
  lines: string | string[],
  labels: YesNoLabels,
  extra: Partial<RevealPromptOptions> = {}
): RevealPromptOptions => ({
  speaker,
  lines: Array.isArray(lines) ? lines : [lines],
  choices: [
    { id: 'yes', label: labels.yes, icon: labels.yesIcon ?? 'check', tone: 'primary' },
    { id: 'no', label: labels.no, icon: labels.noIcon ?? 'times', tone: 'ghost' },
  ],
  cancelId: 'no',
  ...extra,
});

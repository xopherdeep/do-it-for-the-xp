/**
 * What the Hospital's nurse, the Hotel's concierge and the Town Hall's clerk ask and say, as in-world prompts (the
 * game's own dialog, not native alerts). The care prices and the quotes live in Lodging.ts; this turns them into the
 * prompt to show, in each NPC's voice, so the three screens stay thin and the wording is tested without a screen.
 */
import {
  noticeOf,
  yesNoOf,
  type RevealChoice,
  type RevealPromptOptions,
} from '@/components/organisms/RevealPrompt/revealPrompt';
import { copyFor } from '@/lib/services/copy/copy';
import type { Voice } from '@/lib/services/copy/voices';
import { HEAL_COST, REVIVE_COST, ROOM_COST } from './Lodging';
import type { BenchQuote, CareKind, CareQuote } from './Lodging';

/** GP the way the game prints it in a hometown receipt */
const gold = (value: number): string => `₲${Math.round(Number(value) || 0)}`;

// ---------------------------------------------------------------------------------------------------------------
// The Hospital: Nurse Joy
// ---------------------------------------------------------------------------------------------------------------

export const NURSE = 'Nurse Joy';

/** The ids of the nurse's menu. */
export type NurseMenuId = 'heal' | 'revive' | 'bench' | 'stats' | 'patients' | 'leave';

/** The nurse's menu, in the order the old action sheet had it. */
export const nurseMenuChoices = (): RevealChoice[] => [
  { id: 'heal', label: 'Heal Ailments', icon: 'heartbeat' },
  { id: 'revive', label: 'Revive Heroes', icon: 'sparkles' },
  { id: 'bench', label: 'Rest on a Bench (free)', icon: 'bed' },
  { id: 'stats', label: 'Check Vital Stats', icon: 'stethoscope' },
  { id: 'patients', label: 'View Patients', icon: 'users' },
  { id: 'leave', label: 'Leave Hospital', icon: 'door-open', tone: 'ghost' },
];

/** Nurse Joy speaks and the menu follows. Escape steps away from the desk (`stay`); it does not leave the hospital. */
export const nurseMenuPrompt = (lines: string[]): RevealPromptOptions => ({
  speaker: NURSE,
  accent: 'hospital',
  lines,
  choices: nurseMenuChoices(),
  cancelId: 'stay',
});

/** The price and the question, with the coins rising: heal or revive. */
export const careConfirmPrompt = (kind: Extract<CareKind, 'heal' | 'revive'>, voice: Voice = 'adventure'): RevealPromptOptions =>
  kind === 'heal'
    ? yesNoOf(NURSE, copyFor('nurse.care.heal', voice, { cost: HEAL_COST }), { yes: 'Pay & Heal', no: 'Not now', yesIcon: 'heartbeat' }, { accent: 'hospital', sprite: 'coins' })
    : yesNoOf(NURSE, copyFor('nurse.care.revive', voice, { cost: REVIVE_COST }), { yes: 'Pay & Revive', no: 'Not now', yesIcon: 'sparkles' }, { accent: 'hospital', sprite: 'coins' });

/** Nurse Joy turning a hero away: the quote said why. */
export const careRefusalLine = (quote: CareQuote, voice: Voice = 'adventure'): string => {
  if (quote.reason === 'healthy') return copyFor('nurse.refuse.healthy', voice);
  return copyFor('nurse.refuse.poor', voice, { cost: gold(quote.cost) });
};

/** The treatment is done: what was paid and where HP (and MP) stand now. */
export const careReceiptLine = (
  kind: CareKind,
  cost: number,
  hp?: { now: number; max: number } | null,
  mp?: { now: number; max: number } | null,
  voice: Voice = 'adventure'
): string => {
  const verb = kind === 'revive' ? 'Revived' : 'Healed';
  const hpText = hp ? `HP ${hp.now}/${hp.max}` : '';
  const mpText = mp ? ` MP ${mp.now}/${mp.max}` : '';
  return copyFor('nurse.receipt.care', voice, { verb, cost: gold(cost), stats: `${hpText}${mpText}` }).trim();
};

/** Nurse Joy turning a hero off the bench: the quote said why. */
export const benchRefusalLine = (quote: BenchQuote, voice: Voice = 'adventure'): string =>
  copyFor(quote.reason === 'healthy' ? 'nurse.bench.healthy' : 'nurse.bench.napped', voice);

/** The nap is over: what it restored and where HP stands. */
export const benchReceiptLine = (hpGain: number, hp?: { now: number; max: number } | null, voice: Voice = 'adventure'): string => {
  const hpText = hp ? ` HP ${hp.now}/${hp.max}` : '';
  return copyFor('nurse.bench.receipt', voice, { gain: hpGain, hp: hpText });
};

/** What Nurse Joy says after a treatment or a refusal: her line, the heart rising for a treatment. */
export const nurseNotice = (line: string, sprite?: RevealPromptOptions['sprite']): RevealPromptOptions =>
  noticeOf(NURSE, line, { accent: 'hospital', sprite });

// ---------------------------------------------------------------------------------------------------------------
// The Hotel
// ---------------------------------------------------------------------------------------------------------------

/** Who answers at the front desk. */
export const CONCIERGE = 'Hotel Concierge';

/** The ids of the concierge's menu. */
export type ConciergeMenuId = 'room' | 'events' | 'leave';

/** The concierge's menu, in the order the old action sheet had it. */
export const conciergeMenuChoices = (): RevealChoice[] => [
  { id: 'room', label: 'Rent a Room', icon: 'bed' },
  { id: 'events', label: 'Community Events', icon: 'calendar-alt' },
  { id: 'leave', label: 'Leave Hotel', icon: 'door-open', tone: 'ghost' },
];

/** The concierge speaks and the menu follows. Escape steps away from the desk (`stay`). */
export const conciergeMenuPrompt = (lines: string[]): RevealPromptOptions => ({
  speaker: CONCIERGE,
  accent: 'hotel',
  lines,
  choices: conciergeMenuChoices(),
  cancelId: 'stay',
});

/** The room's price and the question, with the bed rising. */
export const roomConfirmPrompt = (voice: Voice = 'adventure'): RevealPromptOptions =>
  yesNoOf(
    CONCIERGE,
    copyFor('hotel.room.confirm', voice, { cost: ROOM_COST }),
    { yes: 'Pay & Rest', no: 'Not tonight', yesIcon: 'moon' },
    { accent: 'hotel', sprite: 'bed' }
  );

/** The concierge turning a guest away: the quote said why. */
export const roomRefusalLine = (quote: CareQuote, voice: Voice = 'adventure'): string => {
  if (quote.reason === 'healthy') return copyFor('hotel.refuse.healthy', voice);
  return copyFor('hotel.refuse.poor', voice, { cost: gold(quote.cost) });
};

/** Morning: what was paid and where HP and MP stand now. */
export const roomReceiptLine = (
  cost: number,
  hp?: { now: number; max: number } | null,
  mp?: { now: number; max: number } | null,
  voice: Voice = 'adventure'
): string => {
  const hpText = hp ? `HP ${hp.now}/${hp.max}` : '';
  const mpText = mp ? ` MP ${mp.now}/${mp.max}` : '';
  return copyFor('hotel.receipt', voice, { cost: gold(cost), stats: `${hpText}${mpText}` }).trim();
};

/** What the concierge says after the night or a refusal: his line, the bed rising for a night's rest. */
export const conciergeNotice = (line: string, sprite?: RevealPromptOptions['sprite']): RevealPromptOptions =>
  noticeOf(CONCIERGE, line, { accent: 'hotel', sprite });

/** The concierge when the Town Hall's notice board is not on the map. */
export const NOTHING_ON_THE_BOARD = 'Nothing on the board tonight.';

/** `NOTHING_ON_THE_BOARD` in the hero's voice. */
export const nothingOnTheBoard = (voice: Voice = 'adventure'): string => copyFor('hotel.board.empty', voice);

// ---------------------------------------------------------------------------------------------------------------
// The Town Hall: the clerk
// ---------------------------------------------------------------------------------------------------------------

export const CLERK = 'Town Clerk';

/** The ids of the clerk's menu. */
export type ClerkMenuId = 'board' | 'bug' | 'registration' | 'never';

/** What the clerk can take down, with the words the board will use for it. */
export const CLERK_ERRANDS: Record<Exclude<ClerkMenuId, 'never'>, string> = {
  board: 'Posting on the Board',
  bug: 'Bug reports',
  registration: 'Family registration',
};

/** The clerk's menu: what to do at the board, then never mind. Registering the family is for a Game Master. */
export const clerkMenuChoices = (isGameMaster: boolean): RevealChoice[] => [
  { id: 'board', label: 'Post on the Board', icon: 'thumbtack' },
  { id: 'bug', label: 'Report a Bug', icon: 'bug' },
  ...(isGameMaster ? [{ id: 'registration', label: 'Family Registration', icon: 'file-signature' }] : []),
  { id: 'never', label: 'Never mind', icon: 'times', tone: 'ghost' as const },
];

/** The clerk asks what to do at the board, with the stone tablet rising. */
export const clerkMenuPrompt = (isGameMaster: boolean, voice: Voice = 'adventure'): RevealPromptOptions => ({
  speaker: CLERK,
  accent: 'townHall',
  sprite: 'tablet',
  lines: [copyFor('clerk.welcome', voice)],
  choices: clerkMenuChoices(isGameMaster),
  cancelId: 'never',
});

/** The clerk's answer to an errand the board cannot take yet. */
export const comingSoonPrompt = (what: string, voice: Voice = 'adventure'): RevealPromptOptions =>
  noticeOf(CLERK, copyFor('clerk.soon', voice, { what }), { accent: 'townHall', sprite: 'tablet' });

/** The clerk when the site does not answer: the courier is late; try again or let it go. */
export const courierLatePrompt = (): RevealPromptOptions => ({
  speaker: CLERK,
  accent: 'townHall',
  sprite: 'tablet',
  lines: ["*peers out the window* The courier hasn't arrived from the city yet."],
  choices: [
    { id: 'retry', label: 'Try again', icon: 'redo' },
    { id: 'never', label: 'Never mind', icon: 'times', tone: 'ghost' },
  ],
  cancelId: 'never',
});

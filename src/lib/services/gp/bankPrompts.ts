/**
 * What the Gold Bank (and its ATM) asks the hero, as in-world prompts: the banker's lines, the menu, and the amount
 * stepper for a deposit, a withdrawal or a payment. The money rules stay in wallet.ts and the words in bankTeller.ts;
 * this only turns a purse into the prompt to show, so the bank screen and the ATM ask the same questions and the
 * wording is tested without a screen.
 */
import { amountPresets, noticeOf, type RevealChoice, type RevealPromptOptions } from '@/components/organisms/RevealPrompt/revealPrompt';
import { copyFor } from '@/lib/services/copy/copy';
import type { Voice } from '@/lib/services/copy/voices';
import { type BankAction, bankRefusal, gold } from './bankTeller';
import {
  type GpPurse,
  depositToSavings,
  hospitalBillOf,
  normalizePurse,
  payDownBills,
  withdrawFromSavings,
} from './wallet';

/** Who is speaking at the counter. */
export const BANKER = 'Bank Manager';

/** The ids of the banker's menu. */
export type BankMenuId = 'atm' | 'withdraw' | 'deposit' | 'payDebt' | 'storage' | 'leave';

/** The Hospital's bill gets the hospital; plain debt gets the card. */
const payIcon = (gp: GpPurse | null | undefined): string => (hospitalBillOf(gp) > 0 ? 'hospital' : 'credit-card');

/** The pay-down row reads as the Hospital's bill while one is owed. */
const payLabel = (gp: GpPurse | null | undefined): string => (hospitalBillOf(gp) > 0 ? 'Pay Hospital Bill' : 'Pay down Debt');

/** The banker's menu, in the order the old action sheet had it. */
export function bankMenuChoices(gp: GpPurse | null | undefined): RevealChoice[] {
  return [
    { id: 'atm', label: 'Use ATM', icon: 'hand-holding-usd' },
    { id: 'withdraw', label: 'Withdraw from Savings', icon: 'wallet' },
    { id: 'deposit', label: 'Deposit to Savings', icon: 'piggy-bank' },
    { id: 'payDebt', label: payLabel(gp), icon: payIcon(gp) },
    { id: 'storage', label: 'Storage', icon: 'treasure-chest' },
    { id: 'leave', label: 'Leave Bank', icon: 'door-open', tone: 'ghost' },
  ];
}

/** The banker speaks and the menu follows. Escape steps away from the counter (`stay`); it does not leave the bank. */
export function bankMenuPrompt(lines: string[], gp: GpPurse | null | undefined): RevealPromptOptions {
  return { speaker: BANKER, accent: 'bank', lines, choices: bankMenuChoices(gp), cancelId: 'stay' };
}

/** The ATM's menu: the same three money moves, then sign off. */
export function atmMenuPrompt(gp: GpPurse | null | undefined, voice: Voice = 'adventure'): RevealPromptOptions {
  return {
    speaker: 'ATM',
    accent: 'atm',
    sprite: 'coins',
    lines: [copyFor('bank.ask.atmWelcome', voice)],
    choices: [
      { id: 'deposit', label: 'Deposit to Savings', icon: 'piggy-bank' },
      { id: 'withdraw', label: 'Withdraw from Savings', icon: 'wallet' },
      { id: 'payDebt', label: payLabel(gp), icon: payIcon(gp) },
      { id: 'leave', label: 'Sign Off', icon: 'sign-out-alt', tone: 'ghost' },
    ],
    // Escape closes the menu and stays at the ATM; Sign Off closes the ATM
    cancelId: 'stay',
  };
}

/** Who speaks in the hero's own Gold app (not at the counter). */
export const GOLD_APP = 'My Gold';

/** The Gold app's savings menu: deposit, withdraw, or never mind. Escape is never mind. */
export function savingsMenuPrompt(gp: GpPurse | null | undefined, voice: Voice = 'adventure'): RevealPromptOptions {
  const purse = normalizePurse(gp);
  return {
    speaker: GOLD_APP,
    accent: 'bank',
    sprite: 'coins',
    lines: [copyFor('bank.ask.savingsMenu', voice, { savings: gold(purse.savings), wallet: gold(purse.wallet) })],
    choices: [
      { id: 'deposit', label: 'Deposit to Savings', icon: 'piggy-bank' },
      { id: 'withdraw', label: 'Withdraw from Savings', icon: 'wallet' },
      { id: 'never', label: 'Never mind', icon: 'times', tone: 'ghost' },
    ],
    cancelId: 'never',
  };
}

/** A line from the banker (or the ATM) and one button to dismiss it; the coins rise with it for a money move. */
export function noticePrompt(line: string, sprite?: RevealPromptOptions['sprite'], speaker: string = BANKER): RevealPromptOptions {
  return noticeOf(speaker, line, { accent: speaker === BANKER ? 'bank' : 'atm', sprite });
}

/** The question for a money move, or the teller's reason there is nothing to ask. */
export type AmountAsk = { prompt: RevealPromptOptions } | { refusal: string };

const CONFIRM_LABEL: Record<BankAction, string> = { withdraw: 'Withdraw', deposit: 'Deposit', payDebt: 'Pay' };
const CONFIRM_ICON: Record<BankAction, string> = { withdraw: 'wallet', deposit: 'piggy-bank', payDebt: 'coins' };

/**
 * How much, for a withdrawal, a deposit or a payment: the stepper reaches exactly what the move can take (a
 * withdrawal stops at the wallet's room, a payment at the wallet or the debt). When the move would move nothing, the
 * teller's refusal instead.
 */
export function amountAsk(
  action: BankAction,
  gp: GpPurse | null | undefined,
  speaker: string = BANKER,
  voice: Voice = 'adventure'
): AmountAsk {
  const purse = normalizePurse(gp);
  const bill = hospitalBillOf(gp);
  let probe;
  let max: number;
  let line: string;
  switch (action) {
    case 'withdraw':
      probe = withdrawFromSavings(gp, purse.savings);
      max = Math.min(purse.savings, Math.max(0, purse.limit - purse.wallet));
      line = copyFor('bank.ask.withdraw', voice, { saved: gold(purse.savings) });
      break;
    case 'deposit':
      probe = depositToSavings(gp, purse.wallet);
      max = purse.wallet;
      line = copyFor('bank.ask.deposit', voice, { wallet: gold(purse.wallet) });
      break;
    case 'payDebt':
      probe = payDownBills(gp, purse.wallet);
      max = Math.min(purse.wallet, bill + purse.debt);
      line =
        bill > 0
          ? copyFor('bank.ask.payBill', voice, { bill: gold(bill) })
          : copyFor('bank.ask.payDebt', voice, { debt: gold(purse.debt) });
      break;
  }
  const refusal = bankRefusal(action, gp, probe, voice);
  if (refusal) return { refusal };
  return {
    prompt: {
      speaker,
      accent: 'bank',
      sprite: 'coins',
      lines: [line],
      amount: { min: 1, max, step: 1, presets: amountPresets(max) },
      choices: [
        { id: 'ok', label: CONFIRM_LABEL[action], icon: CONFIRM_ICON[action], tone: 'primary' },
        { id: 'cancel', label: 'Never mind', icon: 'times', tone: 'ghost' },
      ],
      cancelId: 'cancel',
    },
  };
}

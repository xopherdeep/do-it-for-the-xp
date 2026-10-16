/**
 * What the hero's wallet app (My Funds) asks, as in-world prompts: the cash out stepper, and the send / request flow
 * (send or ask, then who, then how much). The rules live in cashOut.ts and gpGifts.ts; this only turns them into the
 * prompt to show, so the wording is tested without a screen.
 */
import { amountPresets, noticeOf, type RevealChoice, type RevealPromptOptions } from "@/components/organisms/RevealPrompt/revealPrompt";
import { copyFor } from "@/lib/services/copy/copy";
import type { Voice } from "@/lib/services/copy/voices";
import { GOLD_APP } from "./bankPrompts";
import { gold } from "./bankTeller";
import { type CashOutBlock, type CashOutQuote } from "./cashOut";
import { heroName } from "./gpGifts";

const base = { speaker: GOLD_APP, accent: "bank" } as const;

/** A line from the Gold app and one OK; coins rise with it when money moved. */
export const walletNotice = (line: string, coins = false): RevealPromptOptions =>
  noticeOf(GOLD_APP, line, { accent: "bank", ...(coins ? { sprite: "coins" as const } : {}) });

const CASH_OUT_REFUSALS: Record<CashOutBlock, string> = {
  off: "wallet.cashOut.off",
  "not-allowed": "wallet.cashOut.notAllowed",
  short: "wallet.cashOut.short",
};

/** Why the hero can't cash out, in the app's words, or null when they can. */
export function cashOutRefusal(quote: CashOutQuote, voice: Voice = "adventure"): string | null {
  return quote.blocked ? copyFor(CASH_OUT_REFUSALS[quote.blocked], voice, { rate: quote.rate }) : null;
}

/** The cash out stepper: a dollar's worth of GP per tap, up to what the wallet holds in whole dollars. */
export function cashOutPrompt(quote: CashOutQuote, voice: Voice = "adventure"): RevealPromptOptions {
  const dollarsMax = Math.floor(quote.max / quote.rate);
  const marks = [1, 5, 10, 20].filter((n) => n < dollarsMax).map((n) => n * quote.rate);
  return {
    ...base,
    sprite: "coins",
    lines: [copyFor("wallet.cashOut.ask", voice, { rate: quote.rate })],
    amount: {
      min: quote.min,
      max: quote.max,
      step: quote.step,
      presets: amountPresets(quote.max, marks),
    },
    choices: [
      { id: "ok", label: "Cash Out", icon: "money-bill-wave", tone: "primary" },
      { id: "cancel", label: "Never mind", icon: "times", tone: "ghost" },
    ],
    cancelId: "cancel",
  };
}

/** Send or ask: the first question of Send / Request. */
export const sendMenuPrompt = (voice: Voice = "adventure"): RevealPromptOptions => ({
  ...base,
  lines: [copyFor("wallet.send.menu", voice)],
  choices: [
    { id: "send", label: "Send GP", icon: "paper-plane", tone: "primary" },
    { id: "ask", label: "Ask for GP", icon: "envelope-open-dollar" },
    { id: "never", label: "Never mind", icon: "times", tone: "ghost" },
  ],
  cancelId: "never",
});

export interface FamilyMember {
  id: string;
  name?: { nick?: string; first?: string; full?: string };
  isAdult?: boolean;
}

/** Everyone else in the family as choices, heroes first; Game Masters are marked. */
export function heroChoices(members: readonly FamilyMember[], selfId: string): RevealChoice[] {
  const others = members.filter((m) => m && String(m.id) !== String(selfId));
  const ordered = [...others.filter((m) => !m.isAdult), ...others.filter((m) => m.isAdult)];
  return [
    ...ordered.map((m) => ({
      id: String(m.id),
      label: heroName(m),
      icon: m.isAdult ? "crown" : "user",
      ...(m.isAdult ? { hint: "Game Master" } : {}),
    })),
    { id: "never", label: "Never mind", icon: "times", tone: "ghost" as const },
  ];
}

/** Who to send to (`send`) or ask (`ask`). */
export const pickHeroPrompt = (mode: "send" | "ask", members: readonly FamilyMember[], selfId: string, voice: Voice = "adventure"): RevealPromptOptions => ({
  ...base,
  lines: [copyFor(mode === "send" ? "wallet.send.pickHero" : "wallet.ask.pickHero", voice)],
  choices: heroChoices(members, selfId),
  cancelId: "never",
});

/** How much to send (up to the wallet) or ask for (up to the asker's wallet size). */
export function giftAmountPrompt(mode: "send" | "ask", name: string, max: number, wallet: number, voice: Voice = "adventure"): RevealPromptOptions {
  const key = mode === "send" ? "wallet.send.amount" : "wallet.ask.amount";
  return {
    ...base,
    sprite: "coins",
    lines: [copyFor(key, voice, { name, wallet: gold(wallet) })],
    amount: { min: 1, max, step: 1, presets: amountPresets(max) },
    choices: [
      { id: "ok", label: mode === "send" ? "Send" : "Ask", icon: mode === "send" ? "paper-plane" : "envelope-open-dollar", tone: "primary" },
      { id: "cancel", label: "Never mind", icon: "times", tone: "ghost" },
    ],
    cancelId: "cancel",
  };
}

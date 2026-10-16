/**
 * The hero's GP history: one line per time the purse changed (a quest paid, a shop sale, a deposit, a gift). The store
 * writes a line whenever it moves GP (updateUserGP, setWallet), so every screen that pays or charges is covered; a
 * caller only adds the words ("Quest: Feed the cat"). The lines live on the purse (`stats.gp.ledger`), newest last,
 * and only the latest MAX_GP_LEDGER are kept. Pure, so the wallet's Activity tab is tested without a screen.
 */
import { normalizePurse, type GpPurse } from "./wallet";

export type GpEntryKind =
  | "earn"
  | "spend"
  | "deposit"
  | "withdraw"
  | "payDebt"
  | "borrow"
  | "send"
  | "receive"
  | "cashOut"
  | "refund"
  | "upgrade"
  | "bill";

export interface GpLedgerEntry {
  id: string;
  /** ISO timestamp */
  at: string;
  kind: GpEntryKind;
  /** What the hero is richer (+) or poorer (-) by: wallet and savings together */
  gp: number;
  /** How each part of the purse moved */
  wallet: number;
  savings: number;
  debt: number;
  bill: number;
  /** One line on what it was: "Quest: Feed the cat", "Sent to Mia" */
  note: string;
  /** The other hero of a gift or a request */
  withId?: string;
}

/** What a caller can say about a GP move; the store fills in the rest. */
export interface GpEntryNote {
  kind?: GpEntryKind;
  note?: string;
  withId?: string;
}

/** Keep at most this many lines per hero; the oldest fall off. */
export const MAX_GP_LEDGER = 150;

const whole = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
};

/** How the purse moved from `before` to `after`, part by part. */
export function purseDelta(before?: GpPurse | null, after?: GpPurse | null) {
  // A wallet below 0 is old debt the Stats class folds in; read the raw numbers so a charge still shows
  const raw = (gp: GpPurse | null | undefined) => ({
    wallet: whole(gp?.wallet),
    savings: whole(gp?.savings),
    debt: normalizePurse(gp).debt,
    bill: normalizePurse(gp).hospitalBill,
  });
  const a = raw(before);
  const b = raw(after);
  return { wallet: b.wallet - a.wallet, savings: b.savings - a.savings, debt: b.debt - a.debt, bill: b.bill - a.bill };
}

/** The kind a move reads as when its caller did not say. */
export function inferKind(delta: ReturnType<typeof purseDelta>): GpEntryKind {
  const gp = delta.wallet + delta.savings;
  const isDeposit = gp === 0 && delta.savings > 0;
  if (isDeposit) return "deposit";
  const isWithdrawal = gp === 0 && delta.wallet > 0;
  if (isWithdrawal) return "withdraw";
  const isPayDown = gp < 0 && delta.debt + delta.bill < 0;
  if (isPayDown) return "payDebt";
  const isBorrowing = gp > 0 && delta.debt > 0;
  if (isBorrowing) return "borrow";
  const isBillCharged = delta.bill > 0;
  if (isBillCharged) return "bill";
  return gp >= 0 ? "earn" : "spend";
}

const DEFAULT_NOTES: Record<GpEntryKind, string> = {
  earn: "GP earned",
  spend: "GP spent",
  deposit: "Deposited to savings",
  withdraw: "Withdrew from savings",
  payDebt: "Paid down debt",
  borrow: "Borrowed from the bank",
  send: "Sent GP",
  receive: "Received GP",
  cashOut: "Cashed out",
  refund: "Refund",
  upgrade: "Bigger wallet",
  bill: "Hospital bill",
};

let sequence = 0;
const entryId = (now: Date): string => `gp-${now.getTime().toString(36)}-${(sequence++).toString(36)}`;

/** The line for a move, or null when nothing moved. */
export function entryOf(
  before: GpPurse | null | undefined,
  after: GpPurse | null | undefined,
  said: GpEntryNote = {},
  now: Date = new Date()
): GpLedgerEntry | null {
  const delta = purseDelta(before, after);
  const isNothingMoved = !delta.wallet && !delta.savings && !delta.debt && !delta.bill;
  if (isNothingMoved) return null;
  const kind = said.kind ?? inferKind(delta);
  const note = said.note?.trim() || DEFAULT_NOTES[kind];
  return {
    id: entryId(now),
    at: now.toISOString(),
    kind,
    gp: delta.wallet + delta.savings,
    ...delta,
    note,
    ...(said.withId ? { withId: String(said.withId) } : {}),
  };
}

const isEntry = (value: any): value is GpLedgerEntry =>
  Boolean(value) && typeof value === "object" && typeof value.at === "string" && typeof value.kind === "string" && !Number.isNaN(Date.parse(value.at));

/** The ledger as the purse holds it: only well-formed lines (older saves kept other shapes here, or nothing). */
export const ledgerOf = (gp?: { ledger?: unknown } | null): GpLedgerEntry[] =>
  Array.isArray(gp?.ledger) ? (gp!.ledger as unknown[]).filter(isEntry) : [];

/** The ledger with `entry` added at the end, trimmed to the latest MAX_GP_LEDGER. */
export const appendEntry = (ledger: readonly GpLedgerEntry[], entry: GpLedgerEntry | null): GpLedgerEntry[] => {
  const kept = ledger.filter(isEntry);
  if (!entry) return kept;
  return [...kept, entry].slice(-MAX_GP_LEDGER);
};

/** `after` with the line for the move from `before` added to its ledger (the ledger travels from `before`). */
export function withEntry<T extends GpPurse>(
  before: (GpPurse & { ledger?: unknown }) | null | undefined,
  after: T,
  said: GpEntryNote = {},
  now: Date = new Date()
): T & { ledger: GpLedgerEntry[] } {
  return { ...after, ledger: appendEntry(ledgerOf(before), entryOf(before, after, said, now)) };
}

// --- The Activity tab -----------------------------------------------------------------------------------------------

export type LedgerRange = "all" | "today" | "yesterday" | "week" | "last7" | "month" | "last30" | "year";

export const LEDGER_RANGES: readonly { id: LedgerRange; label: string }[] = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "This Week" },
  { id: "last7", label: "7 Days" },
  { id: "month", label: "This Month" },
  { id: "last30", label: "30 Days" },
  { id: "year", label: "This Year" },
];

const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** The [from, to) window of a range around `now`; `all` has none. Weeks start on Monday, like the calendar's. */
export function rangeWindow(range: LedgerRange, now: Date = new Date()): { from: Date; to: Date } | null {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  switch (range) {
    case "today":
      return { from: today, to: tomorrow };
    case "yesterday":
      return { from: addDays(today, -1), to: today };
    case "week":
      return { from: addDays(today, -((today.getDay() + 6) % 7)), to: tomorrow };
    case "last7":
      return { from: addDays(today, -6), to: tomorrow };
    case "month":
      return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: tomorrow };
    case "last30":
      return { from: addDays(today, -29), to: tomorrow };
    case "year":
      return { from: new Date(today.getFullYear(), 0, 1), to: tomorrow };
    default:
      return null;
  }
}

/** The lines in a range, newest first. */
export function entriesIn(ledger: readonly GpLedgerEntry[], range: LedgerRange = "all", now: Date = new Date()): GpLedgerEntry[] {
  const window = rangeWindow(range, now);
  const inside = (entry: GpLedgerEntry) => {
    if (!window) return true;
    const at = new Date(entry.at).getTime();
    return at >= window.from.getTime() && at < window.to.getTime();
  };
  return ledger.filter(isEntry).filter(inside).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/** GP in and out over some lines. Moves between wallet and savings are neither. */
export function ledgerTotals(entries: readonly GpLedgerEntry[]): { earned: number; spent: number; net: number } {
  let earned = 0;
  let spent = 0;
  for (const entry of entries) {
    if (entry.gp > 0) earned += entry.gp;
    if (entry.gp < 0) spent -= entry.gp;
  }
  return { earned, spent, net: earned - spent };
}

/** The amount a line shows: what the hero gained or lost, or what moved for a deposit or withdrawal. */
export const entryAmount = (entry: GpLedgerEntry): number => {
  const isTransfer = entry.kind === "deposit" || entry.kind === "withdraw";
  return isTransfer ? Math.abs(entry.savings) : entry.gp;
};

const ENTRY_ICONS: Record<GpEntryKind, string> = {
  earn: "coins",
  spend: "shopping-bag",
  deposit: "piggy-bank",
  withdraw: "wallet",
  payDebt: "file-invoice-dollar",
  borrow: "hand-holding-usd",
  send: "paper-plane",
  receive: "envelope-open-dollar",
  cashOut: "money-bill-wave",
  refund: "undo",
  upgrade: "wallet",
  bill: "hospital",
};

export const entryIcon = (entry: GpLedgerEntry): string => ENTRY_ICONS[entry.kind] ?? "coins";

/** Lines grouped under a day heading ("Today", "Yesterday", "Mon, Oct 12"), newest day first. */
export function groupByDay(entries: readonly GpLedgerEntry[], now: Date = new Date()): { day: string; entries: GpLedgerEntry[] }[] {
  const today = startOfDay(now).getTime();
  const yesterday = addDays(startOfDay(now), -1).getTime();
  const label = (at: string): string => {
    const day = startOfDay(new Date(at)).getTime();
    if (day === today) return "Today";
    if (day === yesterday) return "Yesterday";
    return new Date(at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  };
  const groups: { day: string; entries: GpLedgerEntry[] }[] = [];
  for (const entry of entries) {
    const day = label(entry.at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.entries.push(entry);
    else groups.push({ day, entries: [entry] });
  }
  return groups;
}

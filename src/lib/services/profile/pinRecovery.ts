/**
 * Forgotten PIN: a Game Master gets a recovery code the first time they unlock their profile (and a fresh one
 * after each use, or whenever they ask for one in Settings > Family). It is stored sealed like the PIN
 * (pinSeal.ts), and typing it on the PIN pad lets them choose a new PIN. Nothing here ever reads a PIN back.
 *
 * A code counts as delivered only when the Game Master taps "I wrote it down". Until then the profile carries
 * `pinRecoveryPending`, and every unlock makes a new code and shows it again (only the sealed form is saved, so
 * the old one cannot be shown twice). A profile saved before that mark existed counts as delivered.
 */
import { randomHex, sealSecret, secretMatches } from "./pinSeal";

/** No 0/O, 1/I/L: the code is read off paper */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 8;

/** Upper case, without spaces or dashes, the way codes are compared */
export const normalizeRecoveryCode = (typed: string): string => String(typed ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");

/** A new code as the parent sees it: "7KQ3-M9TW" */
export function mintRecoveryCode(hex: string = randomHex(CODE_LENGTH)): string {
  const chars = Array.from({ length: CODE_LENGTH }, (_, i) => ALPHABET[parseInt(hex.slice(i * 2, i * 2 + 2), 16) % ALPHABET.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

/** What the profile stores for a code */
export const sealRecoveryCode = (code: string): string => sealSecret(normalizeRecoveryCode(code));

/** Whether the profile has a recovery code yet */
export const hasRecoveryCode = (profile: { pinRecovery?: unknown } | undefined): boolean =>
  typeof profile?.pinRecovery === "string" && profile.pinRecovery !== "";

/** Whether `typed` is this profile's recovery code */
export const recoveryCodeMatches = (profile: { pinRecovery?: unknown } | undefined, typed: string): boolean =>
  secretMatches(profile?.pinRecovery, normalizeRecoveryCode(typed));

/** What the profile saves once the Game Master has tapped "I wrote it down" */
export const RECOVERY_DELIVERED = { pinRecoveryPending: false } as const;

/** A new code (as the parent sees it) and the profile fields that save it: sealed, and not yet delivered */
export function issueRecoveryCode(code: string = mintRecoveryCode()): { code: string; fields: { pinRecovery: string; pinRecoveryPending: true } } {
  return { code, fields: { pinRecovery: sealRecoveryCode(code), pinRecoveryPending: true } };
}

/**
 * Whether the next unlock must hand this profile a code: a Game Master with none yet, or whose last one was never
 * confirmed. A hero never gets one.
 */
export function needsRecoveryCodeShown(profile: Record<string, unknown> | undefined): boolean {
  const isGameMaster = profile?.isAdult === true;
  if (!isGameMaster) return false;
  const isUnconfirmed = profile?.pinRecoveryPending === true;
  return !hasRecoveryCode(profile) || isUnconfirmed;
}

/**
 * Whether the signed-in profile may make itself a new recovery code in Settings > Family: a Game Master signed in as
 * themselves. A Game Master masquerading as a hero is on that hero's profile, and a hero has no code to make.
 */
export function canReissueRecoveryCode(view: { currentUser: { id: string | null; isImpersonating?: boolean }; users: Record<string, { isAdult?: unknown } | undefined> }): boolean {
  const id = view.currentUser.id;
  const profile = id ? view.users[id] : undefined;
  return profile?.isAdult === true;
}

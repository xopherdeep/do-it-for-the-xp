/**
 * Forgotten PIN: a Game Master gets a recovery code the first time they unlock their profile (and a fresh one
 * after each use). It is shown once, stored sealed like the PIN (pinSeal.ts), and typing it on the PIN pad
 * lets them choose a new PIN. Nothing here ever reads a PIN back.
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

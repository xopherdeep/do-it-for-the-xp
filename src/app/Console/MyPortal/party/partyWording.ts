import { escapeHtml } from "@/lib/utils/dialogMessage";

/** The toast after a cheer or a poke */
export interface SentWordToast {
  text: string;
  color: "success" | "warning";
}

/**
 * Words the toast after a cheer or a poke. Ionic toasts render their message as HTML (`innerHTMLTemplatesEnabled`), and
 * in a party with other families the name is another family's text, so it is escaped before it goes in.
 */
export const sentWordToast = (word: "cheer" | "poke", nickname: string): SentWordToast => {
  const name = escapeHtml(nickname || "Hero");
  const isCheer = word === "cheer";
  return isCheer ? { text: `💚 Sent encouragement to ${name}!`, color: "success" } : { text: `👋 Nudged ${name}!`, color: "warning" };
};

/**
 * What "Invite a family" says in a party with other families: the code a Game Master hands to a friend's Game Master, or
 * where to ask for it. A toast renders HTML, so the code is escaped like the names are.
 */
export const inviteCodeText = (code: string | undefined): string => {
  const hasCode = typeof code === "string" && code !== "";
  return hasCode ? `Party code: ${escapeHtml(code)}. Give it to a friend's Game Master.` : "Ask the party leader for the code.";
};

const SYNERGY_STEPS = [
  "Two heroes finishing chores today make strikes x1.1",
  "One more hero today makes strikes x1.1",
  "One more hero today makes strikes x1.2",
];

/**
 * The Synergies tab's line about what powers strikes up next: `finished` heroes have finished a chore today in a party of
 * `size`. A party of two is at full power once both have, and a party of one has no one to power up with.
 */
export const synergyHint = (finished: number, size: number): string => {
  const canPowerUp = size >= 2;
  if (!canPowerUp) return "A party needs two heroes to power up.";
  const isFull = finished >= Math.min(size, 3);
  if (isFull) return "Full party power!";
  return SYNERGY_STEPS[Math.max(0, Math.floor(finished))];
};

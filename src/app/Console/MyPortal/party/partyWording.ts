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

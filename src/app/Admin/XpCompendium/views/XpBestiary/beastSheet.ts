import { arrowUndoOutline, attachOutline, checkmarkOutline, createSharp, listOutline, trashOutline } from "ionicons/icons";
import type { Beast } from "@/lib/databases/BestiaryDb";
import { isLive } from "@/lib/services/creations/creations";

/**
 * The menu on a beast's card in the Game Master's Bestiary (XpBestiary.vue), as a pure list so the page stays short.
 * A beast in play offers Attach to Quests; a kid's beast that is not in the game yet (waiting, or sent back) offers
 * Approve and Send back instead, the same verdicts as Approvals > Creations (creationReview). Edit, View Task List and
 * Delete are always there.
 */

/** What the page does for each line */
export interface BeastSheetHandlers {
  edit: () => void;
  tasks: () => void;
  attach: () => void;
  approve: () => void;
  sendBack: () => void;
  remove: () => void;
}

/** An action sheet line, as Ionic takes it */
export interface BeastSheetButton {
  text: string;
  icon?: string;
  role?: "destructive" | "cancel";
  handler?: () => void;
}

export function beastSheetButtons(beast: Beast, on: BeastSheetHandlers): BeastSheetButton[] {
  const isInPlay = isLive(beast);
  const middle: BeastSheetButton[] = isInPlay
    ? [{ text: "Attach to Quests", icon: attachOutline, handler: on.attach }]
    : [
        { text: "Approve", icon: checkmarkOutline, handler: on.approve },
        { text: "Send back", icon: arrowUndoOutline, handler: on.sendBack },
      ];
  return [
    { text: "Edit Beast", icon: createSharp, handler: on.edit },
    { text: "View Task List", icon: listOutline, handler: on.tasks },
    ...middle,
    { text: "Delete Beast", role: "destructive", icon: trashOutline, handler: on.remove },
    { text: "Cancel", role: "cancel" },
  ];
}

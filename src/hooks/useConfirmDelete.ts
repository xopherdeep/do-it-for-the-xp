import { alertController, toastController } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import { rpgToastOptions } from "@/hooks/useToast";
import { escapeHtml } from "@/lib/services/bestiary/beastLinks";
import debug from "@/lib/utils/debug";

export interface DeleteRequest {
  /** "quest", "item", "Power", "shop", "temple": used in the header and the messages */
  kind: string;
  /** The record's name as the Game Master typed it (escaped here: Ionic alerts render HTML) */
  name: string;
  /** "Used by 2 shops (Market, Hut)", or "" when nothing names it; throws when it cannot be worked out */
  usage: () => Promise<string>;
  /** What the delete does to the records in `usage`, said after it: "It comes off their shelves." */
  detaching?: string;
  /** Anything else the Game Master should know before saying yes */
  note?: string;
  /** The delete itself: unlink, then remove */
  run: () => Promise<void>;
}

const toast = async (message: string): Promise<void> => {
  const shown = await toastController.create(rpgToastOptions(message, 2500));
  await shown.present();
};

/**
 * The Game Master's delete, the same for every kind of record: work out what uses it, ask with that in the alert
 * ("can't be undone"), run the delete, say how it went. Resolves true once the record is gone; false when the Game
 * Master cancelled or something failed (they were told). Without knowing what uses the record it does not delete,
 * since a delete could leave quests, rooms or shelves pointing at nothing.
 */
export async function confirmDelete(request: DeleteRequest): Promise<boolean> {
  const { kind, run } = request;
  const name = request.name.trim() || `this ${kind}`;
  let usage = "";
  try {
    usage = await request.usage();
  } catch (error) {
    debug.error(`Could not check where the ${kind} is used:`, error);
    play$fx("no");
    await toast(`Could not check where this ${kind} is used, so it was not deleted.`);
    return false;
  }

  const lines = [`Delete ${escapeHtml(name)}? This can't be undone.`];
  const isUsed = usage !== "";
  if (isUsed) lines.push(`${escapeHtml(usage)}. ${escapeHtml(request.detaching ?? "")}`.trim());
  const hasNote = !!request.note;
  if (hasNote) lines.push(escapeHtml(request.note ?? ""));

  const alert = await alertController.create({
    header: `Delete ${kind[0].toUpperCase()}${kind.slice(1)}`,
    message: lines.join("<br><br>"),
    mode: "ios",
    buttons: [
      { text: "Cancel", role: "cancel" },
      { text: "Delete", role: "destructive" },
    ],
  });
  await alert.present();
  const { role } = await alert.onDidDismiss();
  const isConfirmed = role === "destructive";
  if (!isConfirmed) return false;

  try {
    await run();
  } catch (error) {
    debug.error(`Error deleting the ${kind}:`, error);
    play$fx("no");
    await toast(`There was a problem deleting ${name}.`);
    return false;
  }
  play$fx("select");
  await toast(`${name} was deleted.`);
  return true;
}

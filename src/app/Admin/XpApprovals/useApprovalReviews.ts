import { alertController } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import type { PurchaseLogEntry } from "@/lib/databases/PurchaseLogDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { approveClaim, rejectClaim, rewardLineOf } from "@/lib/services/quests/approvalFlow";
import type { ReviewOutcome } from "@/lib/services/quests/approvalFlow";
import { withHuntBonus } from "@/lib/services/quests/huntBonus";
import { fulfillPurchase, PurchaseError, refundPurchase } from "@/lib/services/shop/PurchaseService";
import debug from "@/lib/utils/debug";
import { useCreationApprovals } from "./useCreationApprovals";
import type { Profile } from "./useCreationApprovals";

/**
 * The Approvals screen's verdicts on quests (approve, send back) and shop purchases (deliver, refund): the confirm
 * dialogs and the one review runner they share, moved out of XpApprovals.vue as they stood. The Creations lane
 * (useCreationApprovals) rides along on the same runner, so the page mounts one composable and only the lists. The
 * game rules stay in approvalFlow, PurchaseService and creationReview.
 */

export type ToastColor = "success" | "warning" | "danger" | "medium";

export interface ReviewMessage {
  message: string;
  color?: ToastColor;
}

export interface ReviewDeps {
  heroName: (userId: string) => string;
  /** Whether the hero still has a profile: a verdict that pays or refunds needs one */
  isKnownHero: (userId: string) => boolean;
  /** Every profile on the device, for a creation's target chooser */
  profiles: () => Profile[];
  /** The signed-in Game Master */
  reviewerId: () => string | undefined;
  showToast: (message: string, color?: ToastColor) => Promise<void>;
  /** Read the lists again once a verdict is saved */
  reload: () => Promise<unknown>;
  /** Family sync: runs a change to a hero on that hero's turn; false when another device plays the hero (the clerk said why) */
  writeHero: (heroId: string, change: () => Promise<void>) => Promise<boolean>;
}

export const useApprovalReviews = (deps: ReviewDeps) => {
  const { heroName, isKnownHero, reviewerId, showToast, reload, writeHero } = deps;

  // Entries with a review in flight. approveCompletion and refundPurchase are
  // read-then-write, so a double tap must not reach them twice for the same entry
  // (that would pay or refund twice).
  const reviewing = new Set<string>();

  const runReview = async (entry: { id: string }, review: () => Promise<ReviewMessage>) => {
    const isInFlight = reviewing.has(entry.id);
    if (isInFlight) return;
    reviewing.add(entry.id);
    let outcome: ReviewMessage;
    try {
      outcome = await review();
    } catch (error) {
      debug.error("Failed to save the review:", error);
      outcome = {
        message: "Couldn't save that decision. Please try again.",
        color: "danger",
      };
    } finally {
      reviewing.delete(entry.id);
    }
    await reload();
    // A verdict sent to the hero's device has no toast: its row says so
    const hasMessage = outcome.message !== "";
    if (hasMessage) void showToast(outcome.message, outcome.color);
  };

  const unsettled = (reason: Extract<ReviewOutcome, { ok: false }>["reason"]): ReviewMessage =>
    reason === "own-claim"
      ? { message: "Another Game Master has to check your own quest.", color: "warning" }
      : { message: "That quest is no longer waiting for approval.", color: "warning" };

  const approveItem = async (entry: QuestLogEntry) => {
    const hero = heroName(entry.userId);
    if (!isKnownHero(entry.userId)) {
      // applyQuestRewards silently skips unknown heroes, so don't claim a payout.
      void showToast("That hero no longer exists, so there is no one to pay. Send the quest back instead.", "warning");
      return;
    }

    const alert = await alertController.create({
      header: "Approve Quest",
      message: `Approve "${entry.questName}" for ${hero}? They will earn ${rewardLineOf(withHuntBonus(entry))}.`,
      buttons: [
        {
          text: "Cancel",
          role: "cancel",
        },
        {
          text: "Approve",
          handler: () => {
            void runReview(entry, async () => {
              const result = await approveClaim(entry.id, reviewerId());
              const isUnsettled = !result.ok;
              if (isUnsettled) return unsettled(result.reason);
              play$fx("select");
              if (result.remote) return { message: "" };
              return {
                message: `Approved! ${hero} earned ${result.line}`,
              };
            });
          },
        },
      ],
    });
    await alert.present();
  };

  const rejectItem = async (entry: QuestLogEntry) => {
    const hero = heroName(entry.userId);
    const alert = await alertController.create({
      header: "Send Quest Back",
      message: `Send "${entry.questName}" back to ${hero}? The quest will open up again for them.`,
      inputs: [
        {
          name: "note",
          type: "textarea",
          placeholder: "A short note for the hero (optional)",
          attributes: { maxlength: 140 },
        },
      ],
      buttons: [
        {
          text: "Cancel",
          role: "cancel",
        },
        {
          text: "Send back",
          handler: (data) => {
            const note = String(data?.note ?? "").trim();
            void runReview(entry, async () => {
              const result = await rejectClaim(entry.id, reviewerId(), note || undefined);
              const isUnsettled = !result.ok;
              if (isUnsettled) return unsettled(result.reason);
              if (result.remote) return { message: "" };
              return {
                message: `Sent back. "${entry.questName}" is open again for ${hero}.`,
                color: "medium",
              };
            });
          },
        },
      ],
    });
    await alert.present();
  };

  // The hero already paid; the Game Master hands over the real thing and marks it done.
  const confirmDelivery = async (entry: PurchaseLogEntry) => {
    const hero = heroName(entry.userId);
    const alert = await alertController.create({
      header: entry.packed ? "Hand Over Item" : "Deliver Accessory",
      message: entry.packed
        ? `Give ${hero} "${entry.itemName}"? It goes into their bag.`
        : `Has ${hero} received "${entry.itemName}"? It will be marked delivered.`,
      buttons: [
        {
          text: "Cancel",
          role: "cancel",
        },
        {
          text: "Fulfil",
          handler: () => {
            void runReview(entry, async () => {
              const done: { entry: PurchaseLogEntry | null } = { entry: null };
              try {
                const isWritten = await writeHero(entry.userId, async () => {
                  done.entry = await fulfillPurchase(entry.id, reviewerId());
                });
                // The clerk said why: another device plays the hero
                if (!isWritten) return { message: "" };
              } catch (error) {
                // A held game item that has no room in the bag stays waiting, and says why
                const isBagFull = error instanceof PurchaseError && error.code === "bag-full";
                if (isBagFull) return { message: `${hero}'s bag is full. It waits here until they store something at home.`, color: "warning" };
                const isPurchaseRefusal = error instanceof PurchaseError;
                if (isPurchaseRefusal) return { message: error.message, color: "warning" };
                throw error;
              }
              const isFulfilled = done.entry?.status === "fulfilled";
              if (!isFulfilled) {
                return {
                  message: "That purchase is no longer waiting for delivery.",
                  color: "warning",
                };
              }
              return {
                message: `Delivered! "${entry.itemName}" is marked as given to ${hero}.`,
              };
            });
          },
        },
      ],
    });
    await alert.present();
  };

  const sendRefund = async (entry: PurchaseLogEntry) => {
    const hero = heroName(entry.userId);
    if (!isKnownHero(entry.userId)) {
      // refundPurchase can't credit a missing profile, so don't claim a refund.
      void showToast("That hero no longer exists, so there is no one to refund. Fulfil the purchase to clear it.", "warning");
      return;
    }

    const alert = await alertController.create({
      header: "Refund Purchase",
      message: `Refund "${entry.itemName}" to ${hero}? They will get ${entry.price} GP back.`,
      inputs: [
        {
          name: "note",
          type: "textarea",
          placeholder: "Reason for the refund (optional)",
        },
      ],
      buttons: [
        {
          text: "Cancel",
          role: "cancel",
        },
        {
          text: "Refund",
          handler: (data) => {
            const note = String(data?.note ?? "").trim();
            void runReview(entry, async () => {
              const done: { entry: PurchaseLogEntry | null } = { entry: null };
              const isWritten = await writeHero(entry.userId, async () => {
                done.entry = await refundPurchase(entry.id, reviewerId(), note || undefined);
              });
              // The clerk said why: another device plays the hero
              if (!isWritten) return { message: "" };
              const refunded = done.entry;
              const isRefunded = refunded?.status === "refunded";
              if (!isRefunded) {
                return {
                  message: "That purchase is no longer waiting for delivery.",
                  color: "warning",
                };
              }
              return {
                message: `Refunded. ${hero} got ${refunded.price} GP back for "${entry.itemName}".`,
                color: "medium",
              };
            });
          },
        },
      ],
    });
    await alert.present();
  };

  const creations = useCreationApprovals({
    heroName,
    isKnownHero,
    profiles: deps.profiles,
    reviewerId: () => String(reviewerId() ?? ""),
    runReview,
  });

  return { approveItem, rejectItem, confirmDelivery, sendRefund, creations };
};

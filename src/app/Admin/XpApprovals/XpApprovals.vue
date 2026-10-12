<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master" />
        </ion-buttons>
        <ion-title>
          <i class="fad fa-clipboard-check fa-lg mr-2"></i>
          Approvals
        </ion-title>
        <ion-buttons slot="end">
          <ion-button @click="refreshApprovals">
            <i class="fad fa-sync-alt fa-lg"></i>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-segment v-model="activeSegment">
        <ion-segment-button value="achievements">
          Achievements
          <ion-badge color="success">{{
            pendingAchievements.length
          }}</ion-badge>
        </ion-segment-button>
        <ion-segment-button value="accessories">
          Accessories
          <ion-badge color="warning">{{ pendingAccessories.length }}</ion-badge>
        </ion-segment-button>
        <ion-segment-button value="history">
          History
        </ion-segment-button>
      </ion-segment>
    </ion-header>
    <ion-content>
      <div v-if="isLoading" class="loading-wrapper-centered">
        <XpLoading />
      </div>
      <template v-else>
        <ion-list v-if="activeSegment === 'achievements'">
          <ion-item-sliding v-for="entry in pendingAchievements" :key="entry.id">
            <ion-item>
              <ion-avatar slot="start" class="hero-avatar">
                <ion-img v-if="heroAvatar(entry.userId)" :src="heroAvatar(entry.userId)" />
                <i v-else class="fad fa-scroll"></i>
              </ion-avatar>
              <ion-label class="ion-text-wrap">
                <h2>{{ entry.questName }}</h2>
                <p>
                  Submitted by {{ heroName(entry.userId) }}
                  <ion-note>{{ formatDate(entry.completedAt) }}</ion-note>
                </p>
                <p class="rewards">{{ xpApText(entry.rewards) }}</p>
              </ion-label>
              <ion-badge color="warning" slot="end">
                <xp-gp :gp="entry.rewards.gp" />
              </ion-badge>
            </ion-item>
            <ion-item-options side="end">
              <ion-item-option color="success" @click="approveItem(entry)">
                <i class="fad fa-check fa-lg"></i>
                Approve
              </ion-item-option>
              <ion-item-option color="danger" @click="rejectItem(entry)">
                <i class="fad fa-times fa-lg"></i>
                Reject
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
          <ion-item v-if="pendingAchievements.length === 0">
            <ion-label class="ion-text-center">
              <i class="fad fa-check-circle fa-3x text-success"></i>
              <p>No pending achievement approvals</p>
            </ion-label>
          </ion-item>
          <p v-else class="swipe-hint">Swipe a quest left to approve or reject it.</p>
        </ion-list>

        <ion-list v-if="activeSegment === 'accessories'">
          <ion-item-sliding v-for="entry in pendingAccessories" :key="entry.id">
            <ion-item>
              <ion-avatar slot="start" class="hero-avatar">
                <ion-img v-if="heroAvatar(entry.userId)" :src="heroAvatar(entry.userId)" />
                <i v-else class="fad fa-gift"></i>
              </ion-avatar>
              <ion-label class="ion-text-wrap">
                <h2>{{ entry.itemName }}</h2>
                <p>
                  Bought by {{ heroName(entry.userId) }}
                  <ion-note>{{ formatDate(entry.createdAt) }}</ion-note>
                </p>
                <p class="rewards">Paid {{ entry.price }} GP · waiting to be delivered</p>
              </ion-label>
              <ion-badge color="warning" slot="end">
                <xp-gp :gp="entry.price" />
              </ion-badge>
            </ion-item>
            <ion-item-options side="end">
              <ion-item-option color="success" @click="fulfilItem(entry)">
                <i class="fad fa-hand-holding-box fa-lg"></i>
                Fulfil
              </ion-item-option>
              <ion-item-option color="danger" @click="refundItem(entry)">
                <i class="fad fa-coins fa-lg"></i>
                Refund
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
          <ion-item v-if="pendingAccessories.length === 0">
            <ion-label class="ion-text-center">
              <i class="fad fa-check-circle fa-3x text-success"></i>
              <p>No accessories waiting to be delivered</p>
            </ion-label>
          </ion-item>
          <p v-else class="swipe-hint">
            Swipe a purchase left to mark it delivered (Fulfil) or give the GP back (Refund).
          </p>
        </ion-list>

        <ion-list v-if="activeSegment === 'history'">
          <ion-item v-for="row in historyRows" :key="row.key">
            <i
              slot="start"
              class="status-icon fad fa-lg"
              :class="row.good ? 'fa-check-circle text-success' : 'fa-times-circle text-danger'"
            ></i>
            <ion-label class="ion-text-wrap">
              <h2>{{ row.title }}</h2>
              <p>
                {{ heroName(row.userId) }}
                <ion-note>{{ formatDate(row.at) }}</ion-note>
              </p>
              <p v-if="row.detail" class="rewards">{{ row.detail }}</p>
              <p v-if="row.note" class="review-note">Note: {{ row.note }}</p>
            </ion-label>
            <ion-badge :color="row.badge.color" slot="end">
              {{ row.badge.label }}
            </ion-badge>
          </ion-item>
          <ion-item v-if="historyRows.length === 0">
            <ion-label class="ion-text-center">
              <i class="fad fa-history fa-3x"></i>
              <p>No approvals have been reviewed yet</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </template>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { computed, defineComponent, getCurrentInstance, onMounted, ref } from "vue";
  import ionic from "@/lib/mixins/ionic";
  import { useUserStore } from "@/lib/store/stores/user";
  import {
    alertController,
    onIonViewWillEnter,
    toastController,
  } from "@ionic/vue";
  import { format } from "date-fns";
  import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
  import debug from "@/lib/utils/debug";
  import { getQuestLogDb } from "@/lib/databases/QuestLogDb";
  import type { QuestLogEntry, QuestRewards } from "@/lib/databases/QuestLogDb";
  import { getPurchaseLogDb } from "@/lib/databases/PurchaseLogDb";
  import type { PurchaseLogEntry } from "@/lib/databases/PurchaseLogDb";
  import {
    approveCompletion,
    paidQuestRewards,
    rejectCompletion,
  } from "@/lib/services/quests/QuestCompletionService";
  import {
    fulfillPurchase,
    refundPurchase,
  } from "@/lib/services/shop/PurchaseService";
  import {
    approvedNotification,
    rejectedNotification,
  } from "@/lib/services/notifications/Notifications";
  import { notify } from "@/lib/services/notifications/notify";

  const HISTORY_LIMIT = 20;

  type ToastColor = "success" | "warning" | "danger" | "medium";
  interface ReviewOutcome {
    message: string;
    color?: ToastColor;
  }

  // One line of the History tab: a reviewed quest or a reviewed shop purchase.
  interface HistoryRow {
    key: string;
    title: string;
    userId: string;
    /** When the hero finished the quest or bought the item */
    at: string;
    /** Approved or delivered (true) versus rejected or refunded (false) */
    good: boolean;
    detail: string;
    note?: string;
    badge: { label: string; color: string };
  }

  export default defineComponent({
    name: "xp-approvals",
    mixins: [ionic],
    components: {
      XpLoading,
    },
    setup() {
      const userStore = useUserStore();
      const globalProps = getCurrentInstance()?.appContext.config.globalProperties;
      const activeSegment = ref<"achievements" | "accessories" | "history">(
        "achievements"
      );
      const isLoading = ref(true);

      // Quest completions waiting on the Game Master (QuestLog entries with status "pending")
      const pendingAchievements = ref<QuestLogEntry[]>([]);
      // The 20 most recent approved/rejected QuestLog entries
      const recentReviews = ref<QuestLogEntry[]>([]);
      // Shop purchases waiting on the Game Master (PurchaseLog entries with status "pending")
      const pendingAccessories = ref<PurchaseLogEntry[]>([]);
      // The 20 most recent fulfilled/refunded PurchaseLog entries
      const recentPurchaseReviews = ref<PurchaseLogEntry[]>([]);

      // Helper functions
      const heroFor = (userId: string) => {
        const hero = userStore.getUserById(userId);
        // getUserById returns undefined for unknown ids; only trust an exact match.
        return hero && String(hero.id) === String(userId) ? hero : null;
      };

      const heroName = (userId: string) => {
        const name = heroFor(userId)?.name;
        return name?.nick || name?.full || "Unknown hero";
      };

      const heroAvatar = (userId: string): string => {
        const hero = heroFor(userId);
        const isAvatarUnavailable = !hero || !globalProps?.$getUserAvatar;
        if (isAvatarUnavailable) return "";
        try {
          return globalProps.$getUserAvatar(hero) || "";
        } catch {
          return ""; // avatar file missing; the template falls back to an icon
        }
      };

      const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const isUnreadableDate = !dateString || Number.isNaN(date.getTime());
        if (isUnreadableDate) return "";
        return format(date, "MMM d, h:mma");
      };

      const xpApText = (rewards: QuestRewards) =>
        `+${rewards.xp} XP · +${rewards.ap} AP`;

      const rewardLine = (rewards: QuestRewards) =>
        `+${rewards.xp} XP · +${rewards.gp} GP · +${rewards.ap} AP`;

      const statusBadge = (status: QuestLogEntry["status"]) => {
        if (status === "approved") return { label: "Approved", color: "success" };
        if (status === "rejected") return { label: "Rejected", color: "danger" };
        return { label: "Pending", color: "warning" };
      };

      const purchaseBadge = (status: PurchaseLogEntry["status"]) => {
        if (status === "fulfilled") return { label: "Delivered", color: "success" };
        if (status === "refunded") return { label: "Refunded", color: "danger" };
        return { label: "Pending", color: "warning" };
      };

      // Reviewed quests and reviewed shop purchases in one list, newest first
      const historyRows = computed<HistoryRow[]>(() => {
        const quests = recentReviews.value.map(
          (entry): HistoryRow => ({
            key: `quest:${entry.id}`,
            title: entry.questName,
            userId: entry.userId,
            at: entry.completedAt,
            good: entry.status === "approved",
            detail: entry.status === "approved" ? rewardLine(entry.rewards) : "",
            note: entry.note,
            badge: statusBadge(entry.status),
          })
        );
        const purchases = recentPurchaseReviews.value.map(
          (entry): HistoryRow => ({
            key: `purchase:${entry.id}`,
            title: entry.itemName,
            userId: entry.userId,
            at: entry.createdAt,
            good: entry.status === "fulfilled",
            detail:
              entry.status === "fulfilled"
                ? `Delivered · paid ${entry.price} GP`
                : `Refunded · ${entry.price} GP given back`,
            note: entry.note,
            badge: purchaseBadge(entry.status),
          })
        );
        return [...quests, ...purchases]
          .sort((a, b) => b.at.localeCompare(a.at))
          .slice(0, HISTORY_LIMIT);
      });

      const showToast = async (message: string, color: ToastColor = "success") => {
        const toast = await toastController.create({
          message: message,
          duration: 2500,
          position: "bottom",
          color,
        });
        await toast.present();
      };

      // Only the newest load may write to the lists, so a slow earlier read can never
      // overwrite the fresh data that follows an approve/reject.
      let latestLoad = 0;
      const loadApprovals = async (): Promise<boolean> => {
        const thisLoad = ++latestLoad;
        try {
          const questLog = getQuestLogDb();
          const purchaseLog = getPurchaseLogDb();
          // Read the two logs separately so one broken store can't hide the other list.
          const [quests, purchases] = await Promise.allSettled([
            Promise.all([questLog.getPending(), questLog.getEntries()]),
            Promise.all([purchaseLog.getPending(), purchaseLog.getEntries()]),
          ]);
          if (thisLoad === latestLoad) {
            if (quests.status === "fulfilled") {
              const [pending, entries] = quests.value;
              pendingAchievements.value = pending;
              recentReviews.value = entries
                .filter((entry) => entry.status !== "pending")
                .slice(0, HISTORY_LIMIT);
            }
            if (purchases.status === "fulfilled") {
              const [pending, entries] = purchases.value;
              pendingAccessories.value = pending;
              recentPurchaseReviews.value = entries
                .filter((entry) => entry.status !== "pending")
                .slice(0, HISTORY_LIMIT);
            }
          }

          const failed: string[] = [];
          if (quests.status === "rejected") {
            debug.error("Failed to load quest approvals:", quests.reason);
            failed.push("quest approvals");
          }
          if (purchases.status === "rejected") {
            debug.error("Failed to load accessory purchases:", purchases.reason);
            failed.push("accessory purchases");
          }
          if (failed.length > 0) {
            if (thisLoad === latestLoad) {
              void showToast(
                `Couldn't load ${failed.join(" and ")}. Tap refresh to try again.`,
                "danger"
              );
            }
            return false;
          }
          return true;
        } catch (error) {
          debug.error("Failed to load approvals:", error);
          if (thisLoad === latestLoad) {
            void showToast("Couldn't load approvals. Tap refresh to try again.", "danger");
          }
          return false;
        } finally {
          if (thisLoad === latestLoad) isLoading.value = false;
        }
      };

      const refreshApprovals = async () => {
        if (await loadApprovals()) void showToast("Approvals refreshed!");
      };

      onMounted(loadApprovals);
      onIonViewWillEnter(loadApprovals);

      // Entries with a review in flight. approveCompletion and refundPurchase are
      // read-then-write, so a double tap must not reach them twice for the same entry
      // (that would pay or refund twice).
      const reviewing = new Set<string>();

      const runReview = async (
        entry: { id: string },
        review: () => Promise<ReviewOutcome>
      ) => {
        if (reviewing.has(entry.id)) return;
        reviewing.add(entry.id);
        let outcome: ReviewOutcome;
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
        await loadApprovals();
        void showToast(outcome.message, outcome.color);
      };

      const approveItem = async (entry: QuestLogEntry) => {
        const hero = heroName(entry.userId);
        if (!heroFor(entry.userId)) {
          // applyQuestRewards silently skips unknown heroes, so don't claim a payout.
          void showToast(
            "That hero no longer exists, so there is no one to pay. Reject the quest instead.",
            "warning"
          );
          return;
        }

        const alert = await alertController.create({
          header: "Approve Quest",
          message: `Approve "${entry.questName}" for ${hero}? They will earn ${rewardLine(
            entry.rewards
          )}.`,
          buttons: [
            {
              text: "Cancel",
              role: "cancel",
            },
            {
              text: "Approve",
              handler: () => {
                void runReview(entry, async () => {
                  const approved = await approveCompletion(
                    entry.id,
                    userStore.currentUser.id ?? undefined
                  );
                  if (approved?.status !== "approved") {
                    return {
                      message: "That quest is no longer waiting for approval.",
                      color: "warning",
                    };
                  }
                  // The log keeps the board's rate; the toast says what was paid (class GP bonus included)
                  const paid = rewardLine(paidQuestRewards(approved.userId, approved.rewards));
                  notify(approvedNotification(approved.userId, approved, paid));
                  return {
                    message: `Approved! ${hero} earned ${paid}`,
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
          header: "Reject Quest",
          message: `Reject "${entry.questName}" from ${hero}? The quest will open up again for them.`,
          inputs: [
            {
              name: "note",
              type: "textarea",
              placeholder: "Reason for rejection (optional)",
            },
          ],
          buttons: [
            {
              text: "Cancel",
              role: "cancel",
            },
            {
              text: "Reject",
              handler: (data) => {
                const note = String(data?.note ?? "").trim();
                void runReview(entry, async () => {
                  const rejected = await rejectCompletion(
                    entry.id,
                    userStore.currentUser.id ?? undefined,
                    note || undefined
                  );
                  if (rejected?.status !== "rejected") {
                    return {
                      message: "That quest is no longer waiting for approval.",
                      color: "warning",
                    };
                  }
                  notify(rejectedNotification(rejected.userId, rejected, note || undefined));
                  return {
                    message: `Rejected. "${entry.questName}" is open again for ${hero}.`,
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
      const fulfilItem = async (entry: PurchaseLogEntry) => {
        const hero = heroName(entry.userId);
        const alert = await alertController.create({
          header: "Deliver Accessory",
          message: `Has ${hero} received "${entry.itemName}"? It will be marked delivered.`,
          buttons: [
            {
              text: "Cancel",
              role: "cancel",
            },
            {
              text: "Fulfil",
              handler: () => {
                void runReview(entry, async () => {
                  const fulfilled = await fulfillPurchase(
                    entry.id,
                    userStore.currentUser.id ?? undefined
                  );
                  if (fulfilled?.status !== "fulfilled") {
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

      const refundItem = async (entry: PurchaseLogEntry) => {
        const hero = heroName(entry.userId);
        if (!heroFor(entry.userId)) {
          // refundPurchase can't credit a missing profile, so don't claim a refund.
          void showToast(
            "That hero no longer exists, so there is no one to refund. Fulfil the purchase to clear it.",
            "warning"
          );
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
                  const refunded = await refundPurchase(
                    entry.id,
                    userStore.currentUser.id ?? undefined,
                    note || undefined
                  );
                  if (refunded?.status !== "refunded") {
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

      return {
        activeSegment,
        pendingAchievements,
        pendingAccessories,
        historyRows,
        heroName,
        heroAvatar,
        formatDate,
        xpApText,
        approveItem,
        rejectItem,
        fulfilItem,
        refundItem,
        refreshApprovals,
        isLoading,
      };
    },
  });
</script>

<style lang="scss" scoped>
  .xp-approvals {
    .loading-wrapper-centered {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100%;
      padding: 40px;
    }

    ion-segment {
      padding: 4px 8px;

      ion-segment-button {
        --indicator-color: var(--ion-color-primary);

        ion-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          font-size: 10px;
          padding: 2px 6px;
        }
      }
    }

    ion-item {
      --padding-start: 8px;
      --inner-padding-end: 8px;
      margin-bottom: 4px;

      ion-note {
        font-size: 12px;
        margin-left: 8px;
        color: var(--ion-color-medium);
      }
    }

    .hero-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--ion-color-light);
      color: var(--ion-color-medium);
      font-size: 22px;
    }

    .status-icon {
      margin-inline-end: 16px;
    }

    .rewards {
      font-size: 12px;
      color: var(--ion-color-medium);
    }

    .review-note {
      font-style: italic;
    }

    .swipe-hint {
      margin: 8px 16px;
      text-align: center;
      font-size: 12px;
      color: var(--ion-color-medium);
    }

    .text-success {
      color: var(--ion-color-success);
    }

    .text-danger {
      color: var(--ion-color-danger);
    }
  }
</style>

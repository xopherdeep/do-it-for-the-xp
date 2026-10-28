<template>
  <ion-page :class="[$options.name, ...rootClass]" :style="rootStyle">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <xp-back-button />
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
      <ion-segment v-model="activeSegment" scrollable>
        <ion-segment-button value="achievements">
          Achievements
          <ion-badge color="success">{{ achievementsWaiting }}</ion-badge>
        </ion-segment-button>
        <ion-segment-button value="accessories">
          Accessories
          <ion-badge color="warning">{{ pendingAccessories.length }}</ion-badge>
        </ion-segment-button>
        <ion-segment-button value="town-hall">
          Town Hall
          <ion-badge color="tertiary">{{ townHallWaiting.length }}</ion-badge>
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
          <!-- A cleared project's family reward, earned and waiting for the Game Master to hand it over -->
          <approval-family-reward-row v-if="familyReward" :text="familyReward.reward.text" @given="loadApprovals" />
          <approval-claim-row
            v-for="entry in pendingAchievements"
            :key="entry.id"
            :entry="entry"
            :hero-name="heroName(entry.userId)"
            :avatar="heroAvatar(entry.userId)"
            :sent-line="sentLine(entry)"
            @approve="approveItem"
            @reject="rejectItem"
          />
          <ion-item v-if="pendingAchievements.length === 0">
            <ion-label class="ion-text-center">
              <i class="fad fa-check-circle fa-3x text-success"></i>
              <p>No pending achievement approvals</p>
            </ion-label>
          </ion-item>
          <p v-else class="swipe-hint">Tap Approve or Send back. You can also swipe a quest left.</p>
        </ion-list>

        <ion-list v-if="activeSegment === 'accessories'">
          <approval-purchase-row
            v-for="entry in pendingAccessories"
            :key="entry.id"
            :entry="entry"
            :hero-name="heroName(entry.userId)"
            :avatar="heroAvatar(entry.userId)"
            :bought-on="formatDate(entry.createdAt)"
            @fulfil="fulfilItem"
            @refund="refundItem"
          />
          <ion-item v-if="pendingAccessories.length === 0">
            <ion-label class="ion-text-center">
              <i class="fad fa-check-circle fa-3x text-success"></i>
              <p>No accessories waiting to be delivered</p>
            </ion-label>
          </ion-item>
          <p v-else class="swipe-hint">
            Tap Fulfil to mark it delivered or Refund to give the GP back. You can also swipe a purchase left.
          </p>
        </ion-list>

        <xp-town-hall-approvals v-if="activeSegment === 'town-hall'" />

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
              <approval-photo v-if="row.photoEntry" :entry="row.photoEntry" hide-when-missing />
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
    <!-- Family Sync: the clerk says when a purchase's hero is played on another device, and nothing was changed -->
    <xp-hero-write-gate ref="heroGate" />
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
  import XpTownHallApprovals from "./components/XpTownHallApprovals.vue";
  import ApprovalPhoto from "./components/ApprovalPhoto.vue";
  import ApprovalClaimRow from "./components/ApprovalClaimRow.vue";
  import ApprovalFamilyRewardRow from "./components/ApprovalFamilyRewardRow.vue";
  import ApprovalPurchaseRow from "./components/ApprovalPurchaseRow.vue";
  import XpHeroWriteGate from "@/components/organisms/HeroWriteGate/XpHeroWriteGate.vue";
  import { saveHeroEdit, type HeroWriteGate } from "@/hooks/useHeroWrite";
  import { useTownHallStore } from "@/lib/store/stores/townHall";
  import { useSentVerdicts } from "./useSentVerdicts";
  import debug from "@/lib/utils/debug";
  import { getQuestLogDb } from "@/lib/databases/QuestLogDb";
  import type { QuestLogEntry, QuestRewards } from "@/lib/databases/QuestLogDb";
  import { withHuntBonus } from "@/lib/services/quests/huntBonus";
  import { getPurchaseLogDb } from "@/lib/databases/PurchaseLogDb";
  import type { PurchaseLogEntry } from "@/lib/databases/PurchaseLogDb";
  import { approveClaim, rejectClaim } from "@/lib/services/quests/approvalFlow";
  import type { ReviewOutcome } from "@/lib/services/quests/approvalFlow";
  import { claimsFor } from "@/lib/services/quests/waitingClaims";
  import type { ProjectRecord } from "@/lib/services/projects/projectRecord";
  import { readRewardToGive } from "@/lib/services/projects/projectService";
  import { play$fx } from "@/assets/fx";
  import { useAppSkin } from "@/components/organisms/XpApp/useAppSkin";
  import {
    fulfillPurchase,
    PurchaseError,
    refundPurchase,
  } from "@/lib/services/shop/PurchaseService";

  const HISTORY_LIMIT = 20;

  type ToastColor = "success" | "warning" | "danger" | "medium";
  interface ReviewMessage {
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
    /** A quest that asked for a photo: its thumbnail shows while the device still holds it (7 days) */
    photoEntry?: QuestLogEntry;
  }

  export default defineComponent({
    name: "xp-approvals",
    mixins: [ionic],
    components: {
      XpLoading,
      XpTownHallApprovals,
      ApprovalPhoto,
      ApprovalClaimRow,
      ApprovalFamilyRewardRow,
      ApprovalPurchaseRow,
      XpHeroWriteGate,
    },
    setup() {
      const userStore = useUserStore();
      // Follows the profile's Retro / Modern toggle, like the other phone apps
      const { rootClass, rootStyle } = useAppSkin("quests");
      // A verdict on a hero another device holds goes to that device (family sync); the row says so until it is applied,
      // then the claims are read again
      const sentLineOf = useSentVerdicts(() => void loadApprovals());
      // A purchase is fulfilled or refunded on its hero's turn (family sync): not at all while another device plays the hero
      const heroGate = ref<HeroWriteGate | null>(null);
      const writeHero = (heroId: string, change: () => Promise<void>): Promise<boolean> =>
        saveHeroEdit(heroGate.value ?? undefined, heroId, change);
      const globalProps = getCurrentInstance()?.appContext.config.globalProperties;
      const activeSegment = ref<"achievements" | "accessories" | "town-hall" | "history">(
        "achievements"
      );
      const isLoading = ref(true);

      // Heroes' Town Hall posts waiting on the Game Master (the store keeps them on this device)
      const townHall = useTownHallStore();
      const townHallWaiting = computed(() =>
        townHall.posts.filter((post) => post.status === "awaiting-gm")
      );
      onMounted(() => {
        townHall.init().catch((error) => debug.error("Failed to load Town Hall posts:", error));
      });

      // Quest completions waiting on the Game Master (QuestLog entries with status "pending")
      const pendingAchievements = ref<QuestLogEntry[]>([]);
      // The 20 most recent approved/rejected QuestLog entries
      const recentReviews = ref<QuestLogEntry[]>([]);
      // Shop purchases waiting on the Game Master (PurchaseLog entries with status "pending")
      const pendingAccessories = ref<PurchaseLogEntry[]>([]);
      // The 20 most recent fulfilled/refunded PurchaseLog entries
      const recentPurchaseReviews = ref<PurchaseLogEntry[]>([]);
      // The cleared project whose family reward is earned and not yet handed over (its row tops the achievements tab)
      const familyReward = ref<ProjectRecord | null>(null);
      const achievementsWaiting = computed(() => pendingAchievements.value.length + (familyReward.value ? 1 : 0));

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

      /** The line for a claim whose verdict went to the device holding the hero's turn; "" while it waits on this Game Master */
      const sentLine = (entry: QuestLogEntry): string => sentLineOf(entry, heroName(entry.userId));

      const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const isUnreadableDate = !dateString || Number.isNaN(date.getTime());
        if (isUnreadableDate) return "";
        return format(date, "MMM d, h:mma");
      };

      const rewardLine = (rewards: QuestRewards) =>
        `+${rewards.xp} XP · +${rewards.gp} GP · +${rewards.ap} AP`;

      const statusBadge = (status: QuestLogEntry["status"]) => {
        const isApproved = status === "approved";
        if (isApproved) return { label: "Approved", color: "success" };
        const isRejected = status === "rejected";
        if (isRejected) return { label: "Rejected", color: "danger" };
        return { label: "Pending", color: "warning" };
      };

      const purchaseBadge = (status: PurchaseLogEntry["status"]) => {
        const isFulfilled = status === "fulfilled";
        if (isFulfilled) return { label: "Delivered", color: "success" };
        const isRefunded = status === "refunded";
        if (isRefunded) return { label: "Refunded", color: "danger" };
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
            detail: entry.status === "approved" ? rewardLine(withHuntBonus(entry)) : "",
            note: entry.note,
            badge: statusBadge(entry.status),
            photoEntry: entry.requiresPhoto ? entry : undefined,
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
      const isLatestLoad = (load: number) => load === latestLoad;
      // The family reward is read apart from the two logs: a store that cannot be read says so, and the lists still show
      const readFamilyReward = async (load: number, failed: string[]): Promise<void> => {
        try {
          const waiting = await readRewardToGive();
          if (isLatestLoad(load)) familyReward.value = waiting;
        } catch (error) {
          debug.error("Failed to load the family reward:", error);
          failed.push("the family reward");
        }
      };
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
          if (isLatestLoad(thisLoad)) {
            const isQuestsLoaded = quests.status === "fulfilled";
            if (isQuestsLoaded) {
              const [pending, entries] = quests.value;
              // Your own chore is not yours to approve while another Game Master could
              pendingAchievements.value = claimsFor(userStore.currentUser.id, pending, userStore.users);
              recentReviews.value = entries
                .filter((entry) => entry.status !== "pending")
                .slice(0, HISTORY_LIMIT);
            }
            const isPurchasesLoaded = purchases.status === "fulfilled";
            if (isPurchasesLoaded) {
              const [pending, entries] = purchases.value;
              pendingAccessories.value = pending;
              recentPurchaseReviews.value = entries
                .filter((entry) => entry.status !== "pending")
                .slice(0, HISTORY_LIMIT);
            }
          }

          const failed: string[] = [];
          await readFamilyReward(thisLoad, failed);
          const isQuestsFailed = quests.status === "rejected";
          if (isQuestsFailed) {
            debug.error("Failed to load quest approvals:", quests.reason);
            failed.push("quest approvals");
          }
          const isPurchasesFailed = purchases.status === "rejected";
          if (isPurchasesFailed) {
            debug.error("Failed to load accessory purchases:", purchases.reason);
            failed.push("accessory purchases");
          }
          const hasFailures = failed.length > 0;
          if (hasFailures) {
            if (isLatestLoad(thisLoad)) {
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
          if (isLatestLoad(thisLoad)) {
            void showToast("Couldn't load approvals. Tap refresh to try again.", "danger");
          }
          return false;
        } finally {
          if (isLatestLoad(thisLoad)) isLoading.value = false;
        }
      };

      const refreshApprovals = async () => {
        const isLoaded = await loadApprovals();
        if (isLoaded) void showToast("Approvals refreshed!");
      };

      onMounted(loadApprovals);
      onIonViewWillEnter(loadApprovals);

      // Entries with a review in flight. approveCompletion and refundPurchase are
      // read-then-write, so a double tap must not reach them twice for the same entry
      // (that would pay or refund twice).
      const reviewing = new Set<string>();

      const runReview = async (
        entry: { id: string },
        review: () => Promise<ReviewMessage>
      ) => {
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
        await loadApprovals();
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
        const isKnownHero = Boolean(heroFor(entry.userId));
        if (!isKnownHero) {
          // applyQuestRewards silently skips unknown heroes, so don't claim a payout.
          void showToast(
            "That hero no longer exists, so there is no one to pay. Send the quest back instead.",
            "warning"
          );
          return;
        }

        const alert = await alertController.create({
          header: "Approve Quest",
          message: `Approve "${entry.questName}" for ${hero}? They will earn ${rewardLine(
            withHuntBonus(entry)
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
                  const result = await approveClaim(entry.id, userStore.currentUser.id ?? undefined);
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
                  const result = await rejectClaim(entry.id, userStore.currentUser.id ?? undefined, note || undefined);
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
      const fulfilItem = async (entry: PurchaseLogEntry) => {
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
                      done.entry = await fulfillPurchase(entry.id, userStore.currentUser.id ?? undefined);
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

      const refundItem = async (entry: PurchaseLogEntry) => {
        const hero = heroName(entry.userId);
        const isKnownHero = Boolean(heroFor(entry.userId));
        if (!isKnownHero) {
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
                  const done: { entry: PurchaseLogEntry | null } = { entry: null };
                  const isWritten = await writeHero(entry.userId, async () => {
                    done.entry = await refundPurchase(entry.id, userStore.currentUser.id ?? undefined, note || undefined);
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

      return {
        heroGate,
        rootClass,
        rootStyle,
        activeSegment,
        pendingAchievements,
        achievementsWaiting,
        familyReward,
        loadApprovals,
        pendingAccessories,
        townHallWaiting,
        historyRows,
        heroName,
        heroAvatar,
        sentLine,
        formatDate,
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

<style lang="scss" scoped src="./_XpApprovals.scss" />

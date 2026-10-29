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
        <ion-segment-button value="creations">
          Creations
          <ion-badge color="primary">{{ creationLists.pending.length }}</ion-badge>
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
          <approval-family-reward-row v-if="familyReward" :key="familyReward.id" :text="familyReward.reward.text" @given="loadApprovals" />
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

        <ion-list v-if="activeSegment === 'creations'">
          <approval-creation-row
            v-for="row in creationLists.pending"
            :key="row.key"
            :row="row"
            :maker-name="heroName(row.by)"
            :avatar="heroAvatar(row.by)"
            :target-names="targetsOf(row)"
            :portrait="portraitOf(row)"
            @approve="approveCreation"
            @reject="sendBackCreation"
            @edit="editCreation"
          />
          <ion-item v-if="creationLists.pending.length === 0">
            <ion-label class="ion-text-center">
              <i class="fad fa-paint-brush fa-3x text-success"></i>
              <p>No creations waiting</p>
            </ion-label>
          </ion-item>
          <p v-else class="swipe-hint">
            Tap Approve, Send back, or Edit to fix it yourself. You can also swipe a creation left.
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
  import { onIonViewWillEnter, toastController } from "@ionic/vue";
  import { format } from "date-fns";
  import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
  import XpTownHallApprovals from "./components/XpTownHallApprovals.vue";
  import ApprovalPhoto from "./components/ApprovalPhoto.vue";
  import ApprovalClaimRow from "./components/ApprovalClaimRow.vue";
  import ApprovalCreationRow from "./components/ApprovalCreationRow.vue";
  import ApprovalFamilyRewardRow from "./components/ApprovalFamilyRewardRow.vue";
  import ApprovalPurchaseRow from "./components/ApprovalPurchaseRow.vue";
  import XpHeroWriteGate from "@/components/organisms/HeroWriteGate/XpHeroWriteGate.vue";
  import { saveHeroEdit, type HeroWriteGate } from "@/hooks/useHeroWrite";
  import { useTownHallStore } from "@/lib/store/stores/townHall";
  import { useSentVerdicts } from "./useSentVerdicts";
  import debug from "@/lib/utils/debug";
  import { getQuestLogDb } from "@/lib/databases/QuestLogDb";
  import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
  import { getPurchaseLogDb } from "@/lib/databases/PurchaseLogDb";
  import type { PurchaseLogEntry } from "@/lib/databases/PurchaseLogDb";
  import { claimsFor } from "@/lib/services/quests/waitingClaims";
  import type { ProjectRecord } from "@/lib/services/projects/projectRecord";
  import { readRewardToGive } from "@/lib/services/projects/projectService";
  import { play$fx } from "@/assets/fx";
  import { useAppSkin } from "@/components/organisms/XpApp/useAppSkin";
  import { HISTORY_LIMIT, latestHistory, purchaseHistoryRow, questHistoryRow } from "./approvalHistory";
  import type { HistoryRow } from "./approvalHistory";
  import { creationPortrait, creationTargets } from "./components/creationMeta";
  import type { CreationRow } from "@/lib/services/creations/creations";
  import { useApprovalReviews } from "./useApprovalReviews";
  import type { ToastColor } from "./useApprovalReviews";

  type Segment = "achievements" | "accessories" | "creations" | "town-hall" | "history";
  const SEGMENTS: readonly Segment[] = ["achievements", "accessories", "creations", "town-hall", "history"];
  const isSegment = (value: string): value is Segment => SEGMENTS.includes(value as Segment);

  export default defineComponent({
    name: "xp-approvals",
    mixins: [ionic],
    components: {
      XpLoading,
      XpTownHallApprovals,
      ApprovalPhoto,
      ApprovalClaimRow,
      ApprovalCreationRow,
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
      const instance = getCurrentInstance();
      const globalProps = instance?.appContext.config.globalProperties;
      const activeSegment = ref<Segment>("achievements");
      const isLoading = ref(true);

      // A link may ask for a segment (a "creation awaits" notification opens Creations)
      const openAskedSegment = () => {
        const asked = String(instance?.proxy?.$route.query.segment ?? "");
        if (isSegment(asked)) activeSegment.value = asked;
      };

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

      const showToast = async (message: string, color: ToastColor = "success") => {
        const toast = await toastController.create({
          message: message,
          duration: 2500,
          position: "bottom",
          color,
        });
        await toast.present();
      };

      const { approveItem, rejectItem, confirmDelivery, sendRefund, creations } = useApprovalReviews({
        heroName,
        isKnownHero: (userId) => Boolean(heroFor(userId)),
        profiles: () => userStore.usersAz,
        reviewerId: () => userStore.currentUser.id ?? undefined,
        showToast,
        reload: () => loadApprovals(),
        writeHero,
      });

      // Reviewed quests, reviewed shop purchases and reviewed creations in one list, newest first
      const historyRows = computed<HistoryRow[]>(() =>
        latestHistory(recentReviews.value.map(questHistoryRow), recentPurchaseReviews.value.map(purchaseHistoryRow), creations.lists.history)
      );

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
          // Read the stores separately so one broken store can't hide the other lists.
          const [quests, purchases, creationsRead] = await Promise.allSettled([
            Promise.all([questLog.getPending(), questLog.getEntries()]),
            Promise.all([purchaseLog.getPending(), purchaseLog.getEntries()]),
            creations.loadCreations(() => isLatestLoad(thisLoad)),
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

          const reads = [
            ["quest approvals", quests],
            ["accessory purchases", purchases],
            ["creations", creationsRead],
          ] as const;
          const failed: string[] = [];
          await readFamilyReward(thisLoad, failed);
          for (const [name, read] of reads) {
            const isFailed = read.status === "rejected";
            if (!isFailed) continue;
            debug.error(`Failed to load ${name}:`, read.reason);
            failed.push(name);
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

      onMounted(() => {
        openAskedSegment();
        void loadApprovals();
      });
      onIonViewWillEnter(() => {
        openAskedSegment();
        void loadApprovals();
      });

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
        creationLists: creations.lists,
        townHallWaiting,
        historyRows,
        heroName,
        heroAvatar,
        sentLine,
        formatDate,
        approveItem,
        rejectItem,
        fulfilItem: confirmDelivery,
        refundItem: sendRefund,
        targetsOf: (row: CreationRow) => creationTargets(row, heroName),
        portraitOf: creationPortrait,
        approveCreation: creations.approveCreation,
        sendBackCreation: creations.sendBackCreation,
        editCreation: creations.editCreation,
        refreshApprovals,
        isLoading,
      };
    },
  });
</script>

<style lang="scss" scoped src="./_XpApprovals.scss" />

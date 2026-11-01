import { computed, defineComponent, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { modalController, toastController } from "@ionic/vue";
import { IonButton, IonSegment, IonSegmentButton, IonLabel, IonGrid, IonRow, IonCol } from "@ionic/vue";
import XpRpgPage from "@/components/templates/pages/XpRpgPage.vue";
import FamilySummaryBanner from "./components/FamilySummaryBanner.vue";
import FamilyMemberCard from "./components/FamilyMemberCard.vue";
import FamilyTodayChores from "./components/FamilyTodayChores.vue";
import DialPad from "@/app/SideMenu/SwitchProfile/DialPad.vue";
import { useUserStore } from "@/lib/store/stores/user";
import { canManageFamily, needsGameMasterPasscode } from "@/router/_Guards/gm.guard";
import { getQuestLogDb } from "@/lib/databases/QuestLogDb";
import QuestEngine from "@/lib/engine/quests/QuestEngine";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import {
  buildFamilyOverview,
  type FamilyOverviewMember,
  type FamilyOverviewSummary,
} from "@/lib/services/family/familyOverviewService";
import { landingChoiceOf, landingPathFor } from "@/lib/services/core/profilePrefs";
import debug from "@/lib/utils/debug";

const emptySummary: FamilyOverviewSummary = {
  totalMembers: 0,
  totalHeroes: 0,
  totalAdults: 0,
  totalChoresToday: 0,
  completedChoresToday: 0,
  choresProgressPercent: 100,
  pendingApprovalsCount: 0,
  totalFamilyGp: 0,
  longestStreak: 0,
  members: [],
  allTodayChores: [],
};

export default defineComponent({
  name: "FamilyOverview",
  components: {
    XpRpgPage,
    FamilySummaryBanner,
    FamilyMemberCard,
    FamilyTodayChores,
    IonButton,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonGrid,
    IonRow,
    IonCol,
  },
  setup() {
    const userStore = useUserStore();
    const router = useRouter();
    const route = useRoute();

    const isLoading = ref(true);
    const activeTab = ref<"roster" | "chores">("roster");
    const summary = ref<FamilyOverviewSummary>(emptySummary);

    const backHref = computed(() => {
      const fromParam = route.query.from;
      const isString = typeof fromParam === "string" && fromParam.length > 0;
      return isString ? fromParam : "/xp-profile";
    });

    const canManage = computed(() => canManageFamily(userStore));

    const loadOverview = async () => {
      isLoading.value = true;
      try {
        await userStore.loadUsers();
        const users = userStore.users;
        const questLogDb = getQuestLogDb();
        const [questLogs, pendingApprovals] = await Promise.all([
          questLogDb.getEntries(),
          questLogDb.getPending(),
        ]);

        const questEngine = new QuestEngine();
        const today = new Date();
        const userBoards: Record<string, QuestBoardItem[]> = {};

        const userIds = Object.keys(users);
        await Promise.all(
          userIds.map(async (id) => {
            try {
              userBoards[id] = await questEngine.getQuestBoardForUser(id, today);
            } catch {
              userBoards[id] = [];
            }
          })
        );

        summary.value = buildFamilyOverview({
          users,
          questLogs,
          userBoards,
          pendingApprovals,
          today,
        });
      } catch (error) {
        debug.warn("[FamilyOverview] the overview could not load", error);
        const toast = await toastController.create({
          message: "Failed to load family overview",
          duration: 2500,
          color: "danger",
          position: "top",
        });
        await toast.present();
      } finally {
        isLoading.value = false;
      }
    };

    const handleRefresh = async (event: any) => {
      try {
        await loadOverview();
      } finally {
        event.target.complete();
      }
    };

    const navigateToPortal = (profile: any) => {
      userStore.loginUser(profile);
      const landing = landingChoiceOf(profile.id);
      const targetPath = landingPathFor(profile, landing);
      router.push(targetPath);
    };

    const handleSelectMember = async (member: FamilyOverviewMember) => {
      const profile = member.rawUser;
      const requiresPasscode = profile.isAdult && (needsGameMasterPasscode(profile) || Boolean(profile.passcode));

      if (requiresPasscode) {
        const modal = await modalController.create({
          component: DialPad,
          cssClass: "fullscreen",
          componentProps: { profile },
        });
        await modal.present();
        const { data } = await modal.onDidDismiss();
        if (data) {
          navigateToPortal(profile);
        }
      } else {
        navigateToPortal(profile);
      }
    };

    onMounted(() => {
      void loadOverview();
    });

    return {
      isLoading,
      activeTab,
      summary,
      backHref,
      canManage,
      handleRefresh,
      handleSelectMember,
    };
  },
});

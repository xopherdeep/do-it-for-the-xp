import ionic from "@/lib/mixins/ionic";
import { useUserStore } from "@/lib/store/stores/user";
import { useProStore } from "@/lib/store/stores/pro";
import XpBonus from "./components/XpBonus.vue";
import XpGroundedForgive from "./components/XpGroundedForgive.vue";
import XpPowerTimerEnd from "./components/XpPowerTimerEnd.vue";
import AddProfile from "@/app/SideMenu/SwitchProfile/AddProfile/AddProfile.vue";
import AchievementDb, {
  achievementStorage,
} from "@/lib/databases/AchievementDb";
import BestiaryDb, { beastStorage } from "@/lib/databases/BestiaryDb";
import AbilitiesDb, { abilitiesStorage } from "@/lib/databases/AbilitiesDb";
import DosDontsDb from "@/lib/databases/DosDontsDb";
import { getQuestLogDb } from "@/lib/databases/QuestLogDb";
import { getPurchaseLogDb } from "@/lib/databases/PurchaseLogDb";
import { getEngineStatsService } from "@/lib/services/stats/EngineStatsService";
import {
  toastController,
  modalController,
  actionSheetController,
} from "@ionic/vue";
import { RecycleScroller } from "vue-virtual-scroller";
import { appSheet } from "@/components/organisms/XpApp/useAppSkin";
import {
  close,
  colorWandOutline,
  heartOutline,
  leafOutline,
  personAddOutline,
  waterOutline,
} from "ionicons/icons";
import debug from "@/lib/utils/debug";
import XpStatBox from "@/components/molecules/StatBox/XpStatBox.vue";

import { defineComponent, ref, onMounted } from "vue";
import { onIonViewWillEnter } from "@ionic/vue";
import { mintTempleId } from "@/app/Admin/XpCompendium/views/XpTemples/templeWizard";
export default defineComponent({
  name: "xp-dashboard",
  mixins: [ionic],
  components: {
    // XpRewardShelf,
    // XpImpersonateProfile,
    // XpActionItems,
    // XpDoThisNotThat,
    // XpTemples,
    XpStatBox,
    XpGroundedForgive,
    XpPowerTimerEnd,
    RecycleScroller,
    XpDashboardGrid:
      require("@/components/molecules/StatGrid/XpDashboardGrid.vue").default,
    XpDashboardTile:
      require("@/components/molecules/StatGrid/XpDashboardTile.vue").default,
    XpRpgPage: require("@/components/templates/pages/XpRpgPage.vue").default,
  },
  computed: {
    usersAz() {
      return (this as any).userStore.usersAz;
    },
    users() {
      return (this as any).usersAz;
    },
    allProfileItems() {
      const items: any[] = [
        { id: "masquerade", type: "masquerade" }, // Masquerade toggle button
      ];

      // Map all users to profile items if masquerade is active
      const isMasquerading = this.showMasquerade;
      if (isMasquerading) {
        const userItems = this.usersAz.map((user) => ({
          id: `user-${user.id}`,
          type: "user",
          data: user,
        }));
        items.push(...userItems);
      }

      // Add special items
      items.push(
        { id: "add-profile", type: "add" }, // Add Profile button
        { id: "family", type: "family" } // Family settings button
      );

      return items;
    },
  },
  methods: {
    toggleMasquerade() {
      this.showMasquerade = !this.showMasquerade;
      this.play$fx("select");
    },
    navigateTo(pathOrRouteObj) {
      this.$router.push(pathOrRouteObj);
    },
    openSettings() {
      this.$router.push({ name: "xp-settings-general" });
    },
    async openBonus() {
      const modal = await modalController.create({
        component: XpBonus,
        componentProps: {
          isPenalty: false,
        },
        cssClass: "fullscreen",
      });
      await modal.present();

      // Refresh stats after modal is dismissed
      const { data } = await modal.onDidDismiss();
      if (data) {
        this.refreshData();
      }
    },
    async openPenalty() {
      const modal = await modalController.create({
        component: XpBonus,
        componentProps: {
          isPenalty: true,
        },
        cssClass: "fullscreen",
      });
      await modal.present();

      // Refresh stats after modal is dismissed
      const { data } = await modal.onDidDismiss();
      if (data) {
        this.refreshData();
      }
    },
    async refreshData() {
      this.loadStats();
      this.showSuccessToast("Dashboard refreshed!");
    },
    async loadStats() {
      // Use the centralized EngineStatsService
      const statsService = getEngineStatsService();
      const systemStats = await statsService.getSystemStats();

      this.stats.achievements = systemStats.achievements;
      this.stats.beasts = systemStats.beasts;
      this.stats.users = systemStats.users;
      this.stats.dos = systemStats.dos;
      this.stats.donts = systemStats.donts;

      // Get rewards data from XpRewardShelf
      this.rewards = {
        active: 10, // This would come from actual data
        expired: 5, // This would come from actual data
        redeemed: 0, // This would come from actual data
        cashed: 0, // This would come from actual data
        total: 15, // This would come from actual data
      };

      await this.loadPendingApprovals();
    },
    openFamilySettings() {
      this.$router.push({ name: "xp-settings-family" });
    },
    showSuccessToast(message) {
      // Use the imported toastController instead of this.$ionic.toastController
      toastController
        .create({
          message: message,
          duration: 2000,
          position: "bottom",
          color: "success",
        })
        .then((toast) => toast.present());
    },
    async impersonateUser(user: any) {
      const loadingModal = await modalController.create({
        component: require("@/components/templates/modals/ProfileLoadingModal.vue")
          .default,
        componentProps: {
          userName: user.name.nick,
          userAvatar: this.getUserAvatar(user),
        },
        cssClass: "profile-loading-modal",
        backdropDismiss: false,
      });

      await loadingModal.present();

      try {
        await (this as any).userStore.impersonateUser(user.id);

        this.showSuccessToast(`Now viewing as ${user.name.nick}`);

        // Navigate to user's portal after successful impersonation
        await this.$router.push({
          name: "my-home",
          params: { userId: user.id },
        });
      } catch (error) {
        debug.error("Failed to impersonate user:", error);
        this.showErrorToast("Failed to switch profile");
      } finally {
        setTimeout(async () => {
          await loadingModal.dismiss();
        }, 500);
      }
    },

    showErrorToast(message) {
      toastController
        .create({
          message,
          duration: 2000,
          position: "bottom",
          color: "danger",
        })
        .then((toast) => toast.present());
    },

    async presentActionSheet() {
      const actionSheet = await actionSheetController.create({
        // The same sheet the buildings open: an ionicon beside each choice, echoing the dashboard's area icons
        ...appSheet(undefined, "dashboard-action-sheet"),
        header: "Create New...",
        mode: "ios",
        buttons: [
          {
            text: "New Profile",
            cssClass: "action-profile",
            icon: personAddOutline,
            handler: () => {
              this.openNewProfileModal();
            },
          },
          {
            text: "New Ability",
            cssClass: "action-ability",
            icon: colorWandOutline,
            handler: () => {
              this.navigateTo({ name: "xp-add-ability" });
            },
          },
          {
            text: "New Beast",
            cssClass: "action-beast",
            icon: heartOutline,
            handler: () => {
              this.navigateTo({ name: "xp-add-beast" });
            },
          },
          {
            text: "New Quest",
            cssClass: "action-quest",
            icon: leafOutline,
            handler: () => {
              this.navigateTo({ name: "xp-achievement-config-dashboard", params: { id: "new" } });
            },
          },
          {
            text: "New Temple",
            cssClass: "action-temple",
            icon: waterOutline,
            handler: async () => {
              const hasPro = await useProStore().requirePro("templeCreator");
              if (!hasPro) return;
              // A fresh id per temple: every save writes under the id of its route, so a shared "new" overwrote the last one
              this.navigateTo({
                name: "xp-temple-settings",
                params: { templeId: mintTempleId() },
              });
            },
          },
          {
            text: "Cancel",
            role: "cancel",
            cssClass: "action-cancel",
            icon: close,
          },
        ],
      });
      await actionSheet.present();
    },

    async openNewProfileModal() {
      const modal = await modalController.create({
        component: AddProfile,
        cssClass: "fullscreen",
      });

      await modal.present();

      // Refresh data after modal is dismissed
      const { data } = await modal.onDidDismiss();
      if (data) {
        this.refreshData();
      }
    },
  },
  setup() {
    const userStore = useUserStore();
    const achievementDb = new AchievementDb(achievementStorage);
    const bestiaryDb = new BestiaryDb(beastStorage);
    const abilitiesDb = new AbilitiesDb(abilitiesStorage);
    const dosDontsDb = new DosDontsDb();
    const requireAvatar = require.context(
      "@/assets/images/avatars",
      false,
      /\.svg$/
    );
    const isLoading = ref(true);
    const showMasquerade = ref(false);

    const getUserAvatar = (user) => {
      const { avatar } = user;
      if (avatar) {
        return requireAvatar(`./${avatar}.svg`);
      }
      return ""; // Return empty string or default avatar path
    };

    const stats = ref({
      achievements: 0,
      users: 0,
      beasts: 0,
      dos: 0,
      donts: 0,
    });

    const approvals = ref({
      chores: 0,
      rewards: 0,
      total: 0,
    });
    const rewards = ref({
      active: 0,
      expired: 0,
      redeemed: 0,
      cashed: 0,
      total: 0,
    });

    // Add abilities ref with explicit typing to fix the TypeScript error
    const abilities = ref<any[]>([]);

    // Everything waiting on the Game Master: quest completions (Quest Log entries still
    // "pending") and shop purchases to deliver (Purchase Log entries still "pending")
    const loadPendingApprovals = async () => {
      // Count each log on its own so one unreadable store can't zero the other's number.
      const countPending = async (read: () => Promise<unknown[]>, what: string) => {
        try {
          return (await read()).length;
        } catch (error) {
          debug.error(`Failed to load pending ${what}:`, error);
          return 0;
        }
      };
      const [chores, rewards] = await Promise.all([
        countPending(() => getQuestLogDb().getPending(), "quest approvals"),
        countPending(() => getPurchaseLogDb().getPending(), "accessory purchases"),
      ]);
      approvals.value = { chores, rewards, total: chores + rewards };
    };

    const loadDashboardData = async () => {
      isLoading.value = true;
      try {
        // Initial data load via centralized service
        const statsService = getEngineStatsService();
        const systemStats = await statsService.getSystemStats();

        stats.value.achievements = systemStats.achievements;
        stats.value.beasts = systemStats.beasts;
        stats.value.dos = systemStats.dos;
        stats.value.donts = systemStats.donts;
        stats.value.users = systemStats.users;

        await loadPendingApprovals();

        // Load abilities data
        try {
          const abilitiesData = await abilitiesDb.getAbilities();
          abilities.value = Array.isArray(abilitiesData) ? abilitiesData : [];
        } catch (error) {
          debug.error("Failed to load abilities:", error);
          abilities.value = [];
        }
      } finally {
        isLoading.value = false;
      }
    };

    onMounted(loadDashboardData);
    onIonViewWillEnter(loadDashboardData);

    return {
      userStore,
      stats,
      approvals,
      loadPendingApprovals,
      rewards,
      achievementDb,
      bestiaryDb,
      dosDontsDb,
      abilitiesDb,
      getUserAvatar,
      abilities, // Return the abilities ref
      isLoading,
      showMasquerade,
    };
  },
});

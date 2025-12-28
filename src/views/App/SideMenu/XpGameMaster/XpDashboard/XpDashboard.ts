
  import ionic from "@/mixins/ionic";
  import { useUserStore } from "@/lib/store/stores/user";
  import XpBonus from "./components/XpBonus.vue";
  import AddProfile from "../../SwitchProfile/AddProfile/AddProfile.vue";
  import AchievementDb, { achievementStorage } from "@/lib/databases/AchievementDb";
  import BestiaryDb, { beastStorage } from "@/lib/databases/BestiaryDb";
  import AbilitiesDb, { abilitiesStorage } from "@/lib/databases/AbilitiesDb";
  import DosDontsDb from "@/lib/databases/DosDontsDb";
  import { toastController, modalController, actionSheetController } from "@ionic/vue";
  import { RecycleScroller } from 'vue-virtual-scroller';
  import debug from "@/lib/utils/debug";
  import XpStatBox from "@/components/molecules/StatBox/XpStatBox.vue";

  import { defineComponent, ref, onMounted } from "vue";
  import { onIonViewWillEnter } from "@ionic/vue";
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
      RecycleScroller,
      XpDashboardGrid: require("@/components/molecules/StatGrid/XpDashboardGrid.vue").default,
      XpDashboardTile: require("@/components/molecules/StatGrid/XpDashboardTile.vue").default,
    },
    computed: {
      usersAz() { return (this as any).userStore.usersAz },
      users() {
        return (this as any).usersAz;
      },
      allProfileItems() {
        const items: any[] = [
          { id: 'masquerade', type: 'masquerade' } // Masquerade toggle button
        ];

        // Map all users to profile items if masquerade is active
        if (this.showMasquerade) {
          const userItems = this.usersAz.map(user => ({
            id: `user-${user.id}`,
            type: 'user',
            data: user
          }));
          items.push(...userItems);
        }

        // Add special items
        items.push(
          { id: 'add-profile', type: 'add' },    // Add Profile button
          { id: 'family', type: 'family' }  // Family settings button
        );

        return items;
      }
    },
    methods: {
      toggleMasquerade() {
        this.showMasquerade = !this.showMasquerade;
        this.play$fx('select');
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
            isPenalty: false
          },
          cssClass: "fullscreen"
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
            isPenalty: true
          },
          cssClass: "fullscreen"
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
        // Load achievements count
        const achievements = await this.achievementDb.getTasks();
        this.stats.achievements = achievements.length;

        // Load beasts count
        const beasts = await this.bestiaryDb.getBeasts();
        this.stats.beasts = beasts.length;

        // Load users count from Vuex
        this.stats.users = this.users.length;

        // Load dos and donts counts
        const allDosDonts = await this.dosDontsDb.getAll();
        this.stats.dos = allDosDonts.filter(item => item.type === 'do').length;
        this.stats.donts = allDosDonts.filter(item => item.type === 'dont').length;

        // Get approvals data from XpActionItems
        this.approvals = {
          chores: 10, // This would come from actual data
          rewards: 5, // This would come from actual data
          total: 15, // This would come from actual data
        };

        // Get rewards data from XpRewardShelf
        this.rewards = {
          active: 10, // This would come from actual data
          expired: 5, // This would come from actual data
          redeemed: 0, // This would come from actual data
          cashed: 0, // This would come from actual data
          total: 15, // This would come from actual data
        };
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
        try {
          await (this as any).userStore.impersonateUser(user.id);
          this.showSuccessToast(`Now viewing as ${user.name.nick}`);
          // Navigate to user's portal after successful impersonation
          await this.$router.push({
            name: 'my-portal-home',
            params: { userId: user.id }
          });
        } catch (error) {
          debug.error('Failed to impersonate user:', error);
          this.showErrorToast('Failed to switch profile');
        }
      },

      showErrorToast(message) {
        toastController.create({
          message,
          duration: 2000,
          position: 'bottom',
          color: 'danger'
        }).then(toast => toast.present());
      },

      async presentActionSheet() {
        const actionSheet = await actionSheetController.create({
          header: 'Create New...',
          cssClass: 'dashboard-action-sheet',
          mode: 'ios',
          buttons: [
            {
              text: 'New Profile',
              cssClass: 'action-profile',
              handler: () => {
                this.openNewProfileModal();
              }
            },
            {
              text: 'New Ability',
              cssClass: 'action-ability',
              handler: () => {
                this.navigateTo({ name: 'xp-add-ability' });
              }
            },
            {
              text: 'New Beast',
              cssClass: 'action-beast',
              handler: () => {
                this.navigateTo({ name: 'xp-add-beast' });
              }
            },
            {
              text: 'New Quest',
              cssClass: 'action-quest',
              handler: () => {
                this.navigateTo({ name: 'xp-achievement-config' });
              }
            },
            {
              text: 'New Temple',
              cssClass: 'action-temple',
              handler: () => {
                this.navigateTo({
                  name: 'xp-temple-creator',
                  params: { templeId: 'new' }
                });
              }
            },
            {
              text: 'Cancel',
              role: 'cancel',
              cssClass: 'action-cancel'
            }
          ],
        });
        await actionSheet.present();
      },

      async openNewProfileModal() {
        const modal = await modalController.create({
          component: AddProfile,
          cssClass: "fullscreen"
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
      const requireAvatar = require.context("@/assets/images/avatars", false, /\.svg$/);
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

      const loadDashboardData = async () => {
        isLoading.value = true;
        try {
          // Initial data load
          const achievements = await achievementDb.getTasks();
          stats.value.achievements = achievements.length;

          const beasts = await bestiaryDb.getBeasts();
          stats.value.beasts = beasts.length;

          // Get all dos/donts and filter
          const allDosDonts = await dosDontsDb.getAll();
          stats.value.dos = allDosDonts.filter(item => item.type === 'do').length;
          stats.value.donts = allDosDonts.filter(item => item.type === 'dont').length;

          // Load abilities data
          try {
            const abilitiesData = await abilitiesDb.getAbilities();
            abilities.value = Array.isArray(abilitiesData) ? abilitiesData : [];
          } catch (error) {
            debug.error('Failed to load abilities:', error);
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
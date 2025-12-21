<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="icon-colors rpg-box">
        <ion-buttons slot="start">
          <ion-menu-button @click="play$fx('select')" />
          <i
            class="fad fa-heart fa-2x ml-2"
            slot="start"
          />
        </ion-buttons>

        <ion-title>
          XP Family Dashboard
        </ion-title>
        <ion-buttons slot="end">
          <ion-button
            @click="openSettings"
            color="rpg"
          >
            <i class="fad fa-toggle-on fa-lg" />
          </ion-button>

          <ion-button
            @click="refreshData"
            color="rpg"
          >
            <i class="fad fa-sync-alt fa-lg" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="bg-slide">
      <!-- Profile Avatars -->
      <div class="profile-avatars-container rpg-box">
        <div class="scroller-wrapper">
          <RecycleScroller
            class="ion-content-scroll-host scroller profile-scroller"
            :items="allProfileItems"
            :item-size="80"
            direction="horizontal"
          >
            <template #default="{ item }">
              <div
                class="flex flex-row items-end gap-3"
                v-if="item.type === 'user'"
              >
                <div
                  class="profile-item h-30"
                  @click="impersonateUser(item.data)"
                >
                  <div class="avatar-wrapper">
                    <ion-avatar>
                      <ion-img :src="getUserAvatar(item.data)" />
                    </ion-avatar>
                    <div class="xp-badge">₲{{ item.data.stats?.gp.wallet || 0 }}</div>
                  </div>
                  <div class="username">{{ item.data.name.nick }}</div>
                </div>
              </div>

              <div
                v-else-if="item.type === 'add'"
                class="profile-item add-profile"
                @click="openNewProfileModal"
              >
                <ion-avatar class="h-[64px]">
                  <i class="fad fa-heartbeat fa-2x" />
                </ion-avatar>
                <p class="username">Add Profile</p>
              </div>

              <div
                v-else-if="item.type === 'family'"
                class="profile-item add-profile"
                @click="openFamilySettings"
              >
                <ion-avatar class="h-[64px]">
                  <i class="fad fa-cogs fa-2x" />
                </ion-avatar>
                <p class="username">Family</p>
              </div>
            </template>
          </RecycleScroller>
          <small>
            Click a profile to masquerade as that user.
          </small>
        </div>
      </div>

      <!-- Stats Overview -->
      <!-- <ion-card class="stats-card icon-colors"> -->
      <!-- <ion-card-header>
          <ion-card-title>
            <i class="fad fa-chart-line fa-lg mr-2"></i>
            Dashboard Overview
          </ion-card-title>
        </ion-card-header> -->
      <!-- <ion-card-content> -->
      <ion-grid class="icon-colors">
        <ion-row>
          <ion-col size="3">
            <XpStatBox
              :value="stats.users || 0"
              label="Users"
              iconName="fa-users"
              iconColor="tertiary"
              :onClick="openFamilySettings"
            />
          </ion-col>
          <ion-col size="3">
            <XpStatBox
              :value="stats.dos || 0"
              label="Do's"
              iconName="fa-thumbs-up"
              iconColor="success"
              :onClick="() => navigateTo('/game-master/do-this-not-that?openDo=true')"
            />
          </ion-col>
          <ion-col size="3">
            <XpStatBox
              :value="stats.donts || 0"
              label="Don'ts"
              iconName="fa-thumbs-down"
              iconColor="danger"
              :onClick="() => navigateTo('/game-master/do-this-not-that?openDo=false')"
            />
          </ion-col>
          <ion-col size="3">
            <XpStatBox
              :value="approvals?.total || 0"
              label="Approvals"
              iconName="fa-clipboard-check"
              iconColor="primary"
              :onClick="() => navigateTo('/game-master/approvals')"
            />
          </ion-col>
          <ion-col size="3">
            <XpStatBox
              :value="abilities?.length || 0"
              label="Abilities"
              iconName="fa-hand-holding-magic"
              :onClick="() => navigateTo('/game-master/compendium/abilities')"
            />
          </ion-col>

          <ion-col size="3">
            <XpStatBox
              :value="stats.beasts || 0"
              label="Beasts"
              iconName="fa-hand-holding-heart"
              :onClick="() => navigateTo('/game-master/compendium/bestiary')"
            />
          </ion-col>
          <ion-col size="3">
            <XpStatBox
              :value="stats.achievements || 0"
              label="Quests"
              iconName="fa-hand-holding-seedling"
              :onClick="() => navigateTo('/game-master/compendium/achievements')"
            />
          </ion-col>
          <ion-col size="3">
            <XpStatBox
              :value="rewards?.active || 80"
              label="Items"
              iconName="fa-hand-holding-usd"
              :onClick="() => navigateTo('/game-master/compendium/accessories')"
            />
          </ion-col>
        </ion-row>
      </ion-grid>
      <!-- </ion-card-content> -->
      <!-- </ion-card> -->

      <!-- <ion-accordion-group>
        <ion-accordion>
          <ion-item slot="header" class="accordion-header">
            <i class="fad fa-clipboard-check fa-lg mr-3 text-primary"></i>
            <ion-label>
              Action Items
              <p>Stay on top of all the action!</p>
            </ion-label>
            <ion-badge color="primary" slot="end">{{
              approvals?.total || 0
            }}</ion-badge>
          </ion-item>
          <ion-list slot="content">
            <xp-action-items />
            <xp-temples />
          </ion-list>
        </ion-accordion>

        <ion-accordion>
          <ion-item slot="header" class="accordion-header">
            <i class="fad fa-hand-holding-box fa-lg mr-3 text-success"></i>
            <ion-label>
              Reward Shelf
              <p>Create rewards, redeem points.</p>
            </ion-label>
            <ion-badge color="success" slot="end">{{
              rewards?.total || 0
            }}</ion-badge>
          </ion-item>
          <ion-list slot="content">
            <xp-reward-shelf />
            <xp-do-this-not-that />
          </ion-list>
        </ion-accordion>
        
        <ion-accordion>
          <ion-item slot="header" class="accordion-header">
            <i class="fad fa-user-secret fa-lg mr-3 text-tertiary"></i>
            <ion-label>
              Impersonate Profile
              <p>Clicking a profile will impersonate that user.</p>
            </ion-label>
            <ion-badge color="tertiary" slot="end">{{
              users?.length || 0
            }}</ion-badge>
          </ion-item>
          <ion-list slot="content">
            <xp-impersonate-profile />
          </ion-list>
        </ion-accordion>
      </ion-accordion-group> -->

      <!-- Quick Actions FAB -->
      <ion-fab
        vertical="center"
        horizontal="center"
        slot="fixed"
        class="icon-colors"
      >
        <ion-fab-button color="warning">
          <i class="fad fa-hand-holding fa-2x"></i>
        </ion-fab-button>
        <ion-fab-list side="top">
          <ion-fab-button
            color="success"
            @click="openBonus()"
          >
            <i class="fad fa-thumbs-up fa-lg"></i>
          </ion-fab-button>
        </ion-fab-list>
        <ion-fab-list side="bottom">
          <ion-fab-button
            color="danger"
            @click="openPenalty()"
          >
            <i class="fad fa-thumbs-down fa-lg"></i>
          </ion-fab-button>
        </ion-fab-list>
      </ion-fab>

      <!-- Badges FAB -->
      <!-- <ion-fab
        vertical="bottom"
        horizontal="start"
        slot="fixed"
        class="icon-colors"
      >
        <ion-fab-button
          color="primary"
          @click="navigateTo('/game-master/badges')"
        >
          <i class="fad fa-shield fa-2x"></i>
        </ion-fab-button>
      </ion-fab> -->

      <!-- Quest/Achievement FAB -->
      <ion-fab
        vertical="bottom"
        horizontal="center"
        slot="fixed"
        class="icon-colors"
      >
        <ion-fab-button
          color="rpg"
          @click="presentActionSheet"
        >
          <i class="fad fa-hand-holding-medical fa-2x"></i>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
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
  import XpStatBox from "@/components/XpStatBox/XpStatBox.vue";

  import { defineComponent, ref, onMounted } from "vue";
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
    },
    computed: {
      usersAz() { return (this as any).userStore.usersAz },
      users() {
        return (this as any).usersAz;
      },
      allProfileItems() {
        // Map all users to profile items
        const userItems = this.usersAz.map(user => ({
          id: `user-${user.id}`,
          type: 'user',
          data: user
        }));

        // Add special items
        return [
          ...userItems,
          { id: 'add-profile', type: 'add' },    // Add Profile button
          { id: 'family', type: 'family' }  // Family settings button
        ];
      }
    },
    methods: {
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
          await this.$router.push(`/my-portal/${user.id}/my-home`);
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
                this.navigateTo({ name: 'xp-add-achievement' });
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

      onMounted(async () => {
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
      });

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
      };
    },
  });
</script>

<style lang="scss">
  .xp-dashboard {

    ion-card {
      ion-card-title {
        top: 0;
        position: relative !important;
        display: flex;
        align-items: center;
      }

      &.stats-card,
      &.quick-actions-card {
        margin: 16px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
    }

    .accordion-header {
      --background: var(--ion-color-light);
      margin-bottom: 4px;
      border-radius: 8px;
    }

    ion-accordion-group {
      margin: 16px;
    }

    .stat-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 12px;
      border-radius: 8px;
      background-color: var(--ion-color-light);
      transition: all 0.2s ease-in-out;

      .stat-value {
        font-size: 24px;
        font-weight: bold;
        margin: 8px 0;
      }

      .stat-label {
        font-size: 14px;
        color: var(--ion-color-medium);
      }

      i {
        margin-bottom: 8px;
      }
    }

    .clickable {
      cursor: pointer;

      &:hover {
        transform: translateY(-3px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        background-color: var(--ion-color-light-tint);
      }

      &:active {
        transform: translateY(0);
        background-color: var(--ion-color-light-shade);
      }
    }

    .text-success {
      color: var(--ion-color-success);
    }

    .text-primary {
      color: var(--ion-color-primary);
    }

    .text-warning {
      color: var(--ion-color-warning);
    }

    .text-tertiary {
      color: var(--ion-color-tertiary);
    }

    .profile-avatars-container {
      padding: 16px;
      background: var(--ion-color-light);
      overflow: hidden;

      .scroller-wrapper {
        width: 100%;
        overflow-x: auto;
      }

      .scroller {
        height: 100px;
        width: 100%;
      }

      .profile-scroller {
        direction: ltr;
        overflow-x: auto !important;
        scrollbar-width: thin;
        -webkit-overflow-scrolling: touch;

        &::-webkit-scrollbar {
          height: 4px;
        }

        &::-webkit-scrollbar-thumb {
          background: var(--ion-color-medium);
          border-radius: 4px;
        }
      }

      .profile-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 70px;
        margin: 0 8px;
        cursor: pointer;
        transition: all 0.2s ease-in-out;

        &:hover {
          transform: translateY(-3px);

          .avatar-wrapper ion-avatar {
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            border-color: var(--ion-color-primary-shade);
          }

          .username {
            color: var(--ion-color-dark);
          }
        }

        &:active {
          transform: translateY(0);
        }

        .avatar-wrapper {
          position: relative;
          margin-bottom: 4px;
        }

        ion-avatar {
          width: 60px;
          height: 60px;
          border: 2px solid var(--ion-color-primary);
        }

        .xp-badge {
          position: absolute;
          bottom: -4px;
          right: -4px;
          background: var(--ion-color-warning);
          color: var(--ion-color-dark);
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 12px;
          font-weight: bold;
        }

        .username {
          font-size: 12px;
          text-align: center;
          color: var(--ion-color-medium);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 70px;
        }

        &.add-profile {
          ion-avatar {
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--ion-color-light-shade);
            border: 2px dashed var(--ion-color-medium);

            i {
              color: var(--ion-color-medium);
            }
          }
        }
      }
    }
  }
</style>

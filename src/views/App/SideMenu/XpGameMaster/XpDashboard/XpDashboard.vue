<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="icon-colors rpg-box">
        <ion-buttons slot="start">
          <ion-menu-button @click="play$fx('select')" />
        </ion-buttons>
        <i
          class="fad fa-gamepad-alt fa-2x"
          slot="start"
        />
        <ion-title>
          Game Master Dashboard
        </ion-title>
        <ion-buttons slot="end">
          <ion-button @click="openSettings">
            <i class="fad fa-toggle-on fa-lg" />
          </ion-button>

          <ion-button @click="refreshData">
            <i class="fad fa-sync-alt fa-lg" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="bg-slide">
      <!-- Profile Avatars -->
      <div class="profile-avatars-container">
        <ion-scroll horizontal="true">
          <div class="profile-list">
            <div
              v-for="user in users"
              :key="user.id"
              class="profile-item"
              @click="impersonateUser(user)"
            >
              <div class="avatar-wrapper">
                <ion-avatar>
                  <ion-img :src="getUserAvatar(user)" />
                </ion-avatar>
                <div class="xp-badge">₲{{ user.stats?.gp.wallet || 0 }}</div>
              </div>
              <div class="username">{{ user.name.nick }}</div>
            </div>
            <div
              class="profile-item add-profile"
              @click="openNewProfileModal"
            >
              <ion-avatar class="h-[64px]">
                <i class="fad fa-heartbeat fa-2x" />
              </ion-avatar>
              <p class="username">Add Profile</p>
            </div>
            <div
              class="profile-item add-profile"
              @click="openFamilySettings"
            >
              <ion-avatar class="h-[64px]">
                <i class="fad fa-cogs fa-2x" />
              </ion-avatar>
              <p class="username">Family</p>
            </div>
          </div>
        </ion-scroll>
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
          <ion-col
            size="6"
            size-md="3"
          >
            <div
              class="stat-box clickable"
              @click="navigateTo('/game-master/compendium/achievements')"
            >
              <i class="fad fa-hand-holding-seedling fa-2x"></i>
              <div class="stat-value">{{ stats.achievements || 0 }}</div>
              <div class="stat-label">Quests</div>
            </div>
          </ion-col>
          <ion-col
            size="6"
            size-md="3"
          >
            <div
              class="stat-box clickable"
              @click="navigateTo('/game-master/compendium/abilities')"
            >
              <i class="fad fa-hand-holding-magic fa-2x"></i>
              <div class="stat-value">{{ abilities?.length || 0 }}</div>
              <div class="stat-label">Abilities</div>
            </div>
          </ion-col>
          <ion-col
            size="6"
            size-md="3"
          >
            <div
              class="stat-box clickable"
              @click="navigateTo('/game-master/compendium/accessories')"
            >
              <i class="fad fa-hand-holding-usd fa-2x"></i>
              <div class="stat-value">{{ rewards?.active || 80 }}</div>
              <div class="stat-label">Accessories</div>
            </div>
          </ion-col>
          <ion-col
            size="6"
            size-md="3"
          >
            <div
              class="stat-box clickable"
              @click="navigateTo('/game-master/compendium/bestiary')"
            >
              <i class="fad fa-hand-holding-heart fa-2x"></i>
              <div class="stat-value">{{ stats.beasts || 0 }}</div>
              <div class="stat-label">Task Lists</div>
            </div>
          </ion-col>
        </ion-row>

        <ion-row>
          <ion-col
            size="6"
            size-md="3"
          >
            <div
              class="stat-box clickable"
              @click="navigateTo('/game-master/approvals')"
            >
              <i class="fad fa-clipboard-check fa-2x text-primary"></i>
              <div class="stat-value">{{ approvals?.total || 0 }}</div>
              <div class="stat-label">Approvals</div>
            </div>
          </ion-col>
          <ion-col
            size="6"
            size-md="3"
          >
            <div
              class="stat-box clickable"
              @click="navigateTo('/game-master/do-this-not-that?openDo=true')"
            >
              <i class="fad fa-thumbs-up fa-2x text-success"></i>
              <div class="stat-value">{{ stats.dos || 0 }}</div>
              <div class="stat-label">Do's</div>
            </div>
          </ion-col>
          <ion-col
            size="6"
            size-md="3"
          >
            <div
              class="stat-box clickable"
              @click="navigateTo('/game-master/do-this-not-that?openDo=false')"
            >
              <i class="fad fa-thumbs-down fa-2x text-danger"></i>
              <div class="stat-value">{{ stats.donts || 0 }}</div>
              <div class="stat-label">Don'ts</div>
            </div>
          </ion-col>
          <ion-col
            size="6"
            size-md="3"
          >
            <div
              class="stat-box clickable"
              @click="navigateTo('/game-master/family-settings')"
            >
              <i class="fad fa-users fa-2x text-tertiary"></i>
              <div class="stat-value">{{ stats.users || 0 }}</div>
              <div class="stat-label">Users</div>
            </div>
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
        horizontal="end"
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
      <ion-fab
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
      </ion-fab>

      <!-- Quest/Achievement FAB -->
      <ion-fab
        vertical="bottom"
        horizontal="end"
        slot="fixed"
        class="icon-colors"
      >
        <ion-fab-button
          color="primary"
          @click="navigateTo('/game-master/add-achievement')"
        >
          <i class="fad fa-plus fa-2x"></i>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import ionic from "@/mixins/ionic";
import { useStore } from 'vuex';
import XpRewardShelf from "./components/XpRewardShelf.vue";
import XpImpersonateProfile from "./components/XpImpersonateProfile.vue";
import XpActionItems from "./components/XpActionItems.vue";
import XpDoThisNotThat from "./components/XpDoThisNotThatItem.vue";
import XpTemples from "./components/XpTemples.vue";
import XpBonus from "./components/XpBonus.vue";
import AddProfile from "../../SwitchProfile/AddProfile/AddProfile.vue";
import { ProfileDb } from "@/databases";
import { profileStorage } from "../../SwitchProfile/SwitchProfile.vue";
import { mapGetters } from "vuex";
import AchievementDb, { achievementStorage } from "@/databases/AchievementDb";
import BestiaryDb, { beastStorage } from "@/databases/BestiaryDb";
import DosDontsDb, { dosDontsStorage } from "@/databases/DosDontsDb";
import { toastController, modalController } from "@ionic/vue";

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
  },
  computed: {
    ...mapGetters(["usersAz"]),
    users() {
      return this.usersAz;
    },
  },
  methods: {
    navigateTo(path) {
      this.$router.push(path);
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
    async impersonateUser(user) {
      try {
        await this.store.dispatch('impersonateUser', user.id);
        this.showSuccessToast(`Now viewing as ${user.name.nick}`);
        // Navigate to user's portal after successful impersonation
        await this.$router.push(`/my-portal/${user.id}/my-home`);
      } catch (error) {
        console.error('Failed to impersonate user:', error);
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
    const store = useStore();
    const achievementDb = new AchievementDb(achievementStorage);
    const bestiaryDb = new BestiaryDb(beastStorage);
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
    });

    return {
      store,
      stats,
      approvals,
      rewards,
      achievementDb,
      bestiaryDb,
      dosDontsDb,
      getUserAvatar,
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

    .profile-list {
      display: flex;
      overflow-x: auto;
      gap: 16px;
      padding: 4px;
    }

    .profile-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 70px;
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

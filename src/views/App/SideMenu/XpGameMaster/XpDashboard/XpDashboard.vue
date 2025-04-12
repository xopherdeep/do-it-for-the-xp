<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button @click="play$fx('select')" />
        </ion-buttons>
        <ion-title>
          <i class="fad fa-gamepad-alt fa-lg mr-2"></i>
          Game Master Dashboard
        </ion-title>
        <ion-buttons slot="end">
          <ion-button @click="refreshData">
            <i class="fad fa-sync-alt fa-lg"></i>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <!-- Stats Overview -->
      <ion-card class="stats-card">
        <ion-card-header>
          <ion-card-title>
            <i class="fad fa-chart-line fa-lg mr-2"></i>
            Dashboard Overview
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-grid>
            <ion-row>
              <ion-col size="4">
                <div class="stat-box">
                  <i class="fad fa-medal fa-2x text-success"></i>
                  <div class="stat-value">{{ stats.achievements || 0 }}</div>
                  <div class="stat-label">Achievements</div>
                </div>
              </ion-col>
              <ion-col size="4">
                <div class="stat-box">
                  <i class="fad fa-users fa-2x text-primary"></i>
                  <div class="stat-value">{{ stats.users || 0 }}</div>
                  <div class="stat-label">Users</div>
                </div>
              </ion-col>
              <ion-col size="4">
                <div class="stat-box">
                  <i class="fad fa-paw-claws fa-2x text-warning"></i>
                  <div class="stat-value">{{ stats.beasts || 0 }}</div>
                  <div class="stat-label">Beasts</div>
                </div>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>

      <ion-accordion-group>
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
      </ion-accordion-group>

      <!-- Quick Actions -->
      <ion-card class="quick-actions-card">
        <ion-card-header>
          <ion-card-title>
            <i class="fad fa-bolt fa-lg mr-2"></i>
            Quick Actions
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-grid>
            <ion-row>
              <ion-col size="4">
                <ion-button
                  expand="block"
                  color="success"
                  @click="navigateTo('/add-achievement')"
                >
                  <i class="fad fa-plus-circle mr-1"></i>
                  Achievement
                </ion-button>
              </ion-col>
              <ion-col size="4">
                <ion-button
                  expand="block"
                  color="warning"
                  @click="navigateTo('/game-master/do-this-not-that')"
                >
                  <i class="fad fa-rainbow mr-1"></i>
                  Do/Don't
                </ion-button>
              </ion-col>
              <ion-col size="4">
                <ion-button
                  expand="block"
                  color="tertiary"
                  @click="navigateTo('/game-master/bestiary')"
                >
                  <i class="fad fa-dragon mr-1"></i>
                  Beast
                </ion-button>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>
    </ion-content>
    <ion-fab vertical="bottom" horizontal="center">
      <ion-fab-button>
        <i class="fad fa-shield fa-2x"></i>
      </ion-fab-button>
      Badges
    </ion-fab>
  </ion-page>
</template>

<script lang="ts">
  import ionic from "@/mixins/ionic";
  import XpRewardShelf from "./components/XpRewardShelf.vue";
  import XpImpersonateProfile from "./components/XpImpersonateProfile.vue";
  import XpActionItems from "./components/XpActionItems.vue";
  import XpDoThisNotThat from "./components/XpDoThisNotThatItem.vue";
  import XpTemples from "./components/XpTemples.vue";
  import { mapGetters } from "vuex";
  import AchievementDb, { achievementStorage } from "@/databases/AchievementDb";
  import BestiaryDb, { beastStorage } from "@/databases/BestiaryDb";
  import DosDontsDb, { dosDontsStorage } from "@/databases/DosDontsDb";
  import { toastController } from "@ionic/vue";

  import { defineComponent, ref, onMounted } from "vue";
  export default defineComponent({
    name: "xp-dashboard",
    mixins: [ionic],
    components: {
      XpRewardShelf,
      XpImpersonateProfile,
      XpActionItems,
      XpDoThisNotThat,
      XpTemples,
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
    },
    setup() {
      const achievementDb = new AchievementDb(achievementStorage);
      const bestiaryDb = new BestiaryDb(beastStorage);
      const dosDontsDb = new DosDontsDb();

      const stats = ref({
        achievements: 0,
        users: 0,
        beasts: 0,
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
      });

      return {
        stats,
        approvals,
        rewards,
        achievementDb,
        bestiaryDb,
        dosDontsDb,
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
  }
</style>

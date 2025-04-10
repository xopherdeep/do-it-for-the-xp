<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-menu-button :default-href="`/xp-settings/`"></ion-menu-button>
        </ion-buttons>
        <ion-title> Tell a Friend </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding bg-slide">
      <div class="share-container">
        <div class="share-header">
          <ion-icon :icon="shareIcon" class="share-icon"></ion-icon>
          <h2>Share the Adventure!</h2>
        </div>

        <div class="reward-box">
          <h3>Rewards Await!</h3>
          <p>For each friend who joins using your invite:</p>
          <div class="rewards-list">
            <div class="reward-item">
              <ion-icon :icon="trophyIcon"></ion-icon>
              <span>+50 XP Points</span>
            </div>
            <div class="reward-item">
              <ion-icon :icon="diamondIcon"></ion-icon>
              <span>+100 Gold Pieces</span>
            </div>
            <div class="reward-item">
              <ion-icon :icon="giftIcon"></ion-icon>
              <span>Special Mystery Item</span>
            </div>
          </div>
        </div>

        <div class="share-message">
          <p>
            Invite your friends to join the adventure and earn rewards together!
          </p>
          <p class="share-count" v-if="shareCount > 0">
            You've shared {{ shareCount }} times!
          </p>
        </div>
      </div>
    </ion-content>
    <ion-footer>
      <div class="footer-buttons">
        <ion-button expand="block" class="share-button" @click="shareApp">
          <ion-icon :icon="shareIcon" slot="start"></ion-icon>
          Share App
        </ion-button>
      </div>
    </ion-footer>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref, inject } from "vue";
  import { Share } from "@capacitor/share";
  import {
    shareSocialOutline,
    trophyOutline,
    diamondOutline,
    giftOutline,
  } from "ionicons/icons";
  import { toastController } from "@ionic/vue";
  import ionic from "@/mixins/ionic";

  export default defineComponent({
    name: "xp-share-app",
    mixins: [ionic],
    setup() {
      const shareCount = ref(0);

      return {
        shareCount,
        shareIcon: shareSocialOutline,
        trophyIcon: trophyOutline,
        diamondIcon: diamondOutline,
        giftIcon: giftOutline,
      };
    },
    methods: {
      async shareApp() {
        try {
          await Share.share({
            title: "Do-it-for-the-XP",
            text: "Join me on this epic adventure! Level up your productivity with Do-it-for-the-XP!",
            url: "http://doit.forthexp.com/",
            dialogTitle: "Share the Adventure",
          });

          this.shareCount++;
          toastController
            .create({
              message: "Thanks for sharing! Rewards added to your inventory!",
              duration: 2000,
              position: "bottom",
              color: "success",
            })
            .then((toast) => toast.present());
        } catch (error) {
          toastController
            .create({
              message: "No worries! You can share anytime.",
              duration: 2000,
              position: "bottom",
              color: "medium",
            })
            .then((toast) => toast.present());
        }
      },
    },
  });
</script>

<style scoped>
  .share-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px;
    max-width: 600px;
    margin: 0 auto;
  }

  .share-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 24px;
    text-align: center;
  }

  .share-icon {
    font-size: 64px;
    color: var(--ion-color-primary);
    margin-bottom: 16px;
  }

  .reward-box {
    background: rgba(var(--ion-color-primary-rgb), 0.1);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;
    width: 100%;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(var(--ion-color-primary-rgb), 0.3);
  }

  .reward-box h3 {
    text-align: center;
    margin-top: 0;
    color: var(--ion-color-primary);
  }

  .rewards-list {
    margin-top: 16px;
  }

  .reward-item {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
  }

  .reward-item ion-icon {
    font-size: 24px;
    margin-right: 12px;
    color: var(--ion-color-primary);
  }

  .share-message {
    text-align: center;
    margin-bottom: 24px;
  }

  .share-count {
    font-weight: bold;
    color: var(--ion-color-primary);
    margin-top: 12px;
  }

  .footer-buttons {
    padding: 16px;
  }

  .share-button {
    --border-radius: 8px;
    font-weight: bold;
    height: 48px;
  }
</style>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Share the Quest!</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true" class="ion-padding share-content bg-slide">
      <ion-card class="share-intro-card">
        <ion-card-header class="ion-text-center">
           <ion-icon :icon="peopleCircleOutline" class="intro-icon"></ion-icon>
          <ion-card-title>Invite Your Friends!</ion-card-title>
          <ion-card-subtitle>Expand your party & earn rewards</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content class="ion-text-center">
          Share your unique link and help your friends start their own productivity adventure with Do-it-for-the-XP!
        </ion-card-content>
      </ion-card>

      <ion-card class="rewards-card">
        <ion-card-header>
          <ion-card-title class="ion-text-center">Referral Rewards</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="none">
            <ion-item>
              <ion-icon :icon="sparklesOutline" slot="start" color="warning"></ion-icon>
              <ion-label>
                <h2>+50 XP</h2>
                <p>Boost your level</p>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-icon :icon="cashOutline" slot="start" color="success"></ion-icon>
              <ion-label>
                <h2>+100 GP</h2>
                <p>Increase your wealth</p>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-icon :icon="cubeOutline" slot="start" color="secondary"></ion-icon>
              <ion-label>
                <h2>Mystery Item</h2>
                <p>A special surprise awaits</p>
              </ion-label>
            </ion-item>
          </ion-list>
           <p class="ion-text-center ion-margin-top fine-print">Rewards are granted when your friend signs up using your link.</p>
        </ion-card-content>
      </ion-card>

       <p class="ion-text-center share-count" v-if="shareCount > 0">
          You've shared this quest {{ shareCount }} times! Keep it up!
       </p>

    </ion-content>
     <ion-footer class="ion-no-border">
      <ion-toolbar>
         <ion-button expand="block" class="share-button ion-margin" @click="shareApp">
           <ion-icon :icon="sendOutline" slot="start"></ion-icon>
           Send Invite
         </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref } from "vue";
  import { Share } from "@capacitor/share";
  import {
    IonPage, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle,
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonIcon, IonList, IonItem, IonLabel, IonFooter, IonButton, toastController
  } from "@ionic/vue";
  import {
    shareSocialOutline, // Keep if needed elsewhere, or remove
    peopleCircleOutline, // New intro icon
    sparklesOutline,    // XP reward icon
    cashOutline,        // Gold reward icon
    cubeOutline,        // Item reward icon
    sendOutline         // Share button icon
  } from "ionicons/icons";

  export default defineComponent({
    name: "XpShareApp",
    components: {
      IonPage, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle,
      IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
      IonIcon, IonList, IonItem, IonLabel, IonFooter, IonButton
    },
    setup() {
      const shareCount = ref(0);

      // Potentially load shareCount from user profile/storage in a real app
      // e.g., onMounted(async () => { shareCount.value = await getShareCount(); });

      const shareApp = async () => {
        try {
          await Share.share({
            title: "Join my Quest on Do-it-for-the-XP!",
            text: "Level up your life and productivity! Join me on Do-it-for-the-XP using my link.",
            url: "http://doit.forthexp.com/?ref=USER_ID", // Replace USER_ID dynamically later
            dialogTitle: "Share Your Quest Link",
          });

          shareCount.value++;
          // Potentially save shareCount update

          const toast = await toastController.create({
            message: "Invite sent! May your party grow strong!",
            duration: 2500,
            position: "bottom",
            color: "success",
            cssClass: 'rpg-toast' // Optional: for custom styling
          });
          await toast.present();

        } catch (error: any) {
          // Handle cancellation or errors
          // Check if it's a cancellation (often error message contains "Abort" or similar, but Capacitor API might not provide specific codes)
          // For simplicity, we show a generic message if it's not a success.
           if (error?.message && error.message.includes('Abort')) {
             console.log('Share dialog was cancelled by the user.');
             // Optionally show a less prominent message or do nothing
              const toast = await toastController.create({
                message: "Share cancelled.",
                duration: 1500,
                position: "bottom",
                color: "medium",
              });
              await toast.present();
           } else {
             console.error("Share failed:", error);
             const toast = await toastController.create({
               message: "Could not share. Please try again!",
               duration: 2000,
               position: "bottom",
               color: "danger",
             });
             await toast.present();
           }
        }
      };

      return {
        shareCount,
        shareApp,
        // Icons
        peopleCircleOutline,
        sparklesOutline,
        cashOutline,
        cubeOutline,
        sendOutline,
      };
    },
    // Removed methods block as logic is now in setup()
  });
</script>

<style scoped>
/* General Page Styling */
.share-content {
  --background: linear-gradient(135deg, var(--ion-color-light-shade), var(--ion-color-light));
}

ion-toolbar {
  --background: var(--ion-color-primary);
  --color: var(--ion-color-primary-contrast);
}

/* Card Styling */
ion-card {
  margin-left: 0;
  margin-right: 0;
  margin-bottom: 20px;
  border-radius: 16px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  background: var(--ion-color-light); /* Slightly off-white background for cards */
}

.share-intro-card ion-card-header {
  padding-top: 24px;
  padding-bottom: 8px;
}

.intro-icon {
  font-size: 4rem; /* Larger icon */
  color: var(--ion-color-primary);
  margin-bottom: 8px;
}

ion-card-title {
  font-weight: bold;
  color: var(--ion-color-dark);
}

ion-card-subtitle {
  color: var(--ion-color-medium-shade);
  font-size: 0.9rem;
}

/* Rewards Card Specifics */
.rewards-card ion-item {
  --inner-padding-end: 0;
  --padding-start: 8px; /* Align icon better */
  --background: transparent; /* Ensure item bg doesn't clash */
}

.rewards-card ion-icon {
  font-size: 1.8rem;
  margin-right: 16px;
}

.rewards-card ion-label h2 {
  font-weight: 600;
  font-size: 1.1rem;
  margin-bottom: 2px;
}

.rewards-card ion-label p {
  font-size: 0.85rem;
  color: var(--ion-color-medium-shade);
}

.fine-print {
  font-size: 0.75rem;
  color: var(--ion-color-medium);
}

/* Share Count */
.share-count {
  font-weight: 500;
  color: var(--ion-color-primary);
  margin-top: 16px;
  margin-bottom: 16px;
  font-style: italic;
}

/* Footer & Button */
ion-footer ion-toolbar {
   --background: transparent; /* Make footer toolbar transparent */
   padding-bottom: var(--ion-safe-area-bottom, 8px); /* Add padding for safe area */
}

.share-button {
  --background: linear-gradient(90deg, var(--ion-color-primary), var(--ion-color-secondary));
  --background-activated: linear-gradient(90deg, var(--ion-color-primary-shade), var(--ion-color-secondary-shade));
  --border-radius: 25px; /* Pill shape */
  font-weight: bold;
  height: 50px;
  --box-shadow: 0 4px 10px rgba(var(--ion-color-primary-rgb), 0.3);
  color: var(--ion-color-primary-contrast);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 8px 16px; /* Add horizontal margin */
}
</style>

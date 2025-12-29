<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/xp-settings/`"></ion-back-button>
        </ion-buttons>
        <ion-title>Privacy Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box">
      <ion-list>
        <ion-item-group>
          <ion-item-divider>
            <ion-label>Data Collection</ion-label>
          </ion-item-divider>

          <ion-item>
            <ion-label>
              <h2>Analytics</h2>
              <p>Allow anonymous usage data collection to improve the app</p>
            </ion-label>
            <ion-toggle
              v-model="privacySettings.analytics"
              @ionChange="savePrivacySettings"
            ></ion-toggle>
          </ion-item>

          <ion-item>
            <ion-label>
              <h2>Crash Reports</h2>
              <p>Send crash reports to help fix issues</p>
            </ion-label>
            <ion-toggle
              v-model="privacySettings.crashReports"
              @ionChange="savePrivacySettings"
            ></ion-toggle>
          </ion-item>
        </ion-item-group>

        <ion-item-group>
          <ion-item-divider>
            <ion-label>Social Features</ion-label>
          </ion-item-divider>

          <ion-item>
            <ion-label>
              <h2>Profile Visibility</h2>
              <p>Make your profile visible to other users</p>
            </ion-label>
            <ion-toggle
              v-model="privacySettings.profileVisibility"
              @ionChange="savePrivacySettings"
            ></ion-toggle>
          </ion-item>

          <ion-item>
            <ion-label>
              <h2>Achievement Sharing</h2>
              <p>Share your achievements with the community</p>
            </ion-label>
            <ion-toggle
              v-model="privacySettings.achievementSharing"
              @ionChange="savePrivacySettings"
            ></ion-toggle>
          </ion-item>
        </ion-item-group>
      </ion-list>

      <ion-card class="settings-card">
        <ion-card-header>
          <ion-card-title>Data Management</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p>
            You can request a copy of your data or delete your account at any
            time.
          </p>
          <ion-button expand="block" color="primary" @click="requestDataExport">
            Export My Data
          </ion-button>
          <ion-button
            expand="block"
            color="danger"
            class="ion-margin-top"
            @click="confirmDataDeletion"
          >
            Delete My Data
          </ion-button>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref } from "vue";
  import ionic from "@/lib/mixins/ionic";
  import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonItemGroup,
    IonItemDivider,
    IonLabel,
    IonToggle,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    alertController,
    toastController,
  } from "@ionic/vue";

  export default defineComponent({
    name: "privacy-settings",
    components: {
      IonPage,
      IonHeader,
      IonToolbar,
      IonButtons,
      IonBackButton,
      IonTitle,
      IonContent,
      IonList,
      IonItem,
      IonItemGroup,
      IonItemDivider,
      IonLabel,
      IonToggle,
      IonCard,
      IonCardHeader,
      IonCardTitle,
      IonCardContent,
      IonButton,
    },
    mixins: [ionic],
    methods: {
      savePrivacySettings() {
        // In a real app, this would save to a database or local storage
        localStorage.setItem(
          "privacySettings",
          JSON.stringify(this.privacySettings)
        );
        this.showToast("Privacy settings saved");
      },
      async requestDataExport() {
        const toast = await toastController.create({
          message:
            "Data export request submitted. You will receive an email with your data soon.",
          duration: 3000,
          position: "bottom",
          color: "success",
        });
        await toast.present();
      },
      async confirmDataDeletion() {
        const alert = await alertController.create({
          header: "Delete Your Data",
          message:
            "Are you sure you want to delete all your data? This action cannot be undone.",
          buttons: [
            {
              text: "Cancel",
              role: "cancel",
            },
            {
              text: "Delete",
              role: "destructive",
              handler: () => this.deleteUserData(),
            },
          ],
        });
        await alert.present();
      },
      async deleteUserData() {
        // In a real app, this would delete user data from the database
        const toast = await toastController.create({
          message:
            "Your data has been scheduled for deletion. This process may take up to 30 days.",
          duration: 3000,
          position: "bottom",
          color: "danger",
        });
        await toast.present();
      },
      async showToast(message: string) {
        const toast = await toastController.create({
          message,
          duration: 2000,
          position: "bottom",
        });
        await toast.present();
      },
    },
    setup() {
      // Load saved privacy settings or use defaults
      let savedSettings = localStorage.getItem("privacySettings");
      const defaultSettings = {
        analytics: true,
        crashReports: true,
        profileVisibility: true,
        achievementSharing: true,
      };

      const privacySettings = ref(
        savedSettings ? JSON.parse(savedSettings) : defaultSettings
      );

      return {
        privacySettings,
      };
    },
  });
</script>

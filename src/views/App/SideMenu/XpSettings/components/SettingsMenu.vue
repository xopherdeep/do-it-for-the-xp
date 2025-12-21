<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box">
      <ion-card>
        <ion-list>
          <ion-item
            v-for="(item, index) in menuItems"
            :key="index"
            :router-link="item.route"
            detail
            class="settings-menu-item"
            @click="playSelectSound"
          >
            <ion-icon :icon="item.icon" slot="start"></ion-icon>
            <ion-label>{{ item.title }}</ion-label>
          </ion-item>
        </ion-list>
      </ion-card>

      <ion-card class="settings-card">
        <ion-card-header>
          <ion-card-title>
            <ion-icon
              :icon="informationCircleOutline"
              color="primary"
            ></ion-icon>
            About XP
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p>Version: 1.2.3</p>
          <p>© 2025 XP Experience</p>
          <ion-button size="small" fill="clear" @click="showPrivacyPolicy"
            >Privacy Policy</ion-button
          >
          <ion-button size="small" fill="clear" @click="showTermsOfService"
            >Terms of Service</ion-button
          >
          <ion-item lines="none" class="logout-section">
            <ion-label class="ion-text-center">
              <p>© 2025 XP</p>
              <small>All rights reserved.</small>
            </ion-label>
          </ion-item>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import ionic from "@/mixins/ionic";
  import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    alertController,
  } from "@ionic/vue";
  import { informationCircleOutline } from "ionicons/icons";

  export default defineComponent({
    name: "settings-menu",
    components: {
      IonPage,
      IonHeader,
      IonToolbar,
      IonButtons,
      IonMenuButton,
      IonTitle,
      IonContent,
      IonList,
      IonItem,
      IonLabel,
      IonIcon,
      IonCard,
      IonCardHeader,
      IonCardTitle,
      IonCardContent,
      IonButton,
    },
    mixins: [ionic],
    props: {
      menuItems: {
        type: Array as () => Array<{ route: string; icon: any; title: string }>,
        required: true,
      },
    },
    methods: {
      playSelectSound() {
        this.$fx.ui[this.$fx.theme.ui].select.play();
      },
      async showPrivacyPolicy() {
        const alert = await alertController.create({
          header: "Privacy Policy",
          message:
            "Your privacy is important to us. This policy outlines how we collect, use, and protect your data.",
          buttons: ["OK"],
        });
        await alert.present();
      },
      async showTermsOfService() {
        const alert = await alertController.create({
          header: "Terms of Service",
          message:
            "By using this application, you agree to abide by our terms and conditions.",
          buttons: ["OK"],
        });
        await alert.present();
      },
    },
    setup() {
      return {
        informationCircleOutline,
      };
    },
  });
</script>

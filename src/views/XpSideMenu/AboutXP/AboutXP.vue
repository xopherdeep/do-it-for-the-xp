<template>
  <ion-page>
    <ion-tabs @ionTabsWillChange="beforeTabChange" @ionTabsDidChange="afterTabChange">
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="my-home" href="/about-xp/my-dashboard/1">
          <ion-icon :icon="home" color="primary"></ion-icon>
          <ion-label>Home</ion-label>
          <ion-badge></ion-badge>
        </ion-tab-button>

        <ion-tab-button tab="my-party" href="/about-xp/my-party">
          <ion-icon :icon="peopleCircle" color="ternary"></ion-icon>
          <ion-label>My Party</ion-label>
          <ion-badge>6</ion-badge>
        </ion-tab-button>

        <ion-tab-button tab="my-chatbox" href="/about-xp/chatbox">
          <ion-icon :icon="chatbox"></ion-icon>
          <ion-label>Chat</ion-label>
        </ion-tab-button>
  
        <ion-tab-button color="success" tab="speakers" href="/about-xp/speakers">
          <ion-icon :icon="wallet" color="success"></ion-icon>
          <ion-label>GP Wallet</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="speakers" href="/about-xp/speakers">
          <ion-icon :icon="personCircle" color="secondary"></ion-icon>
          <ion-label>Settings</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
      <ion-router-outlet></ion-router-outlet>
    </ion-tabs>
  </ion-page>
</template>

<script>
import { defineComponent } from 'vue';
import { 
  IonIcon, 
  IonLabel, 
  IonPage,
  IonTabBar, 
  IonTabButton, 
  IonTabs,
  IonRouterOutlet
} from '@ionic/vue';
import { calendar, peopleCircle, home,
chatbox, wallet, personCircle } from 'ionicons/icons';

export default defineComponent({
  components: { IonIcon, IonLabel, IonPage, IonTabBar, IonTabButton, IonTabs, IonRouterOutlet },
  setup() {
    const beforeTabChange = () => {
      // do something before tab change
    }
    const afterTabChange = () => {
      // do something after tab change
    }
    return {
      home,
      calendar,
      peopleCircle,
      beforeTabChange,
      afterTabChange,
      chatbox,
      wallet,
      personCircle
    }
  }
});
</script>
<style src="./_AboutXP.scss" lang="scss" />

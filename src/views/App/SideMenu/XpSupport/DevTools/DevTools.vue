`<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/xp-support"></ion-back-button>
        </ion-buttons>
        <ion-title>Developer Tools</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-list>
        <ion-item button @click="navigateTo('/dev/component-showcase')">
          <ion-icon :icon="cubeOutline" slot="start"></ion-icon>
          <ion-label>
            <h2>Component Showcase</h2>
            <p>View and test UI components used in the app</p>
          </ion-label>
        </ion-item>

        <ion-item button @click="navigateTo('/dev/dialog-demo')">
          <ion-icon :icon="chatboxOutline" slot="start"></ion-icon>
          <ion-label>
            <h2>Dialog System Demo</h2>
            <p>Test the RPG-style dialog system</p>
          </ion-label>
        </ion-item>

        <ion-item button @click="navigateTo('/rpg-text-demo')">
          <ion-icon :icon="keypadOutline" slot="start"></ion-icon>
          <ion-label>
            <h2>RPG Text Demo</h2>
            <p>Test the typing text animation system</p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonButtons, IonBackButton, IonIcon } from '@ionic/vue';
import { cubeOutline, chatboxOutline, keypadOutline } from 'ionicons/icons';

export default defineComponent({
  name: 'DevTools',
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonButtons,
    IonBackButton,
    IonIcon
  },
  setup() {
    const router = useRouter();

    const navigateTo = (path: string) => {
      router.push(path);
    };

    return {
      navigateTo,
      cubeOutline,
      chatboxOutline,
      keypadOutline
    };
  }
});
</script>`
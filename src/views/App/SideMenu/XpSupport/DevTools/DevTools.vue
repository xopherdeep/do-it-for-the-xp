<template>
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

        <ion-item button @click="navigateTo('/dev/weatherfx')">
          <ion-icon :icon="cloudOutline" slot="start"></ion-icon>
          <ion-label>
            <h2>WeatherFX Dev Tools</h2>
            <p>Test and debug weather effects and animations</p>
          </ion-label>
        </ion-item>

        <ion-item button @click="navigateTo('/dev/soundfx')">
          <ion-icon :icon="volumeHighOutline" slot="start"></ion-icon>
          <ion-label>
            <h2>Sound FX Dev Tools</h2>
            <p>Test and preview all sound effects and music</p>
          </ion-label>
        </ion-item>

        <ion-item button @click="navigateTo('/dev/intro-splash')">
          <ion-icon :icon="imageOutline" slot="start"></ion-icon>
          <ion-label>
            <h2>IntroSplash Demo</h2>
            <p>Test and customize 90s-style game intro splash screens</p>
          </ion-label>
        </ion-item>
        
        <ion-item button @click="navigateTo('/dev/dungeon-background')">
          <ion-icon :icon="gridOutline" slot="start"></ion-icon>
          <ion-label>
            <h2>Dungeon Background Designer</h2>
            <p>Generate and test procedural temple/dungeon backgrounds</p>
          </ion-label>
        </ion-item>
        
        <ion-item button @click="navigateTo('/xp-demo')">
          <ion-icon :icon="globeOutline" slot="start"></ion-icon>
          <ion-label>
            <h2>World Showcase Demo</h2>
            <p>View a showcase of all game worlds</p>
          </ion-label>
        </ion-item>

        <ion-item button @click="navigateTo('/rpg-text-demo')">
          <ion-icon :icon="keypadOutline" slot="start"></ion-icon>
          <ion-label>
            <h2>RPG Text Demo</h2>
            <p>Test the typing text animation system</p>
          </ion-label>
        </ion-item>

        <ion-item button @click="navigateTo('/dev/battleroom')">
          <ion-icon :icon="flashOutline" slot="start"></ion-icon>
          <ion-label>
            <h2>Battleroom Dev Tools</h2>
            <p>Test and debug the battle system components</p>
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
import { cubeOutline, chatboxOutline, keypadOutline, flashOutline, cloudOutline, imageOutline, volumeHighOutline, globeOutline, gridOutline } from 'ionicons/icons';

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
      keypadOutline,
      flashOutline,
      cloudOutline,
      imageOutline,
      volumeHighOutline,
      globeOutline,
      gridOutline
    };
  }
});
</script>
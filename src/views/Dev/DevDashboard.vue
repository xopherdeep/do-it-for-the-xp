<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/"></ion-back-button>
        </ion-buttons>
        <ion-title>Developer Tools</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="container">
        <ion-card class="intro-card">
          <ion-card-header>
            <ion-card-title>Developer Tools Dashboard</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>
              Welcome to the Developer Tools Dashboard. This interface provides access to various development 
              and debugging tools for the Do It for the XP application.
            </p>
          </ion-card-content>
        </ion-card>

        <ion-list>
          <ion-item-divider>
            <ion-label>Component Development</ion-label>
          </ion-item-divider>
          
          <ion-item button detail @click="navigateTo('/dev/component-showcase')">
            <ion-icon :icon="cubeOutline" slot="start"></ion-icon>
            <ion-label>
              <h2>Component Showcase</h2>
              <p>View and interact with UI components in isolation</p>
            </ion-label>
          </ion-item>

          <ion-item button detail @click="navigateTo('/dev/dialog-demo')">
            <ion-icon :icon="chatboxOutline" slot="start"></ion-icon>
            <ion-label>
              <h2>Dialog Demo</h2>
              <p>Test and debug dialog and notification systems</p>
            </ion-label>
          </ion-item>

          <ion-item button detail @click="navigateTo('/dev/intro-splash')">
            <ion-icon :icon="imageOutline" slot="start"></ion-icon>
            <ion-label>
              <h2>Intro Splash Demo</h2>
              <p>Test and customize 90s-style game intro splash screens</p>
            </ion-label>
          </ion-item>

          <ion-item-divider>
            <ion-label>System Dev Tools</ion-label>
          </ion-item-divider>

          <ion-item button detail @click="navigateTo('/dev/battleroom')">
            <ion-icon :icon="shieldOutline" slot="start"></ion-icon>
            <ion-label>
              <h2>Battleroom Dev Tools</h2>
              <p>Test battle interactions, animations and systems</p>
            </ion-label>
          </ion-item>

          <ion-item button detail @click="navigateTo('/dev/weatherfx')">
            <ion-icon :icon="cloudOutline" slot="start"></ion-icon>
            <ion-label>
              <h2>WeatherFX Dev Tools</h2>
              <p>Test and debug weather effects and animations</p>
            </ion-label>
          </ion-item>
        </ion-list>

        <ion-card>
          <ion-card-header>
            <ion-card-title>System Information</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="system-info">
              <p><strong>App Version:</strong> {{appVersion}}</p>
              <p><strong>Environment:</strong> {{environment}}</p>
              <p><strong>Platform:</strong> {{platform}}</p>
              <p><strong>Last Build:</strong> {{buildDate}}</p>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, 
         IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem,
         IonItemDivider, IonLabel, IonButtons, IonBackButton, IonIcon } from '@ionic/vue';
import { 
  cloudOutline, shieldOutline, cubeOutline, chatboxOutline, imageOutline
} from 'ionicons/icons';
import { isPlatform } from '@ionic/vue';

export default defineComponent({
  name: 'dev-dashboard',
  components: {
    IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonCard,
    IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem,
    IonItemDivider, IonLabel, IonButtons, IonBackButton, IonIcon
  },
  setup() {
    const router = useRouter();
    const appVersion = ref('1.0.0');
    const environment = ref(process.env.NODE_ENV || 'development');
    const platform = ref(isPlatform('ios') ? 'iOS' : isPlatform('android') ? 'Android' : 'Web');
    const buildDate = ref(new Date().toLocaleDateString());

    const navigateTo = (path: string) => {
      router.push(path);
    };

    return {
      navigateTo,
      appVersion,
      environment,
      platform,
      buildDate,
      cloudOutline,
      shieldOutline,
      cubeOutline,
      chatboxOutline,
      imageOutline
    };
  }
});
</script>

<style lang="scss" scoped>
.container {
  padding: 16px;
  max-width: 800px;
  margin: 0 auto;
}

.intro-card {
  margin-bottom: 24px;
}

.system-info {
  p {
    margin: 8px 0;
  }
}

ion-item-divider {
  font-weight: bold;
  --background: var(--ion-color-light);
  margin-top: 16px;
}
</style>
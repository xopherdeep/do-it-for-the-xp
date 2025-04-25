<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/dev"></ion-back-button>
        </ion-buttons>
        <ion-title>Intro Splash Demo</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div v-if="!showDemo">
        <ion-card>
          <ion-card-header>
            <ion-card-title>Intro Splash Screen Demo</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>This demo showcases a nostalgic 90s-style game intro splash screen sequence.</p>
            <p>You can click through the screens or let them automatically advance.</p>
            
            <ion-button expand="block" @click="startDemo">
              Start Demo
            </ion-button>
          </ion-card-content>
        </ion-card>
        
        <ion-card>
          <ion-card-header>
            <ion-card-title>Configuration</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-item>
              <ion-label>Text Speed (ms)</ion-label>
              <ion-range v-model="textSpeed" min="10" max="200" step="10" pin>
                <ion-label slot="start">10</ion-label>
                <ion-label slot="end">200</ion-label>
              </ion-range>
            </ion-item>
            
            <ion-item>
              <ion-label>Default Duration (ms)</ion-label>
              <ion-range v-model="defaultDuration" min="1000" max="6000" step="500" pin>
                <ion-label slot="start">1s</ion-label>
                <ion-label slot="end">6s</ion-label>
              </ion-range>
            </ion-item>
            
            <ion-item>
              <ion-label>Transition Duration (ms)</ion-label>
              <ion-range v-model="transitionDuration" min="200" max="2000" step="100" pin>
                <ion-label slot="start">200</ion-label>
                <ion-label slot="end">2000</ion-label>
              </ion-range>
            </ion-item>
            
            <ion-item>
              <ion-label>Auto Play</ion-label>
              <ion-toggle v-model="autoPlay"></ion-toggle>
            </ion-item>
            
            <ion-item>
              <ion-label>Pixel Art Scaling</ion-label>
              <ion-toggle v-model="pixelArtScaling"></ion-toggle>
            </ion-item>
            
            <ion-item>
              <ion-label>Skip Enabled</ion-label>
              <ion-toggle v-model="skipEnabled"></ion-toggle>
            </ion-item>
            
            <ion-item>
              <ion-label>Show Skip Button</ion-label>
              <ion-toggle v-model="showSkipButton"></ion-toggle>
            </ion-item>
            
            <ion-item>
              <ion-label>Play Intro Sound</ion-label>
              <ion-toggle v-model="playIntroSound"></ion-toggle>
            </ion-item>
          </ion-card-content>
        </ion-card>
      </div>
      
      <xp-intro-splash
        v-if="showDemo"
        :key="componentKey"
        :splash-screens="splashScreens"
        :auto-play="autoPlay"
        :default-duration="defaultDuration"
        :transition-duration="transitionDuration"
        :text-speed="textSpeed"
        :use-pixel-art-scaling="pixelArtScaling"
        :skip-enabled="skipEnabled"
        :show-skip-button="showSkipButton"
        :play-intro-sound="playIntroSound"
        @complete="onComplete"
        @skip="onSkip"
        @splash-change="onSplashChange"
      />
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, 
  IonButtons, IonBackButton, IonCard, IonCardHeader, 
  IonCardTitle, IonCardContent, IonButton, IonItem, 
  IonLabel, IonRange, IonToggle, toastController
} from '@ionic/vue';
import { XpIntroSplash } from '@/components/XpIntroSplash';
import type { SplashScreen } from '@/components/XpIntroSplash';
import debug from '@/utils/debug';

export default defineComponent({
  name: 'IntroSplashDemo',
  components: {
    IonPage, 
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonContent, 
    IonButtons, 
    IonBackButton,
    IonCard, 
    IonCardHeader, 
    IonCardTitle, 
    IonCardContent, 
    IonButton,
    IonItem, 
    IonLabel, 
    IonRange, 
    IonToggle, 
    XpIntroSplash
  },
  setup() {
    // Demo state
    const showDemo = ref(false);
    const componentKey = ref(0); // Key to force component remount
    
    // Configuration options
    const textSpeed = ref(50);
    const defaultDuration = ref(3000);
    const transitionDuration = ref(800);
    const autoPlay = ref(true);
    const pixelArtScaling = ref(true);
    const skipEnabled = ref(true);
    const showSkipButton = ref(true);
    const playIntroSound = ref(true);
    
    // Sample splash screens for demo
    const splashScreens = ref<SplashScreen[]>([
      {
        image: require('@/assets/images/about/splash-1.png'),
        alt: 'Do it for the XP Logo',
        duration: 4000,
        soundEffect: 'splash.intro'
      },
      {
        image: require('@/assets/images/about/splash-2.png'),
        // text: 'Welcome to the world of XP! Your journey is about to begin...',
        alt: 'XP Icon',
        duration: 5000
      },
      {
        image: require('@/assets/images/about/splash-3.png'),
        // text: 'Complete quests, earn rewards, and level up your life with this RPG-inspired adventure!',
        duration: 5000
      },
      {
        image: require('@/assets/images/about/splash-4.png'),
        // text: 'Are you ready to embark on this epic quest?',
        duration: 5000
      },
    ]);
    
    // Start the demo
    const startDemo = () => {
      showDemo.value = true;
      componentKey.value++; // Force remount when starting demo
    };
    
    // Handle events from the intro splash component
    const onComplete = async () => {
      showDemo.value = false;
      
      const toast = await toastController.create({
        message: 'Intro sequence completed!',
        duration: 2000,
        position: 'bottom'
      });
      
      await toast.present();
    };
    
    const onSkip = async () => {
      showDemo.value = false;
      
      const toast = await toastController.create({
        message: 'Intro sequence skipped!',
        duration: 2000,
        position: 'bottom'
      });
      
      await toast.present();
    };
    
    const onSplashChange = (index: number) => {
      debug.log(`Splash changed to index ${index}`);
    };
    
    return {
      showDemo,
      componentKey,
      textSpeed,
      defaultDuration,
      transitionDuration,
      autoPlay,
      pixelArtScaling,
      skipEnabled,
      showSkipButton,
      playIntroSound,
      splashScreens,
      startDemo,
      onComplete,
      onSkip,
      onSplashChange
    };
  },
  
  // When component is revisited, update the key to force remount
  activated() {
    if (this.showDemo) {
      this.componentKey++;
    }
  }
});
</script>

<style scoped>
/* No additional styles needed as component handles its own styling */
</style>
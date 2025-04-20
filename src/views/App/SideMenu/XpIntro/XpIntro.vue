<template>
  <ion-page>
    <ion-content class="ion-no-padding">
      <xp-intro-splash
        :splash-screens="splashScreens"
        :auto-play="true"
        :default-duration="4000"
        :transition-duration="800"
        :text-speed="40"
        :use-pixel-art-scaling="true"
        :skip-enabled="true"
        :show-skip-button="true"
        :play-intro-sound="true"
        @complete="onComplete"
        @skip="onSkip"
      />
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router';
import { 
  toastController
} from '@ionic/vue';
import { playCircleOutline, closeCircleOutline } from 'ionicons/icons';
import { XpIntroSplash } from '@/components/XpIntroSplash';
import type { SplashScreen } from '@/components/XpIntroSplash';
import ionic from '@/mixins/ionic';

export default defineComponent({
  name: 'XpIntro',
  mixins: [ionic],
  components: {
    XpIntroSplash
  },
  setup() {
    const router = useRouter();
    const showIntro = ref(false);
    
    // Define the splash screens for the intro sequence
    const splashScreens = ref<SplashScreen[]>([
      {
        image: require('@/assets/images/about/splash-1.png'),
        text: "Welcome to 'Do it for the XP' - Your life's level-up system!",
        alt: "Do it for the XP Logo",
        duration: 5000,
        soundEffect: 'splash.intro'
      },
      {
        image: require('@/assets/images/about/splash-2.png'),
        text: "XP (Experience Points) help you track your progress as you complete tasks and build good habits.",
        alt: "XP Icon",
        duration: 6000
      },
      {
        image: require('@/assets/images/about/splash-3.png'),
        text: "GP (Gold Points) are the in-app currency you earn and spend on rewards you set for yourself.",
        duration: 6000
      },
      {
        image: require('@/assets/images/about/splash-4.png'),
        text: "Are you ready to embark on this epic quest to level up your life?",
        duration: 5000
      },
    ]);
    
    // Start the intro sequence
    const startIntro = () => {
      showIntro.value = true;
    };
    
    // Skip the intro sequence
    const skipIntro = () => {
      showIntro.value = false;
    };
    
    // Handle intro completion
    const onComplete = async () => {
      showIntro.value = false;
      
      
      const toast = await toastController.create({
        message: 'Introduction completed! Ready to start your journey?',
        duration: 3000,
        position: 'bottom',
        buttons: [
          {
            text: 'Get Started',
            role: 'confirm',
            handler: () => navigateTo('/xp-profile')
          }
        ]
      });
      
      await toast.present().then(()=>navigateTo('/log-in'));
    };
    
    // Handle intro skip
    const onSkip = () => {
      showIntro.value = false;
    };
    
    // Navigate to another page
    const navigateTo = (path: string) => {
      router.push(path);
    };

    return {
      showIntro,
      splashScreens,
      startIntro,
      skipIntro,
      onComplete,
      onSkip,
      navigateTo,
      playCircleOutline,
      closeCircleOutline
    };
  },
  mounted() {
    this.$fx.ui[this.$fx.theme.ui].options.play();
  }
});
</script>

<style scoped>
.intro-container {
  max-width: 800px;
  margin: 0 auto;
}

ion-card {
  margin-bottom: 20px;
}

.mt-2 {
  margin-top: 8px;
}

.mt-4 {
  margin-top: 16px;
}
</style>
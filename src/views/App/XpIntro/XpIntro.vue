<template>
  <ion-page>
    <ion-content class="ion-no-padding">
      <xp-intro-splash
        v-if="viewActive"
        key="introSplash"
        ref="introSplash"
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
import {  IonPage, IonContent } from '@ionic/vue';
import { XpIntroSplash } from '@/components/XpIntroSplash';
import type { SplashScreen } from '@/components/XpIntroSplash';
import Ionic from '@/mixins/ionic';

export default defineComponent({
  name: 'XpIntro',
  mixins: [Ionic],
  components: {
    XpIntroSplash,
    IonPage,
    IonContent
  },
  setup() {
    const router = useRouter();
    // const ionRouter = useIonRouter();
    const viewActive = ref(false);
    const duration = 2500; // Default duration for each splash screen
    
    // Define the splash screens for the intro sequence
    const splashScreens = ref<SplashScreen[]>([
      {
        image: require('@/assets/images/about/welcome.png'),
        text: "Welcome to 'Do it for the XP' - Your life's level-up & reward system!",
        alt: "Do it for the XP Logo",
        duration,
        soundEffect: 'splash.intro'
      },
      {
        image: require('@/assets/images/about/peace.png'),
        text: "Long ago, the sacred pegasi maintained balance in our world, bringing harmony to every corner of life.",
        alt: "World Lore",
        duration,
      },
      {
        image: require('@/assets/images/about/darkness.png'),
        text: "But the dark forces of chaos - Dust Bunnies and Grease Dragons - have risen to power, capturing the pegasi and imprisoning them in dragon eggs.",
        alt: "Villains",
        duration,
      },
      {
        image: require('@/assets/images/about/temples.png'),
        text: "These temples - once sacred grounds of order - now lie in disarray. The Wind Temple, the Earth Temple, the Water Temple, the Fire & Frozen Temples, and the Sun & Moon Temples have fallen to chaos.",
        alt: "Temples",
        duration,
      },
      {
        image: require('@/assets/images/about/chosen.png'),
        text: "As the Chosen One, you must cleanse these temples, defeat the forces of disorder, and rescue the pegasi to restore balance to your world.",
        alt: "Hero's Journey",
        duration,
      },
      {
        image: require('@/assets/images/about/order.png'),
        text: "Each completed task brings order to chaos, frees a pegasus, and strengthens your resolve for the battles ahead.",
        duration,
      },
      {
        image: require('@/assets/images/about/xp.png'),
        text: "XP (Experience Points) represents how much you've grown in your quest for balance. Fueling up as you complete quests and vanquish the forces of chaos.",
        alt: "XP Icon",
        duration,
      },
      {
        image: require('@/assets/images/about/gp.png'),
        text: "GP (Gold Points) are the currency you use to buy treasures you collect along your journey, to be spent on rewards and tools to aid your quest.",
        duration,
      },
      {
        image: require('@/assets/images/about/ap.png'),
        text: "AP (Ability Points) are used to unlock new abilities and skills, enhancing your powers and making you a formidable force against the forces of chaos.",
        duration,
      },
      {
        image: require('@/assets/images/about/splash-4.png'),
        text: "Will you answer the call? The fate of the pegasi - and the balance of your realm - rests in your hands.",
        duration,
      },
    ]);
    
    // Handle intro completion
    const onComplete = () => {
      navigateTo('/log-in');
    };
    
    // Handle intro skip
    const onSkip = () => {
      navigateTo('/log-in');
    };
    
    // Navigate to another page
    const navigateTo = (path: string) => {
      router.push(path);
    };

    return {
      viewActive,
      splashScreens,
      onComplete,
      onSkip,
      navigateTo
    };
  },
  
  // Use Ionic-specific lifecycle hooks
  beforeMount() {
    // Play sound if needed
    if (typeof this.$fx?.ui?.[this.$fx.theme.ui]?.options?.play === 'function') {
      this.$fx.ui[this.$fx.theme.ui].options.play();
    }
  },
  
  // This is called every time the view is entered - Ionic specific
  ionViewWillEnter() {
    // Ensure intro will play when entering the view
    this.viewActive = false;
    // Short delay to ensure a clean start
    setTimeout(() => {
      this.viewActive = true;
    }, 100);
  },
  
  // This is called when leaving the view - Ionic specific
  ionViewWillLeave() {
    // Deactivate the component when navigating away
    this.viewActive = false;
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
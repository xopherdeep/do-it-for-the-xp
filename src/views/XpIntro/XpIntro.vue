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
  import { defineComponent, ref } from "vue";
  import { useRouter } from "vue-router";
  import { IonPage, IonContent } from "@ionic/vue";
  import { XpIntroSplash } from "@/components/organisms/IntroSplash";
  import type { SplashScreen } from "@/components/organisms/IntroSplash";
  import Ionic from "@/lib/mixins/ionic";

  export default defineComponent({
    name: "XpIntro",
    mixins: [Ionic],
    components: {
      XpIntroSplash,
      IonPage,
      IonContent,
    },
    setup() {
      const router = useRouter();
      // const ionRouter = useIonRouter();
      const viewActive = ref(false);
      const duration = 2500; // Default duration for each splash screen

      // Define the splash screens for the intro sequence
      const splashScreens = ref<SplashScreen[]>([
        {
          image: require("@/assets/images/about/welcome.webp"),
          text: "Welcome to Do It For The XP! Here, your chores make you a hero.",
          alt: "Do it for the XP Logo",
          duration,
          soundEffect: "splash.intro",
        },
        {
          image: require("@/assets/images/about/peace.webp"),
          text: "Long ago, magic horses called pegasi kept our world happy and clean.",
          alt: "World Lore",
          duration,
        },
        {
          image: require("@/assets/images/about/darkness.webp"),
          text: "Then the Dust Bunnies and Grease Dragons came. They locked the pegasi in dragon eggs!",
          alt: "Villains",
          duration,
        },
        {
          image: require("@/assets/images/about/temples.webp"),
          text: "Their homes, the temples, are a big mess now. Wind, Earth, Water, Fire, Ice, Sun and Moon.",
          alt: "Temples",
          duration,
        },
        {
          image: require("@/assets/images/about/chosen.webp"),
          text: "You are the hero. Clean up the temples. Beat the mess monsters. Set the pegasi free!",
          alt: "Hero's Journey",
          duration,
        },
        {
          image: require("@/assets/images/about/order.webp"),
          text: "Every chore you finish beats a monster. Every chore makes you stronger.",
          duration,
        },
        {
          image: require("@/assets/images/about/xp.webp"),
          text: "XP shows how much you have grown. Do quests, win fights, go up a level!",
          alt: "XP Icon",
          duration,
        },
        {
          image: require("@/assets/images/about/gp.webp"),
          text: "GP is your gold. Spend it on treats and tools.",
          duration,
        },
        {
          image: require("@/assets/images/about/ap.webp"),
          text: "AP is your power. Earn it to unlock cool powers, like Video Games time.",
          duration,
        },
        {
          image: require("@/assets/images/about/splash-4.webp"),
          text: "Will you help the pegasi? The world needs you. Let's go!",
          duration,
        },
      ]);

      // Handle intro completion
      const onComplete = () => {
        navigateTo("/log-in");
      };

      // Handle intro skip
      const onSkip = () => {
        navigateTo("/log-in");
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
        navigateTo,
      };
    },

    // Use Ionic-specific lifecycle hooks
    beforeMount() {
      // Play sound if needed
      if (
        typeof this.$fx?.ui?.[this.$fx.theme.ui]?.options?.play === "function"
      ) {
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
    },
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

<template>
  <ion-page>
    <ion-content class="ion-no-padding">
      <xp-intro-splash
        v-if="viewActive"
        key="demoSplash"
        ref="demoSplash"
        :splash-screens="splashScreens"
        :auto-play="true"
        :default-duration="2000"
        :transition-duration="1200"
        :text-speed="25"
        :use-pixel-art-scaling="true"
        :skip-enabled="true"
        :show-skip-button="true"
        :play-intro-sound="true"
        @complete="onComplete"
        @skip="onSkip"
        @screen-change="onScreenChange"
      />
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { IonPage, IonContent } from '@ionic/vue';
  import { XpIntroSplash } from '@/components/XpIntroSplash';
  import type { SplashScreen } from '@/components/XpIntroSplash';
  import debug from '@/utils/debug';

  // Extended splash screen interface that includes our custom properties
  interface ExtendedSplashScreen extends SplashScreen {
    additionalClass?: string;
  }

  // Type for our $fx object to fix type checking
  interface FXObject {
    ui: Record<string, Record<string, any>>;
    rpg: Record<string, Record<string, any>>;
    theme: {
      ui: string;
      rpg: string;
    };
  }

  export default defineComponent({
    name: 'XpDemo', 
    components: {
      XpIntroSplash,
      IonPage,
      IonContent
    },
    setup() {
      const router = useRouter();
      // const ionRouter = useIonRouter();
      const viewActive = ref(false);
      const duration = 1300; // Duration for each splash screen - longer to read text

      // Define the splash screens for the demo sequence with richer content
      const splashScreens = ref<ExtendedSplashScreen[]>([
        {
          image: require('@/assets/images/backgrounds/world-plains.jpg'),
          text: "The Plains of Wisdom\n\nVast grasslands where new adventurers begin their journey. Home to gentle creatures and abundant resources.",
          alt: "Plains World",
          duration: duration + 300,
          soundEffect: 'select',
          additionalClass: 'plains-theme'
        },
        // {
        //   image: require('@/assets/images/backgrounds/wind-temple/[5,2].jpg'),
        //   text: "The Ancient Wind Temple\n\nA sacred place of trials and wisdom. Mastering the elements is key to your success.",
        //   alt: "Wind Temple",
        //   duration: duration + 300,
        //   soundEffect: 'temple',
        //   additionalClass: 'temple-theme'
        // },
        {
          image: require('@/assets/images/backgrounds/world-islands.jpg'),
          text: "The Tropical Islands\n\nParadise surrounded by azure waters. These islands hold ancient secrets and hidden pirate treasures.",
          alt: "Islands World",
          duration,
          soundEffect: 'island',
          additionalClass: 'island-theme'
        },
        {
          image: require('@/assets/images/backgrounds/world-forest.jpg'),
          text: "The Ancient Forest\n\nMystic woodlands filled with secrets and ancient magic. Listen carefully for whispers among the trees.",
          alt: "Forest World",
          duration,
          soundEffect: 'forest',
          additionalClass: 'forest-theme'
        },
        {
          image: require('@/assets/images/backgrounds/world-swamps.jpg'),
          text: "The Murky Swamps\n\nA realm of mist and mystery. Strange creatures lurk beneath the surface, waiting for unwary travelers.",
          alt: "Swamp World",
          duration,
          soundEffect: 'swamp',
          additionalClass: 'swamp-theme'
        },
        {
          image: require('@/assets/images/backgrounds/world-mountains.jpg'),
          text: "The Forbidden Mountains\n\nTreacherous peaks hiding valuable treasures. Only the bravest adventurers dare to climb these heights.",
          alt: "Mountain World",
          duration,
          soundEffect: 'mountain',
          additionalClass: 'mountain-theme'
        },
        {
          image: require('@/assets/images/backgrounds/world-desert.jpg'),
          text: "The Endless Sands\n\nA harsh desert where survival is tested. Ancient ruins lie buried beneath the shifting dunes.",
          alt: "Desert World",
          duration,
          soundEffect: 'desert',
          additionalClass: 'desert-theme'
        },
        {
          image: require('@/assets/images/backgrounds/world-ice.jpg'),
          text: "The Frozen Peaks\n\nAn eternally frozen realm with treasures locked in ice. The most powerful magic items are found here.",
          alt: "Ice World",
          duration,
          soundEffect: 'ice',
          additionalClass: 'ice-theme'
        },
        {
          image: require('@/assets/images/backgrounds/world-clouds.jpg'),
          text: "The Sky Kingdom\n\nFloating islands among the clouds. Home to rare creatures and advanced technology.",
          alt: "Cloud World",
          duration,
          soundEffect: 'clouds',
          additionalClass: 'cloud-theme'
        },
        {
          image: require('@/assets/images/backgrounds/world-moon.jpg'),
          text: "The Moonlit Realm\n\nA mystical world where the moonlight reveals hidden paths. Secrets of the universe await those who dare to explore.",
          alt: "Moon World",
          duration,
          soundEffect: 'moon',
          additionalClass: 'moon-theme'
        },
        // Credits screen with hometown image
        {
          image: require('@/assets/images/backgrounds/hometown.jpg'),
          text: "DO IT FOR THE XP\n\nCreated by X.P.\n\nMusic by Earthbound\nSound Effects by Nintendo\n\nThank you for playing!",
          alt: "Opening Credits",
          duration: duration, // Extended duration for credits
          soundEffect: 'select',
          additionalClass: 'credits-theme'
        }
      ]);

      // Current screen for contextual music
      const currentScreenIndex = ref(0);

      // Handle screen changes to play appropriate sound effects
      const onScreenChange = (index: number) => {
        currentScreenIndex.value = index;

        // Play corresponding sound effect for the current screen
        const screen = splashScreens.value[index];
        if (screen && screen.soundEffect) {
          playSoundEffect(screen.soundEffect);
        }

        // Change background music based on world category - special case for credits
        if (index === splashScreens.value.length - 1) {
          playCreditsMusic();
        } else {
          changeBackgroundMusic(index);
        }
      };

      // Special function to play credits music
      const playCreditsMusic = () => {
        const $fx = window.$fx as unknown as FXObject | undefined;
        if (!$fx || !$fx.rpg || !$fx.theme) return;

        stopBGM();

        try {
          // Use credits music if available, otherwise fallback to demo music
          const creditsTracks = $fx.rpg[String($fx.theme.rpg)]?.BGM?.credits ||
            $fx.rpg[String($fx.theme.rpg)]?.BGM?.demo;

          if (creditsTracks && Array.isArray(creditsTracks) && creditsTracks.length > 0) {
            const trackIndex = Math.floor(Math.random() * creditsTracks.length);
            const audio = new Audio(creditsTracks[trackIndex]);
            audio.volume = 0.6;
            audio.loop = true;
            audio.play().catch(err => debug.error('Error playing credits music:', err));

            // Store audio element for cleanup
            bgmAudio.value = audio;
          }
        } catch (error) {
          debug.error('Error playing credits music:', error);
        }
      };

      // Play specific sound effect
      const playSoundEffect = (effectName: string) => {
        const $fx = window.$fx as unknown as FXObject | undefined;
        if (!$fx) return;

        try {
          // Try to find the sound in RPG sound effects
          const rpgSound = $fx.rpg[String($fx.theme.rpg)]?.[effectName];
          if (rpgSound && typeof rpgSound.play === 'function') {
            rpgSound.currentTime = 0;
            rpgSound.play().catch(err => debug.error('Error playing sound effect:', err));
            return;
          }

          // Try UI sounds if RPG sound not found
          const uiSound = $fx.ui[String($fx.theme.ui)]?.[effectName];
          if (uiSound && typeof uiSound.play === 'function') {
            uiSound.currentTime = 0;
            uiSound.play().catch(err => debug.error('Error playing UI sound:', err));
            return;
          }
        } catch (error) {
          debug.error('Error playing sound effect:', error);
        }
      };

      // Change background music based on world type
      const changeBackgroundMusic = (index: number) => {
        const $fx = window.$fx as unknown as FXObject | undefined;
        if (!$fx || !$fx.rpg || !$fx.theme) return;

        // Stop any currently playing BGM
        stopBGM();

        // Map screen indices to BGM categories
        const worldToBGM: Record<number, string> = {
          0: 'plains',       // Plains
          1: 'forest',       // Forest
          2: 'mountain',     // Mountains
          3: 'swamp',        // Swamp
          4: 'islands',      // Islands
          5: 'desert',       // Desert
          6: 'ice',          // Ice
          7: 'clouds',       // Clouds
          8: 'temple',       // Temple
          9: 'adventure',    // Final adventure screen
          10: 'credits'      // Credits screen
        };

        const bgmCategory = worldToBGM[index];
        if (bgmCategory) {
          try {
            // Get specific BGM for this category if it exists
            const bgmTracks = $fx.rpg[String($fx.theme.rpg)]?.BGM?.[bgmCategory] ||
              ($fx.rpg[String($fx.theme.rpg)]?.BGM?.worlds?.terrains?.[bgmCategory]);

            if (bgmTracks && Array.isArray(bgmTracks) && bgmTracks.length > 0) {
              const trackIndex = Math.floor(Math.random() * bgmTracks.length);
              const audio = new Audio(bgmTracks[trackIndex]);
              audio.volume = 0.6;
              audio.loop = true;
              audio.play().catch(err => debug.error('Error playing BGM:', err));

              // Store audio element for cleanup
              bgmAudio.value = audio;
            }
          } catch (error) {
            debug.error('Error playing background music:', error);
          }
        }
      };

      // Store BGM audio for cleanup
      const bgmAudio = ref<HTMLAudioElement | null>(null);

      // Stop any playing BGM
      const stopBGM = () => {
        if (bgmAudio.value) {
          bgmAudio.value.pause();
          bgmAudio.value = null;
        }
      };

      // Handle demo completion
      const onComplete = () => {
        stopBGM();
        playSoundEffect('finish');
        setTimeout(() => navigateTo('/log-in'), 1000);
      };

      // Handle demo skip
      const onSkip = () => {
        stopBGM();
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
        onScreenChange,
        navigateTo
      };
    },

    // Use Ionic-specific lifecycle hooks
    beforeMount() {
      // Ensure we're ready for sound playback
      document.documentElement.setAttribute('data-user-interacted', 'true');
    },

    // This is called every time the view is entered - Ionic specific
    ionViewWillEnter() {
      // Ensure demo will play when entering the view
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

      // Ensure all audio is stopped
      const audio = (this as any).bgmAudio;
      if (audio) {
        audio.pause();
      }
    }
  });
</script>

<style scoped>
  .intro-container {
    max-width: 800px;
    margin: 0 auto;
  }

  /* World-specific themed styling */
  :deep(.plains-theme) {
    --splash-text-shadow: 0 0 8px rgba(76, 175, 80, 0.8);
    --splash-text-color: #e8f5e9;
  }

  :deep(.forest-theme) {
    --splash-text-shadow: 0 0 8px rgba(27, 94, 32, 0.9);
    --splash-text-color: #c8e6c9;
  }

  :deep(.mountain-theme) {
    --splash-text-shadow: 0 0 8px rgba(121, 85, 72, 0.9);
    --splash-text-color: #efebe9;
  }

  :deep(.swamp-theme) {
    --splash-text-shadow: 0 0 8px rgba(38, 50, 56, 0.9);
    --splash-text-color: #b2dfdb;
  }

  :deep(.island-theme) {
    --splash-text-shadow: 0 0 8px rgba(3, 169, 244, 0.8);
    --splash-text-color: #e1f5fe;
  }

  :deep(.desert-theme) {
    --splash-text-shadow: 0 0 8px rgba(255, 111, 0, 0.8);
    --splash-text-color: #fff3e0;
  }

  :deep(.ice-theme) {
    --splash-text-shadow: 0 0 8px rgba(41, 121, 255, 0.8);
    --splash-text-color: #e3f2fd;
  }

  :deep(.cloud-theme) {
    --splash-text-shadow: 0 0 8px rgba(158, 158, 158, 0.9);
    --splash-text-color: #f5f5f5;
  }

  :deep(.temple-theme) {
    --splash-text-shadow: 0 0 8px rgba(121, 85, 72, 0.9);
    --splash-text-color: #ffecb3;
  }

  :deep(.adventure-theme) {
    --splash-text-shadow: 0 0 8px rgba(66, 66, 66, 0.9);
    --splash-text-color: #fffde7;
  }

  :deep(.credits-theme) {
    --splash-text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
    --splash-text-color: #fffde7;
    font-family: 'Press Start 2P', monospace;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  :deep(.credits-theme) .rpg-box {
    background-color: rgba(0, 0, 0, 0.7);
  }

  :deep(.moon-theme) {
    --splash-text-shadow: 0 0 8px rgba(156, 39, 176, 0.8);
    --splash-text-color: #f3e5f5;
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
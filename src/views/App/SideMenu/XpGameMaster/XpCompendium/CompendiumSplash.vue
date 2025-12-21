<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-menu-button
            color="primary"
            @click="$fx.ui[$fx.theme.ui].select.play()"
          ></ion-menu-button>
          <i
            class="fad fa-game-console-handheld fa-2x ml-2"
            slot="start"
          ></i>
        </ion-buttons>
        <ion-title>Setup XP</ion-title>
        <!-- Add help button to restart tutorial -->
        <ion-buttons slot="end">
          <ion-button
            @click="resetTutorial"
            id="tutorial-button"
          >
            <i class="fad fa-question-circle fa-lg"></i>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content
      :fullscreen="true"
      class="ion-padding bg-slide"
    >
      <swiper
        :modules="modules"
        navigation
        pager="true"
        :pagination="{ clickable: true }"
        @swiper="setSwiperInstance"
        @slideChange="handleSlideChange"
      >
        <swiper-slide
          v-for="(slide, index) in slides"
          :key="index"
        >
          <ion-card class="max-w-8xl text-center flex flex-col items-center justify-center space-y-4 gap-2 py-4">
            <i :class="`fad ${slide.icon} fa-4x`"></i>
            <ion-card-title>{{ slide.title }}</ion-card-title>
            <ion-button
              v-if="slide.isFinal"
              @click="getStarted"
              expand="block"
              color="success"
              class="mt-4 w-1/2 mx-auto"
            >
              Begin Your Journey!
            </ion-button>
          </ion-card>
          <component
            :is="getDashboardComponent(index)"
            :stats="stats"
          />
        </swiper-slide>
      </swiper>
    </ion-content>

    <xp-dialog
      ref="dialog"
      :text-blocks="currentDialogBlocks"
      :text-speed="textSpeed"
      @block-complete="onBlockComplete"
      @dialog-complete="onDialogComplete"
      @click="dialog?.handleClick()"
    />
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref, onMounted } from "vue";
  import { useRouter } from 'vue-router';
  import { Swiper as SwiperClass, Pagination, Navigation } from 'swiper';
  import { Swiper, SwiperSlide } from "swiper/vue";
  import 'swiper/css';
  import 'swiper/css/pagination';
  import 'swiper/css/navigation';
  import XpDialog from "@/components/XpDialog/XpDialog.vue";
  import XpStatBox from "@/components/XpStatBox/XpStatBox.vue";
  import WelcomeDashboard from "@/views/App/SideMenu/XpGameMaster/XpCompendium/components/WelcomeDashboard.vue";
  import ExperiencePointsDashboard from "@/views/App/SideMenu/XpGameMaster/XpCompendium/components/ExperiencePointsDashboard.vue";
  import GoldPointsDashboard from "@/views/App/SideMenu/XpGameMaster/XpCompendium/components/GoldPointsDashboard.vue";
  import AbilityPointsDashboard from "@/views/App/SideMenu/XpGameMaster/XpCompendium/components/AbilityPointsDashboard.vue";
  import CharacterStatsDashboard from "@/views/App/SideMenu/XpGameMaster/XpCompendium/components/CharacterStatsDashboard.vue";
  import BeastsChallengesDashboard from "@/views/App/SideMenu/XpGameMaster/XpCompendium/components/BeastsChallengesDashboard.vue";
  import QuestsAdventuresDashboard from "@/views/App/SideMenu/XpGameMaster/XpCompendium/components/QuestsAdventuresDashboard.vue";
  import TemplesTrainingDashboard from "@/views/App/SideMenu/XpGameMaster/XpCompendium/components/TemplesTrainingDashboard.vue";
  import ShopsMarketplaceDashboard from "@/views/App/SideMenu/XpGameMaster/XpCompendium/components/ShopsMarketplaceDashboard.vue";
  import debug from "@/lib/utils/debug";
  import Ionic from "@/mixins/ionic";
  import { useDialogSystem } from "@/lib/engine/core/DialogSystem";

  // Define required classes for database operations
  class AchievementDb {
    constructor(private storage: any) { }
    async getTasks() {
      try {
        return await this.storage.get('achievements') || [];
      } catch (error) {
        debug.error('Error fetching achievements:', error);
        return [];
      }
    }
  }

  class BestiaryDb {
    constructor(private storage: any) { }
    async getBeasts() {
      try {
        return await this.storage.get('beasts') || [];
      } catch (error) {
        debug.error('Error fetching beasts:', error);
        return [];
      }
    }
  }

  class AbilitiesDb {
    constructor(private storage: any) { }
    async getAbilities() {
      try {
        return await this.storage.get('abilities') || [];
      } catch (error) {
        debug.error('Error fetching abilities:', error);
        return [];
      }
    }
  }

  // Define storage placeholders
  const achievementStorage = {
    get: async () => []
  };
  const beastStorage = {
    get: async () => []
  };
  const abilitiesStorage = {
    get: async () => []
  };

  // Define tutorial completed key
  const TUTORIAL_COMPLETED_KEY = 'xp_compendium_tutorial_completed';

  // Define SlideData interface
  interface SlideData {
    icon: string;
    iconClass: string;
    title: string;
    dialogContent: string[];
    isFinal?: boolean;
  }

  export default defineComponent({
    name: 'CompendiumSplash',
    mixins: [Ionic],
    components: {
      Swiper,
      SwiperSlide,
      XpDialog,
      XpStatBox,
      WelcomeDashboard,
      ExperiencePointsDashboard,
      GoldPointsDashboard,
      AbilityPointsDashboard,
      CharacterStatsDashboard,
      BeastsChallengesDashboard,
      QuestsAdventuresDashboard,
      TemplesTrainingDashboard,
      ShopsMarketplaceDashboard
    },
    setup() {
      const router = useRouter();
      const textSpeed = ref(40);
      const activeSlideIndex = ref(0);
      const slidesViewed = ref<boolean[]>([]);
      const swiperInstance = ref<SwiperClass | null>(null);
      const dialog = ref<InstanceType<typeof XpDialog> | null>(null);
      const currentDialogBlocks = ref<string[]>([]);
      const autoAdvance = ref(true);

      // Access dialog system from game engine
      const dialogSystem = useDialogSystem();

      // Import necessary database services
      const achievementDb = new AchievementDb(achievementStorage);
      const bestiaryDb = new BestiaryDb(beastStorage);
      const abilitiesDb = new AbilitiesDb(abilitiesStorage);
      const stats = ref({
        abilities: 0,
        beasts: 0,
        achievements: 0,
        temples: 0,
        items: 0,
      });

      // Define all slides data in a single array
      const slides = ref<SlideData[]>([
        {
          icon: "fa-game-console-handheld",
          iconClass: "",
          title: "Welcome to the Adventure!",
          dialogContent: [
            "Welcome to your gamified journey!",
            "This tutorial will guide you through the different systems in the game.",
            "You'll learn how to transform everyday tasks into exciting adventures."
          ]
        },
        {
          icon: "fa-staff " + ["quest", "fire", "ice"][Math.floor(Math.random() * 3)],
          iconClass: "xp-icon",
          title: "Experience Points (XP)",
          dialogContent: [
            "Experience Points (XP) represent time and effort spent on tasks.",
            "Earn roughly 10 XP per minute of effort.",
            "As you accumulate XP, you'll level up, unlocking new abilities and increasing your maximum HP and MP."
          ]
        },
        {
          icon: "fa-hand-holding-usd",
          iconClass: "gp-icon",
          title: "Gold Points (GP)",
          dialogContent: [
            "Gold Points (GP) are the in-game currency for purchasing items and rewards.",
            "GP is deposited into your savings after completing quests.",
            "You can make limited withdrawals into your wallet, which has size limits that increase as you level up."
          ]
        },
        {
          icon: "fa-hand-holding-magic",
          iconClass: "ap-icon",
          title: "Ability Points (AP)",
          dialogContent: [
            "Ability Points (AP) unlock special abilities and privileges.",
            "Unlike XP, they follow a 'use it or lose it' system, encouraging regular achievement.",
            "AP is awarded for daily streaks, weekly achievements, and monthly milestones."
          ]
        },
        {
          icon: "fa-heartbeat",
          iconClass: "character-stats-icon",
          title: "Character Stats (HP/MP)",
          dialogContent: [
            "Like any RPG character, you have Health Points (HP) and Mana Points (MP).",
            "HP represents your physical energy and is consumed by completing tasks.",
            "MP represents your mental energy, used for focus-intensive activities.",
            "Both regenerate with proper rest and self-care."
          ]
        },
        {
          icon: "fa-hand-holding-heart",
          iconClass: "beast-icon",
          title: "Beasts & Challenges",
          dialogContent: [
            "Beasts represent challenges in your life.",
            "From procrastination dragons to distraction demons, each has unique patterns and weaknesses.",
            "Develop strategies to overcome these beasts and earn special bonuses for conquering particularly difficult challenges."
          ]
        },
        {
          // random element
          icon: "fa-hand-holding-seedling",
          iconClass: "quest-icon",
          title: "Quests & Adventures",
          dialogContent: [
            "Your daily tasks become quests in this adventure!",
            "Complete quests to earn XP, AP, and GP.",
            "Quests can be categorized by difficulty, urgency, and type.",
            "Creating balanced quest logs ensures steady progress in all areas of your life."
          ]
        },
        {
          icon: "fa-hand-holding-water",
          iconClass: "temple-icon",
          title: "Temples & Training",
          dialogContent: [
            "Temples are where you develop your skills and attributes.",
            "Invest AP to gain permanent bonuses to your abilities.",
            "Each temple represents an area of personal growth, such as fitness, creativity, knowledge, or social skills."
          ]
        },
        {
          icon: "fa-store",
          iconClass: "shop-icon",
          title: "Shops & Marketplace",
          dialogContent: [
            "Shops let you spend your hard-earned GP on rewards!",
            "From digital items to real-world treats, shops turn your productivity into tangible benefits.",
            "Shop inventories expand as you progress, offering more valuable rewards at higher levels."
          ],
          isFinal: true
        }
      ]);

      // Function to check if tutorial has been completed
      const checkTutorialCompleted = (): boolean => {
        const completed = localStorage.getItem(TUTORIAL_COMPLETED_KEY);
        return completed === 'true';
      };

      // Function to mark tutorial as completed
      const markTutorialCompleted = () => {
        localStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true');
        debug.log('Tutorial has been marked as completed');
      };

      // Initialize slidesViewed array based on slides length and tutorial completion status
      onMounted(async () => {
        const tutorialCompleted = checkTutorialCompleted();

        // Initialize slidesViewed array
        slidesViewed.value = new Array(slides.value.length).fill(tutorialCompleted);

        // Register a display function for the compendium context
        dialogSystem.registerDisplayFunction('compendium', (message) => {
          // This function will be called when dialogSystem.showMessage is used
          // It will use our existing XpDialog component
          if (dialog.value) {
            currentDialogBlocks.value = [message];
            dialog.value.show();
          }
        });

        // Auto-start dialog for first slide after a short delay if tutorial not completed
        if (!tutorialCompleted) {
          setTimeout(() => {
            showSlideDialog(0);
          }, 500);
        }

        // Load stats data
        await loadStats();
      });

      // Load stats data from various sources
      const loadStats = async () => {
        try {
          // Load achievements count
          const achievements = await achievementDb.getTasks();
          stats.value.achievements = achievements.length;

          // Load beasts count
          const beasts = await bestiaryDb.getBeasts();
          stats.value.beasts = beasts.length;

          // Load abilities count
          const abilities = await abilitiesDb.getAbilities();
          stats.value.abilities = abilities.length;

          // Set placeholder values for temples and items since we don't have direct DB access
          stats.value.temples = 3;
          stats.value.items = 5;
        } catch (error) {
          debug.error('Error loading stats:', error);
        }
      };

      const setSwiperInstance = (swiper: SwiperClass) => {
        swiperInstance.value = swiper;
      };

      const handleSlideChange = (swiper: any) => {
        debug.log('Slide changed to:', swiper.activeIndex);
        activeSlideIndex.value = swiper.activeIndex;

        // Automatically show dialog when reaching a new slide that hasn't been viewed yet
        if (!slidesViewed.value[activeSlideIndex.value]) {
          showSlideDialog(activeSlideIndex.value);
        }
      };

      const showSlideDialog = (slideIndex: number) => {
        // Set the dialog text blocks based on the slide index
        currentDialogBlocks.value = slides.value[slideIndex].dialogContent;
        // Show the dialog
        dialog.value?.show();
        // Mark this slide as viewed
        slidesViewed.value[slideIndex] = true;

        // Play a sound effect for immersion when dialog is shown
        if (typeof window['play$fx'] === 'function') {
          window['play$fx']('select');
        }
      };

      const onBlockComplete = (blockIndex: number) => {
        debug.log(`Dialog block ${blockIndex} completed`);

        // Play subtle sound effect between blocks
        if (typeof window['play$fx'] === 'function' && blockIndex < currentDialogBlocks.value.length - 1) {
          window['play$fx']('text');
        }
      };

      const onDialogComplete = () => {
        debug.log("Dialog complete");

        // Check if we've viewed all slides and mark tutorial as completed
        if (slidesViewed.value.every(viewed => viewed)) {
          markTutorialCompleted();
        }

        // Auto-advance to next slide if not on the final slide
        if (autoAdvance.value && activeSlideIndex.value < slides.value.length - 1) {
          setTimeout(() => {
            goToSlide(activeSlideIndex.value + 1);
          }, 500);
        }
      };

      // Reset tutorial function - called when clicking ? in toolbar
      const resetTutorial = () => {
        // Reset the slidesViewed array to make all slides appear unviewed
        slidesViewed.value = new Array(slides.value.length).fill(false);

        // Clear tutorial completion status
        localStorage.removeItem(TUTORIAL_COMPLETED_KEY);

        // Show dialog for current slide
        showSlideDialog(activeSlideIndex.value);

        // Play sound effect
        if (typeof window['play$fx'] === 'function') {
          window['play$fx']('system');
        }

        debug.log('Tutorial has been reset');
      };

      const getStarted = () => {
        router.push({ name: 'xp-main' });
      };

      const goToSlide = (index: number) => {
        if (swiperInstance.value) {
          swiperInstance.value.slideTo(index);
        }
      };

      const getDashboardComponent = (index: number) => {
        const components = [
          'WelcomeDashboard',
          'ExperiencePointsDashboard',
          'GoldPointsDashboard',
          'AbilityPointsDashboard',
          'CharacterStatsDashboard',
          'BeastsChallengesDashboard',
          'QuestsAdventuresDashboard',
          'TemplesTrainingDashboard',
          'ShopsMarketplaceDashboard'
        ];
        return components[index] || null;
      };

      return {
        $requireIcon: require.context("@/assets/icons/"),
        modules: [Pagination, Navigation],
        textSpeed,
        activeSlideIndex,
        slidesViewed,
        slides,
        handleSlideChange,
        showSlideDialog,
        getStarted,
        setSwiperInstance,
        goToSlide,
        dialog,
        currentDialogBlocks,
        onBlockComplete,
        onDialogComplete,
        stats,
        resetTutorial,
        getDashboardComponent
      };
    }
  });
</script>

<style lang="scss" scoped>
  .ion-page {
    ion-content {

      .swiper {
        width: 100%;
        height: 100%;
        position: relative;
        /* Increased height now that debug info is removed */

        :deep(.swiper-button-next),
        :deep(.swiper-button-prev) {
          top: auto !important;
          bottom: 3px !important;
          /* margin-top: 0 !important; */
          color: var(--ion-color-primary);
          z-index: 5;
        }
        
        :deep(.swiper-button-next) {
          right: 2.5% !important;
        }
        
        :deep(.swiper-button-prev) {
          left: 2.5% !important;
        }

        :deep(.swiper-pagination) {
          bottom: 15px !important;
          z-index: 1;
        }

        .swiper-slide {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          /* padding: 1em 2em; */
          height: 100%;
          padding-bottom: 50px; /* Add space at the bottom for navigation */

          .slide-icon {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 120px;
            height: 120px;
            border-radius: 50%;
            margin: 1rem 0;
            background-color: var(--ion-color-light);
            color: var(--ion-color-primary);

            &.xp-icon {
              background-color: rgba(var(--ion-color-success-rgb), 0.2);
              color: var(--ion-color-success);
            }

            &.ap-icon {
              background-color: rgba(var(--ion-color-warning-rgb), 0.2);
              color: var(--ion-color-warning);
            }

            &.gp-icon {
              background-color: rgba(var(--ion-color-tertiary-rgb), 0.2);
              color: var(--ion-color-tertiary);
            }

            &.character-stats-icon {
              background-color: rgba(var(--ion-color-danger-rgb), 0.2);
              color: var(--ion-color-danger);
            }

            &.quest-icon {
              background-color: rgba(var(--ion-color-success-rgb), 0.1);
              color: var(--ion-color-success-shade);
            }

            &.temple-icon {
              background-color: rgba(var(--ion-color-warning-rgb), 0.1);
              color: var(--ion-color-warning-shade);
            }

            &.shop-icon {
              background-color: rgba(var(--ion-color-tertiary-rgb), 0.1);
              color: var(--ion-color-tertiary-shade);
            }

            &.beast-icon {
              background-color: rgba(var(--ion-color-danger-rgb), 0.1);
              color: var(--ion-color-danger-shade);
            }
          }

          ion-text {
            margin: 1rem 0 1.5rem;
            width: 100%;
            line-height: 1.5;
            text-align: left;
          }

          .get-started-button {
            max-width: 250px;
            margin: 0 auto;
            font-weight: bold;
            height: 48px;
          }
        }
      }
    }
  }
</style>

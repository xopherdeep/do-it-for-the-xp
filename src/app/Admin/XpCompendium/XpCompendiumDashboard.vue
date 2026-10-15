<template>
  <xp-rpg-page title="Setup XP" :headerIcon="slides[activeSlideIndex].icon"
    :class="['bg-slide', getBgClass(activeSlideIndex)]">
    <!-- Primary Toolbar Actions -->
    <template #start-actions>
      <ion-menu-button @click="play$fx('select')" />
    </template>

    <!-- Native Navigation FABs in fixed slot -->
    <ion-fab slot="fixed" vertical="bottom" horizontal="start" class="nav-fab-container" v-if="activeSlideIndex > 0">
      <ion-fab-button color="light" @click.stop="swiperInstance?.slidePrev()" class="rpg-box">
        <i class="fad fa-chevron-left"></i>
      </ion-fab-button>
    </ion-fab>

    <ion-fab slot="fixed" vertical="bottom" horizontal="end" class="nav-fab-container"
      v-if="activeSlideIndex < slides.length - 1">
      <ion-fab-button color="light" @click.stop="swiperInstance?.slideNext()" class="rpg-box">
        <i class="fad fa-chevron-right"></i>
      </ion-fab-button>
    </ion-fab>

    <!-- Home FAB -->
    <ion-fab slot="fixed" vertical="bottom" horizontal="center" class="home-fab-container" v-if="activeSlideIndex > 0">
      <ion-fab-button color="light" @click.stop="goToSlide(0)" class="rpg-box" size="large">
        <i class="fad fa-game-console-handheld fa-2x"></i>
      </ion-fab-button>
    </ion-fab>

    <div class="slideshow-container ion-padding p-4">
      <swiper :modules="modules" :pagination="{
        el: '.swiper-pagination-custom',
        clickable: true,
      }" @swiper="setSwiperInstance" @slideChange="handleSlideChange" class="main-slideshow">
        <swiper-slide v-for="(slide, index) in slides" :key="index" class="flex flex-col items-center justify-center">
          <!-- Premium Glassmorphic Hero Card -->
          <div class="hero-card-container" :class="{ 'animate-in': activeSlideIndex === index }">
            <div class="hero-content text-center flex flex-col items-center">
              <div class="flex flex-row justify-center items-center gap-4">
                <div class="icon-wrapper">
                  <i :class="`fad ${slide.icon} fa-3x ${slide.iconClass}`"></i>
                </div>
                <xp-title variant="section" :class="{
                  'gamemaster-title-animate':
                    activeSlideIndex === index && index === 0,
                }">
                  {{ slide.title }}
                </xp-title>
              </div>

              <!-- Final slide button removed -->
            </div>
          </div>

          <!-- Dashboard Component -->
          <div class="dashboard-container w-full" :class="{ 'animate-up': activeSlideIndex === index }">
            <component :is="getDashboardComponent(index)" :stats="stats" :isActive="activeSlideIndex === index"
              :animationKey="`${activeSlideIndex}-${index}`" @navigate="goToSlide" @reset="resetTutorial" />
          </div>
        </swiper-slide>
      </swiper>

      <div class="nav-pagination-container">
        <div class="swiper-pagination-custom"></div>
      </div>
    </div>
  </xp-rpg-page>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import type { Swiper as SwiperClass } from "swiper";
import { Pagination, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/vue";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import XpStatBox from "@/components/molecules/StatBox/XpStatBox.vue";
import XpTitle from "@/components/atoms/Title/XpTitle.vue";
import XpText from "@/components/atoms/Text/XpText.vue";
import WelcomeDashboard from "@/app/Admin/XpCompendium/components/WelcomeDashboard.vue";
import ExperiencePointsDashboard from "@/app/Admin/XpCompendium/components/ExperiencePointsDashboard.vue";
import GoldPointsDashboard from "@/app/Admin/XpCompendium/components/GoldPointsDashboard.vue";
import AbilityPointsDashboard from "@/app/Admin/XpCompendium/components/AbilityPointsDashboard.vue";
import CharacterStatsDashboard from "@/app/Admin/XpCompendium/components/CharacterStatsDashboard.vue";
import BeastsChallengesDashboard from "@/app/Admin/XpCompendium/components/BeastsChallengesDashboard.vue";
import TemplesTrainingDashboard from "@/app/Admin/XpCompendium/components/TemplesTrainingDashboard.vue";
import debug from "@/lib/utils/debug";
import { getEngineStatsService } from "@/lib/services/stats/EngineStatsService";
import Ionic from "@/lib/mixins/ionic";
import { useDialogSystem } from "@/lib/engine/core/DialogSystem";
import XpRpgPage from "@/components/templates/pages/XpRpgPage.vue";
import { play$fx } from "@/assets/fx";
import { useTimers } from "@/hooks/useTimers";

const TUTORIAL_COMPLETED_KEY = "xp_compendium_tutorial_completed";

// Define SlideData interface
interface SlideData {
  icon: string;
  iconClass: string;
  title: string;
  dialogContent: string[];
  isFinal?: boolean;
}

export default defineComponent({
  name: "CompendiumDashboard",
  mixins: [Ionic],
  components: {
    Swiper,
    SwiperSlide,
    XpStatBox,
    XpTitle,
    XpText,
    WelcomeDashboard,
    ExperiencePointsDashboard,
    GoldPointsDashboard,
    AbilityPointsDashboard,
    CharacterStatsDashboard,
    BeastsChallengesDashboard,
    TemplesTrainingDashboard,
    XpRpgPage
  },
  setup() {
    const router = useRouter();
    const timers = useTimers();
    const activeSlideIndex = ref(0);
    const slidesViewed = ref<boolean[]>([]);
    const swiperInstance = ref<SwiperClass | null>(null);
    // The Game Master moves between slides with the arrows or a swipe; closing a dialog never jumps ahead
    const autoAdvance = ref(false);

    // Access dialog system from game engine
    const dialogSystem = useDialogSystem();

    const stats = ref({
      abilities: 0,
      beasts: 0,
      achievements: 0,
      temples: 0,
      items: 0,
      shops: 0,
    });

    // ---------------------------------------------------------
    // PARENT ONBOARDING: Hook → Stakes → Defense → Training → Economy → Payoff
    // ---------------------------------------------------------
    const slides = ref<SlideData[]>([
      // 0: GameMaster - Welcome
      {
        icon: "fa-game-console-handheld",
        iconClass: "",
        title: "GameMaster™",
        dialogContent: [
          "Welcome, Game Master. This is your Compendium: the rulebook for your family's game.",
          "Chores become quests and beasts. Heroes earn XP, Gold and Ability Points for doing them.",
          "The game keeps score, so you don't have to nag.",
        ],
      },
      // 1: Beasts - THE HOOK
      {
        icon: "fa-dragon",
        iconClass: "beast-icon",
        title: "Beasts & Battles",
        dialogContent: [
          "A Beast is a chore with a checklist. The Socktopus: sort the socks, match the pairs, put them away.",
          "In battle every checklist item is an attack. Finish them all and the Beast is defeated.",
          "Each Beast has a clock. Let it run out and the Beast strikes, and the hero loses HP.",
          "Heroes can always Run Away, but the Beast gets one parting strike as they go, and the chore stays on their quest board.",
        ],
      },
      // 2: HP/MP - THE STAKES
      {
        icon: "fal fa-heart",
        iconClass: "character-stats-icon",
        title: "Health & Mana",
        dialogContent: [
          "HP is the hero's stamina. Beast strikes take it away, and the damage lasts after the fight.",
          "At 0 HP the hero blacks out and wakes up at the Hospital, where healing costs Gold.",
          "MP is the hero's focus. Using an Ability costs MP.",
          "Potions, rest in town and the Hospital bring HP and MP back.",
        ],
      },
      // 3: Powers/AP - THE DEFENSE
      {
        icon: "fa-hand-holding-magic",
        iconClass: "ap-icon",
        title: "Abilities & Powers",
        dialogContent: [
          "Powers are privileges you define: real-life ones like extra screen time, or in-game spells.",
          "Each Power unlocks with Ability Points (AP) earned in a window: today, this week or this month.",
          "AP measures steady effort. Let it slip and the Power locks again.",
          "Using a Power costs MP, so heroes choose when to spend it.",
        ],
      },
      // 4: Temples - THE TRAINING
      {
        icon: "fa-dungeon",
        iconClass: "temple-icon",
        title: "Temples & Dungeons",
        dialogContent: [
          "Every region of the world map has a Temple: a maze of rooms with beasts, locked doors and treasure.",
          "Chests hold Gold and key items, like the wands that bend the rules of a chore.",
          "A mini-boss guards the boss key, and a Pegasus waits past the boss.",
          "Edit any room here, roll a new Temple from a seed, or raise a Blood Moon to reset one.",
        ],
      },
      // 5: GP/Economy - THE RESOURCES
      {
        icon: "fa-hand-holding-usd",
        iconClass: "gp-icon",
        title: "Gold & Shops",
        dialogContent: [
          "Quests pay Gold Points (GP) into the hero's wallet. The Gold Bank keeps their savings.",
          "Shops sell what you stock: real rewards at prices you set, potions and gear.",
          "Healing costs Gold, so putting chores off gets expensive.",
          "Saving up teaches budgeting without a lecture.",
        ],
      },
      // 6: XP - THE PAYOFF
      {
        icon: "fa-hand-holding-seedling",
        iconClass: "xp-icon",
        title: "Experience & Leveling",
        dialogContent: [
          "Experience Points (XP) are the permanent record of effort. They never go down.",
          "Every level raises the hero's max HP and MP and grows their class.",
          "Ready? Start with a Beast or a Quest from the tabs below.",
        ],
        isFinal: true,
      },
    ]);

    // Function to check if tutorial has been completed
    const checkTutorialCompleted = (): boolean => {
      const completed = localStorage.getItem(TUTORIAL_COMPLETED_KEY);
      return completed === "true";
    };

    // Function to mark tutorial as completed
    const markTutorialCompleted = () => {
      localStorage.setItem(TUTORIAL_COMPLETED_KEY, "true");
      debug.log("Tutorial has been marked as completed");
    };

    // Function to handle slide 0 enter (animation + sound)
    const handleSlide0Enter = () => {
      // 2200ms: synchronize with the end of the slower animation
      timers.startTimeout(2200, () => {
        // Verify we are still on slide 0 before playing
        const canPlayIntroSound =
          activeSlideIndex.value === 0 &&
          typeof window["play$fx"] === "function";
        if (canPlayIntroSound) {
          window["play$fx"]("GameBoy");
        }
      });
    };

    // Initialize slidesViewed array based on slides length and tutorial completion status
    onMounted(async () => {
      const tutorialCompleted = checkTutorialCompleted();

      // Initialize slidesViewed array
      slidesViewed.value = new Array(slides.value.length).fill(
        tutorialCompleted
      );

      // Auto-start dialog for first slide after a short delay if tutorial not completed
      if (!tutorialCompleted) {
        timers.startTimeout(500, () => {
          showSlideDialog(0);
        });
      }

      // Trigger slide 0 enter effect
      handleSlide0Enter();

      // Load stats data
      await loadStats();
    });

    // Load stats data from centralized service
    const loadStats = async () => {
      try {
        const statsService = getEngineStatsService();
        const systemStats = await statsService.getSystemStats();

        stats.value.achievements = systemStats.achievements;
        stats.value.beasts = systemStats.beasts;
        stats.value.abilities = systemStats.abilities;
        stats.value.temples = systemStats.temples;
        stats.value.items = systemStats.items;
        stats.value.shops = systemStats.shops;
      } catch (error) {
        debug.error("Error loading stats:", error);
      }
    };

    const setSwiperInstance = (swiper: SwiperClass) => {
      swiperInstance.value = swiper;
    };

    const handleSlideChange = (swiper: any) => {
      debug.log("Slide changed to:", swiper.activeIndex);
      activeSlideIndex.value = swiper.activeIndex;

      // Trigger slide 0 enter effect if returning to slide 0
      const isFirstSlide = activeSlideIndex.value === 0;
      if (isFirstSlide) {
        handleSlide0Enter();
      }

      // Automatically show dialog when reaching a new slide that hasn't been viewed yet
      const isSlideViewed = slidesViewed.value[activeSlideIndex.value];
      if (!isSlideViewed) {
        showSlideDialog(activeSlideIndex.value);
      }
    };

    const showSlideDialog = (slideIndex: number) => {
      // Show the dialog using the global dialog system
      dialogSystem.showMessage(
        slides.value[slideIndex].dialogContent,
        "global",
        {
          autoDismiss: false,
          onDismiss: () => {
            // Logic from onDialogComplete
            const isEverySlideViewed = slidesViewed.value.every((viewed) => viewed);
            if (isEverySlideViewed) {
              markTutorialCompleted();
            }

            const shouldAdvanceToNextSlide =
              autoAdvance.value &&
              activeSlideIndex.value < slides.value.length - 1;
            if (shouldAdvanceToNextSlide) {
              timers.startTimeout(500, () => {
                goToSlide(activeSlideIndex.value + 1);
              });
            }
          },
        }
      );

      // Mark this slide as viewed
      slidesViewed.value[slideIndex] = true;

      // Play a sound effect for immersion when dialog is shown
      const canPlayFx = typeof window["play$fx"] === "function";
      if (canPlayFx) {
        window["play$fx"]("select");
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
      const canPlayFx = typeof window["play$fx"] === "function";
      if (canPlayFx) {
        window["play$fx"]("system");
      }

      debug.log("Tutorial has been reset");
    };

    const getStarted = () => {
      router.push({ name: "xp-main" });
    };

    const goToSlide = (index: number) => {
      if (swiperInstance.value) {
        swiperInstance.value.slideTo(index);
      }
    };

    const getDashboardComponent = (index: number) => {
      const components = [
        "WelcomeDashboard", // 0: GameMaster
        "BeastsChallengesDashboard", // 1: Beasts (THE HOOK)
        "CharacterStatsDashboard", // 2: HP/MP (THE STAKES)
        "AbilityPointsDashboard", // 3: Powers/AP (THE DEFENSE)
        "TemplesTrainingDashboard", // 4: Temples (THE TRAINING)
        "GoldPointsDashboard", // 5: GP/Economy (THE RESOURCES)
        "ExperiencePointsDashboard", // 6: XP (THE PAYOFF)
      ];
      return components[index] || null;
    };

    const getBgClass = (index: number) => {
      const classes = [
        "bg-slide-modal", // 0: Welcome / GameMaster
        "bg-slide-beast", // 1: Beasts (THE HOOK)
        "bg-slide-hp", // 2: HP/MP (THE STAKES)
        "bg-slide-ap", // 3: Powers/AP (THE DEFENSE)
        "bg-slide-temple", // 4: Temples (THE TRAINING)
        "bg-slide-gp", // 5: GP/Economy (THE RESOURCES)
        "bg-slide-xp", // 6: XP (THE PAYOFF)
      ];
      return classes[index] || "bg-slide-dark";
    };

    return {
      requireIcon: require.context("@/assets/icons/", false, /\.svg$/),
      modules: [Pagination, Navigation],
      activeSlideIndex,
      slidesViewed,
      slides,
      handleSlideChange,
      showSlideDialog,
      getStarted,
      setSwiperInstance,
      goToSlide,
      stats,
      resetTutorial,
      getDashboardComponent,
      getBgClass,
      swiperInstance,
      play$fx,
    };
  },
});
</script>

<style lang="scss" scoped src="./_XpCompendiumDashboard.scss" />

<template>
  <ion-page :class="['icon-colors', 'bg-slide', getBgClass(activeSlideIndex)]">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-menu-button
            color="primary"
            @click="$fx.ui[$fx.theme.ui].select.play()"
          ></ion-menu-button>
          <i class="fad fa-game-console-handheld fa-2x ml-2" slot="start"></i>
        </ion-buttons>
        <ion-title>
          <xp-title variant="page" class="text-center">Setup XP</xp-title>
        </ion-title>
        <!-- Help button removed, now in Welcome Dashboard -->
      </ion-toolbar>
    </ion-header>
    <ion-content
      :fullscreen="true"
      class="ion-padding transparent-content"
      style="--background: transparent"
    >
      <!-- Native Navigation FABs in fixed slot -->
      <ion-fab
        slot="fixed"
        vertical="bottom"
        horizontal="start"
        class="nav-fab-container"
        v-if="activeSlideIndex > 0"
      >
        <ion-fab-button
          color="light"
          @click.stop="swiperInstance?.slidePrev()"
          class="rpg-box"
        >
          <i class="fad fa-chevron-left"></i>
        </ion-fab-button>
      </ion-fab>

      <ion-fab
        slot="fixed"
        vertical="bottom"
        horizontal="end"
        class="nav-fab-container"
        v-if="activeSlideIndex < slides.length - 1"
      >
        <ion-fab-button
          color="light"
          @click.stop="swiperInstance?.slideNext()"
          class="rpg-box"
        >
          <i class="fad fa-chevron-right"></i>
        </ion-fab-button>
      </ion-fab>

      <!-- Home FAB -->
      <ion-fab
        slot="fixed"
        vertical="bottom"
        horizontal="center"
        class="home-fab-container"
        v-if="activeSlideIndex > 0"
      >
        <ion-fab-button
          color="light"
          @click.stop="goToSlide(0)"
          class="rpg-box"
          size="large"
        >
          <i class="fad fa-game-console-handheld fa-2x"></i>
        </ion-fab-button>
      </ion-fab>

      <div class="slideshow-container">
        <swiper
          :modules="modules"
          :pagination="{
            el: '.swiper-pagination-custom',
            clickable: true,
          }"
          @swiper="setSwiperInstance"
          @slideChange="handleSlideChange"
          class="main-slideshow"
        >
          <swiper-slide
            v-for="(slide, index) in slides"
            :key="index"
            class="flex flex-col items-center justify-center"
          >
            <!-- Premium Glassmorphic Hero Card -->
            <div
              class="hero-card-container"
              :class="{ 'animate-in': activeSlideIndex === index }"
            >
              <div class="hero-content text-center flex flex-col items-center">
                <div class="flex flex-row justify-center items-center gap-4">
                  <div class="icon-wrapper">
                    <i
                      :class="`fad ${slide.icon} fa-3x ${slide.iconClass}`"
                    ></i>
                  </div>
                  <xp-title
                    variant="section"
                    :class="{
                      'gamemaster-title-animate':
                        activeSlideIndex === index && index === 0,
                    }"
                  >
                    {{ slide.title }}
                  </xp-title>
                </div>

                <!-- Final slide button removed -->
              </div>
            </div>

            <!-- Dashboard Component -->
            <div
              class="dashboard-container w-full"
              :class="{ 'animate-up': activeSlideIndex === index }"
            >
              <component
                :is="getDashboardComponent(index)"
                :stats="stats"
                :isActive="activeSlideIndex === index"
                :animationKey="`${activeSlideIndex}-${index}`"
                @navigate="goToSlide"
                @reset="resetTutorial"
              />
            </div>
          </swiper-slide>
        </swiper>

        <div class="nav-pagination-container">
          <div class="swiper-pagination-custom"></div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref, onMounted } from "vue";
  import { useRouter } from "vue-router";
  import { Swiper as SwiperClass, Pagination, Navigation } from "swiper";
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
  import Ionic from "@/lib/mixins/ionic";
  import { useDialogSystem } from "@/lib/engine/core/DialogSystem";

  // Define required classes for database operations
  class AchievementDb {
    constructor(private storage: any) {}
    async getTasks() {
      try {
        return (await this.storage.get("achievements")) || [];
      } catch (error) {
        debug.error("Error fetching achievements:", error);
        return [];
      }
    }
  }

  class BestiaryDb {
    constructor(private storage: any) {}
    async getBeasts() {
      try {
        return (await this.storage.get("beasts")) || [];
      } catch (error) {
        debug.error("Error fetching beasts:", error);
        return [];
      }
    }
  }

  class AbilitiesDb {
    constructor(private storage: any) {}
    async getAbilities() {
      try {
        return (await this.storage.get("abilities")) || [];
      } catch (error) {
        debug.error("Error fetching abilities:", error);
        return [];
      }
    }
  }

  // Define storage placeholders
  const achievementStorage = {
    get: async () => [],
  };
  const beastStorage = {
    get: async () => [],
  };
  const abilitiesStorage = {
    get: async () => [],
  };

  // Define tutorial completed key
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
    },
    setup() {
      const router = useRouter();
      const activeSlideIndex = ref(0);
      const slidesViewed = ref<boolean[]>([]);
      const swiperInstance = ref<SwiperClass | null>(null);
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
        shops: 0,
      });

      // Define all slides data in a single array
      // const slides = ref<SlideData[]>([
      //   {
      //     icon: "fa-game-console-handheld",
      //     iconClass: "",
      //     title: "Welcome to the Adventure!",
      //     dialogContent: [
      //       "Welcome to your gamified journey into recurring task management!",
      //       "This tutorial will guide you through the different systems in our app.",
      //       "You'll learn how to transform everyday tasks into exciting adventures."
      //     ]
      //   },
      //   {
      //     icon: "fa-staff " + ["quest", "fire", "ice"][Math.floor(Math.random() * 3)],
      //     iconClass: "xp-icon",
      //     title: "Experience Points (XP)",
      //     dialogContent: [
      //       "Experience Points (XP) represent time and effort spent on tasks.",
      //       "Think of it as 10 XP is about 1 minute of good effort.",
      //       "As you accumulate XP, you'll level up, unlocking new abilities (privileges) and increasing your maximum HP and MP."
      //     ]
      //   },
      //   {
      //     icon: "fa-hand-holding-usd",
      //     iconClass: "gp-icon",
      //     title: "Gold Points (GP)",
      //     dialogContent: [
      //       "Gold Points (GP) are the in-game currency, used for things like purchasing items and rewards.",
      //       "GP is automatically deposited into your savings after completing tasks and battles.",
      //       "You can make limited withdrawals from your wallet. Wallets come in a few sizes, each with a different limit."
      //     ]
      //   },
      //   {
      //     icon: "fa-hand-holding-magic",
      //     iconClass: "ap-icon",
      //     title: "Ability Points (AP)",
      //     dialogContent: [
      //       "Ability Points (AP) unlock special abilities and privileges.",
      //       "AP is awarded for daily streaks, weekly achievements, and monthly milestones.",
      //       "For example. There may be a ability/privilege that requires the user to have accumulated 100 AP in the last 7 days to unlock.",
      //       "This encourages users to keep their AP streaks ",
      //     ]
      //   },
      //   {
      //     icon: "fa-heartbeat",
      //     iconClass: "character-stats-icon",
      //     title: "Character Stats (HP/MP)",
      //     dialogContent: [
      //       "Like any RPG character, you have Health Points (HP) and Mana Points (MP).",
      //       "HP represents your physical energy and is consumed by completing tasks.",
      //       "MP represents your mental energy, used for focus-intensive activities.",
      //       "Both regenerate with proper rest and self-care."
      //     ]
      //   },
      //   {
      //     icon: "fa-hand-holding-heart",
      //     iconClass: "beast-icon",
      //     title: "Beasts & Challenges",
      //     dialogContent: [
      //       "Beasts represent challenges in your life.",
      //       "From procrastination dragons to distraction demons, each has unique patterns and weaknesses.",
      //       "Develop strategies to overcome these beasts and earn special bonuses for conquering particularly difficult challenges."
      //     ]
      //   },
      //   {
      //     // random element
      //     icon: "fa-hand-holding-seedling",
      //     iconClass: "quest-icon",
      //     title: "Quests & Adventures",
      //     dialogContent: [
      //       "Your daily tasks become quests in this adventure!",
      //       "Complete quests to earn XP, AP, and GP.",
      //       "Quests can be categorized by difficulty, urgency, and type.",
      //       "Creating balanced quest logs ensures steady progress in all areas of your life."
      //     ]
      //   },
      //   {
      //     icon: "fa-hand-holding-water",
      //     iconClass: "temple-icon",
      //     title: "Temples & Training",
      //     dialogContent: [
      //       "Temples are where you develop your skills and attributes.",
      //       "Invest AP to gain permanent bonuses to your abilities.",
      //       "Each temple represents an area of personal growth, such as fitness, creativity, knowledge, or social skills."
      //     ]
      //   },
      //   {
      //     icon: "fa-store",
      //     iconClass: "shop-icon",
      //     title: "Shops & Marketplace",
      //     dialogContent: [
      //       "Shops let you spend your hard-earned GP on rewards!",
      //       "From digital items to real-world treats, shops turn your productivity into tangible benefits.",
      //       "Shop inventories expand as you progress, offering more valuable rewards at higher levels."
      //     ],
      //     isFinal: true
      //   }
      // ]);

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
            "Welcome to the ultimate parenting life-hack.",
            "We are going to replace 'Nagging' with 'Game Mechanics'.",
            "This system automates consequences and rewards effort.",
          ],
        },
        // 1: Beasts - THE HOOK
        {
          icon: "fa-dragon",
          iconClass: "beast-icon",
          title: "Beasts & Battles",
          dialogContent: [
            "Chores become Beasts that attack when it's time to do them.",
            "The Beast hits constantly, draining HP until the task is DONE.",
            "They can 'Run Away'... but the Beast chases them.",
            "Next time they open the app? SNEAK ATTACK for massive damage!",
          ],
        },
        // 2: HP/MP - THE STAKES
        {
          icon: "fal fa-heart",
          iconClass: "character-stats-icon",
          title: "Health & Mana",
          dialogContent: [
            "HP is their 'Freedom Meter'. When it hits 0, they are 'Grounded'.",
            "All Abilities and Privileges lock until they heal with Potions or rest.",
            "MP is their mental energy, used to cast Abilities like Time Extensions.",
            "The app does the nagging, so you don't have to.",
          ],
        },
        // 3: Powers/AP - THE DEFENSE
        {
          icon: "fa-hand-holding-magic",
          iconClass: "ap-icon",
          title: "Abilities & Powers",
          dialogContent: [
            "Abilities are special powers unlocked through consistency.",
            "They can cast 'Time Spells' (ask for extensions) or 'Heal Spells' (recover HP).",
            "But using Abilities costs MP, and MP regenerates slowly.",
            "Ability Points (AP) measure consistency—lose the streak, lose the power.",
          ],
        },
        // 4: Temples - THE TRAINING
        {
          icon: "fa-dungeon",
          iconClass: "temple-icon",
          title: "Temples & Dungeons",
          dialogContent: [
            "Temples are where consistency is forged into power.",
            "Each Temple represents an area of growth: Fitness, Creativity, Knowledge, Social Skills.",
            "Regular training at a Temple unlocks permanent bonuses.",
            "This is where habits become superpowers.",
          ],
        },
        // 5: GP/Economy - THE RESOURCES
        {
          icon: "fa-hand-holding-usd",
          iconClass: "gp-icon",
          title: "Gold & Shops",
          dialogContent: [
            "Gold Points (GP) are earned by completing tasks.",
            "They can spend GP at Shops on real rewards or survival items like Potions.",
            "If they procrastinate, they'll spend fun money on Potions just to survive.",
            "This forces smart budgeting and teaches financial responsibility.",
          ],
        },
        // 6: XP - THE PAYOFF
        {
          icon: "fa-hand-holding-seedling",
          iconClass: "xp-icon",
          title: "Experience & Leveling",
          dialogContent: [
            "Experience Points (XP) are the permanent record of effort.",
            "XP never decreases. Every completed task adds to their legacy.",
            "As they Level Up, their maximum HP and MP increase—they get stronger!",
            "Are you ready to be the GameMaster?",
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
        setTimeout(() => {
          // Verify we are still on slide 0 before playing
          if (
            activeSlideIndex.value === 0 &&
            typeof window["play$fx"] === "function"
          ) {
            window["play$fx"]("GameBoy");
          }
        }, 2200); // Synchronize with the end of the slower animation
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
          setTimeout(() => {
            showSlideDialog(0);
          }, 500);
        }

        // Trigger slide 0 enter effect
        handleSlide0Enter();

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
          stats.value.shops = 2;
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
        if (activeSlideIndex.value === 0) {
          handleSlide0Enter();
        }

        // Automatically show dialog when reaching a new slide that hasn't been viewed yet
        if (!slidesViewed.value[activeSlideIndex.value]) {
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
              if (slidesViewed.value.every((viewed) => viewed)) {
                markTutorialCompleted();
              }

              if (
                autoAdvance.value &&
                activeSlideIndex.value < slides.value.length - 1
              ) {
                setTimeout(() => {
                  goToSlide(activeSlideIndex.value + 1);
                }, 500);
              }
            },
          }
        );

        // Mark this slide as viewed
        slidesViewed.value[slideIndex] = true;

        // Play a sound effect for immersion when dialog is shown
        if (typeof window["play$fx"] === "function") {
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
        if (typeof window["play$fx"] === "function") {
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
        $requireIcon: require.context("@/assets/icons/"),
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
      };
    },
  });
</script>

<style lang="scss" scoped>
  .ion-page {
    transition: all 0.5s ease;

    ion-content {
      .slideshow-container {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;

        .main-slideshow {
          width: 100%;
          height: 100%;
          position: relative;

          .swiper-slide {
            padding-bottom: 100px;
            overflow-y: auto;
            overflow-x: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
        }
      }

      .nav-fab-container {
        margin-bottom: 60px;
        z-index: 1000;
        --color: var(--eb-color-pale-yellow);

        &[horizontal="start"] {
          margin-left: 16px;
        }

        &[horizontal="end"] {
          margin-right: 16px;
        }

        ion-fab-button {
          --box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          --border-color: rgba(255, 255, 255, 0.2);
          --border-width: 1px;
          --border-style: solid;
        }
      }

      .nav-pagination-container {
        position: absolute;
        bottom: 45px;
        left: 0;
        right: 0;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 48px;
        pointer-events: none;
        z-index: 2000;
      }

      .swiper-pagination-custom {
        position: relative;
        display: flex;
        justify-content: center;
        gap: 12px;
        width: 100%;
        pointer-events: auto;

        :deep(.swiper-pagination-bullet) {
          width: 10px;
          height: 10px;
          background: rgba(255, 255, 255, 0.25);
          opacity: 1;
          transition: all 0.3s ease;
          border: 1px solid rgba(255, 255, 255, 0.15);
          margin: 0 !important;
          transform: rotate(45deg);
          border-radius: 1px;
        }

        :deep(.swiper-pagination-bullet-active) {
          background: var(--eb-color-pale-yellow);
          transform: rotate(45deg) scale(1.6);
          border-radius: 1px;
          box-shadow: 0 0 15px var(--eb-color-pale-yellow),
            0 0 5px rgba(255, 255, 255, 0.8);
          border-color: #fff;
        }
      }
    }
  }

  /* Premium Hero Styles */
  .hero-content {
    width: 92%;
    max-width: 600px;
    margin: 1.5rem auto 1rem;
    transition: all 0.4s ease;
  }

  .icon-wrapper {
    background: radial-gradient(
      circle,
      rgba(255, 255, 255, 0.08) 0%,
      transparent 70%
    );
    padding: 16px;
    border-radius: 50%;

    i {
      filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.25));
    }
  }

  .get-started-btn {
    --border-radius: 8px;
    --background: linear-gradient(
      135deg,
      var(--ion-color-success),
      var(--ion-color-success-shade)
    );
    font-weight: 700;
    font-size: 1rem;
    height: 50px;
    width: 80%;
    box-shadow: 0 4px 15px rgba(var(--ion-color-success-rgb), 0.3);

    &:hover {
      --box-shadow: 0 6px 20px rgba(var(--ion-color-success-rgb), 0.4);
    }
  }

  /* Animations */
  .hero-card-container {
    width: 100%;
    opacity: 0;
    transform: scale(0.9) translateY(20px);
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);

    &.animate-in {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .dashboard-container {
    opacity: 0;
    transform: translateY(30px);
    transition: all 0.6s ease-out;
    transition-delay: 0.2s;
    display: flex;

    &.animate-up {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .xp-icon {
    color: var(--ion-color-success);
  }

  .gp-icon {
    color: var(--ion-color-warning);
  }

  .ap-icon {
    color: var(--ion-color-tertiary);
  }

  .character-stats-icon {
    color: var(--ion-color-danger);
  }

  .beast-icon {
    color: var(--ion-color-danger-shade);
  }

  .temple-icon {
    color: var(--ion-color-secondary);
  }

  .shop-icon {
    color: #e599f7;
    text-shadow: 0 0 10px rgba(190, 75, 219, 0.6);
  }

  /* GameMaster Title Specific Animation */
  .gamemaster-title-animate {
    animation: dropIn 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    display: inline-block;
  }

  @keyframes dropIn {
    0% {
      transform: translateY(-200px);
      opacity: 0;
    }

    100% {
      transform: translateY(0);
      opacity: 1;
    }
  }
</style>

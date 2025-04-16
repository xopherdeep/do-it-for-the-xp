<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-menu-button
            color="primary"
            @click="$fx.ui[$fx.theme.ui].select.play()"
          ></ion-menu-button>
        <i class="fad fa-hand-holding-medical fa-2x ml-2" slot="start"></i>
        </ion-buttons>
        <ion-title>XP Compendium</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true" class="ion-padding bg-slide">
      <swiper
        :modules="modules"
        navigation
        pager="true"
        :pagination="{ clickable: true }"
        @swiper="setSwiperInstance"
        @slideChange="handleSlideChange"
      >
        <swiper-slide>
          <div class="slide-icon">
            <i class="fad fa-hand-holding-medical fa-4x"></i>
          </div>
          <ion-card class="max-w-xl">
            <ion-card-title>Welcome to the Adventure!</ion-card-title>
            <ion-card-content>
              <ion-text>
                <xp-typing-text
                  ref="slide1Text"
                  :text="introText"
                  :speed="textSpeed"
                  :auto-start="activeSlideIndex === 0"
                  :sound-theme="$fx.theme.rpg"
                  sound-type="text"
                  @typing-complete="textComplete(0)"
                ></xp-typing-text>
              </ion-text>
            </ion-card-content>
          </ion-card>
        </swiper-slide>
        
        <swiper-slide>
          <div class="slide-icon character-stats-icon">
            <i class="fad fa-heartbeat fa-4x"></i>
          </div>
          <ion-card class="max-w-xl">
            <ion-card-title>Character Stats (HP/MP)</ion-card-title>
            <ion-card-content>
              <ion-text>
                <xp-typing-text
                  ref="slideStatsText"
                  :text="characterStatsText"
                  :speed="textSpeed"
                  :auto-start="activeSlideIndex === 1"
                  :sound-theme="$fx.theme.rpg"
                  sound-type="text"
                  @typing-complete="textComplete(1)"
                ></xp-typing-text>
              </ion-text>
            </ion-card-content>
          </ion-card>
        </swiper-slide>

        <swiper-slide>
          <div class="slide-icon xp-icon">
            <i class="fad fa-hand-holding-seedling fa-4x"></i>
          </div>
          <ion-card class="max-w-xl">
            <ion-card-title>Experience Points (XP)</ion-card-title>
            <ion-card-content>
              <ion-text>
                <xp-typing-text
                  ref="slide2Text"
                  :text="xpText"
                  :speed="textSpeed"
                  :auto-start="activeSlideIndex === 2"
                  :sound-theme="$fx.theme.rpg"
                  sound-type="text"
                  @typing-complete="textComplete(2)"
                ></xp-typing-text>
              </ion-text>
            </ion-card-content>
          </ion-card>
        </swiper-slide>
        
        <swiper-slide>
          <div class="slide-icon quest-icon">
            <i class="fad fa-scroll-old fa-4x"></i>
          </div>
          <ion-card class="max-w-xl">
            <ion-card-title>Quests & Adventures</ion-card-title>
            <ion-card-content>
              <ion-text>
                <xp-typing-text
                  ref="slideQuestsText"
                  :text="questsText"
                  :speed="textSpeed"
                  :auto-start="activeSlideIndex === 3"
                  :sound-theme="$fx.theme.rpg"
                  sound-type="text"
                  @typing-complete="textComplete(3)"
                ></xp-typing-text>
              </ion-text>
            </ion-card-content>
          </ion-card>
        </swiper-slide>

        <swiper-slide>
          <div class="slide-icon ap-icon">
            <i class="fad fa-hand-holding-magic fa-4x"></i>
          </div>
          <ion-card class="max-w-xl">
            <ion-card-title>Ability Points (AP)</ion-card-title>
            <ion-card-content>
              <ion-text>
                <xp-typing-text
                  ref="slide3Text"
                  :text="apText"
                  :speed="textSpeed"
                  :auto-start="activeSlideIndex === 4"
                  :sound-theme="$fx.theme.rpg"
                  sound-type="text"
                  @typing-complete="textComplete(4)"
                ></xp-typing-text>
              </ion-text>
            </ion-card-content>
          </ion-card>
        </swiper-slide>
        
        <swiper-slide>
          <div class="slide-icon temple-icon">
            <i class="fad fa-gopuram fa-4x"></i>
          </div>
          <ion-card class="max-w-xl">
            <ion-card-title>Temples & Training</ion-card-title>
            <ion-card-content>
              <ion-text>
                <xp-typing-text
                  ref="slideTemplesText"
                  :text="templesText"
                  :speed="textSpeed"
                  :auto-start="activeSlideIndex === 5"
                  :sound-theme="$fx.theme.rpg"
                  sound-type="text"
                  @typing-complete="textComplete(5)"
                ></xp-typing-text>
              </ion-text>
            </ion-card-content>
          </ion-card>
        </swiper-slide>

        <swiper-slide>
          <div class="slide-icon gp-icon">
            <i class="fad fa-coins fa-4x"></i>
          </div>
          <ion-card class="max-w-xl">
            <ion-card-title>Gold Points (GP)</ion-card-title>
            <ion-card-content>
              <ion-text>
                <xp-typing-text
                  ref="slide4Text"
                  :text="gpText"
                  :speed="textSpeed"
                  :auto-start="activeSlideIndex === 6"
                  :sound-theme="$fx.theme.rpg"
                  sound-type="text"
                  @typing-complete="textComplete(6)"
                ></xp-typing-text>
              </ion-text>
            </ion-card-content>
          </ion-card>
        </swiper-slide>
        
        <swiper-slide>
          <div class="slide-icon shop-icon">
            <i class="fad fa-store fa-4x"></i>
          </div>
          <ion-card class="max-w-xl">
            <ion-card-title>Shops & Marketplace</ion-card-title>
            <ion-card-content>
              <ion-text>
                <xp-typing-text
                  ref="slideShopsText"
                  :text="shopsText"
                  :speed="textSpeed"
                  :auto-start="activeSlideIndex === 7"
                  :sound-theme="$fx.theme.rpg"
                  sound-type="text"
                  @typing-complete="textComplete(7)"
                ></xp-typing-text>
              </ion-text>
            </ion-card-content>
          </ion-card>
        </swiper-slide>
        
        <swiper-slide>
          <div class="slide-icon beast-icon">
            <i class="fad fa-dragon fa-4x"></i>
          </div>
          <ion-card class="max-w-xl">
            <ion-card-title>Beasts & Challenges</ion-card-title>
            <ion-card-content>
              <ion-text>
                <xp-typing-text
                  ref="slideBeastsText"
                  :text="beastsText"
                  :speed="textSpeed"
                  :auto-start="activeSlideIndex === 8"
                  :sound-theme="$fx.theme.rpg"
                  sound-type="text"
                  @typing-complete="textComplete(8)"
                ></xp-typing-text>
              </ion-text>
            </ion-card-content>
            <ion-button
              @click="getStarted"
              expand="block"
              color="success"
              class="mb-2 w-1/2 mx-auto"
              :disabled="!slidesCompleted[8]"
            >
              Begin Your Journey!
            </ion-button>
          </ion-card>
        </swiper-slide>
      </swiper>
      
      <!-- Debug info to help troubleshoot -->
      <div class="debug-info ion-padding ion-margin-top">
        <p>Current slide: {{ activeSlideIndex }}</p>
        <p>Slides completed: {{ slidesCompleted.join(', ') }}</p>
        <div class="slide-buttons">
          <ion-button 
            v-for="index in 9" 
            :key="index" 
            size="small"
            @click="goToSlide(index - 1)"
            :color="activeSlideIndex === index - 1 ? 'success' : 'medium'"
          >
            {{ index }}
          </ion-button>
        </div>
      </div>
    </ion-content>
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
import XpTypingText from "@/components/XpTypingText";

export default defineComponent({
  name: 'CompendiumSplash',
  components: {
    Swiper,
    SwiperSlide,
    XpTypingText
  },
  // mixins: [Ionic],
  setup() {
    const router = useRouter();
    const textSpeed = ref(50);
    const activeSlideIndex = ref(0);
    const slidesCompleted = ref([false, false, false, false, false, false, false, false, false]);
    const swiperInstance = ref<SwiperClass | null>(null);

    const introText = ref('Welcome to your gamified journey! This tutorial will guide you through the different systems in the game and show you how to transform everyday tasks into exciting adventures.');
    
    const characterStatsText = ref('Like any RPG character, you have Health Points (HP) and Mana Points (MP). HP represents your physical energy and is consumed by completing tasks. MP represents your mental energy, used for focus-intensive activities. Both regenerate with proper rest and self-care.');
    
    const xpText = ref('Experience Points (XP) represent time and effort spent on tasks. Earn roughly 10 XP per minute of effort. As you accumulate XP, you\'ll level up, unlocking new abilities and increasing your maximum HP and MP.');
    
    const questsText = ref('Your daily tasks become quests in this adventure! Complete quests to earn XP, AP, and GP. Quests can be categorized by difficulty, urgency, and type. Creating balanced quest logs ensures steady progress in all areas of your life.');
    
    const apText = ref('Ability Points (AP) unlock special abilities and privileges. Unlike XP, they follow a "use it or lose it" system, encouraging regular achievement to maintain your powers. AP is awarded for daily streaks, weekly achievements, and monthly milestones.');
    
    const templesText = ref('Temples are where you develop your skills and attributes. Invest AP to gain permanent bonuses to your abilities. Each temple represents an area of personal growth, such as fitness, creativity, knowledge, or social skills.');
    
    const gpText = ref('Gold Points (GP) are the in-game currency for purchasing items and rewards. GP is deposited into your savings after completing quests. You can make limited withdrawals into your wallet, which has size limits that increase as you level up.');
    
    const shopsText = ref('Shops let you spend your hard-earned GP on rewards! From digital items to real-world treats, shops turn your productivity into tangible benefits. Shop inventories expand as you progress, offering more valuable rewards at higher levels.');
    
    const beastsText = ref('Beasts represent challenges in your life. From procrastination dragons to distraction demons, each has unique patterns and weaknesses. Develop strategies to overcome these beasts and earn special bonuses for conquering particularly difficult challenges.');

    const setSwiperInstance = (swiper) => {
      swiperInstance.value = swiper;
    };

    const handleSlideChange = (swiper) => {
      console.log('Slide changed to:', swiper.activeIndex);
      activeSlideIndex.value = swiper.activeIndex;
    };

    const textComplete = (slideIndex: number) => {
      console.log(`Slide ${slideIndex} completed`);
      slidesCompleted.value[slideIndex] = true;
    };

    const getStarted = () => {
      router.push({ name: 'xp-main' });
    };

    const goToSlide = (index: number) => {
      if (swiperInstance.value) {
        swiperInstance.value.slideTo(index);
      }
    };

    // Initialize the first slide's completion if there's no animation
    onMounted(() => {
      setTimeout(() => {
        if (!slidesCompleted.value[0]) {
          textComplete(0);
        }
      }, 1000);
    });

    return {
      $requireIcon: require.context("@/assets/icons/"),
      modules: [Pagination, Navigation],
      textSpeed,
      introText,
      characterStatsText,
      xpText,
      questsText,
      apText,
      templesText,
      gpText,
      shopsText,
      beastsText,
      activeSlideIndex,
      slidesCompleted,
      handleSlideChange,
      textComplete,
      getStarted,
      setSwiperInstance,
      goToSlide
    };
  }
});
</script>

<style lang="scss" scoped>
.ion-page {
  ion-content {
    .swiper {
      width: 100%;
      height: 70%; /* Reduced height to make room for debug controls */

      .swiper-slide {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 1em 2em;
        height: 100%;

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
    
    .debug-info {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.05);
      padding: 10px;
      font-size: 0.8rem;
      
      .slide-buttons {
        display: flex;
        justify-content: center;
        gap: 5px;
        margin-top: 5px;
      }
    }
  }
}
</style>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-menu-button
            color="primary"
            @click="$fx.ui[$fx.theme.ui].select.play()"
          />
          <ion-icon
            :ios="informationOutline"
            :md="informationSharp"
            class="fa-2x ml-2"
          />
        </ion-buttons>
        <ion-title>
          About XP
        </ion-title>
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
        @slideChange="handleSlideChange"
      >
        <swiper-slide>
          <ion-img
            :src="$requireIcon('./mobile-game.svg')"
            class="slide-image"
          />
          <ion-card class="max-w-xl">
            <ion-card-title>Welcome to XP!</ion-card-title>

            <ion-card-content>
              <ion-text>
                <xp-typing-text
                  ref="slide1Text"
                  :text="welcomeText"
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
          <ion-img
            :src="$requireIcon('./level.svg')"
            class="slide-image"
          />
          <ion-card class="max-w-xl">
            <ion-card-title>Turn Tasks into Quests</ion-card-title>
            <ion-card-content>
              <ion-text>
                <xp-typing-text
                  ref="slide2Text"
                  :text="tasksText"
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
          <ion-img
            :src="$requireIcon('./024-level.svg')"
            class="slide-image"
          />
          <ion-card class="max-w-xl">
            <ion-card-title>Earn Rewards & Gain Levels</ion-card-title>
            <ion-card-content>
              <ion-text>
                <xp-typing-text
                  ref="slide3Text"
                  :text="rewardsText"
                  :speed="textSpeed"
                  :auto-start="activeSlideIndex === 2"
                  :sound-theme="$fx.theme.rpg"
                  sound-type="text"
                  @typing-complete="textComplete(2)"
                ></xp-typing-text>
              </ion-text>
            </ion-card-content>
            <ion-button
              @click="getStarted"
              expand="block"
              color="success"
              class="mb-2 w-1/2 mx-auto"
              :disabled="!slidesCompleted[2]"
            >
              Get Started!
            </ion-button>
          </ion-card>
        </swiper-slide>
      </swiper>
    </ion-content>
  </ion-page>
</template>

<script>
import { defineComponent, ref } from "vue";
// import requireImg from "@/assets/js/requireImg.js";
const requireImg = require.context("@/assets/icons/");
import { useRouter } from 'vue-router';
import { Swiper, SwiperSlide } from "swiper/vue";
// Correct import for Swiper modules (v7+)
import { Pagination, Navigation } from 'swiper';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

// Import our typing text component
import XpTypingText from "@/components/XpTypingText";

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  // IonSlides, // Deprecated
  // IonSlide, // Deprecated
  IonContent,
  IonText,
  IonImg,
  IonIcon,
  IonButtons
} from "@ionic/vue";

import { arrowBack, informationOutline, informationSharp } from "ionicons/icons";

export default defineComponent({
  name: 'XpAbout',
  components: {
    Swiper,
    SwiperSlide,
    IonImg,
    IonText,
    IonButton,
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    XpTypingText,
    IonIcon,
    IonButtons
  },
  setup() {
    const router = useRouter();
    const textSpeed = ref(50); // milliseconds between characters
    const activeSlideIndex = ref(0);
    const slidesCompleted = ref([false, false, false]);
    
    // Text content for each slide
    const welcomeText = ref('Welcome to XP! Your life is an adventure, and this app helps you track your progress, manage your tasks (we call them quests!), and reward yourself along the way. Get ready for a fun and fulfilling journey!');
    const tasksText = ref('XP transforms everyday chores and goals into exciting quests. We\'ve blended the engaging power of gaming with practical task management to create an entertaining platform for your life\'s adventure. Do it for the XP!');
    const rewardsText = ref('Completing quests earns you different kinds of points: AP (Ability Points), GP (Gold Points), and XP (Experience Points)! Use AP to unlock new features, spend GP on real-world rewards you define, and gain XP to level up your character. The more you use the app, the more powerful and rewarding your journey becomes!');
    
    // References to text components
    const slide1Text = ref(null);
    const slide2Text = ref(null);
    const slide3Text = ref(null);

    const handleSlideChange = (swiper) => {
      activeSlideIndex.value = swiper.activeIndex;
      
      // Start typing when slide changes
      if (activeSlideIndex.value === 0 && slide1Text.value && !slidesCompleted.value[0]) {
        slide1Text.value.startTyping();
      } else if (activeSlideIndex.value === 1 && slide2Text.value && !slidesCompleted.value[1]) {
        slide2Text.value.startTyping();
      } else if (activeSlideIndex.value === 2 && slide3Text.value && !slidesCompleted.value[2]) {
        slide3Text.value.startTyping();
      }
    };
    
    const textComplete = (slideIndex) => {
      slidesCompleted.value[slideIndex] = true;
    };

    const getStarted = () => {
      // Navigate to the main part of the app, adjust '/tabs/home' as needed
      router.push({ name: 'xp-profile' });
      // Optionally, set a flag in localStorage/store indicating the intro has been seen
      // localStorage.setItem('introSeen', 'true');
    };

    return {
      arrowBack,
      informationOutline,
      informationSharp,
      requireImg,
      $requireIcon: requireImg,
      modules: [Pagination, Navigation], // Expose Swiper modules
      getStarted, // Expose the navigation method
      textSpeed,
      welcomeText,
      tasksText,
      rewardsText,
      slide1Text,
      slide2Text,
      slide3Text,
      activeSlideIndex,
      handleSlideChange,
      slidesCompleted,
      textComplete
    };
  },
});
</script>

<style lang="scss" scoped>
.ion-page {
  // height: 100vh; // Let ion-content handle height

  ion-content {
    // --background: none; // Remove if you want the swiper background to fill content
    // height: 100vh; // Let content scroll naturally if needed

    .swiper {
      width: 100%;
      height: 100%; // Make swiper fill the content area

      font-size: 1.2rem;
      padding: 2em;
      font-family: sans-serif;


      .swiper-slide {
        display: flex;
        flex-direction: column;
        justify-content: center; // Center content vertically
        align-items: center;
        padding: 1em 2em; // Adjust padding
        /* text-align: center; // Center text within slide */
        height: 100%;

        .slide-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          height: 100%;
          max-width: 600px;
          padding-bottom: 60px;
          /* Space for pagination dots */
        }

        h1 {
          margin-top: 2rem;
          margin-bottom: 1rem;
          font-size: 1.8rem;
        }

        .slide-image {
          width: 45%;
          max-width: 200px;
          max-height: 150px;
          margin: 1rem 0;
          object-fit: contain;
        }

        ion-text {
          margin: 1rem 0 1.5rem;
          width: 100%;
          line-height: 1.5;
          font-family: "StatusPlz";
          text-align: left
        }

        .button-container {
          width: 100%;
          margin-top: 2rem;
          margin-bottom: 3rem;
          /* Extra space above pagination dots */
        }

        .get-started-button {
          max-width: 250px;
          margin: 0 auto;
          --border-radius: 8px;
          font-weight: bold;
          height: 48px;
        }
      }
    }
  }
}

// body {} // Generally avoid styling body directly in component styles

@keyframes slide {
  from {
    background-position: 0 0, 30px 30px;
  }

  to {
    background-position: 0 0, -30px -30px;
  }
}

/* Removed unused styles: main, .right, p, .grid, .column */


.characters figure:hover .box {
  transform: translateY(-0.1em);
}

.box.full {
  width: 100%;
  margin-top: 2em;
  display: block;
}

/* Removed unused styles: .characters, .ness, .paula, .jeff, .poo, .king */
/* Removed custom ion-button styles, using Ionic defaults now */

/* Add Swiper Navigation/Pagination Styles */
:deep(.swiper-button-prev),
:deep(.swiper-button-next) {
  color: #280828;
  /* Match text box color */
}

:deep(.swiper-pagination) {
  bottom: 20px !important;
  /* Ensure pagination is a safe distance from content */
}

:deep(.swiper-pagination-bullet-active) {
  background: #f7e8a8;
  /* Match text box highlight */
}
</style>

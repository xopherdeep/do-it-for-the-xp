<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-title>About XP</ion-title>
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
      >
        <swiper-slide>
          <h1>Welcome to XP!</h1>
          <ion-img :src="$requireIcon('./mobile-game.svg')" />
          <ion-text>
            Welcome to <b>XP</b>! Your life is an adventure, and this app helps you track your progress, manage your
            tasks (we call them quests!), and reward yourself along the way. Get ready for a fun and fulfilling journey!
          </ion-text>
        </swiper-slide>
        <swiper-slide>
          <h1>Turn Tasks into Quests</h1>
          <ion-img :src="$requireIcon('./level.svg')" />
          <ion-text>
            XP transforms everyday chores and goals into exciting quests. We've blended the engaging power of gaming
            with practical task management to create an entertaining platform for your life's adventure. Do it for the
            <b>XP</b>!
          </ion-text>
        </swiper-slide>
        <swiper-slide>
          <h1>Earn Rewards & Gain Levels</h1>
          <ion-img :src="$requireIcon('./024-level.svg')" />
          <ion-text>
            Completing quests earns you different kinds of points: AP (Ability Points), GP (Gold Points), and XP
            (Experience Points)! Use AP to unlock new features, spend GP on real-world rewards you define, and gain XP
            to level up your character. The more you use the app, the more powerful and rewarding your journey becomes!
          </ion-text>
          <ion-button
            @click="getStarted"
            expand="block"
            class="ion-margin-top"
          >
            Get Started!
          </ion-button>
        </swiper-slide>
      </swiper>
    </ion-content>
  </ion-page>
</template>

<script>
import { defineComponent } from "vue";
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
} from "@ionic/vue";

import { arrowBack } from "ionicons/icons";

export default defineComponent({
  name: 'XpAbout',
  components: {
    Swiper,
    SwiperSlide,
    IonImg,
    IonText,
    IonButton, // Added back
    IonPage,
    IonHeader, // Added back
    IonToolbar, // Added back
    IonTitle, // Added back
    IonContent,
  },
  setup() {
    const router = useRouter();

    const getStarted = () => {
      // Navigate to the main part of the app, adjust '/tabs/home' as needed
      router.push('/tabs/home');
      // Optionally, set a flag in localStorage/store indicating the intro has been seen
      // localStorage.setItem('introSeen', 'true');
    };

    return {
      arrowBack,
      requireImg,
      $requireIcon: requireImg,
      modules: [Pagination, Navigation], // Expose Swiper modules
      getStarted, // Expose the navigation method
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
        text-align: center; // Center text within slide

        h1 {
          margin-top: 0; // Adjust spacing if needed
        }

        img {
          width: 60%; // Adjust image size
          max-width: 250px; // Add max-width
          max-height: 200px;
          margin: 1.5em 0; // Adjust margins
        }

        ion-text {
          margin-bottom: 1em; // Add space below text
        }

        ion-button {
          // Ensure button is not overly wide on large screens if needed
          // max-width: 300px;
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


/* EARTHBOUND STYLE CHATBOX */
ion-text {
  /* Reviewing this style - ensure readability */
  min-width: 5em;
  display: inline-block;
  position: relative;
  vertical-align: top;
  background-color: #280828;
  color: #e7e6b3;
  padding: 5px 3px;
  border-radius: 1px;
  transform: translateY(0);
  transition: transform linear 150ms;
  box-shadow:
    0 0 0 5px #383050,
    /* dark grey */
    0 0 0 10px #68d0b8,
    /* minty blue */
    0 0 0 12px #f7e8a8,
    /* white */
    0 0 0 15px #3d3c55;
  /* black */
}

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

:deep(.swiper-pagination-bullet-active) {
  background: #f7e8a8;
  /* Match text box highlight */
}
</style>

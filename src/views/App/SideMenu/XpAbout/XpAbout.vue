<template>
  <ion-page>
    <ion-content>
      <swiper pager="true">
        <swiper-slide>
          <h1>Welcome to XP!</h1>
          <ion-img :src="$requireIcon('./mobile-game.svg')" />
          <ion-text>
            Welcome to <b>XP</b>! Your life is an adventure, and this app helps you track your progress, manage your tasks (we call them quests!), and reward yourself along the way. Get ready for a fun and fulfilling journey!
          </ion-text>
        </swiper-slide>
        <swiper-slide>
          <h1>Turn Tasks into Quests</h1>
          <ion-img :src="$requireIcon('./level.svg')" />
          <ion-text>
            XP transforms everyday chores and goals into exciting quests. We've blended the engaging power of gaming with practical task management to create an entertaining platform for your life's adventure. Do it for the <b>XP</b>!
          </ion-text>
        </swiper-slide>
        <swiper-slide>
          <h1>Earn Rewards & Gain Levels</h1>
          <ion-img :src="$requireIcon('./024-level.svg')" />
          <ion-text>
            Completing quests earns you different kinds of points: AP (Ability Points), GP (Gold Points), and XP (Experience Points)! Use AP to unlock new features, spend GP on real-world rewards you define, and gain XP to level up your character. The more you use the app, the more powerful and rewarding your journey becomes!
          </ion-text>
        </swiper-slide>
      </swiper>
    </ion-content>
  </ion-page>
</template>

<script>
import { defineComponent } from "vue";
// import requireImg from "@/assets/js/requireImg.js";
const requireImg = require.context("@/assets/icons/");
import { Swiper, SwiperSlide } from "swiper/vue";
 // Import Swiper styles
import 'swiper/css';

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonMenuButton,
  IonTitle,
  IonSlides,
  IonSlide,
  IonContent,
  IonText,
  IonImg,
} from "@ionic/vue";

import { arrowBack } from "ionicons/icons";

export default defineComponent({
  name: 'XpAbout', // Add component name
  components: {
    Swiper,
    SwiperSlide,
    IonImg,
    IonText,
    IonButton,
    IonPage,
    // IonSlides and IonSlide are deprecated in Ionic Vue, Swiper is used instead
    // IonSlides,
    // IonSlide,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
  },
  setup() {
    // code
    return {
      arrowBack,
      requireImg,
      // Expose appConfig methods/properties if needed in template
      // For example, if $requireIcon is used:
      $requireIcon: requireImg // Assuming requireImg serves the same purpose
    };
  },
});
</script>

<style lang="scss" src="./_XpAbout.scss" scoped />

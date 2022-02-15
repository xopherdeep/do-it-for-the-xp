import { defineComponent } from "vue";
// import requireImg from "@/assets/js/requireImg.js";
const requireImg = require.context("@/assets/images/icons/");

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
} from "@ionic/vue";

import { arrowBack } from "ionicons/icons";

export default defineComponent({
  components: {
    IonButton,
    IonPage,
    IonSlides,
    IonSlide,
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
    };
  },
});

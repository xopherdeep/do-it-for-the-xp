import { defineComponent } from "vue";
// import requireImg from "@/assets/js/requireImg.js";
const requireImg = require.context("@/assets/images/icons/");
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
  components: {
    Swiper,
    SwiperSlide,
    IonImg,
    IonText,
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

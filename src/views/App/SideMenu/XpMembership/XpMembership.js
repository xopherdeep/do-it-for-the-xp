import { defineComponent } from 'vue'

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonText,
} from '@ionic/vue'

import {
  arrowBack,
  checkmarkCircle,
  stopCircle,
} from "ionicons/icons"

export default defineComponent({
  data() {
    return {
      benefits: [
        "No-Ads",
        "Unlimited Usage",
        "Exclusive Offers",
        "Premium Features",
        "Price Lock Guaranteed",
      ]
    }
  },
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonText,
    IonTitle,
    IonContent
  },
  setup() {
    // code
    return {
      arrowBack,
      checkmarkCircle,

    }
  },
})
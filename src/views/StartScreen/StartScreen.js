import { defineComponent } from 'vue'

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent
} from '@ionic/vue'

import {
  arrowBack
} from "ionicons/icons"

export default defineComponent({
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent
  },
  setup() {
    // code
    return {
      arrowBack
    }
  },
})
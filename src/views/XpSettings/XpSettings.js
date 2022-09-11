import { defineComponent } from 'vue'
import InputSettings from "./components/InputSettings.vue"
const requireIconImg = require.context("@/assets/images/icons/");

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonSelect,
  IonSelectOption,
  IonContent
} from '@ionic/vue'

import {
  arrowBack
} from "ionicons/icons"
import { mapActions } from 'vuex'

export default defineComponent({
  name: 'xp-settings',
  components: {
    InputSettings,
    IonSelect,
    IonSelectOption,
    IonPage,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent
  },
  mounted() {
    this.$fx.ui[this.$fx.theme.ui].options.play()
  },
  setup() {
    // code
    return {
      arrowBack,
      requireIconImg
    }
  },
})
import { defineComponent } from 'vue'

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

export default defineComponent({
  name: 'xp-settings',
  components: {
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
  methods:{
    changeUISound(ev){
      this.$fx.theme.ui = ev.detail.value
    },

    changeRPGSound(ev){
      this.$fx.theme.rpg = ev.detail.value
    }
  },
  setup() {
    // code
    return {
      arrowBack
    }
  },
})
import { defineComponent } from 'vue'

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
} from '@ionic/vue'

import {
} from "ionicons/icons"
import { mapActions } from 'vuex'

export default defineComponent({
  name: 'log-in',
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent
  },
  mounted(){
    this.loginUser()
    // alert();
  },
  methods: {
  },
  setup() {
    // code
    return {
      ...mapActions(['loginUser']),
    }
  },
})
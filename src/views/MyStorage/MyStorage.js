import { defineComponent } from 'vue'
import ionic from "@/assets/js/mixins/ionic";
import {modalController} from "@ionic/vue";
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
import { useRouter } from 'vue-router';

import ModalContent from "./ModalContent.vue"

export default defineComponent({
  name: 'my-storage',
  mixins: [ionic],
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
  },
  data(){
    return {
      isOpen: false 
    }
  },
  ionViewDidEnter(){
    this.openModal()

  },
  methods: {
    didDismiss() {
      this.isOpen = false
      this.router.go(-1)
    },
    async openModal() {
      if(this.isOpen)
        return false

      const modal = await modalController
        .create({
          component: ModalContent,
          initialBreakpoint: 0.9,
          breakpoints: [0, 0.5, 1],
        })

        modal.onDidDismiss().then(this.didDismiss) 

      this.isOpen = true
      return modal.present();
    },
  },
  setup() {
    const router = useRouter()
    return {
      arrowBack,
      router
    }
  },
})
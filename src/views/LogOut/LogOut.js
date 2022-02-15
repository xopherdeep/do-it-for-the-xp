import { defineComponent } from 'vue'

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  alertController
} from '@ionic/vue'

import {
  arrowBack
} from "ionicons/icons"
import { mapActions } from 'vuex'

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
  mounted(){
    this.presentAlertConfirm()
  },
  methods: {
    async presentAlertConfirm() {
      const alert = await alertController.create({
          // cssClass: 'my-custom-class',
          header: 'Log Out?',
          message: 'Are you sure you want to log out? You will have to sign in again using your credentials!!!',
          buttons: [
            {
              text: 'No',
              role: 'cancel',
              cssClass: 'secondary',
              id: 'cancel-button',
              handler: blah => {
                console.log('Confirm Cancel:', blah)
              },
            },
            {
              text: 'Yes',
              id: 'confirm-button',
              handler: () => {
                this.logOutUser()
              },
            },
          ],
        });
      return alert.present();
    },
  },
  setup() {
    // code
    return {
      ...mapActions(['logOutUser']),
      arrowBack
    }
  },
})
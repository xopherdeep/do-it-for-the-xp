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
  data(){
    return {
      tiles:[
        {
          src: '',
          title: 'F.A.Q.s',
          desc: 'Ask a question or post a suggestion. We listen to our parents!'
        },
        {
          src: '',
          title: 'Help Videos',
          desc: 'A quick guide on how to use the app.'
        },
        {
          src: '',
          title: 'User Manual',
          desc: 'Answers to some of the frequently asked questions.'
        },
        {
          src: '',
          title: 'Feature Request',
          desc: 'A good collection of video tutorials.'
        },
        {
          src: '',
          title: 'Ask the developers',
          desc: 'Your opinions matter! Vote of leave a comment.'
        },
    ] 
    }
  },
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
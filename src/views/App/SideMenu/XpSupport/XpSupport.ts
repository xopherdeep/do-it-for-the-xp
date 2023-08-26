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
  data() {
    return {
      tiles: [
        {
          src: '',
          title: 'F.A.Q.s',
          desc: 'Answers to some of the frequently asked questions.',
          icon: 'fa-question'
        },
        {
          src: '',
          title: 'Help Videos',
          desc: 'A good collection of video tutorials.',
          icon: 'fa-video'
        },
        {
          src: '',
          title: 'User Manual',
          desc: 'A quick guide on how to use the app.',
          icon: 'fa-book'
        },
        {
          src: '',
          title: 'Feature Request',
          desc: 'Your opinions matter! Vote or leave a comment.',
          icon: 'fa-tasks'
        },
        {
          src: '',
          title: 'Ask the developers',
          desc: 'Ask a question or post a suggestion. We listen to our parents!',
          icon: 'fa-comments'
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
import { defineComponent } from 'vue'
import { useRouter } from 'vue-router'

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent
} from '@ionic/vue'

export default defineComponent({
  name: 'xp-support',
  data() {
    return {
      tiles: [
        {
          src: '/support/faq',
          title: 'F.A.Q.s',
          desc: 'Answers to some of the frequently asked questions.',
          icon: 'fa-question'
        },
        {
          src: '/support/help-videos',
          title: 'Help Videos',
          desc: 'A good collection of video tutorials.',
          icon: 'fa-video'
        },
        {
          src: '/support/user-manual',
          title: 'User Manual',
          desc: 'A quick guide on how to use the app.',
          icon: 'fa-book'
        },
        {
          src: '/support/feature-request',
          title: 'Feature Request',
          desc: 'Your opinions matter! Vote or leave a comment.',
          icon: 'fa-tasks'
        },
        {
          src: '/support/contact',
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
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent
  },
  setup() {
    const router = useRouter();
    
    const navigateTo = (path: string) => {
      console.log('Navigating to:', path);
      router.push(path);
    };
    
    return {
      navigateTo
    }
  },
})

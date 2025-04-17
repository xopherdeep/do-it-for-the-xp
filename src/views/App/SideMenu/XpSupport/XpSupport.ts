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
  IonCardContent,
  IonIcon
} from '@ionic/vue'

import {
  helpOutline,
  helpSharp
} from 'ionicons/icons'

export default defineComponent({
  name: 'xp-support',
  data() {
    const tiles = [
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
      }
    ];

    // Add dev tools tile only in development mode
    if (process.env.NODE_ENV === 'development') {
      tiles.push({
        src: '/support/dev-tools',
        title: 'Developer Tools',
        desc: 'Access developer tools and demos for testing.',
        icon: 'fa-tools'
      });
    }

    return {
      tiles
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
    IonCardContent,
    IonIcon
  },
  setup() {
    const router = useRouter();
    
    const navigateTo = (path: string) => {
      console.log('Navigating to:', path);
      router.push(path);
    };
    
    return {
      navigateTo,
      helpOutline,
      helpSharp
    }
  },
})

import { defineComponent } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/lib/store/stores/game'
import { alertController, toastController } from '@ionic/vue'
import debug from '@/lib/utils/debug'

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
import Ionic from '@/lib/mixins/ionic'

export default defineComponent({
  name: 'xp-support',
  mixins: [Ionic],
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

    return {
      tiles,
      helpIconClicks: 0
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
    const gameStore = useGameStore();

    const navigateTo = (path: string) => {
      debug.log('Navigating to:', path);
      router.push(path);
    };

    return {
      navigateTo,
      helpOutline,
      helpSharp,
      gameStore
    }
  },
  mounted() {
    // Check if dev mode was previously enabled
    const savedDevMode = localStorage.getItem('xp-dev-mode') === 'true';
    if (savedDevMode && !this.gameStore.devMode) {
      this.gameStore.setDevMode(true);
    }

    // Add dev tools tile if dev mode is enabled
    if (this.gameStore.devMode) {
      this.tiles.push({
        src: '/support/dev-tools',
        title: 'Developer Tools',
        desc: 'Access developer tools and demos for testing.',
        icon: 'fa-construction'
      });
    }
  },
  methods: {
    onHelpIconClick() {
      this.helpIconClicks++;

      // Play a subtle sound effect on each click
      this.play$fx("select");

      // After 7 clicks, show the dev mode confirmation
      if (this.helpIconClicks === 7) {
        this.showDevModeConfirmation();
        this.helpIconClicks = 0; // Reset counter
      }
    },

    async showDevModeConfirmation() {
      const isDevMode = this.gameStore.devMode;

      const alert = await alertController.create({
        backdropDismiss: false,
        header: isDevMode ? 'Disable Developer Mode?' : 'Enable Developer Mode?',
        message: isDevMode
          ? 'Are you sure you want to disable developer tools?'
          : 'This enables additional developer features for advanced users.',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: isDevMode ? 'Disable' : 'Enable',
            handler: () => {
              const newMode = !isDevMode;
              this.gameStore.setDevMode(newMode);
              localStorage.setItem('xp-dev-mode', newMode.toString());

              // If enabling dev mode, refresh tiles to show dev tools option
              if (newMode) {
                this.tiles = [...this.tiles, {
                  src: '/support/dev-tools',
                  title: 'Developer Tools',
                  desc: 'Access developer tools and demos for testing.',
                  icon: 'fa-tools'
                }];
              } else {
                // If disabling, remove the dev tools option
                this.tiles = this.tiles.filter(tile => tile.src !== '/support/dev-tools');
              }

              // Show toast notification
              this.showDevModeToast(newMode);
            }
          }
        ]
      });

      await alert.present();
    },

    async showDevModeToast(isEnabled: boolean) {
      const toast = await toastController.create({
        message: isEnabled ? '🛠️ Developer Mode Enabled' : '🔒 Developer Mode Disabled',
        duration: 2000,
        position: 'bottom',
        color: isEnabled ? 'success' : 'medium',
        buttons: [
          {
            text: 'OK',
            role: 'cancel'
          }
        ]
      });

      await toast.present();
    }
  }
})

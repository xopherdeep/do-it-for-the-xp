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
// The auto-bump workflow rewrites package.json's version on every push to master.
import packageInfo from '@/../package.json'

// Developer tools are only available outside production builds
const devToolsAvailable = process.env.NODE_ENV !== 'production';

export default defineComponent({
  name: 'xp-support',
  mixins: [Ionic],
  data() {
    const tiles: Array<{ src: string; title: string; desc: string; icon: string; version?: string }> = [
      {
        src: '/support/user-manual',
        title: 'User Manual',
        desc: 'How quests, battles, powers and shops work.',
        icon: 'fa-book'
      },
      {
        src: '/support/faq',
        title: 'F.A.Q.',
        desc: 'Quick answers for Game Masters and heroes.',
        icon: 'fa-question'
      },
      {
        src: '/support/feature-request',
        title: 'Feature Requests',
        desc: 'Ask for what you want next on the Town Hall board.',
        icon: 'fa-tasks'
      },
      {
        src: '/support/contact',
        title: 'Ask the Developers',
        desc: 'Questions, bugs and feedback.',
        icon: 'fa-comments',
        version: packageInfo.version
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
    const shouldRestoreDevMode = devToolsAvailable && savedDevMode && !this.gameStore.devMode;
    if (shouldRestoreDevMode) {
      this.gameStore.setDevMode(true);
    }

    // Add dev tools tile if dev mode is enabled
    const shouldShowDevToolsTile = devToolsAvailable && this.gameStore.devMode;
    if (shouldShowDevToolsTile) {
      this.tiles.push({
        src: '/support/dev-tools',
        title: 'Developer Tools',
        desc: 'Developer tools and demos for testing.',
        icon: 'fa-tools'
      });
    }
  },
  methods: {
    onHelpIconClick() {
      this.helpIconClicks++;

      // Play a subtle sound effect on each click
      this.play$fx("select");

      // After 7 clicks, show the dev mode confirmation
      const isSeventhClick = this.helpIconClicks === 7;
      if (isSeventhClick) {
        this.showDevModeConfirmation();
        this.helpIconClicks = 0; // Reset counter
      }
    },

    async showDevModeConfirmation() {
      if (!devToolsAvailable) return;

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
                  desc: 'Developer tools and demos for testing.',
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

// Must run before anything loads a chunk; see publicPath.ts
import './publicPath'

// FRAMEWORK LIBS
import { createApp } from 'vue'
import { IonicVue } from '@ionic/vue';

// PLUGINS
import Vue3AutoCounter from 'vue3-autocounter';
import Countdown from 'vue3-flip-countdown'
import XpGp from './components/atoms/Currency/XpGp.vue'
import XpLandmarkBadge from './components/atoms/Badge/XpLandmarkBadge.vue'
import XpLoading from './components/molecules/Loading'
import XpTempleModel from './components/organisms/TempleModel/XpTempleModel.vue'
import XpBuildingModel from './components/organisms/BuildingModel/XpBuildingModel.vue'
import XpStageModel from './components/organisms/StageModel/XpStageModel.vue'
import XpTravelingMerchant from './components/organisms/TravelingMerchant/XpTravelingMerchant.vue'

import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import VueVirtualScroller from 'vue-virtual-scroller';

// XP APP
import App from './app/App.vue'
import appConfig from "./app.config"

// ROUTER & STORE
import { createAppRouter as useRouter } from './router';

import { AudioEnginePlugin } from './lib/engine/audio/plugin';

// GP System
import { GPService } from './lib/services/gp';

// Ability System
import { AbilityService } from '@/lib/services/abilities';
import { AbilitiesDb, abilitiesStorage } from '@/lib/databases/AbilitiesDb';

// Accessibility fixes
import { fixAriaHiddenFocusIssues, preventIOSZoom } from '@/lib/utils/a11yUtils';

// Pinia
import { createPinia } from 'pinia';
import { useProStore } from '@/lib/store/stores/pro';

// Title
const TITLE = 'Do it for the XP';
document.title = TITLE;

// Set up user interaction detection for audio playback
document.addEventListener('click', () => {
  document.documentElement.setAttribute('data-user-interacted', 'true');

  // Play any pending audio that was attempted before user interaction
  if (window._pendingAudioPlay) {
    // Clear the flag
    window._pendingAudioPlay = false;
  }
}, { once: true });

// Apply accessibility fixes for aria-hidden issues
fixAriaHiddenFocusIssues();

// Prevent iOS zoom on double tap
preventIOSZoom();


function readyRouterMountApp() {
  const router = useRouter();
  const app = createApp(App)
    .component('vue3-autocounter', Vue3AutoCounter)
    .component('xp-loading', XpLoading)
    .component('xp-gp', XpGp)
    .component('xp-landmark-badge', XpLandmarkBadge)
    .component('xp-temple-model', XpTempleModel)
    .component('xp-building-model', XpBuildingModel)
    .component('xp-stage-model', XpStageModel)
    .component('xp-traveling-merchant', XpTravelingMerchant)
    // .component('RecycleScroller', RecycleScroller)
    .use(VueVirtualScroller)
    .use(Countdown)
    .use(IonicVue, {
      mode: 'md',
      // Alerts and toasts carry small bits of markup (<strong>, <br>); without this Ionic prints the tags
      innerHTMLTemplatesEnabled: true,
      // animated: true,
      swipeBackEnabled: false,
      // backButtonText: '',
      // backButtonIcon: 'chevron-back',
      // routerAnimation: undefined,
    })
    .use(createPinia())
    .use(router)
    .use(AudioEnginePlugin);

  router.afterEach((to) => {
    document.title = (to.meta?.title as string) || TITLE;
  });

  // Initialize the GPSystem// Initialize Services
  GPService.initialize();

  // XP Pro: load the cached license and recheck it when the offline rules say so (never blocks the app)
  useProStore().init().catch(() => undefined);

  // Initialize the AbilitySystem
  const abilitiesDb = new AbilitiesDb(abilitiesStorage);
  AbilityService.initialize(abilitiesDb);

  Object.assign(app.config.globalProperties, appConfig);

  const mountApp = () => app.mount('#app');
  router.isReady().then(mountApp);
}

// Global Console Helper for Testing
import { useUserStore } from './lib/store/stores/user';
import debug from './lib/utils/debug';
// Extend window interface
declare global {
  interface Window {
    unlockPegasus: (index: number) => void;
  }
}

// Console cheat for development builds only
if (process.env.NODE_ENV !== 'production') {
  window.unlockPegasus = (index: number) => {
    const store = useUserStore();
    if (store.currentUser.id) {
      store.unlockPegasus(store.currentUser.id, index);
      debug.log(`%c 🦄 Pegasus #${index + 1} Unlocked!`, 'color: #ff00ff; font-weight: bold; font-size: 14px;');
    } else {
      debug.warn("No user logged in.");
    }
  };
}

readyRouterMountApp()

// Refresh the temples shipped in code in this device's TempleDb before any temple opens (a Game Master's edited copy is kept)
import('@/lib/engine/core/dungeons/importAllTemples').then(({ ensureBuiltInTemples }) => ensureBuiltInTemples()).catch(() => undefined);

// E2E seam, development builds only: the Cypress suite seeds every store from a backup file and
// signs a hero in without driving the whole onboarding flow (tests/e2e/support/commands.js).
if (process.env.NODE_ENV !== 'production') {
  import('./lib/services/core/BackupService').then(({ backupService }) => {
    (window as any).__xp = {
      restoreBackup: (backup: unknown) => backupService.restoreBackup(backup as any),
      // Restoring a backup is Game Master only, so a spec signs in as a throwaway Game Master first.
      // The profile lives in memory only and the restore that follows drops it.
      signInSeedGameMaster: () => {
        const store = useUserStore();
        const gm = { id: 'seed-game-master', name: { nick: 'Seed GM' }, isAdult: true, passcode: '0000' };
        store.addUser(gm);
        store.loginUser(gm);
      },
      loginUser: (userId: string) => {
        const store = useUserStore();
        const user = store.users[userId];
        if (user) store.loginUser(user);
        return Boolean(user);
      },
      getUser: (userId: string) => JSON.parse(JSON.stringify(useUserStore().users[userId] ?? null)),
    };
  });
}

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
import XpBackButton from './components/atoms/BackButton/XpBackButton.vue'
import XpLoading from './components/molecules/Loading'
import XpTempleModel from './components/organisms/TempleModel/XpTempleModel.vue'
import XpBuildingModel from './components/organisms/BuildingModel/XpBuildingModel.vue'
import XpStageModel from './components/organisms/StageModel/XpStageModel.vue'
import XpTravelingMerchant from './components/organisms/TravelingMerchant/XpTravelingMerchant.vue'
import XpDraggableSpot from './components/organisms/DraggableSpot/XpDraggableSpot.vue'
import XpAppBottomNav from './components/organisms/BottomNav/XpAppBottomNav.vue'
import XpAppHeader from './components/organisms/XpApp/XpAppHeader.vue'
import XpAppSection from './components/organisms/XpApp/XpAppSection.vue'
import XpAppRow from './components/organisms/XpApp/XpAppRow.vue'
import XpAppChip from './components/organisms/XpApp/XpAppChip.vue'
import XpAppChips from './components/organisms/XpApp/XpAppChips.vue'
import XpAppEmpty from './components/organisms/XpApp/XpAppEmpty.vue'

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

// Analytics
import { startAnalytics } from './lib/services/analytics/analytics';

// Ability System
import { AbilityService } from '@/lib/services/abilities';
import { AbilitiesDb, abilitiesStorage } from '@/lib/databases/AbilitiesDb';

// Accessibility fixes
import { fixAriaHiddenFocusIssues, preventIOSZoom } from '@/lib/utils/a11yUtils';
import { startInstallWatch } from '@/lib/services/pwa/installApp';
import { requestPersistentStorage } from '@/lib/services/core/persistentStorage';

// Pinia
import { createPinia } from 'pinia';
import { useProStore } from '@/lib/store/stores/pro';
import { listenForStreakChests } from '@/lib/services/streaks/StreakService';

// Capacitor (the phone apps)
import { Capacitor } from '@capacitor/core';

// Family Registration: WordPress's answer to the Town Hall (see pendingReturn.ts)
import { captureTownHallReturn } from '@/lib/services/townhall/pendingReturn';

// Title
const TITLE = 'Do it for the XP';
document.title = TITLE;

// Suppress unhandled autoplay rejections from triggering dev server error overlay
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const isAutoplayBlocked =
    reason?.name === 'NotAllowedError' ||
    (typeof reason?.message === 'string' &&
      (reason.message.includes('interact') || reason.message.includes('user activation')));

  if (isAutoplayBlocked) {
    event.preventDefault();
  }
});

// Set up user interaction detection for audio playback
const markUserInteracted = () => {
  document.documentElement.setAttribute('data-user-interacted', 'true');

  const hasPendingAudioPlay = Boolean(window._pendingAudioPlay);
  if (hasPendingAudioPlay) {
    window._pendingAudioPlay = false;
  }
};
document.addEventListener('click', markUserInteracted, { once: true });
document.addEventListener('keydown', markUserInteracted, { once: true });
document.addEventListener('touchstart', markUserInteracted, { once: true });

// Apply accessibility fixes for aria-hidden issues
fixAriaHiddenFocusIssues();

// Prevent iOS zoom on double tap
preventIOSZoom();

// Catch Chrome's install prompt before the side menu exists; see installApp.ts
startInstallWatch();

// Phone apps: WordPress sends the parent back from the in-app browser through the app's own address (see nativeReturn.ts).
// Registered once; the store keeps the result and the Town Hall page, when it is open, has the clerk say how it went.
function listenForTownHallReturn() {
  if (!Capacitor.isNativePlatform()) return;
  Promise.all([import('@/lib/services/townhall/nativeReturn'), import('@/lib/store/stores/townHall')])
    .then(([{ listenForTownHallReturn: listen }, { useTownHallStore }]) =>
      listen((search) => {
        const townHall = useTownHallStore();
        townHall.completeLink(search).catch((error) => {
          debug.error('Town Hall could not finish the registration:', error);
          townHall.lastLinkResult = 'failed';
        });
      })
    )
    .catch((error) => debug.warn('The Town Hall return is unavailable', error));
}


function readyRouterMountApp() {
  // WordPress sends the parent back with the new password in the address: it leaves the address bar and the history
  // before the router is made, so vue-router never memorises it (its history reads the address when it is created)
  captureTownHallReturn();

  const router = useRouter();
  const app = createApp(App)
    .component('vue3-autocounter', Vue3AutoCounter)
    .component('xp-loading', XpLoading)
    .component('xp-gp', XpGp)
    .component('xp-landmark-badge', XpLandmarkBadge)
    .component('xp-back-button', XpBackButton)
    .component('xp-temple-model', XpTempleModel)
    .component('xp-building-model', XpBuildingModel)
    .component('xp-stage-model', XpStageModel)
    .component('xp-traveling-merchant', XpTravelingMerchant)
    .component('xp-draggable-spot', XpDraggableSpot)
    .component('xp-app-bottom-nav', XpAppBottomNav)
    .component('xp-app-header', XpAppHeader)
    .component('xp-app-section', XpAppSection)
    .component('xp-app-row', XpAppRow)
    .component('xp-app-chip', XpAppChip)
    .component('xp-app-chips', XpAppChips)
    .component('xp-app-empty', XpAppEmpty)
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

  // Google Analytics, production builds only: gtag on the web, Firebase in the Android app
  startAnalytics(router);

  // Initialize the GPSystem// Initialize Services
  GPService.initialize();

  // XP Pro: load the cached license and recheck it when the offline rules say so (never blocks the app)
  useProStore().init().catch(() => undefined);

  // Keep the browser from evicting the family's only copy of their data
  void requestPersistentStorage();

  // Streak chests: paid whenever a quest pays and a run reaches 3, 7, 14, 30 days
  listenForStreakChests();

  // Family registration from the phone apps comes back through the app's own address
  listenForTownHallReturn();

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
    const userId = store.currentUser.id;
    if (userId) {
      store.unlockPegasus(userId, index);
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
  Promise.all([import('./lib/services/core/BackupService'), import('./lib/utils/e2eProjectSeam')]).then(([{ backupService }, { projectTowerSeam }]) => {
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
      // Reads and claims for the project tower walk (tests/e2e/specs/project-tower.spec.js)
      ...projectTowerSeam(),
    };
  });
}

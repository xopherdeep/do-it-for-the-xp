// FRAMEWORK LIBS
import { createApp } from 'vue'
import { IonicVue } from '@ionic/vue';

// PLUGINS
import Vue3AutoCounter from 'vue3-autocounter';
import Countdown from 'vue3-flip-countdown'
import XpGp from './components/atoms/Currency/XpGp.vue'
import XpLoading from './components/molecules/Loading'

// Virtual Scroller
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import VueVirtualScroller from 'vue-virtual-scroller';

// XP APP
import App from './views/App/App.vue'
import appConfig from "./app.config"

// ROUTER & STORE
import useRouter from './router/router';

// Audio Engine
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
    // .component('RecycleScroller', RecycleScroller)
    .use(VueVirtualScroller)
    .use(Countdown)
    .use(IonicVue,{
      mode: 'md',
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
  
  // Initialize the AbilitySystem
  const abilitiesDb = new AbilitiesDb(abilitiesStorage);
  AbilityService.initialize(abilitiesDb);

  Object.assign(app.config.globalProperties, appConfig);

  const mountApp = () => app.mount('#app');
  router.isReady().then(mountApp);
}

// Global Console Helper for Testing
import { useUserStore } from './lib/store/stores/user';
// Extend window interface
declare global {
  interface Window {
    unlockPegasus: (index: number) => void;
  }
}

// Add function to window
window.unlockPegasus = (index: number) => {
  const store = useUserStore();
  if (store.currentUser.id) {
    store.unlockPegasus(store.currentUser.id, index);
    // eslint-disable-next-line no-console
    console.log(`%c 🦄 Pegasus #${index + 1} Unlocked!`, 'color: #ff00ff; font-weight: bold; font-size: 14px;');
  } else {
    // eslint-disable-next-line no-console
    console.warn("No user logged in.");
  }
};

readyRouterMountApp()

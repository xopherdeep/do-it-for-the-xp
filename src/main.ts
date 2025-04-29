// FRAMEWORK LIBS
import { createApp } from 'vue'
import { IonicVue } from '@ionic/vue';

// PLUGINS
import Vue3AutoCounter from 'vue3-autocounter';
import Countdown from 'vue3-flip-countdown'
import XpGp from './components/XpGp'
import XpLoading from './components/XpLoading'

// Virtual Scroller
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import VueVirtualScroller, { RecycleScroller } from 'vue-virtual-scroller';

// XP APP
import App from './views/App/App.vue'
import appConfig from "./app.config"

// ROUTER & STORE
import useRouter from './router/router';
import store from './store';

// Audio Engine
import { AudioEnginePlugin } from './lib/engine/audio/plugin';

// GP System
import { GPSystem } from './lib/engine/core/GPSystem';

// Ability System
import { initializeAbilitySystem } from './lib/engine/core/abilities';

// Accessibility fixes
import { fixAriaHiddenFocusIssues } from '@/lib/utils/a11yUtils';

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


function readyRouterMountApp() {
  const router = useRouter(store);
  const app = createApp(App)
    .component('vue3-autocounter', Vue3AutoCounter)
    .component('xp-loading', XpLoading)
    .component('xp-gp', XpGp)
    .component('RecycleScroller', RecycleScroller)
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
    .use(store)
    .use(router)
    .use(AudioEnginePlugin);

  router.afterEach((to) => {
    document.title = (to.meta?.title as string) || 'Do it for the XP';
  });

  // Initialize the GPSystem with the Vuex store
  GPSystem.initialize(store);
  
  // Initialize the AbilitySystem
  initializeAbilitySystem();

  Object.assign(app.config.globalProperties, appConfig);

  const mountApp = () => app.mount('#app');
  router.isReady().then(mountApp);
}

document.title = 'Do it for the XP';
readyRouterMountApp()

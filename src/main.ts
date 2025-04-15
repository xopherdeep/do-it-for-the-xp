// FRAMEWORK LIBS
import { createApp } from 'vue'
import { IonicVue } from '@ionic/vue';

// PLUGINS
import Vue3Autocounter from 'vue3-autocounter';
import Countdown from 'vue3-flip-countdown'
import XpGp from './components/XpGp'
import XpLoading from './components/XpLoading'

// V-CALENDAR STYLES - Removed failing import. Styling needs investigation.
// import 'v-calendar/style.css';


// XP APP
import App from './views/App/App.vue'
import appConfig from "./app.config"

// ROUTER & STORE
import useRouter from './router/router';
import store from './store';
// import 'vue-ionicons/ionicons.css'
// import "@fortawesome/fontawesome-pro/css/fontawesome.css";
// import "@fortawesome/fontawesome-pro/css/regular.css";
// import "@fortawesome/fontawesome-pro/css/solid.css";
// import "@fortawesome/fontawesome-pro/css/light.css";
// import "@fortawesome/fontawesome-pro/css/duotone.css";
// import "./theme/variables.css";
// import "./theme/rpg.scss";
// import "./styles/app.css";
// import "./styles/tailwind.css";
// import VueGtag from "vue-gtag";
// import mitt from "mitt";

// Set up user interaction detection for audio playback
document.addEventListener('click', () => {
  document.documentElement.setAttribute('data-user-interacted', 'true');
  
  // Play any pending audio that was attempted before user interaction
  if (window._pendingAudioPlay) {
    // Clear the flag
    window._pendingAudioPlay = false;
  }
}, { once: true });

// Create the emitter for the events
//const emitter = mitt();

function readyRouterMountApp() {
  const router = useRouter(store);
  const app = createApp(App)
    .component('vue3-autocounter', Vue3Autocounter)
    .component('xp-loading', XpLoading)
    .component('xp-gp', XpGp)
    // .use(setupCalendar)
    .use(Countdown)
    .use(IonicVue)
    .use(store)
    .use(router);

  Object.assign(app.config.globalProperties, appConfig);

  const mountApp = () => app.mount('#app');
  router.isReady().then(mountApp);
}

readyRouterMountApp()

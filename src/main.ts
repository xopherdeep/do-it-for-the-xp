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

function readyRouterMountApp() {
  const router = useRouter(store);
  const app = createApp(App)
    .component('vue3-autocounter', Vue3Autocounter)
    .component('xp-loading', XpLoading)
    .component('xp-gp', XpGp)
    .use(Countdown)
    .use(IonicVue)
    .use(store)
    .use(router);

  Object.assign(app.config.globalProperties, appConfig);

  const mountApp = () => app.mount('#app');
  router.isReady().then(mountApp);
}

readyRouterMountApp()

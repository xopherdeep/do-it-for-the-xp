import { createApp } from 'vue'
import App from './views/App/App.vue'
import createRouter from './router';
import store from './store';

import { IonicVue } from '@ionic/vue';

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';
import '@/assets/fonts/font-awesome/css/all.css'

import $fx from "@/assets/js/fx"
import Vue3Autocounter from 'vue3-autocounter';
import Countdown from 'vue3-flip-countdown'
/* Theme variables */
import './theme/variables.css';
import * as IonComponents from '@ionic/vue';
import { useRoute } from 'vue-router';


const router = createRouter(store)

const app = createApp(App)
  .component('vue3-autocounter', Vue3Autocounter)
  .use(IonicVue)
  .use(store)
  .use(Countdown)
  .use(router);

// Object.keys(IonComponents).forEach(key => {
//     if (/^Ion[A-Z]\w+$/.test(key)) {
//         app.component(key, IonComponents[key]);
//     }
// });
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $fx: any
  }
}


// use $store like in Vue2
app.config.globalProperties = {
  ...app.config.globalProperties,
  $fx,
  $requireAvatar: require.context("@/assets/images/avatars/"),
  $requireImg: require.context("@/assets/images/"),
  $router: router,
  $store: store,
  play$fx: (fx='select')=>{
    if($fx.ui[$fx.theme.ui][fx])
      $fx.ui[$fx.theme.ui][fx].play()
  },
  $historyCount: window.history.length
};

router.isReady().then(() => {
  app.mount('#app');
});
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
/* Theme variables */
import './theme/variables.css';

const router = createRouter(store)

const app = createApp(App)
  .component('vue3-autocounter', Vue3Autocounter)
  .use(IonicVue)
  .use(store)
  .use(router);

// use $store like in Vue2
app.config.globalProperties = {
  ...app.config.globalProperties,
  $store: store,
  $requireImg: require.context("@/assets/images/"),
  $fx
};

router.isReady().then(() => {
  app.mount('#app');
});
import { createApp } from 'vue'
import { IonicVue } from '@ionic/vue';
import createRouter from './router/router';
import store from './store';
import $fx from "@/assets/fx"
import Vue3Autocounter from 'vue3-autocounter';
import Countdown from 'vue3-flip-countdown'
import App from './App/App.vue'

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


app.config.globalProperties = {
  ...app.config.globalProperties,
  $fx,
  $requireAvatar: require.context("@/assets/images/avatars/"),
  $requireImg: require.context("@/assets/images/"),
  $router: router,
  // TODO: update, using $store like in Vue2 atm
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
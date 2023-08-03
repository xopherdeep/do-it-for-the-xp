import { createApp } from 'vue'
import { IonicVue } from '@ionic/vue';
import createRouter from './router/router';
import store from './store';
import $fx from "@/assets/fx"
import Vue3Autocounter from 'vue3-autocounter';
import Countdown from 'vue3-flip-countdown'
import App from './views/App/App.vue'

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


app.config.globalProperties = {
  ...app.config.globalProperties,
  $fx,
  $requireAvatar: require.context("@/assets/images/avatars/"),
  $requireImg: require.context("@/assets/images/"),
  $requireIcon: require.context("@/assets/icons/"),
  $router: router,
  // TODO: update, using $store like in Vue2 atm
  $store: store,
  play$fx: (fx='select')=>{
    const { ui, theme: { ui: themeUi } }  = $fx
    const soundFx = ui[themeUi][fx]

    if(soundFx)
      soundFx.play()
  },
  $historyCount: window.history.length
};

router.isReady().then(() => {
  app.mount('#app');
});
import { alertController } from '@ionic/vue'
import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import routesArray from "./routes"
const routes: Array<RouteRecordRaw> = routesArray

async function logoutAlert(onConfirm, onCancel) {
  const logOutAlert = await alertController.create({
    header: 'Log Out?',
    message: 'Are you sure you want to log out? You will have to sign in again using your credentials!!!',
    buttons: [
      {
        text: 'No',
        role: 'cancel',
        cssClass: 'secondary',
        id: 'cancel-button',
        handler: onCancel,
      },
      {
        text: 'Yes',
        id: 'confirm-button',
        handler: onConfirm,
      },
    ],
  });
  logOutAlert.present();
}


const useRouter = (store) => {
  const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),
    routes
  })

  router.beforeEach((to, from, next) => {
    // log-out safe gaurd
    if (to.name === 'log-out' && !to.params.confirm) {
      const onConfirm = () => {
        store.dispatch('logOutUser')
        router.push({ name: 'log-out', params: { confirm: 1 } })
      }
      // .then(toLogout) 
      logoutAlert(onConfirm, null);
      return next(false);
    }

    const { theme, bgm: { $fx }, audio } = store.state
    const { BGM } = $fx.rpg[theme.rpg]
    // Music environment 

    // Battle safe gaurd
    switch (to.name) {
      case 'log-in':
      case 'log-out':
      case 'switch-profile':
      case 'my-home':
        store.dispatch('stopBattleTimer')
        break;

      default:
        store.dispatch('startBattleTimer')
        break;
    }

    if (store.getters.battleState('active')) {
      next(false)
    } else if (to.name === 'log-in') {
      next()
      // return true
      // next() // login route is always  okay (we could use the requires auth flag below). prevent a redirect loop
    } else if (to.meta && to.meta.requiresAuth === false) {
      next()
    } else if (store.getters.isLoggedIn) {
      next()
    } else {
      next({ name: 'log-in' })
      // return 'log-in'  
    }

    const startDelay = 333;
    const track = 0;
    const saveBookmark = false;

    switch (to.name) {
      case 'log-in':
      case 'log-out':
        store.dispatch('changeBGM', {
          tracks: BGM.startScreen,
          track,
          startDelay,
          saveBookmark,
        })
        break;
      case 'switch-profile':
        store.dispatch('changeBGM', {
          tracks: BGM.chooseFile,
          track,
          startDelay,
          saveBookmark,
        })
        break;
      case 'my-home':
        store.dispatch('changeBGM', {
          tracks: BGM.home,
          track,
          startDelay,
        })
        break;
      case 'world-map':
        store.dispatch('changeBGM', {
          tracks: BGM.world,
          track,
          startDelay,
          saveBookmark,
        })
        break;
      case 'my-dashboard':
        store.dispatch('changeBGM', {
          tracks: BGM.battle,
          track: Math.floor(Math.random() * BGM.battle.length),
          startDelay: store.state.battle.bgmWaitToStart,
          saveBookmark: true
        })
        break;
      case 'shop':
        store.dispatch('changeBGM', {
          tracks: BGM.shop,
          track,
          saveBookmark,
          startDelay
        })
        break;

      default:
        break;
    }

  })

  return router
}

export default useRouter 
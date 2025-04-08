import { Router } from 'vue-router';
import { alertController } from '@ionic/vue';

/**
 * Creates a logout confirmation alert
 */
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

/**
 * Applies all router guards to the provided router instance
 */
export function useRouterGuards(router: Router, store: any) {
  router.beforeEach((to, from, next) => {
    // log-out safe guard
    if (to.name === 'log-out' && !to.params.confirm) {
      const onConfirm = () => {
        store.dispatch('logOutUser')
        router.push({ name: 'log-out', params: { confirm: 1 } })
      }
      logoutAlert(onConfirm, null);
      return next(false);
    }

    const { theme, bgm: { $fx }, audio } = store.state
    const { BGM } = $fx.rpg[theme.rpg]
    
    // Battle safe guard
    switch (to.name) {
      case 'home-town':
      case 'world-map':
        store.dispatch('startBattleTimer')
        break;

      default:
        store.dispatch('stopBattleTimer')
        break;
    }

    if (store.getters.battleState('active')) {
      next(false)
    } else if (to.name === 'log-in') {
      next()
    } else if (to.meta && to.meta.requiresAuth === false) {
      next()
    } else if (store.getters.isLoggedIn) {
      next()
    } else {
      next({ name: 'log-in' })
    }

    // Handle BGM changes based on route
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
      case 'battle-ground':
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
  });
}

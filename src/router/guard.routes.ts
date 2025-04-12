import { Router, NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { Store } from 'vuex';
import { alertController } from '@ionic/vue';
import { RootState } from '@/types/store.types'; // Removed unused import

/**
 * Creates a logout confirmation alert
 */
// Add types for callbacks
async function logoutAlert(onConfirm: () => void, onCancel?: (() => void) | undefined) {
  const logOutAlert = await alertController.create({
    header: 'Log Out?',
    message: 'Are you sure you want to log out? You will have to sign in again using your credentials.', // Removed extra exclamation marks
    buttons: [
      {
        text: 'No',
        role: 'cancel',
        cssClass: 'secondary',
        id: 'cancel-button',
        handler: onCancel ? () => onCancel() : undefined, // Removed unused parameter
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
// Type the store parameter
export function useRouterGuards(router: Router, store: Store<RootState>) {
  // Type the navigation guard parameters
  router.beforeEach((to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
    // log-out safe guard
    if (to.name === 'log-out' && !to.params.confirm) {
      const onConfirm = () => {
        store.dispatch('logOutUser'); // Consider adding type safety for action names later
        // Ensure 'confirm' param is expected as number or string based on usage
        router.push({ name: 'log-out', params: { confirm: '1' } }); // Use string '1' for consistency if param is string
      };
      logoutAlert(onConfirm, undefined); // Changed from null to undefined
      return next(false); // Explicitly return false
    }

    // Accessing state - RootState needs definition for theme, bgm
    const state = store.state as any;
    const theme = state.theme;
    const bgm = state.bgm;

    // Check if objects exist before destructuring
    const fx = bgm?.$fx;
    const rpgTheme = theme?.rpg;
    const BGM = fx?.rpg?.[rpgTheme]?.BGM;

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

    // Use getters with type safety (requires typed getters later)
    if (store.getters.battleState('active')) { // Assuming battleState getter exists and returns boolean
      next(false);
    } else if (to.name === 'log-in') {
      next();
    } else if (to.meta && to.meta.requiresAuth === false) {
      next();
    } else if (store.getters.isLoggedIn) { // Assuming isLoggedIn getter exists and returns boolean
      next();
    } else {
      next({ name: 'log-in' });
    }

    // Handle BGM changes based on route
    const startDelay = 333;
    const track = 0; // Default track index

    // Ensure BGM object exists before trying to access tracks
    if (!BGM) {
      // Skip BGM changes if data is missing
      return;
    }

    let bgmPayload: any = null; // Use a specific type later

    switch (to.name) {
      case 'log-in':
      case 'log-out':
        bgmPayload = {
          tracks: BGM.startScreen, // Assuming BGM.startScreen exists
          track,
          startDelay,
          saveBookmark: false, // Explicitly false here
        };
        break;
      case 'xp-profile':
        bgmPayload = {
          tracks: BGM.chooseFile, // Assuming BGM.chooseFile exists
          track,
          startDelay,
          saveBookmark: false, // Explicitly false here
        };
        break;
      case 'my-home':
        bgmPayload = {
            tracks: BGM.home,
            track,
          startDelay,
          // saveBookmark defaults to false if not provided, or set explicitly if needed
        };
        break;
      case 'home-town':
        bgmPayload = {
            tracks: BGM.hometown,
            track: Math.floor(Math.random() * BGM.home.length),
          startDelay,
          // saveBookmark defaults to false if not provided, or set explicitly if needed
        };
        break;
      case 'hospital':
        bgmPayload = {
          tracks: BGM.hotel, // Assuming BGM.hotel exists
          track,
          startDelay,
        };
        break;
      case 'bank':
      case 'hotel':
        bgmPayload = {
          tracks: BGM.hotel, // Assuming BGM.hotel exists
          track,
          startDelay,
        };
        break;
      case 'world-map':
        bgmPayload = {
          tracks: BGM.world, // Assuming BGM.world exists
          track,
          startDelay,
          saveBookmark: false, // Explicitly false here
        };
        break;
      case 'battle-ground':
        // Ensure BGM.battle is an array and state.battle exists
        if (Array.isArray(BGM.battle) && BGM.battle.length > 0 && state.battle) {
          bgmPayload = {
            tracks: BGM.battle,
            track: Math.floor(Math.random() * BGM.battle.length),
            startDelay: state.battle.bgmWaitToStart,
            saveBookmark: true
          };
        }
        // Skip BGM changes if battle data is missing
        break;
      case 'shop':
        bgmPayload = {
          tracks: BGM.shop, // Assuming BGM.shop exists
          track,
          saveBookmark: false, // Explicitly false here
          startDelay
        };
        break;

      default:
        // No BGM change for other routes
        break;
    }

    // Dispatch only if a payload was determined
    if (bgmPayload) {
      // TODO: Type the payload for 'changeBGM' action using ChangeBGMPayload from store.types.ts
      store.dispatch('changeBGM', bgmPayload);
    }
  });
}

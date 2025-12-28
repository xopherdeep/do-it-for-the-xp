import { Router, NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { alertController } from '@ionic/vue';
import { changeBGM } from '@/lib/engine/audio/routeMusic'; // Import our updated adapter
import debug from '@/lib/utils/debug';
import { useAudioStore } from '@/lib/store/stores/audio';
import { useUserStore } from '@/lib/store/stores/user';
import { useGameStore } from '@/lib/store/stores/game';
import { useBattleStore } from '@/lib/store/stores/battle';

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
 * Note: The store parameter is kept for backward compatibility but Pinia stores are used internally
 */
export function useRouterGuards(router: Router) {
  // Type the navigation guard parameters
  router.beforeEach((to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
    // Get Pinia stores
    const audioStore = useAudioStore();
    const userStore = useUserStore();
    const gameStore = useGameStore();
    const battleStore = useBattleStore();
    
    // log-out safe guard
    if (to.name === 'log-out' && !to.params.confirm) {
      const onConfirm = () => {
        userStore.logoutUser();
        // Ensure 'confirm' param is expected as number or string based on usage
        router.push({ name: 'log-in', params: { confirm: '1' } }); // Use string '1' for consistency if param is string
      };
      logoutAlert(onConfirm, undefined); // Changed from null to undefined
      return next(false); // Explicitly return false
    }

    // Get audio state from Pinia store
    const bgm = audioStore.bgm;
    const theme = gameStore.theme;

    // Check if objects exist before destructuring
    const fx = bgm?.$fx;
    const rpgTheme = theme?.rpg;
    const BGM = fx?.rpg?.[rpgTheme]?.BGM;

    // Battle safe guard - use Pinia battle store
    switch (to.name) {
      case 'home-town':
      case 'world-map':
        battleStore.startBattleTimer({ 
          onEncounter: () => {
            // Random encounter logic - could navigate to battle
            if (battleStore.randomEncounter()) {
              debug.log('Random encounter triggered!');
            }
          }
        });
        break;

      default:
        battleStore.stopBattleTimer();
        break;
    }

    // Check battle state using Pinia store
    if (battleStore.active) {
      next(false);
    } else if (to.name === 'log-in') {
      next();
    } else if (to.meta && to.meta.requiresAuth === false) {
      next();
    } else if (userStore.currentUser.isAuthenticated) {
      next();
    } else {
      next({ name: 'log-in' });
    }

    // Handle BGM changes based on route
    const startDelay = 333;
    const track = 0; // Default track index

    // Skip BGM changes if data is missing, but don't return early
    // This allows the navigation to continue
    let bgmPayload: any = null; // Use a specific type later

    if (!BGM) {
      // If BGM data is missing, we'll try to fall back to a default track if needed
      debug.warn('BGM data is missing, some music features may not work.');
      // Continue with navigation
    } else {
      // Check for area-based BGM first (e.g., entire Game Master area)
      if (to.path.startsWith('/game-master')) {
        if (BGM?.chooseFile && Array.isArray(BGM.chooseFile) && BGM.chooseFile.length > 0) {
          bgmPayload = {
            tracks: BGM.chooseFile,
            track,
            startDelay,
            saveBookmark: false
          };
        }
      }

      switch (to.name) {
        case 'xp-intro':
          // Use optional chaining to prevent errors when BGM.intro might be undefined
          if (BGM?.intro && Array.isArray(BGM.intro) && BGM.intro.length > 0) {
            bgmPayload = {
              tracks: BGM.intro,
              track,
              startDelay,
              saveBookmark: false
            };
          }
          break;

        case 'xp-demo':
          if (BGM?.demo && Array.isArray(BGM.demo) && BGM.demo.length > 0) {
            bgmPayload = {
              tracks: BGM.demo,
              track,
              startDelay,
              saveBookmark: false
            };
          }
          break;
          
        // Continue with same pattern for other routes...
        case 'log-in':
        case 'log-out':
          if (BGM?.startScreen && Array.isArray(BGM.startScreen) && BGM.startScreen.length > 0) {
            bgmPayload = {
              tracks: BGM.startScreen,
              track,
              startDelay,
              repeat: false,
              saveBookmark: false
            };
          }
          break;
        case 'xp-profile':
        case 'my-portal':
          if (BGM?.chooseFile && Array.isArray(BGM.chooseFile) && BGM.chooseFile.length > 0) {
            bgmPayload = {
              tracks: BGM.chooseFile,
              track,
              startDelay,
              saveBookmark: false
            };
          }
          break;
        case 'my-home':
          if (BGM?.home && Array.isArray(BGM.home) && BGM.home.length > 0) {
            bgmPayload = {
              tracks: BGM.home,
              track,
              startDelay,
            };
          }
          break;
        case 'home-town':
          if (BGM?.hometown && Array.isArray(BGM.hometown) && BGM.hometown.length > 0) {
            bgmPayload = {
              tracks: BGM.hometown,
              track: Math.floor(Math.random() * BGM.hometown.length),
              startDelay,
            };
          }
          break;
        case 'hospital':
          if (BGM?.hospital && Array.isArray(BGM.hospital) && BGM.hospital.length > 0) {
            bgmPayload = {
              tracks: BGM.hospital,
              track,
              startDelay,
            };
          }
          break;
        case 'bank':
        case 'hotel':
          if (BGM?.hotel && Array.isArray(BGM.hotel) && BGM.hotel.length > 0) {
            bgmPayload = {
              tracks: BGM.hotel,
              track,
              startDelay,
            };
          }
          break;
        case 'world-map':
          if (BGM?.world && Array.isArray(BGM.world) && BGM.world.length > 0) {
            bgmPayload = {
              tracks: BGM.world,
              track: Math.floor(Math.random() * BGM.world.length),  
              startDelay,
              saveBookmark: false,
            };
          }
          break;
          
        // Handle terrain-specific world routes
        case 'world-plains':
          if (BGM?.worlds?.terrains?.plains && Array.isArray(BGM.worlds.terrains.plains) && BGM.worlds.terrains.plains.length > 0) {
            bgmPayload = {
              tracks: BGM.worlds.terrains.plains,
              track: 1,
              startDelay,
              saveBookmark: true
            };
          }
          break;
        case 'world-desert':
        case 'world-sands':
          if (BGM?.worlds?.terrains?.desert && Array.isArray(BGM.worlds.terrains.desert) && BGM.worlds.terrains.desert.length > 0) {
            bgmPayload = {
              tracks: BGM.worlds.terrains.desert,
              track: Math.floor(Math.random() * BGM.worlds.terrains.desert.length),
              startDelay,
              saveBookmark: true
            };
          }
          break;
        case 'world-ice':
          if (BGM?.worlds?.terrains?.snow && Array.isArray(BGM.worlds.terrains.snow) && BGM.worlds.terrains.snow.length > 0) {
            bgmPayload = {
              tracks: BGM.worlds.terrains.snow,
              track: Math.floor(Math.random() * BGM.worlds.terrains.snow.length),
              startDelay,
              saveBookmark: true
            };
          }
          break;
        case 'world-swamps':
          if (BGM?.worlds?.terrains?.swamp && Array.isArray(BGM.worlds.terrains.swamp) && BGM.worlds.terrains.swamp.length > 0) {
            bgmPayload = {
              tracks: BGM.worlds.terrains.swamp,
              track: Math.floor(Math.random() * BGM.worlds.terrains.swamp.length),
              startDelay,
              saveBookmark: true
            };
          }
          break;
        case 'world-mountains':
          if (BGM?.worlds?.terrains?.mountains && Array.isArray(BGM.worlds.terrains.mountains) && BGM.worlds.terrains.mountains.length > 0) {
            bgmPayload = {
              tracks: BGM.worlds.terrains.mountains,
              track: Math.floor(Math.random() * BGM.worlds.terrains.mountains.length),
              startDelay,
              saveBookmark: true
            };
          }
          break;
        case 'world-forest':
          if (BGM?.worlds?.terrains?.forest && Array.isArray(BGM.worlds.terrains.forest) && BGM.worlds.terrains.forest.length > 0) {
            bgmPayload = {
              tracks: BGM.worlds.terrains.forest,
              track: Math.floor(Math.random() * BGM.worlds.terrains.forest.length),
              startDelay,
              saveBookmark: true
            };
          }
          break;
        case 'world-islands': 
          if (BGM?.worlds?.terrains?.islands && Array.isArray(BGM.worlds.terrains.islands) && BGM.worlds.terrains.islands.length > 0) {
            bgmPayload = {
              tracks: BGM.worlds.terrains.islands,
              track: Math.floor(Math.random() * BGM.worlds.terrains.islands.length),
              startDelay,
              saveBookmark: true
            };
          }
          break;
        case 'world-urban':
        case 'world-city':
          if (BGM?.worlds?.terrains?.urban && Array.isArray(BGM.worlds.terrains.urban) && BGM.worlds.terrains.urban.length > 0) {
            bgmPayload = {
              tracks: BGM.worlds.terrains.urban,
              track: Math.floor(Math.random() * BGM.worlds.terrains.urban.length),
              startDelay,
              saveBookmark: true
            };
          }
          break;
        case 'the-moon':
          if (BGM?.worlds?.terrains?.moon && Array.isArray(BGM.worlds.terrains.moon) && BGM.worlds.terrains.moon.length > 0) {
            bgmPayload = {
              tracks: BGM.worlds.terrains.moon,
              track: Math.floor(Math.random() * BGM.worlds.terrains.moon.length),
              startDelay,
              saveBookmark: true
            };
          }
          break;
        case 'world-clouds':
          if (BGM?.worlds?.terrains?.clouds && Array.isArray(BGM.worlds.terrains.clouds) && BGM.worlds.terrains.clouds.length > 0) {
            bgmPayload = {
              tracks: BGM.worlds.terrains.clouds,
              track: Math.floor(Math.random() * BGM.worlds.terrains.clouds.length),
              startDelay,
              saveBookmark: true
            };
          }
          break;
        case 'world-cave':
          if (BGM?.worlds?.terrains?.cave && Array.isArray(BGM.worlds.terrains.cave) && BGM.worlds.terrains.cave.length > 0) {
            bgmPayload = {
              tracks: BGM.worlds.terrains.cave,
              track: Math.floor(Math.random() * BGM.worlds.terrains.cave.length),
              startDelay,
              saveBookmark: true
            };
          }
          break;
        case 'temple':
          if (BGM?.worlds?.terrains?.dungeon && Array.isArray(BGM.worlds.terrains.dungeon) && BGM.worlds.terrains.dungeon.length > 0) {
            bgmPayload = {
              tracks: BGM.worlds.terrains.dungeon,
              track: Math.floor(Math.random() * BGM.worlds.terrains.dungeon.length),
              startDelay,
              saveBookmark: true
            };
          }
          break;
      
        case 'battleroom-dev':
        case 'battle-field':
        case 'battle-field-with-participants':
        case 'battle-field-temple':
        case 'battle-field-quest':
          // Use Pinia battle store for battle state
          if (BGM?.battle && Array.isArray(BGM.battle) && BGM.battle.length > 0) {
            bgmPayload = {
              tracks: BGM.battle,
              track: Math.floor(Math.random() * BGM.battle.length),
              startDelay: battleStore.bgmWaitToStart || startDelay, // Use Pinia store
              saveBookmark: true
            };
          }
          break;
        case 'shop':
          if (BGM?.shop && Array.isArray(BGM.shop) && BGM.shop.length > 0) {
            bgmPayload = {
              tracks: BGM.shop,
              track,
              saveBookmark: false,
              startDelay
            };
          }
          break;

        default:
          // No BGM change for other routes
          break;
      }
    }

    // Dispatch only if a payload was determined
    if (bgmPayload && bgmPayload.tracks && bgmPayload.tracks.length > 0) {
      // Always set to use the new AudioEngine (true) to prevent double playback
      // Pass the Pinia audio store instead of Vuex store
      changeBGM(audioStore, bgmPayload, true);
    }
  });
 
}

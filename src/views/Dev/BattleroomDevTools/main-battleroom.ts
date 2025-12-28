/**
 * Battleroom Development Entry Point
 * 
 * This is a specialized entry point used when running the application in
 * battleroom development mode. It provides direct access to the battleroom
 * components and tools without loading the entire application.
 */
import { createApp } from 'vue';
import { IonicVue } from '@ionic/vue';
import { createPinia } from 'pinia';
import { useBattleStore } from '@/lib/store/stores/battle';
import { useUserStore } from '@/lib/store/stores/user';
import { useGameStore } from '@/lib/store/stores/game';
import { FXSystem } from '@/lib/types/fx';
import debug from '@/lib/utils/debug';
import BattleroomDevTools from './BattleroomDevTools.vue';

// Initialize Pinia
const pinia = createPinia();

// Add hydration logic after app mount or use a plugin to hydrate
// Since we can't easily access stores before app.use(pinia), we'll do it after app creation
// but before mount, or let the component handle default states.
// However, the original code had explicit mock data. Let's try to set it up.


// Create the Vue application
const app = createApp(BattleroomDevTools)
  .use(IonicVue)
  .use(pinia);

// Hydrate Pinia stores with mock data
const userStore = useUserStore();
const battleStore = useBattleStore();
const gameStore = useGameStore();

// Set up mock user
userStore.users = {
  1: {
    id: '1', // Ensure ID matches expected type (string)
    name: {
      nick: "Dev User",
      first: "Dev",
      last: "User"
    },
    avatar: "default",
    stats: {
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      xp: 120,
      level: 5,
      gp: { wallet: 100, savings: 0, debt: 0 } // Add missing GP
    }
  }
} as any; 

// Set user 1 as current
// userStore.currentUser = userStore.users[1];

// Hydrate battle store
battleStore.steps = {
  counter: 100,
  max: 100,
  min: 50
};

// Mock game state
gameStore.userActions = [
  { label: "Attack", click: () => debug.log("Attack clicked") },
  { label: "Magic", click: () => debug.log("Magic clicked") },
  { label: "Item", click: () => debug.log("Item clicked") },
  { label: "Run", click: () => debug.log("Run clicked") },
] as any;

// Global properties for the battle dev environment
const fxSystem: Partial<FXSystem> = {
  theme: {
    rpg: 'rpg-theme',
    ui: 'default-ui'
  },
  ui: {
    'default-ui': {
      // Create mock audio objects for development
      chooseUser: {
        play: () => debug.log('Playing chooseUser sound'),
        pause: () => debug.log('Pausing chooseUser sound'),
        currentTime: 0
      },
      openPage: {
        play: () => debug.log('Playing openPage sound'),
        pause: () => debug.log('Pausing openPage sound'),
        currentTime: 0
      }
    }
  },
  play$fx: (sound) => debug.log(`Playing sound: ${sound}`)
};

app.config.globalProperties.$fx = fxSystem as FXSystem;

app.config.globalProperties.$getUserAvatar = () => 'https://placehold.co/100';

// Mount the app
app.mount('#app');
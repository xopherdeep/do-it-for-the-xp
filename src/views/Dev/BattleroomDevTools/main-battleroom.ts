/**
 * Battleroom Development Entry Point
 * 
 * This is a specialized entry point used when running the application in
 * battleroom development mode. It provides direct access to the battleroom
 * components and tools without loading the entire application.
 */
import { createApp } from 'vue';
import { IonicVue } from '@ionic/vue';
import { createStore } from 'vuex';
import BattleroomDevTools from './BattleroomDevTools.vue';
import { FXSystem } from '@/lib/types/fx';

// Import global styles
import '@ionic/vue/css/core.css';
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

// Import your theme css
import '@/theme/variables.css';
import '@/theme/core.css';
import debug from '@/lib/utils/debug';

// Create a simplified version of the store with just battle-related features
const store = createStore({
  state: {
    battle: {
      active: false,
      interval: null,
      bgmWaitToStart: 500,
      steps: {
        counter: 100,
        max: 100,
        min: 50,
        timer: 500,
      },
      terrain: {
        plains: 1,
        forest: 0,
        mountain: 0,
        swamp: 0,
        island: 0,
      },
    },
    theme: "default",
    bgm: {
      is_on: false,
      bookmark: 0,
      playlist: [],
    },
    userActions: [
      { label: "Attack", click: () => debug.log("Attack clicked") },
      { label: "Magic", click: () => debug.log("Magic clicked") },
      { label: "Item", click: () => debug.log("Item clicked") },
      { label: "Run", click: () => debug.log("Run clicked") },
    ],
  },
  getters: {
    battleState: (state) => (key) => {
      if (key) return state.battle[key];
      return state.battle;
    },
  },
  mutations: {
    ACTIVATE_BATTLE(state) {
      state.battle.active = true;
    },
    DEACTIVATE_BATTLE(state) {
      state.battle.active = false;
    },
    SET_BATTLE_COUNTER(state, counter) {
      state.battle.steps.counter = counter;
    },
    SET_BATTLE_INTERVAL(state, interval) {
      if (!interval && state.battle.interval) {
        clearInterval(state.battle.interval as unknown as number);
      }
      state.battle.interval = interval;
    },
    SET_BATTLE_TERRAIN(state, terrain) {
      state.battle.terrain = {
        ...state.battle.terrain,
        ...terrain,
      };
    },
    SET_USER_ACTIONS(state, userActions) {
      state.userActions = userActions;
    },
  },
  actions: {
    enterBattle({ commit }) {
      commit("ACTIVATE_BATTLE");
      debug.log("Battle started");
    },
    leaveBattle({ commit }) {
      commit("DEACTIVATE_BATTLE");
      debug.log("Battle ended");
    },
    resetBattleTimer({ commit, state }) {
      commit("SET_BATTLE_COUNTER", state.battle.steps.max);
    },
    randomEncounter({ state, commit }) {
      const currentStep = state.battle.steps.counter;
      if (currentStep <= 0) {
        commit("ACTIVATE_BATTLE");
      }
    },
  },
});

// Create the Vue application
const app = createApp(BattleroomDevTools)
  .use(IonicVue)
  .use(store);

// Global properties for the battle dev environment
const fxSystem: Partial<FXSystem> = {
  theme: {
    rpg: 'rpg-theme',
    ui: 'default-ui'
  },
  play$fx: (sound) => debug.log(`Playing sound: ${sound}`)
};

app.config.globalProperties.$fx = fxSystem as FXSystem;

app.config.globalProperties.$getUserAvatar = () => 'https://placehold.co/100';

// Mount the app
app.mount('#app');
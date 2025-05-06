import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import BattleGround from '../BattleField.vue';
import { createBattleroomTestUtils } from '@/lib/utils/battleroom';

// Mock store for testing
const createMockStore = () => {
  return createStore({
    state: {
      battle: {
        active: false,
        interval: null,
        bgmWaitToStart: 0,
        steps: {
          counter: 100,
          max: 100,
          min: 50
        },
        terrain: {
          plains: 1,
          forest: 0,
          mountain: 0,
          swamp: 0,
          island: 0
        }
      },
      theme: 'default',
      bgm: {
        is_on: false,
        bookmark: 0,
        playlist: []
      },
      userActions: []
    },
    getters: {
      battleState: (state) => (key) => {
        if (key) return state.battle[key];
        return state.battle;
      }
    },
    mutations: {
      ACTIVATE_BATTLE: (state) => {
        state.battle.active = true;
      },
      DEACTIVATE_BATTLE: (state) => {
        state.battle.active = false;
      },
      SET_BATTLE_COUNTER: (state, counter) => {
        state.battle.steps.counter = counter;
      },
      SET_BATTLE_TERRAIN: (state, terrain) => {
        state.battle.terrain = {
          ...state.battle.terrain,
          ...terrain
        };
      },
      SET_BATTLE_INTERVAL: jest.fn()
    },
    actions: {
      enterBattle: jest.fn(),
      leaveBattle: jest.fn(),
      resetBattleTimer: jest.fn(),
      randomEncounter: jest.fn()
    }
  });
};

describe('BattleGround.vue', () => {
  let store;
  let battleUtils;
  
  beforeEach(() => {
    store = createMockStore();
    battleUtils = createBattleroomTestUtils(store);
  });
  
  test('renders correctly', () => {
    const wrapper = mount(BattleGround, {
      global: {
        plugins: [store],
        mocks: {
          $route: { params: {} },
          $fx: {
            theme: { rpg: 'rpg-theme' },
            play$fx: jest.fn()
          },
          $getUserAvatar: jest.fn()
        }
      }
    });
    
    // Check that component renders
    expect(wrapper.exists()).toBe(true);
  });
  
  test('battle actions are displayed', () => {
    // Mock user actions
    store.state.userActions = [
      { label: 'Attack', click: jest.fn() },
      { label: 'Defend', click: jest.fn() }
    ];
    
    const wrapper = mount(BattleGround, {
      global: {
        plugins: [store],
        mocks: {
          $route: { params: {} },
          $fx: {
            theme: { rpg: 'rpg-theme' },
            play$fx: jest.fn()
          },
          $getUserAvatar: jest.fn()
        }
      }
    });
    
    // Check that battle actions are displayed
    const buttons = wrapper.findAll('ion-button');
    expect(buttons.length).toBeGreaterThan(0);
  });
  
  test('can trigger a battle', () => {
    // Use the battle utils to trigger a battle
    battleUtils.triggerBattle();
    
    // Check that battle state was updated
    expect(store.state.battle.active).toBe(true);
    expect(store.actions.enterBattle).toHaveBeenCalled();
  });
});
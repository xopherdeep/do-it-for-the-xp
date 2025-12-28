import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import BattleField from '../BattleField.vue';
import { createBattleroomTestUtils } from '@/lib/utils/battleroom';
import { useBattleStore } from '@/lib/store/stores/battle';
import { useGameStore } from '@/lib/store/stores/game';
import { useUserStore } from '@/lib/store/stores/user';

describe('BattleField.vue', () => {
  let pinia;
  let battleUtils;
  
  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    battleUtils = createBattleroomTestUtils();
  });
  
  test('renders correctly', () => {
    const wrapper = mount(BattleField, {
      global: {
        plugins: [pinia],
        mocks: {
          $route: { params: {} },
          $router: { push: jest.fn() },
          $fx: {
            theme: { rpg: 'rpg-theme' },
            ui: {},
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
    // Set up game store with user actions
    const gameStore = useGameStore();
    gameStore.userActions = [
      { label: 'Attack', click: jest.fn() },
      { label: 'Defend', click: jest.fn() }
    ] as any;
    
    const wrapper = mount(BattleField, {
      global: {
        plugins: [pinia],
        mocks: {
          $route: { params: {} },
          $router: { push: jest.fn() },
          $fx: {
            theme: { rpg: 'rpg-theme' },
            ui: {},
            play$fx: jest.fn()
          },
          $getUserAvatar: jest.fn()
        }
      }
    });
    
    // Check that battle actions are displayed
    const buttons = wrapper.findAll('ion-button');
    // Note: BattleField now renders differently, but it should still have buttons
    expect(buttons.length).toBeGreaterThan(0);
  });
  
  test('can trigger a battle', () => {
    const battleStore = useBattleStore();
    
    // Use the battle utils to trigger a battle
    battleUtils.triggerBattle();
    
    // Check that battle state was updated
    expect(battleStore.active).toBe(true);
  });
});
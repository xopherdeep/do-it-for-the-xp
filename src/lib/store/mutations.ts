/// import Vue from "vue";

/**
 * mutations.js
 * --------------------------
 * holds methods that handle mutating the local state
 *
 */
export default {
  ADD_USER: function (state, user) {
    state.users[user.id] = user;
  },
  LOGOUT_USER: function (state) {
    state.user.isAuthenticated = false;
  },
  LOGIN_USER: function (state, user) {
    state.user = {
      ...state.user,
      ...user,
      isAuthenticated: true,
    };
  },

  /**
   * ADD_REQUEST
   * adds request to state[type].requests
   *
   * @param state Object
   * @param {type, request} Object
   */
  ADD_REQUEST: function (state, { type, request }) {
    state.requests[type].push(request);
  },

  /**
   * ADD_ITEM
   * adds a specific item to the state by type
   */
  ADD_ITEM: function (state, { type, item }) {
    if (item && type) state[type][item.id] = item;
  },

  UPDATE_ITEM(state, { type, item }) {
    state[type][item.id] = item;
  },
  
  SET_DEV_MODE(state, isEnabled) {
    state.devMode = isEnabled;
  },
  
  CHANGE_SOUND_FX(state, theme) {
    state.theme = theme;
  },
  TOGGLE_BGM(state) {
    state.bgm.is_on = !state.bgm.is_on;
  },
  CHANGE_BGM(state, bgm) {
    // console.log("Background Music:", bgm);
    state.bgm = {
      ...state.bgm,
      ...bgm,
    };
  },
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
    if (!interval) clearInterval(state.battle.interval);
    state.battle.interval = interval;
  },
  SET_BATTLE_TERRAIN(state, terrain) {
    state.battle.terrain = {
      ...state.battle.terrain,
      ...terrain,
    };
  },
  SET_USER_ACTIONS(state, userActions) {
    state.userActions = userActions
  },
  SET_AREA(state, area) {
    state.area = area
  },
  UPDATE_USER_GP(state, { userId, wallet, savings, debt }) {
    if (state.users[userId]) {
      const userStats = state.users[userId].stats || { gp: { wallet: 0, savings: 0, debt: 0, limit: 1000 } };
      
      // Initialize stats if missing
      if (!userStats.gp) userStats.gp = { wallet: 0, savings: 0, debt: 0, limit: 1000 };
      
      if (wallet !== undefined) userStats.gp.wallet = (userStats.gp.wallet || 0) + wallet;
      if (savings !== undefined) userStats.gp.savings = (userStats.gp.savings || 0) + savings;
      if (debt !== undefined) userStats.gp.debt = (userStats.gp.debt || 0) + debt;
      
      // Update state
      state.users[userId].stats = userStats;
      
      // Also update currently logged in user if it matches
      if (state.user.id === userId) {
        state.user.stats = userStats;
      }
    }
  }
};

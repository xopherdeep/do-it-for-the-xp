// import Vue from "vue";

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
  LOGOUT_USER: function(state){
    state.user.isAuthenticated = false
  },
  LOGIN_USER: function(state){
    state.user.isAuthenticated = true 
  },

  /**
   * ADD_REQUEST
   * adds request to state[type].requests
   *
   * @param state Object
   * @param {type, request} Object
   */
  ADD_REQUEST: function(state, { type, request }) {
    state.requests[type].push(request);
  },

  /**
   * ADD_ITEM
   * adds a specific item to the state by type
   */
  ADD_ITEM: function (state, { type, item }) {
    if (item && type) 
      state[type][item.id] = item
  },

  UPDATE_ITEM(state, {type, item}){
    state[type][item.id] = item
  },
};

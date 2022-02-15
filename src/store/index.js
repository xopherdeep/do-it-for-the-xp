import { createStore } from 'vuex'
import getters from "./getters";
import mutations from "./mutations";
import actions from "./actions";

// const strict = process.env.NODE_ENV !== "production";

/**
 * state
 * scaffolding of our app's local stage object
 * ! OBJECTS have to be listed below before they can be manipulated by the store
 * ! user objects over arrays as the state will add the id as its key, which will bloat
 * ! your array with empty values: i.e: id=1001 looks like [empty 0-1000, 1001]  
 */

const state = {
  xp_achievement: {},
  xp_ability: {},
  xp_accessory: {},
  media: {},
  requests: {
    xp_ability: [],
    xp_accessory: [],
    xp_achievement: [],
    media: [],
  },
  user: {
    isAuthenticated: true 
  },
  users: {
    1: {
      id: 1
    }
  } 
};
 
export default createStore({
  state,
  actions,
  getters,
  mutations,
  // strict,
})
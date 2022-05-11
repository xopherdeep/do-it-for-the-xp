import { createStore } from 'vuex'
import getters from "./getters";
import mutations from "./mutations";
import actions from "./actions";

import $fx from "@/assets/js/fx"

// const strict = process.env.NODE_ENV !== "production";

/**
 * state
 * scaffolding of our app's local stage object
 * ! OBJECTS have to be listed below before they can be manipulated by the store
 * ! user objects over arrays as the state will add the id as its key, which will bloat
 * ! your array with empty values: i.e: id=1001 looks like [empty 0-1000, 1001]  
 */

const state = {
  bgm: {
    audio: null,
    saveBookmark: false,
    is_on: false,
    startDelay: 0,
    src: null,
    track: 0,
    tracks: [],
    $fx
  },
  xp_achievement: {},
  xp_ability: {

  },
  xp_accessory: {

  },
  userActions: [],
  theme: {
    ui: 'nintendo',
    rpg: 'earthbound'
  },
  battle: {
    active: false,
    interval: null,
    terrain: {
      plains: 1,
      swamp: 0,
      forest: 0,
      mountain: 0,
      island: 0
    },
    steps: {
      min: 64,
      max: 255,
      counter: 255,
    },
    timer: 500,
    bgmWaitToStart: 4200,
  },
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
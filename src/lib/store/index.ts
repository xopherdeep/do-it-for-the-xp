import { createStore } from 'vuex'
import getters from "./getters";
import mutations from "./mutations";
import actions from "./actions";

import $fx from "@/assets/fx"

// const strict = process.env.NODE_ENV !== "production";

/**
 * state
 * scaffolding of our app's local stage object
 * ! OBJECTS have to be listed below before they can be manipulated by the store
 * ! user objects over arrays as the state will add the id as its key, which will bloat
 * ! your array with empty values: i.e: id=1001 looks like [empty 0-1000, 1001]  
 */

const state = {
  devMode: false, // Add devMode state - defaults to false in production
  bgm: {
    audio: new Audio(),
    saveBookmark: false,
    is_on: false, // Changed from false to true to enable music by default
    startDelay: 0,
    src: null,
    track: 0,
    tracks: [],
    repeat: true, // Add repeat flag - default to true for backward compatibility
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
      counter: 155,
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
  users: {}
};

export default createStore({
  state,
  actions,
  getters,
  mutations,
  // strict,
})
import Api from "@/lib/api";
import XpApi from "@/lib/api/doit.forthexp.com.api";
import { AudioEngine } from '@/engine/audio/AudioEngine';
import debug from '@/utils/debug';

export default {
  getSingleById({ getters, commit }, request) {
    const { type, id, batch = false } = request;
    if (!getters.singleById({ type, id })) {
      commit("SHOW_LOADING", true);
      return XpApi.get(`${type}/${id}`).then(({ data }) => {
        if (batch) {
          data.forEach((item) => commit("ADD_ITEM", { type, item }));
        } else {
          commit("ADD_ITEM", { type, item: data });
        }
        commit("SHOW_LOADING", false);
      });
    }
  },
  /**
   * fetchItems
   * call items from the ap
   */
  fetchItems({ getters, dispatch }, { type, params }) {
    const dejaVu = getters.request({ type, params });
    const runApi = () => XpApi.get(type, params).then(dispatchData);

    return dejaVu ? setTimeout(runApi, 5000) : runApi();

    function dispatchData({ data }) {
      dispatch("addRequest", { type, params, data });
      dispatch("addData", { type, data });
      return { data };
    }
  },

  fetchWPItems({ getters, dispatch }, request) {
    const { type, params } = request;
    const dejaVu = getters.request({ type, params });
    const runApi = () => XpApi.get(type, params).then(dispatchData);

    return dejaVu ? setTimeout(runApi, 1000) : runApi();

    function dispatchData({ data, headers }) {
      dispatch("addWPRequest", { type, params, data, headers });
      dispatch("addData", { type, data: { results: data } });
    }
  },
  /**
   * addRequest
   * add the Api request to the app's state
   * /type/?params
   */
  addRequest(
    { commit },
    { type, params, data: { results, total, total_pages } }
  ) {
    const ids = results.map((i) => i.id);
    const request = {
      type,
      request: { params: { ...params }, ids, total, total_pages },
    };
    commit("ADD_REQUEST", request);
  },

  addWPRequest({ commit }, { type, params, data: results, headers }) {
    const total = headers.get("x-wp-total");
    const total_pages = headers.get("x-wp-totalpages");
    const ids = results.map((i) => i.id);
    const request = {
      type,
      request: { params: { ...params }, ids, total, total_pages },
    };
    commit("ADD_REQUEST", request);
  },

  /**
   * addItems
   * add items to the app's state.
   */
  addData({ commit }, { type, data }) {
    if (data.results)
      data.results.forEach((item) => commit("ADD_ITEM", { type, item }));
  },

  loadUsers({ dispatch }) {
    const dispatchUsers = (users) => dispatch("addUsers", users);
    return Api.get("users").then(dispatchUsers);
  },

  addUsers({ commit }, users) {
    // console.log("users", users);
    users?.forEach((user) => commit("ADD_USER", user));
  },

  loginUser({ commit }, user) {
    commit("LOGIN_USER", user);
  },

  logOutUser({ commit }) {
    commit("LOGOUT_USER");
  },

  changeSoundFX({ commit }, theme) {
    return commit("CHANGE_SOUND_FX", theme);
  },
  toggleBGM({ commit }) {
    return commit("TOGGLE_BGM");
  },
  
  /**
   * Toggle BGM repeat setting
   * When set to false, the music will play once and stop
   */
  toggleBGMRepeat({ commit, state }) {
    // Toggle the current repeat setting
    const repeat = !state.bgm.repeat;
    
    // Update both the store state and the audio element's loop property
    commit("CHANGE_BGM", { repeat });
    
    // If there's an active audio element, update its loop property
    if (state.bgm.audio) {
      state.bgm.audio.loop = repeat;
    }
    
    // Also update any tracks in the new AudioEngine
    const engine = AudioEngine.getInstance();
    engine.setLoopOption(repeat);
    
    return repeat;
  },
  
  /**
   * Change BGM based on provided payload
   * This action handles both old and new audio engines
   */
  changeBGM({ commit, state }, bgm) {
    // First update the state
    commit("CHANGE_BGM", bgm);
    
    // If the new audio engine already handled this, don't play again
    if (bgm._usingNewAudioEngine) {
      return;
    }
    
    // If using old audio system, handle playback here
    const { audio, is_on, tracks, track } = state.bgm;
    
    if (!is_on || !tracks || !tracks.length) {
      return;
    }
    
    // Only attempt playback if we have a valid track 
    const targetTrack = tracks[track % tracks.length];
    if (!targetTrack) {
      return;
    }
    
    // Get the track source URL
    const src = typeof targetTrack === 'string' ? targetTrack : targetTrack.src;
    
    // Configure audio element
    audio.src = src;
    audio.loop = state.bgm.repeat !== false; // Default to true if not specified
    
    // Attempt playback
    const playPromise = audio.play();
    
    // Handle potential playback errors
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        debug.warn('Audio playback failed', error);
      });
    }
  },

  turnMusicOnOff({ state }) {
    const { audio, is_on } = state.bgm;

    if (audio) {
      if (is_on) audio.play();
      else audio.pause();
    }
  },

  leaveBattle({ commit }) {
    commit("DEACTIVATE_BATTLE");
  },

  enterBattle({ dispatch, state }) {
    const playMusic = () => dispatch("turnMusicOnOff");
    // dispatch("changeBGM", { is_on: true })
    dispatch("changeBGM");
    setTimeout(playMusic, state.battle.bgmWaitToStart);
  },

  startBattleTimer({ dispatch, state, commit }) {
    const randomEncounter = () => dispatch("randomEncounter");
    const {
      timer,
      steps: { max, min },
    } = state.battle;
    let { counter, interval } = state.battle;

    if (counter <= 0) {
      counter = Math.floor(Math.random() * (max - min + 1) + min);
      commit("SET_BATTLE_COUNTER", counter);
    }

    interval = interval || setInterval(randomEncounter, timer);
    if (interval) commit("SET_BATTLE_INTERVAL", interval);
  },

  stopBattleTimer({ commit }) {
    commit("SET_BATTLE_INTERVAL", 0);
    // commit("SET_BATTLE_COUNTER", state.battle.steps.max);
  },

  resetBattleTimer({ commit, state }) {
    commit("SET_BATTLE_COUNTER", state.battle.steps.max);
  },

  randomEncounter({ state, commit, getters }) {
    const {
      terrain: { plains, swamp, forest, mountain, island },
      steps: { counter },
    } = state.battle;

    const minus = plains * 4 + (swamp + forest + mountain + island) * 8;

    commit("SET_BATTLE_COUNTER", counter - minus);
    const currentStep = getters.battleState("steps").counter;
    const isBattleActive = getters.battleState("active");
    const isBattleTimerUp = currentStep < 0;
    if (isBattleTimerUp && !isBattleActive) {
      // dispatch("enterBattle");
    }
  },

  setUserActions({ commit }, userActions) {
    commit("SET_USER_ACTIONS", userActions);
  },
  setArea({ commit }, area) {
    commit("SET_AREA", area);
  },
};

import Api from "@/assets/js/api.js"
import XpApi from "@/assets/js/api/xp.js"
export default {
  getSingleById({ getters, commit }, request) {
    const { type, id, batch = false } = request;
    if (!getters.singleById({ type, id })) {
      commit("SHOW_LOADING", true);
      return XpApi.get(`${type}/${id}`).then(({data}) => {
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
    const runApi = () => XpApi.get(type, params).then( dispatchData );

    return dejaVu
      ? setTimeout( runApi, 5000 ) 
      : runApi()

    function dispatchData({ data }){
      dispatch('addRequest', { type, params, data });
      dispatch('addData', { type, data });
      return { data }
    }
  },

  fetchWPItems({ getters, dispatch }, request) {
    const { type, params } = request;
    const dejaVu = getters.request({ type, params });
    const runApi = () => XpApi.get(type, params).then( dispatchData );

    return dejaVu
      ? setTimeout( runApi, 1000 ) 
      : runApi()

    function dispatchData({ data, headers }){
      dispatch('addWPRequest', { type, params, data, headers });
      dispatch('addData', { type, data: { results: data } });
    }
  },
  /**
   * addRequest
   * add the Api request to the app's state 
   * /type/?params 
   */
  addRequest({ commit }, {type, params, data: { results, total, total_pages }}){
    const ids     = results.map((i) => i.id);
    const request = {
      type,
      request: { params: {...params}, ids, total, total_pages },
    };
    commit("ADD_REQUEST", request);
  },

  addWPRequest({ commit }, {type, params, data: results, headers}){
    const total = headers.get('x-wp-total')
    const total_pages = headers.get('x-wp-totalpages')
    const ids     = results.map((i) => i.id);
    const request = {
      type,
      request: { params: {...params}, ids, total, total_pages },
    };
    commit("ADD_REQUEST", request);
  },

  /**
   * addItems
   * add items to the app's state.
   */
  addData({ commit }, { type, data }){
    if(data.results)
      data.results.forEach((item) => commit("ADD_ITEM", { type, item }));
  },


  loadUsers({ dispatch }){
    return Api.get('users',{}).then(dispatchData)
    function dispatchData( { data } ){
      dispatch('addUsers', { data })
    }
  },

  addUsers({ commit }, { data }){
    data.users.forEach(user => commit('ADD_USER', user));
  },

  loginUser({ commit }){
    commit('LOGIN_USER')
  },

  logOutUser({ commit }){
    commit('LOGOUT_USER')
  }
};

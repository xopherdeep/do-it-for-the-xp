/**
 * getters.js
 * getter methods for returning data out of local state
 */
export default {
  /**
   * request
   * find matching request type w/ exact params in local state or return undefined
   * @return Object || undefined
   */
  request:
    (state) =>
    ({ type, params }) => {
      // console.log("SEARCH FOR TYPE", type, params);
      if (!type) {
        // console.log("TYPE NOT FOUND", type);
        return false;
      }
      // recycle the request if its been stored
      return state.requests[type].find((request) => {
        // return state[type].requests.find((request) => {
        if (Object.keys(request.params).length === Object.keys(params).length) {
          // match against each key
          return Object.keys(request.params).every((key) => {
            const match = request.params[key] == params[key];
            // console.log("MATCH", key, match);
            return match;
          });
        }
      });
    },

  /**
   * requestedItems
   * uses request getter above to map requested items by id from local state[type][id]
   * @return Array
   */
  requestedItems:
    (state, getters) =>
    ({ type, params }) => {
      let request = getters.request({ type, params });
      // console.log("ITEMS REQUESTS", request);
      // if we do have a request, map the ids stored in the state
      return request ? request.ids.map((id) => state[type][id]) : [];
    },

  totalPages:
    (state, getters) =>
    ({ type, params }) => {
      let request = getters.request({ type, params });
      return request ? request.total_pages : 0;
    },

  totalItems:
    (state, getters) =>
    ({ type, params }) => {
      let request = getters.request({ type, params });
      return request ? request.total : 0;
    },

  /**
   * singleById
   * returns local state item by type & id.
   * @param {type, id}
   * @returns Object
   */
  singleById:
    (state) =>
    ({ type, id }) => {
      const item = state[type][id];
      return item;
    },

  // CUSTOM XP GETTERS
  isLoggedIn: (state) => {
    // console.log(state.users);
    return state.user.isAuthenticated;
  },

  getUserById: (state) => (id) => {
    // console.log("OVER HERE",state.users);
    const user = state.users[id];
    return user ? user : state.users[1];
  },

  user: (state) => {
    return state.user;
  },

  theme: (state) => (theme) => {
    return state.theme[theme];
  },

  battleState: (state) => (key) => {
    return state.battle[key];
  },

  bgm: (state) => (key) => {
    return key ? state.bgm[key] : state.bgm;
  },
  userActions: (state) => {
    return state.userActions;
  },

  users: (state) => {
    return state.users;
  },

  usersAz: (state) => {
    const sortedUsersArray = Object.values(state.users).sort((a, b) => {
      return a.name.full.localeCompare(b.name.full);
    });
    return sortedUsersArray;
  },
};

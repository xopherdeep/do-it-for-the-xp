import users from "./users"

export default {
  users: {
    data: { users } 
  },
  get(type, params){
    return Promise.resolve(this[type])
  },
}

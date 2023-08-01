import users from "./users.api"

export default {
  users: {
    data: { users } 
  },
  get(type){
    return Promise.resolve(this[type])
  },
}

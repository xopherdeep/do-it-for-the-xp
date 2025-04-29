import users from "./users.api"

export default {
  users,
  get(type) {
    return Promise.resolve(this[type]())
  },
}

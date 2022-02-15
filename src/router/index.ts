import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import routesArray from "./routes"

const routes: Array<RouteRecordRaw> = routesArray 

export default function (store) {
  const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),
    routes
  })

  router.beforeEach((to) => {
    if (to.name === 'log-in') {
      return true
      // next() // login route is always  okay (we could use the requires auth flag below). prevent a redirect loop
    } else if (to.meta && to.meta.requiresAuth === false) {
      return true
    } else if (store.getters.isLoggedIn) {
      return true
    } else {
      return 'log-in'  
    }
  })

  return router
}

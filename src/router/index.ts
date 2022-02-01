import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import routesArray from "./routes"

const routes: Array<RouteRecordRaw> = routesArray 
const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router

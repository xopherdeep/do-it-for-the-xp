import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';

const routes: Array<RouteRecordRaw> = [
  // Switch Profile
  {
    path: '',
    redirect: '/switch-profile'
  },
  {
    path: '/switch-profile',
    component: () => import ('../views/SwitchProfile.vue')
  },
  {
    path: '/folder/:id',
    component: () => import ('../views/FolderPage.vue')
  },
  {
    path: '/my-dashboard/:avatar?',
    component: () => import ('../views/MyDashboard.vue')
  },
  {
    path: '/tabs/schedule',
    component: () => import ('../views/MySchedule.vue')
  },
  {
    path: '/tabs/speakers',
    component: () => import ('../views/MySpeakers.vue')
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router

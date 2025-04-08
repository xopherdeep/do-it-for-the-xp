import { RouteRecordRaw } from 'vue-router';

const MyHomeRoutes: Array<RouteRecordRaw> = [ 
  // HOME
  {
    path: '/cook-food',
    name: 'cook-food',
    component: () => import ('@/views/MyPortal/MyHome/MyFoods/MyFoods.vue'),
  },
  {
    path: '/craft-item',
    name: 'craft-item',
    component: () => import ('@/views/MyPortal/MyHome/MyCrafts/MyCrafts.vue'),
  },

  {
    path: '/storage',
    name: 'storage',
    component: () => import ('@/views/MyPortal/MyHome/MyStorage/MyStorage.vue'),
  },

  {
    path: '/calendar',
    name: 'calendar',
    component: () => import ('@/views/MyPortal/MyHome/MyCalendar/MyCalendar.vue'),
  },
  // END HOME
]

export default MyHomeRoutes 

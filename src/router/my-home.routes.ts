import { RouteRecordRaw } from 'vue-router';

const MyHomeRoutes: Array<RouteRecordRaw> = [ 
  // HOME
  {
    path: '/cook-food',
    name: 'cook-food',
    component: () => import ('@/views/Console/MyPortal/MyHome/MyFoods/MyFoods.vue'),
  },
  {
    path: '/craft-item',
    name: 'craft-item',
    component: () => import ('@/views/Console/MyPortal/MyHome/MyCrafts/MyCrafts.vue'),
  },

  {
    path: '/storage',
    name: 'storage',
    component: () => import ('@/views/Console/MyPortal/MyHome/MyStorage/MyStorage.vue'),
  },

  {
    path: '/calendar',
    name: 'calendar',
    component: () => import ('@/views/Console/MyPortal/MyHome/MyCalendar/MyCalendar.vue'),
  },
  // END HOME
]

export default MyHomeRoutes 

import { RouteRecordRaw } from 'vue-router';

const MyHomeRoutes: Array<RouteRecordRaw> = [ 
  // HOME
  // Every My Home page carries the hero id so its back button and data stay with that hero
  {
    path: '/cook-food/:userId?',
    name: 'cook-food',
    component: () => import ('@/app/Console/MyPortal/MyHome/MyFoods/MyFoods.vue'),
    props: true,
  },
  {
    path: '/craft-item/:userId?',
    name: 'craft-item',
    component: () => import ('@/app/Console/MyPortal/MyHome/MyCrafts/MyCrafts.vue'),
    props: true,
  },

  {
    path: '/storage/:userId?',
    name: 'storage',
    component: () => import ('@/app/Console/MyPortal/MyHome/MyStorage/MyStorage.vue'),
    props: true,
  },

  {
    path: '/calendar/:userId?',
    name: 'calendar',
    component: () => import ('@/app/Console/MyPortal/MyHome/MyCalendar/MyCalendar.vue'),
    props: true,
  },
  // END HOME
]

export default MyHomeRoutes 

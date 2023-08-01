const MyHomeRoutes = [ 
  // HOME
  {
    path: '/cook-food',
    name: 'cook-food',
    component: () => import ('@/views/MyHome/MyFoods/MyFoods.vue'),
  },
  {
    path: '/craft-item',
    name: 'craft-item',
    component: () => import ('@/views/MyHome/MyCrafts/MyCrafts.vue'),
  },

  {
    path: '/storage',
    name: 'storage',
    component: () => import ('@/views/MyHome/MyStorage/MyStorage.vue'),
  },

  {
    path: '/calendar',
    name: 'calendar',
    component: () => import ('@/views/MyHome/MyCalendar/MyCalendar.vue'),
  },
  // END HOME
]

export default MyHomeRoutes 

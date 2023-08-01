const MyHomeRoutes = [ 
  // HOME
  {
    path: '/cook-food',
    name: 'cook-food',
    component: () => import ('@/views/MyFoods/MyFoods.vue'),
  },
  {
    path: '/craft-item',
    name: 'craft-item',
    component: () => import ('@/views/MyCrafts/MyCrafts.vue'),
  },

  {
    path: '/storage',
    name: 'storage',
    component: () => import ('@/views/UserMenu/MyStorage/MyStorage.vue'),
  },

  {
    path: '/calendar',
    name: 'calendar',
    component: () => import ('@/views/MyCalendar/MyCalendar.vue'),
  },
  // END HOME
]

export default MyHomeRoutes 

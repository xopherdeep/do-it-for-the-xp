const MyHomeRoutes = [ 
  // HOME
  {
    path: '/cook-food',
    name: 'cook-food',
    component: () => import ('@/views/_jig_app/_jig_app.vue'),
  },
  {
    path: '/craft-item',
    name: 'craft-item',
    component: () => import ('@/views/_jig_app/_jig_app.vue'),
  },

  {
    path: '/storage',
    name: 'storage',
    component: () => import ('@/views/_jig_app/_jig_app.vue'),
  },
  // END HOME
]

export default MyHomeRoutes 

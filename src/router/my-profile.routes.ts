const MyProfileRoutes = [ 
  {
    path: '/my-tasks/:userId?/',
    name: 'my-tasks',
    component: () => import ('@/views/UserMenu/MyTasks/MyTasks.vue'),
    props: true,
  },
  {
    path: '/my-tasks/:userId?/task/:taskId?/',
    component: () => import ('@/views/UserMenu/MyTask/MyTask.vue'),
    props: true,
  },
  {
    path: '/my-abilities/:userId?/',
    name: 'my-abilities',
    component: () => import ('@/views/UserMenu/MyAbilities/MyAbilities.vue'),
    props: true,
  },
  {
    path: '/my-gold-points/:userId?/',
    name: 'my-gold-points',
    component: () => import ('@/views/UserMenu/MyGoldPoints/MyGoldPoints.vue'),
    props: true,
  },
  {
    path: '/my-inventory/:userId/',
    name: 'my-inventory',
    component: () => import ('@/views/UserMenu/MyInventory/MyInventory.vue'),
    props: true,
  },
]

export default MyProfileRoutes 

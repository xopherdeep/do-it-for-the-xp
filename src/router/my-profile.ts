const MyProfileRoutes = [ 
  {
    path: '/my-tasks/:userId?/',
    name: 'my-tasks',
    component: () => import ('@/views/MyTasks/MyTasks.vue'),
    props: true,
  },
  {
    path: '/my-tasks/:userId?/task/:taskId?/',
    component: () => import ('@/views/MyTask/MyTask.vue'),
    props: true,
  },
  {
    path: '/my-abilities/:userId?/',
    name: 'my-abilities',
    component: () => import ('@/views/MyAbilities/MyAbilities.vue'),
    props: true,
  },
  {
    path: '/my-gold-points/:userId?/',
    name: 'my-gold-points',
    component: () => import ('@/views/MyGoldPoints/MyGoldPoints.vue'),
    props: true,
  },
  {
    path: '/my-inventory/:userId/',
    name: 'my-inventory',
    component: () => import ('@/views/MyInventory/MyInventory.vue'),
    props: true,
  },
]

export default MyProfileRoutes 

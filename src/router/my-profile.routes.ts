import { RouteRecordRaw } from 'vue-router';

const MyProfileRoutes: Array<RouteRecordRaw> = [ 
  {
    path: '/my-tasks/:userId?/',
    name: 'my-tasks',
    component: () => import ('@/views/MyDialogBox/MyQuests/MyQuests.vue'),
    props: true,
  },
  {
    path: '/my-tasks/:userId?/task/:taskId?/',
    component: () => import ('@/views/MyDialogBox/MyTask/MyTask.vue'),
    props: true,
  },
  {
    path: '/my-abilities/:userId?/',
    name: 'my-abilities',
    component: () => import ('@/views/MyDialogBox/MyAbilities/MyAbilities.vue'),
    props: true,
  },
  {
    path: '/my-gold-points/:userId?/',
    name: 'my-gold-points',
    component: () => import ('@/views/MyDialogBox/MyGoldPoints/MyGoldPoints.vue'),
    props: true,
  },
  {
    path: '/my-inventory/:userId/',
    name: 'my-inventory',
    component: () => import ('@/views/MyDialogBox/MyInventory/MyInventory.vue'),
    props: true,
  },
]

export default MyProfileRoutes 

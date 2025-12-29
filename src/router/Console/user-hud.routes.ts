import { RouteRecordRaw } from 'vue-router';

const UserHudRoutes: Array<RouteRecordRaw> = [ 
  {
    path: '/my-tasks/:userId?/',
    name: 'my-tasks',
    component: () => import ('@/app/Console/MyPortal/UserHud/MyQuests/MyQuests.vue'),
    props: true,
  },
  {
    path: '/my-tasks/:userId?/task/:taskId?/',
    component: () => import ('@/app/Console/MyPortal/UserHud/MyTask/MyTask.vue'),
    props: true,
  },
  {
    path: '/my-abilities/:userId?/',
    name: 'my-abilities',
    component: () => import ('@/app/Console/MyPortal/UserHud/MyAbilities/MyAbilities.vue'),
    props: true,
  },
  {
    path: '/my-gold-points/:userId?/',
    name: 'my-gold-points',
    component: () => import ('@/app/Console/MyPortal/UserHud/MyGoldPoints/MyGoldPoints.vue'),
    props: true,
  },
  {
    path: '/my-inventory/:userId/',
    name: 'my-inventory',
    component: () => import ('@/app/Console/MyPortal/UserHud/MyInventory/MyInventory.vue'),
    props: true,
  },
]

export default UserHudRoutes 

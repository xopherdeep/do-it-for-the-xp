export default [
  // Switch Profile
  {
    path: '/switch-profile',
    component: () => import ('@/views/SwitchProfile.vue'),
    meta: {
      requiresAuth: false
    }
  },
  {
    path: '/user/:userId?',
    component: () => import ('@/views/UserProfile/UserProfile.vue'),
    props: true
  },
  {
    path: '/my-portal/:userId',
    component: () => import ('@/views/MyPortal/MyPortal.vue'),
    props: true,
    children: [
      {
        path: '',
        component: () => import ('@/views/MyDashboard/MyDashboard.vue'),
        props: true,
      },
      {
        path: 'shop',
        component: () => import ('@/views/AccessoryShop/AccessoryShop.vue'),
        props: true,
      },
      {
        path: 'my-party',
        component: () => import('@/views/MyParty.vue'),
      },
      {
        path: 'speakers',
        component: () => import('@/views/MySpeakers.vue'),
      },
      {
        path: 'schedule',
        component: () => import('@/views/MySchedule.vue'),
      },
    ],
  },
  {
    path: '/my-party/:userId?',
    component: () => import('@/views/MyParty.vue'),
    props: true
  },
  {
    path: '/folder/:id?',
    component: () => import ('@/views/FolderPage.vue')
  },
  {
    path: '/my-dashboard/:userId?',
    component: () => import ('@/views/MyDashboard/MyDashboard.vue'),
    props: true,
  },
  {
    path: '/my-dashboard/:userId/my-party',
    component: () => import('@/views/MyParty.vue'),
  },
  {
    path: '/my-tasks/:userId?/',
    component: () => import ('@/views/MyTasks/MyTasks.vue'),
    props: true,
  },
  {
    path: '/my-tasks/:userId?/task/:taskId?',
    component: () => import ('@/views/MyTask/MyTask.vue'),
    props: true,
  },
  {
    path: '/my-abilities/:userId?',
    component: () => import ('@/views/MyAbilities/MyAbilities.vue'),
    props: true,
  },
  {
    path: '/my-gold-points/:userId?',
    component: () => import ('@/views/MyGoldPoints/MyGoldPoints.vue'),
    props: true,
  },
  {
    path: '/my-inventory/:userId',
    component: () => import ('@/views/MyInventory/MyInventory.vue'),
    props: true,
  },
  {
    path: '/xp-membership',
    component: () => import ('@/views/XpMembership/XpMembership.vue'),
  },
  {
    path: '/xp-settings',
    component: () => import ('@/views/XpSettings/XpSettings.vue'),
  },
  {
    path: '/xp-support',
    component: () => import ('@/views/XpSupport/XpSupport.vue'),
  },
  {
    path: '/',
    component: () => import ('@/views/XpAbout/XpAbout.vue'),
  },
  {
    path: '/log-out',
    component: () => import ('@/views/LogOut/LogOut.vue'),
  },
  {
    path: '/log-in',
    component: () => import ('@/views/LogIn/LogIn.vue'),
    meta: {
      requiresAuth: false
    }
  },
  // {
  //   path: '/accessory-shop/:userId?',
  //   component: () => import ('@/views/Xp/Xp.vue'),
  //   props: true,
  // },
]
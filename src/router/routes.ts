export default [
  {
    path: '/',
    redirect: '/log-in'
    // component: () => import ('@/views/StartScreen/StartScreen.vue'),
  },
  // Switch Profile
  {
    path: '/switch-profile',
    name: 'switch-profile',
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
        redirect: to => ({
          name: "my-home",
          params: { userId: to.params.userId },
        }),
      },
      {
        path: 'my-home',
        name: 'my-home',
        meta: {
          faIcon: 'home'
        },
        component: () => import ('@/views/MyHome/MyHome.vue'),
        children: [
          {
            path: 'storage',
            name: 'storage',
            component: () => import ('@/views/MyStorage/MyStorage.vue'),
          },
        ]
      },
      {
        path: 'my-dashboard',
        name: 'my-dashboard',
        meta: {
          faIcon: 'dungeon'
        },
        component: () => import ('@/views/MyDashboard/MyDashboard.vue'),
        props: true,
      },
      {
        path: 'shop',
        name: 'shop',
        meta: {
          faIcon: 'store'
        },
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
      {
        path: 'the-city',
        name: 'the-city',
        meta: {
          faIcon: 'building'
        },
        component: () => import ('@/views/TheCity/TheCity.vue'),
      },
      {
        path: 'world-map',
        name: 'world-map',
        meta: {
          faIcon: 'globe'
        },
        component: () => import ('@/views/WorldMap/WorldMap.vue'),
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
    path: '/my-dashboard/:userId/my-party',
    component: () => import('@/views/MyParty.vue'),
  },
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
    path: '/about-xp',
    component: () => import ('@/views/XpAbout/XpAbout.vue'),
  },
  {
    path: '/log-out',
    name: 'log-out',
    component: () => import ('@/views/LogOut/LogOut.vue'),
  },
  {
    name: 'log-in',
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
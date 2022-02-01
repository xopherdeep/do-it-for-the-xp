export default [
  // Switch Profile
  {
    path: '',
    component: () => import ('@/views/SwitchProfile.vue')
  },
  {
    path: '/about-xp',
    component: () => import ('@/views/AboutXP/AboutXP.vue')
  },
  {
    path: '/my-portal/:id',
    component: () => import ('@/views/MyPortal/MyPortal.vue'),
    props: true,
    children: [
      {
        path: '',
        component: () => import ('@/views/MyDashboard/MyDashboard.vue'),
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
    path: '/folder/:id?',
    component: () => import ('@/views/FolderPage.vue')
  },
  {
    path: '/my-dashboard/:id?',
    component: () => import ('@/views/MyDashboard/MyDashboard.vue'),
    props: true,
  },
  {
        path: '/my-dashboard/:id/my-party',
        component: () => import('@/views/MyParty.vue'),
  },
  {
    path: '/tabs/schedule',
    component: () => import ('@/views/MySchedule.vue')
  },
  {
    path: '/tabs/speakers',
    component: () => import ('@/views/MySpeakers.vue')
  }
]
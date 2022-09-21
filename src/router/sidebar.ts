const SidebarRoutes = [
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
    path: '/xp-membership',
    component: () => import ('@/views/XpMembership/XpMembership.vue'),
  },
  {
    path: '/xp-settings',
    name: 'xp-settings',
    component: () => import ('@/views/XpSettings/XpSettings.vue'),
    children: [
      {
        path: '',
        component: () => import ('@/views/XpSettingsHome/XpSettingsHome.vue'),
      },
      {
        path: 'general',
        component: () => import ('@/views/XpSettings/components/GeneralSettings.vue'),
      },
      {
        path: 'family',
        component: () => import ('@/views/XpSettings/components/FamilySettings.vue'),
      },
      {
        path: 'sound',
        component: () => import ('@/views/XpSettings/components/SoundSettings.vue'),
      },
    ],
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
]

export default SidebarRoutes

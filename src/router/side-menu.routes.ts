const SideMenu = [
  {
    path: '/',
    redirect: '/log-in'
    // component: () => import ('@/views/StartScreen/StartScreen.vue'),
  },
  // Switch Profile
  {
    path: '/switch-profile',
    name: 'switch-profile',
    component: () => import ('@/views/XpSideMenu/SwitchProfile.vue'),
    meta: {
      requiresAuth: false
    }
  },
  {
    path: '/xp-membership',
    component: () => import ('@/views/XpSideMenu/XpMembership/XpMembership.vue'),
  },
  {
    path: '/xp-settings',
    name: 'xp-settings',
    component: () => import ('@/views/XpSideMenu/XpSettings/XpSettings.vue'),
    children: [
      {
        path: '',
        component: () => import ('@/views/XpSideMenu/XpSettingsHome/XpSettingsHome.vue'),
      },
      {
        path: 'general',
        component: () => import ('@/views/XpSideMenu/XpSettings/components/GeneralSettings.vue'),
      },
      {
        path: 'family',
        component: () => import ('@/views/XpSideMenu/XpSettings/components/FamilySettings.vue'),
      },
      {
        path: 'sound',
        component: () => import ('@/views/XpSideMenu/XpSettings/components/SoundSettings.vue'),
      },
    ],
  },
  {
    path: '/xp-support',
    component: () => import ('@/views//XpSideMenu/XpSupport/XpSupport.vue'),
  },
  {
    path: '/about-xp',
    component: () => import ('@/views/XpSideMenu/XpAbout/XpAbout.vue'),
  },
  {
    path: '/log-out',
    name: 'log-out',
    component: () => import ('@/views/XpSideMenu/LogOut/LogOut.vue'),
  },
  {
    name: 'log-in',
    path: '/log-in',
    component: () => import ('@/views/XpSideMenu/LogIn/LogIn.vue'),
    meta: {
      requiresAuth: false
    }
  },
]

export default SideMenu

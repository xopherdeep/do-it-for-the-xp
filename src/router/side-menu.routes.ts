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
    component: () => import ('@/views/App/SideMenu/SwitchProfile/SwitchProfile.vue'),
    meta: {
      requiresAuth: false
    }
  },
  {
    path: '/xp-membership',
    component: () => import ('@/views/App/SideMenu/XpMembership/XpMembership.vue'),
  },
  {
    path: '/xp-settings',
    name: 'xp-settings',
    component: () => import ('@/views/App/SideMenu/XpSettings/XpSettings.vue'),
    children: [
      {
        path: '',
        name: 'xp-settings-home',
        component: () => import ('@/views/App/SideMenu/XpSettingsHome/XpSettingsHome.vue'),
      },
      {
        path: 'general',
        name: 'xp-settings-general',
        component: () => import ('@/views/App/SideMenu/XpSettings/components/GeneralSettings.vue'),
      },
      {
        path: 'family',
        name: 'xp-settings-family',
        component: () => import ('@/views/App/SideMenu/XpSettings/components/FamilySettings.vue'),
      },
      {
        path: 'sound',
        name: 'xp-settings-sound',
        component: () => import ('@/views/App/SideMenu/XpSettings/components/SoundSettings.vue'),
      },
    ],
  },
  {
    path: '/xp-support',
    component: () => import ('@/views/App/SideMenu/XpSupport/XpSupport.vue'),
  },
  {
    path: '/about-xp',
    component: () => import ('@/views/App/SideMenu/XpAbout/XpAbout.vue'),
  },
  {
    path: '/log-out',
    name: 'log-out',
    component: () => import ('@/views/App/SideMenu/LogOut/LogOut.vue'),
  },
  {
    name: 'log-in',
    path: '/log-in',
    component: () => import ('@/views/App/SideMenu/LogIn/LogIn.vue'),
    meta: {
      requiresAuth: false
    }
  },
]

export default SideMenu

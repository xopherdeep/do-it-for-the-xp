const SideMenu = [
  {
    path: '/',
    redirect: '/log-in'
    // component: () => import ('@/views/StartScreen/StartScreen.vue'),
  },

  // Game Master
  // Switch Profile
  {
    path: '/switch-profile',
    name: 'switch-profile',
    component: () => import('@/views/App/SideMenu/SwitchProfile/SwitchProfile.vue'),
    meta: {
      requiresAuth: false
    }
  },
  {
    path: '/game-master',
    name: 'game-master',
    component: () => import('@/views/App/SideMenu/XpGameMaster/XpGameMaster.vue'),
    children: [
      {
        path: '',
        name: 'xp-dashboard',
        component: () => import("../views/App/SideMenu/XpGameMaster/XpDashboard/XpDashboard.vue"),
      },
      {
        path: 'achievements',
        name: 'xp-achievements',
        component: () => import('@/views/App/SideMenu/XpGameMaster/XpAchievements/XpAchievements.vue'),
      },
      {
        path: 'beastiary',
        name: 'xp-beastiary',
        component: () => import('@/views/App/SideMenu/XpGameMaster/XpBeastiary/XpBeastiary.vue'),
      },
    ],
  },
  {
    path: '/add-achievement/:id?',
    name: 'xp-add-achievement',
    component: () => import('@/views/App/SideMenu/XpGameMaster/XpAchievements/XpAddAchievement/XpAddAchievement.vue'),
    props: true
  },
  {
    path: '/discover-achievements',
    name: 'xp-discover-achievements',
    component: () => import('@/views/App/SideMenu/XpGameMaster/XpAchievements/XpDiscoverAchievements/XpDiscoverAchievements.vue'),
  },
  {
    path: '/xp-membership',
    component: () => import('@/views/App/SideMenu/XpMembership/XpMembership.vue'),
  },
  {
    path: '/xp-settings',
    name: 'xp-settings',
    component: () => import('@/views/App/SideMenu/XpSettings/XpSettings.vue'),
    children: [
      {
        path: '',
        name: 'xp-settings-home',
        component: () => import('@/views/App/SideMenu/XpSettingsHome/XpSettingsHome.vue'),
      },
      {
        path: 'general',
        name: 'xp-settings-general',
        component: () => import('@/views/App/SideMenu/XpSettings/components/GeneralSettings.vue'),
      },
      {
        path: 'family',
        name: 'xp-settings-family',
        component: () => import('@/views/App/SideMenu/XpSettings/components/FamilySettings.vue'),
      },
      {
        path: 'sound',
        name: 'xp-settings-sound',
        component: () => import('@/views/App/SideMenu/XpSettings/components/SoundSettings.vue'),
      },
    ],
  },
  {
    path: '/xp-support',
    component: () => import('@/views/App/SideMenu/XpSupport/XpSupport.vue'),
  },
  {
    path: '/tell-a-friend',
    component: () => import('@/views/App/SideMenu/XpShareApp/XpShareApp.vue'),
  },
  {
    path: '/about-xp',
    component: () => import('@/views/App/SideMenu/XpAbout/XpAbout.vue'),
  },
  {
    path: '/log-out',
    name: 'log-out',
    component: () => import('@/views/App/SideMenu/LogOut/LogOut.vue'),
  },
  {
    name: 'log-in',
    path: '/log-in',
    component: () => import('@/views/App/SideMenu/LogIn/LogIn.vue'),
    meta: {
      requiresAuth: false
    }
  },
]

export default SideMenu

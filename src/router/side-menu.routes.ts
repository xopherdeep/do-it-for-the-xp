const SideMenu = [
  {
    path: '/',
    redirect: '/log-in',
    // component: () => import ('@/views/StartScreen/StartScreen.vue'),
    meta: {
      title: "Do it for the XP"
    }
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
        name: 'dashboard',
        redirect: '/game-master/dashboard',
      },
      {
        path: 'dashboard',
        name: 'xp-dashboard',
        component: () => import("../views/App/SideMenu/XpGameMaster/XpDashboard/XpDashboard.vue"),
      },
      {
        path: 'compendium',
        name: 'xp-compendium',
        component: () => import("../views/App/SideMenu/XpGameMaster/XpCompendium/XpCompendium.vue"),
        children: [
          {
            path: '',
            name: 'achievements',
            redirect: '/game-master/compendium/achievements',
          },
          {
            path: 'achievements',
            name: 'xp-achievements',
            component: () => import('@/views/App/SideMenu/XpGameMaster/XpAchievements/XpAchievements.vue'),
          },
          {
            path: 'bestiary',
            name: 'xp-bestiary',
            component: () => import('@/views/App/SideMenu/XpGameMaster/XpBestiary/XpBestiary.vue'),
          },
          {
            path: 'accessories',
            name: 'xp-accessories',
            component: () => import('@/views/App/SideMenu/XpGameMaster/XpAccessories/XpAccessories.vue'),
          },
          {
            path: 'accessories/create-update/:id?',
            name: 'xp-create-update-accessory',
            component: () => import('@/views/App/SideMenu/XpGameMaster/XpAccessories/components/XpCreateUpdateAccessory.vue'),
          },
          {
            path: 'abilities',
            name: 'xp-abilities',
            component: () => import('@/views/App/SideMenu/XpGameMaster/XpAbilities/XpAbilities.vue'),
            children: [
              {
                path: 'create-update/:id?',
                name: 'xp-create-update-ability',
                component: () => import('@/views/App/SideMenu/XpGameMaster/XpAbilities/components/XpCreateUpdateAbility.vue'),
              },
            ],
          },
        ]
      },
      {
        path: 'temples',
        name: 'xp-temples',
        component: () => import("../views/App/SideMenu/XpGameMaster/XpTemples"),
      },
      {
        path: 'do-this-not-that/:id?',
        name: 'xp-do-this-not-that',
        component: () => import('@/views/App/SideMenu/XpGameMaster/XpDoThisNotThat/XpDoThisNotThat.vue'),
        props: true
      },
    ],
  },
  {
    path: '/temple-setting/:templeId',
    name: 'xp-temple-settings',
    component: () => import('@/views/App/SideMenu/XpGameMaster/XpTemples/components/XpTempleSettings.vue'),
    props: true
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
      requiresAuth: false,
      title: "Do it for the XP"
    }
  },
]

export default SideMenu

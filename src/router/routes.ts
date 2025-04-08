
export default [
  ...SideMenuRoutes,
  ...MyProfileRoutes,
  ...MyHomeRoutes,
  ...HometownRoutes,
  ...supportRoutes,
  MyPortalRoutes,
  {
    path: '/user/:userId?',
    component: () => import('@/views/App/UserProfile/UserProfile.vue'),
    props: true
  },
  {
    path: '/battle-ground/:userId?',
    name: 'battle-ground',
    meta: {
      faIcon: 'dungeon'
    },
    component: () => import('@/views/MyPortal/HomeTown/BattleGround/BattleGround.vue'),
    props: true,
  },
]

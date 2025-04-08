import SideMenuRoutes from './side-menu.routes';
import MyProfileRoutes from './my-profile.routes';
import MyHomeRoutes from './my-home.routes';
import MyPortalRoutes from './my-portal.routes';
import HometownRoutes from './hometown.routes';
import supportRoutes from './support';

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

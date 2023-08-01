import SideMenuRoutes from './side-menu.routes';
import MyProfileRoutes from './my-profile.routes';
import MyHomeRoutes from './my-home.routes';
import MyPortalRoutes from './my-portal.routes';
import HometownRoutes from './hometown.routes';

export default [
  ...SideMenuRoutes,
  ...MyProfileRoutes,
  ...MyHomeRoutes,
  ...HometownRoutes,
  {
    path: '/user/:userId?',
    component: () => import ('@/views/UserProfile/UserProfile.vue'),
    props: true
  },
  {
    path: '/my-portal/:userId',
    component: () => import ('@/views/MyPortal/MyPortal.vue'),
    props: true,
    children: MyPortalRoutes,
  },
  {
    path: '/my-dashboard',
    name: 'my-dashboard',
    meta: {
      faIcon: 'dungeon'
    },
    component: () => import ('@/views/BattleGround/BattleGround.vue'),
    props: true,
  },
]
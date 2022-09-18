import HometownRoutes from './hometown';
import MyHomeRoutes from './my-home';
import MyPortalRoutes from './my-portal';
import MyProfileRoutes from './my-profile';
import SidebarRoutes from './sidebar';

export default [
  ...SidebarRoutes,
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
    path: '/my-party/:userId?',
    component: () => import('@/views/MyParty.vue'),
    props: true
  },
  {
    path: '/my-dashboard/:userId/my-party',
    component: () => import('@/views/MyParty.vue'),
  },
  {
    path: '/my-dashboard',
    name: 'my-dashboard',
    meta: {
      faIcon: 'dungeon'
    },
    component: () => import ('@/views/MyDashboard/MyDashboard.vue'),
    props: true,
  },
  // {
  //   path: '/accessory-shop/:userId?',
  //   component: () => import ('@/views/Xp/Xp.vue'),
  //   props: true,
  // },
]
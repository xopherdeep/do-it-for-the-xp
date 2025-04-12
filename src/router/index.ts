// Impordules
import SideMenuRoutes  from './side-menu.routes';
import MyProfileRoutes from './my-profile.routes';
import MyHomeRoutes from './my-home.routes';
import MyPortalRoutes from './my-portal.routes';
import HometownRoutes from './hometown.routes';
import supportRoutes from './support';
import WorldMapRoutes from './world-map.routes';
import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import { useRouterGuards } from './guard.routes';

// Combine all routes
const routes: Array<RouteRecordRaw> = [
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
  {
    path: '/dev/component-showcase', // Hidden path for developers
    name: 'component-showcase',
    component: () => import('@/views/Dev/ComponentShowcase.vue'),
  },
];

// Create and export router factory function
export const createAppRouter = (store) => {
  const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),
    routes
  });
  
  // Apply router guards
  useRouterGuards(router, store);
  
  return router;
};

// Export all route collections for potential reuse
export {
  SideMenuRoutes,
  MyProfileRoutes,
  MyHomeRoutes,
  MyPortalRoutes,
  HometownRoutes,
  supportRoutes,
  WorldMapRoutes
};

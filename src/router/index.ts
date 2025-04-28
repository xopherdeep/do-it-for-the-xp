// Impordules
import SideMenuRoutes  from './side-menu.routes';
import MyProfileRoutes from './my-profile.routes';
import MyHomeRoutes from './my-home.routes';
import MyPortalRoutes from './my-portal.routes';
import HometownRoutes from './hometown.routes';
import SupportRoutes from './support.routes';
import WorldMapRoutes from './world-map.routes';
import DevRoutes from './dev.routes';
import { createRouter, createWebHistory, createWebHashHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import { useRouterGuards } from './guard.routes';
import { Capacitor } from '@capacitor/core';

// Combine all routes
const routes: Array<RouteRecordRaw> = [
  ...SideMenuRoutes,
  ...MyProfileRoutes,
  ...MyHomeRoutes,
  ...HometownRoutes,
  ...SupportRoutes,
  ...MyPortalRoutes,
  ...DevRoutes,
  {
    path: '/battle-ground/:userId?',
    name: 'battle-ground',
    meta: {
      faIcon: 'dungeon'
    },
    component: () => import('@/views/Console/MyPortal/HomeTown/BattleGround/BattleGround'),
    props: true,
  },
];

// Create and export router factory function
export const createAppRouter = (store) => {
  // Use hash mode for production builds and Capacitor apps
  // This helps with navigation in production builds
  const isNative = Capacitor.isNativePlatform();
  const isProduction = process.env.NODE_ENV === 'production';
  
  const router = createRouter({
    history: (isNative || isProduction) 
      ? createWebHashHistory(process.env.BASE_URL)
      : createWebHistory(process.env.BASE_URL),
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
  SupportRoutes,
  WorldMapRoutes,
  DevRoutes
};

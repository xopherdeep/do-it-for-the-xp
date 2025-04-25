// Impordules
import SideMenuRoutes  from './side-menu.routes';
import MyProfileRoutes from './my-profile.routes';
import MyHomeRoutes from './my-home.routes';
import MyPortalRoutes from './my-portal.routes';
import HometownRoutes from './hometown.routes';
import SupportRoutes from './support';
import WorldMapRoutes from './world-map.routes';
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
  {
    path: '/battle-ground/:userId?',
    name: 'battle-ground',
    meta: {
      faIcon: 'dungeon'
    },
    component: () => import('@/views/Console/MyPortal/HomeTown/BattleGround/BattleGround'),
    props: true,
  },
  {
    path: '/dev', // Main developer dashboard
    name: 'dev-dashboard',
    component: () => import('@/views/Dev/DevDashboard.vue'),
  },
  {
    path: '/dev/component-showcase', // Hidden path for developers
    name: 'component-showcase',
    component: () => import('@/views/Dev/ComponentShowcase.vue'),
  },
  {
    path: '/dev/dialog-demo', // Dialog system demo
    name: 'dialog-demo',
    component: () => import('@/views/Dev/DialogDemo.vue'),
  },
  {
    path: '/dev/battleroom', // Battleroom development tools
    name: 'battleroom-dev',
    component: () => import('@/views/Dev/BattleroomDevTools/BattleroomDevTools.vue'),
  },
  {
    path: '/dev/weatherfx', // Weather FX development tools
    name: 'weatherfx-dev',
    component: () => import('@/views/Dev/WeatherFXDevTools/WeatherFXDevTools.vue'),
  },
  {
    path: '/dev/soundfx', // Sound FX development tools
    name: 'soundfx-dev',
    component: () => import('@/views/Dev/SoundFXDevTools/SoundFXDevTools.vue'),
  },
  {
    path: '/dev/intro-splash', // Intro Splash demo
    name: 'intro-splash-demo',
    component: () => import('@/views/Dev/IntroSplashDemo.vue'),
  },
  {
    path: '/dev/dungeon-background', // Dungeon Background Designer
    name: 'dungeon-background-designer',
    component: () => import('@/views/App/SideMenu/XpSupport/DevTools/DungeonBackgroundDesigner/DungeonBackgroundDesigner.vue'),
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
  WorldMapRoutes
};

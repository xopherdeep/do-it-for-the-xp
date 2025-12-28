// Impordules
import SideMenuRoutes  from './side-menu.routes';
import UserHudRoutes from './user-hud.routes';
import MyHomeRoutes from './my-home.routes';
import MyPortalRoutes from './my-portal.routes';
import HometownRoutes from './hometown.routes';
import SupportRoutes from './support.routes';
import WorldMapRoutes from './world-map.routes';
import DevRoutes from './dev.routes';
import GameMasterRoutes from './game-master.routes';
import SettingsRoutes from './settings.routes';
import { createRouter, createWebHistory, createWebHashHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import { useRouterGuards } from './guard.routes';
import { Capacitor } from '@capacitor/core';

// Combine all routes
const routes: Array<RouteRecordRaw> = [
  ...SideMenuRoutes,
  ...UserHudRoutes,
  ...MyHomeRoutes,
  ...HometownRoutes,
  ...SupportRoutes,
  ...MyPortalRoutes,

  ...GameMasterRoutes,
  ...SettingsRoutes,
  ...DevRoutes,

  // XP Intro Page
  {
    path: "/xp-intro",
    name: "xp-intro",
    component: () => import("@/views/App/XpIntro/XpIntro.vue"),
  },

  // Start Screen / Login
  {
    name: "log-in",
    path: "/log-in",
    component: () => import("@/views/App/LogIn/LogIn.vue"),
    meta: {
      requiresAuth: false,
      title: "Do it for the XP",
    },
  },

  // XP Demo Page - World Showcase
  {
    path: "/xp-demo",
    name: "xp-demo",
    component: () => import("@/views/App/XpDemo/XpDemo.vue"),
  },

  // Battle Field Routes
  {
    path: "/battle-field/:userId?",
    name: "battle-field",
    meta: {
      faIcon: "dungeon",
    },
    component: () => import("@/views/Console/BattleField/BattleField.vue"),
    props: true,
  },
  {
    path: "/battle-field/:beastIds/:userIds?",
    name: "battle-field-with-participants",
    meta: {
      faIcon: "dungeon",
    },
    component: () => import("@/views/Console/BattleField/BattleField.vue"),
    props: true,
  },
  // Temple Room Battle - /battle-field/temple/:templeId/:level/:x/:y
  {
    path: "/battle-field/temple/:templeId/:level/:x/:y",
    name: "battle-field-temple",
    meta: {
      faIcon: "dungeon",
      battleType: "temple" // Metadata to identify the battle context
    },
    component: () => import("@/views/Console/BattleField/BattleField.vue"),
    props: true,
  },
  // Quest Battle - /battle-field/quest/:questId
  {
    path: "/battle-field/quest/:questId",
    name: "battle-field-quest",
    meta: {
      faIcon: "dungeon",
      battleType: "quest"
    },
    component: () => import("@/views/Console/BattleField/BattleField.vue"),
    props: true,
  },
];

// Create and export router factory function
export const createAppRouter = () => {
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
  useRouterGuards(router);
  
  return router;
};

// Export all route collections for potential reuse
export {
  SideMenuRoutes,
  UserHudRoutes as MyProfileRoutes,
  MyHomeRoutes,
  MyPortalRoutes,
  HometownRoutes,
  SupportRoutes,
  WorldMapRoutes,
  DevRoutes,
  GameMasterRoutes,
  SettingsRoutes
};

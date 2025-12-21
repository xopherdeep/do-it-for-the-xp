import { RouteRecordRaw } from "vue-router";

export const SideMenuRoutes: Array<RouteRecordRaw> = [
  {
    path: "/",
    redirect: "/xp-intro",
    // component: () => import ('@/views/StartScreen/StartScreen.vue'),
    meta: {
      title: "Do it for the XP",
    },
  },

  // Switch Profile
  {
    path: "/xp-profile", // Changed path
    name: "xp-profile",
    component: () =>
      import("@/views/App/SideMenu/SwitchProfile/SwitchProfile.vue"),
    meta: {
      // requiresAuth: false
    },
  },
  // Game Master route - imported from separate file
  {
    path: "/xp-membership",
    component: () =>
      import("@/views/App/SideMenu/XpMembership/XpMembership.vue"),
  },
  {
    path: "/support",
    name: "support",
    component: () => import("@/views/App/SideMenu/XpSupport/XpSupport.vue"),
  },
  {
    path: "/tell-a-friend",
    component: () => import("@/views/App/SideMenu/XpShareApp/XpShareApp.vue"),
  },
  {
    path: "/about-xp",
    component: () => import("@/views/App/SideMenu/XpAbout/XpAbout.vue"),
  },
  {
    path: "/about-xp/gp",
    name: "about-xp-gp",
    component: () => import("@/views/App/SideMenu/XpAbout/XpAboutGp.vue"),
  },
  {
    path: "/about-xp/xp",
    name: "about-xp-xp",
    component: () => import("@/views/App/SideMenu/XpAbout/XpAboutXp.vue"),
  },
  {
    path: "/about-xp/ap",
    name: "about-xp-ap",
    component: () => import("@/views/App/SideMenu/XpAbout/XpAboutAp.vue"),
  },
  {
    path: "/rpg-text-demo",
    name: "rpg-text-demo",
    component: () => import("@/views/App/SideMenu/XpAbout/RpgTextDemo.vue"),
  },
  {
    path: "/log-out",
    name: "log-out",
    component: () => null // Caught by router guard
  },
];

export default SideMenuRoutes;

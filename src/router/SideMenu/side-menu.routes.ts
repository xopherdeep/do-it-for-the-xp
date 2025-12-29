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
      import("@/app/SideMenu/SwitchProfile/SwitchProfile.vue"),
    meta: {
      // requiresAuth: false
    },
  },
  // Game Master route - imported from separate file
  {
    path: "/xp-membership",
    component: () =>
      import("@/app/SideMenu/XpMembership/XpMembership.vue"),
  },
  {
    path: "/support",
    name: "support",
    component: () => import("@/app/SideMenu/XpSupport/XpSupport.vue"),
  },
  {
    path: "/tell-a-friend",
    component: () => import("@/app/SideMenu/XpShareApp/XpShareApp.vue"),
  },
  {
    path: "/about-xp",
    component: () => import("@/app/SideMenu/XpAbout/XpAbout.vue"),
  },
  {
    path: "/about-xp/gp",
    name: "about-xp-gp",
    component: () => import("@/app/SideMenu/XpAbout/XpAboutGp.vue"),
  },
  {
    path: "/about-xp/xp",
    name: "about-xp-xp",
    component: () => import("@/app/SideMenu/XpAbout/XpAboutXp.vue"),
  },
  {
    path: "/about-xp/ap",
    name: "about-xp-ap",
    component: () => import("@/app/SideMenu/XpAbout/XpAboutAp.vue"),
  },
  {
    path: "/rpg-text-demo",
    name: "rpg-text-demo",
    component: () => import("@/app/SideMenu/XpAbout/RpgTextDemo.vue"),
  },
  {
    path: "/log-out",
    name: "log-out",
    component: () => null // Caught by router guard
  },
];

export default SideMenuRoutes;

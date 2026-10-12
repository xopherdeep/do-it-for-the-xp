import { RouteRecordRaw } from "vue-router";

/** XP Pro: the shop counter and the page Stripe sends the parent back to. */
export const ProRoutes: RouteRecordRaw[] = [
  {
    path: "/pro",
    name: "xp-pro",
    component: () => import("@/app/SideMenu/XpPro/XpGoPro/XpGoPro.vue"),
  },
  {
    path: "/pro/return",
    name: "xp-pro-return",
    component: () => import("@/app/SideMenu/XpPro/XpProReturn/XpProReturn.vue"),
    // Stripe lands here after a full page load, before anyone has signed in again
    meta: { requiresAuth: false },
  },
];

export default ProRoutes;

import { RouteRecordRaw } from "vue-router";

/** XP Pro: the old shop address and the page Stripe sends the parent back to. */
export const ProRoutes: RouteRecordRaw[] = [
  {
    path: "/pro",
    name: "xp-pro",
    // the shop lives on the XP Pro page; old links, the upsell and the deep-link guard still arrive here
    redirect: (to) => ({ name: "xp-membership", query: to.query }),
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

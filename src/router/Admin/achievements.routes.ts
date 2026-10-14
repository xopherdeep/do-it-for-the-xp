import { RouteRecordRaw } from "vue-router";

const CONFIG = "/game-master/compendium/achievements/config";

export const AchievementRoutes: RouteRecordRaw[] = [
  {
    path: "achievements",
    name: "xp-achievements",
    component: () =>
      import(
        "@/app/Admin/XpCompendium/views/XpAchievements/XpAchievements.vue"
      ),
  },
  // The quest config is one page, the wizard (What's the chore? -> Who? -> When? -> How hard? -> Ready?). The step is
  // the page's own state, not a route; "dashboard" stays the name callers push (the quest list, the temple room editor).
  {
    path: "achievements/config/:id/dashboard",
    name: "xp-achievement-config-dashboard",
    component: () =>
      import(
        "@/app/Admin/XpCompendium/views/XpAchievements/XpConfigAchievement/XpConfigAchievement.vue"
      ),
    props: true,
  },
  // A link without the page name, and the old tab addresses (heros, when, points, quest-type), land on the wizard
  {
    path: "achievements/config/:id",
    name: "xp-achievement-config",
    redirect: (to) => `${CONFIG}/${to.params.id || "new"}/dashboard`,
  },
  {
    path: "achievements/config/:id/:tab(heros|when|points|quest-type)",
    redirect: (to) => `${CONFIG}/${to.params.id || "new"}/dashboard`,
  },
];

export default AchievementRoutes;

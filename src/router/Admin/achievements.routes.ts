import { RouteRecordRaw } from "vue-router";

export const AchievementRoutes: RouteRecordRaw[] = [
  {
    path: "achievements",
    name: "xp-achievements",
    component: () =>
      import(
        "@/app/Admin/XpCompendium/views/XpAchievements/XpAchievements.vue"
      ),
  },
  {
    path: "achievements/config/:id",
    component: () =>
      import(
        "@/app/Admin/XpCompendium/views/XpAchievements/XpConfigAchievement/XpConfigAchievement.vue"
      ),
    props: true,
    children: [
      {
        path: "",
        name: "xp-achievement-config",
        redirect: (to: any) => `/game-master/compendium/achievements/config/${to.params.id || 'new'}/dashboard`,
      },
      {
        path: "dashboard",
        name: "xp-achievement-config-dashboard",
        component: () => import("@/app/Admin/XpCompendium/views/XpAchievements/XpConfigAchievement/components/tabs/QuestDashboardTab.vue"),
        props: true,
      },
      {
        path: "heros",
        name: "xp-achievement-config-heros",
        component: () => import("@/app/Admin/XpCompendium/views/XpAchievements/XpConfigAchievement/components/tabs/QuestHerosTab.vue"),
        props: true,
      },
      {
        path: "when",
        name: "xp-achievement-config-when",
        component: () => import("@/app/Admin/XpCompendium/views/XpAchievements/XpConfigAchievement/components/tabs/QuestScheduleTab.vue"),
        props: true,
      },
      {
        path: "points",
        name: "xp-achievement-config-points",
        component: () => import("@/app/Admin/XpCompendium/views/XpAchievements/XpConfigAchievement/components/tabs/QuestRewardsTab.vue"),
        props: true,
      },
      {
        path: "quest-type",
        name: "xp-achievement-config-type",
        component: () => import("@/app/Admin/XpCompendium/views/XpAchievements/XpConfigAchievement/components/tabs/QuestTypeTab.vue"),
        props: true,
      },
    ]
  },
];

export default AchievementRoutes;

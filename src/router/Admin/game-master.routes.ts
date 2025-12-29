import { RouteRecordRaw } from "vue-router";
import CompendiumRoutes from "./compendium.routes";

export const GameMasterRoutes: RouteRecordRaw[] = [{
  path: "/game-master",
  name: "game-master",
  component: () =>
    import("@/app/Admin/XpGameMaster.vue"),
  children: [
    {
      path: "",
      name: "dashboard",
      redirect: "/game-master/dashboard",
    },
    {
      path: "dashboard",
      name: "xp-dashboard",
      component: () =>
        import(
          "@/app/Admin/XpDashboard/XpDashboard.vue"
        ),
    },
    ...CompendiumRoutes,
    {
      path: "chat",
      name: "xp-chat",
      component: () =>
        import("@/app/Admin/XpChat/XpChat.vue"),
    },
    {
      path: "do-this-not-that/:id?",
      name: "xp-do-this-not-that",
      component: () =>
        import(
          "@/app/Admin/XpDoThisNotThat/XpDoThisNotThat.vue"
        ),
      props: true,
    },

    {
      path: "add-beast/:id?",
      name: "xp-add-beast",
      component: () =>
        import(
          "@/app/Admin/XpBestiary/components/XpAddBeast.vue"
        ),
      props: true,
    },
    {
      path: "add-ability/:id?",
      name: "xp-add-ability",
      component: () =>
        import(
          "@/app/Admin/XpAbilities/components/XpCreateUpdateAbility.vue"
        ),
      props: true,
    },
    {
      path: "discover-achievements",
      name: "xp-discover-achievements",
      component: () =>
        import(
          "@/app/Admin/XpAchievements/XpDiscoverAchievements/XpDiscoverAchievements.vue"
        ),
    },
  ],
}];

export default GameMasterRoutes;
// touch

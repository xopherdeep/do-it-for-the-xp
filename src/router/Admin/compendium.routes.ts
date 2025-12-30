import { RouteRecordRaw } from "vue-router";
import AchievementRoutes from "./achievements.routes";
import BestiaryRoutes from "./bestiary.routes";
import EconomyRoutes from "./economy.routes";
import AbilityRoutes from "./abilities.routes";
import TempleRoutes from "./temples.routes";

export const CompendiumRoutes: RouteRecordRaw[] = [
  {
    path: "compendium",
    component: () =>
      import(
        "@/app/Admin/XpCompendium/CompendiumRoot.vue"
      ),
    children: [
      {
        path: "",
        name: "xp-compendium",
        redirect: "/game-master/compendium/setup",
      },
      {
        path: "setup",
        component: () =>
          import(
            "@/app/Admin/XpCompendium/XpCompendium.vue"
          ),
        children: [
          {
            path: "",
            name: "xp-compendium-setup",
            redirect: "/game-master/compendium/setup/dashboard",
          },
          {
            path: "dashboard",
            name: "xp-compendium-dashboard",
            component: () =>
              import(
                "@/app/Admin/XpCompendium/CompendiumDashboard.vue"
              ),
          },
          ...AchievementRoutes,
          ...BestiaryRoutes,
          ...EconomyRoutes,
          ...AbilityRoutes,
          ...TempleRoutes,
        ],
      },
    ],
  },
];

export default CompendiumRoutes;

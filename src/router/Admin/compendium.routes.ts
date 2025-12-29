import { RouteRecordRaw } from "vue-router";
import AchievementRoutes from "./achievements.routes";
import BestiaryRoutes from "./bestiary.routes";
import EconomyRoutes from "./economy.routes";
import AbilityRoutes from "./abilities.routes";
import TempleRoutes from "./temples.routes";

export const CompendiumRoutes: RouteRecordRaw[] = [
  {
    path: "compendium",
    name: "xp-compendium",
    component: () =>
      import(
        "@/app/Admin/XpCompendium/CompendiumRoot.vue"
      ),
    children: [
      {
        path: "",
        redirect: "/game-master/compendium/setup",
      },
      {
        path: "setup",
        name: "xp-compendium-setup",
        component: () =>
          import(
            "@/app/Admin/XpCompendium/XpCompendium.vue"
          ),
        children: [
          {
            path: "",
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

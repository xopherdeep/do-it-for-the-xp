import { RouteRecordRaw } from "vue-router";

const DevRoutes: Array<RouteRecordRaw> = [
  {
    path: "/dev/",
    name: "dev-dashboard",
    component: () => import("@/views/Dev/DevDashboard.vue"),
    children: [
      {
        path: "component-showcase",
        name: "component-showcase",
        component: () => import("@/views/Dev/ComponentShowcase.vue"),
      },
      {
        path: "dialog-demo",
        name: "dialog-demo",
        component: () => import("@/views/Dev/DialogDemo.vue"),
      },
      {
        path: "weatherfx",
        name: "weatherfx-dev",
        component: () =>
          import("@/views/Dev/WeatherFXDevTools/WeatherFXDevTools.vue"),
      },
      {
        path: "abilities",
        name: "abilities-dev",
        component: () =>
          import("@/views/Dev/AbilityDevTools/AbilityDevTools.vue"),
      },
      {
        path: "soundfx",
        name: "soundfx-dev",
        component: () =>
          import("@/views/Dev/SoundFXDevTools/SoundFXDevTools.vue"),
      },
      {
        path: "intro-splash",
        name: "intro-splash-demo",
        component: () => import("@/views/Dev/IntroSplashDemo.vue"),
      },
      {
        path: "dungeon-background",
        name: "dungeon-background-designer",
        component: () =>
          import(
            "@/views/App/SideMenu/XpSupport/DevTools/DungeonBackgroundDesigner/DungeonBackgroundDesigner.vue"
          ),
      },
    ],
  },
  {
    path: "/dev/battleroom",
    name: "battleroom-dev",
    component: () =>
      import("@/views/Dev/BattleroomDevTools/BattleroomDevTools.vue"),
  },
];

export default DevRoutes;

import { RouteRecordRaw } from "vue-router";

const DevRoutes: Array<RouteRecordRaw> = [
  {
    path: "/dev/",
    name: "dev-dashboard",
    redirect: { name: "dev-tools" }, 
  },
  {
    path: "/dev/component-showcase",
    name: "component-showcase",
    component: () => import("@/views/Dev/ComponentShowcase.vue"),
  },
  {
    path: "/dev/dialog-demo",
    name: "dialog-demo",
    component: () => import("@/views/Dev/DialogDemo.vue"),
  },
  {
    path: "/dev/weatherfx",
    name: "weatherfx-dev",
    component: () =>
      import("@/views/Dev/WeatherFXDevTools/WeatherFXDevTools.vue"),
  },
  {
    path: "/dev/abilities",
    name: "abilities-dev",
    component: () => import("@/views/Dev/AbilityDevTools/AbilityDevTools.vue"),
  },
  {
    path: "/dev/soundfx",
    name: "soundfx-dev",
    component: () => import("@/views/Dev/SoundFXDevTools/SoundFXDevTools.vue"),
  },
  {
    path: "/dev/intro-splash",
    name: "intro-splash-demo",
    component: () => import("@/views/Dev/IntroSplashDemo.vue"),
  },
  {
    path: "/dev/dungeon-background",
    name: "dungeon-background-designer",
    component: () =>
      import(
        "@/views/Dev/DungeonBackgroundDesigner/DungeonBackgroundDesigner.vue"
      ),
  },
  {
    path: "/dev/battle-field",
    name: "battle-field-dev",
    component: () => import("@/views/Console/BattleField/BattleField.vue"),
    props: {
      devMode: true
    }
  },
  {
    path: "/dev/battle-field/:beastIds/:userIds?",
    name: "battle-field-dev-with-params",
    component: () => import("@/views/Console/BattleField/BattleField.vue"),
    props: (route) => ({
      devMode: true,
      beastIds: route.params.beastIds,
      userIds: route.params.userIds
    })
  },
];

export default DevRoutes;

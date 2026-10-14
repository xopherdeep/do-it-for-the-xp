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
    component: () => import("@/app/Dev/ComponentShowcase.vue"),
  },
  {
    path: "/dev/dialog-demo",
    name: "dialog-demo",
    component: () => import("@/app/Dev/DialogDemo.vue"),
  },
  {
    path: "/dev/weatherfx",
    name: "weatherfx-dev",
    component: () =>
      import("@/app/Dev/WeatherFXDevTools/WeatherFXDevTools.vue"),
  },
  {
    path: "/dev/abilities",
    name: "abilities-dev",
    component: () => import("@/app/Dev/AbilityDevTools/AbilityDevTools.vue"),
  },
  {
    path: "/dev/soundfx",
    name: "soundfx-dev",
    component: () => import("@/app/Dev/SoundFXDevTools/SoundFXDevTools.vue"),
  },
  {
    path: "/dev/intro-splash",
    name: "intro-splash-demo",
    component: () => import("@/app/Dev/IntroSplashDemo.vue"),
  },
  {
    path: "/dev/voxels",
    name: "voxel-lab",
    component: () => import("@/app/Dev/VoxelLab.vue"),
  },
  {
    path: "/dev/dungeon-background",
    name: "dungeon-background-designer",
    component: () =>
      import(
        "@/app/Dev/DungeonBackgroundDesigner/DungeonBackgroundDesigner.vue"
      ),
  },
];

export default DevRoutes;

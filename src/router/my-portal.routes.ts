import WorldMapRoutes from "./world-map.routes";

const MyPortalRoutes = [
  {
    path: "",
    redirect: (to) => ({
      name: "my-home",
      params: { userId: to.params.userId },
    }),
  },
  {
    path: "my-home",
    name: "my-home",
    meta: {
      faIcon: "house-user",
    },
    component: () => import("@/views/MyHome/MyHome.vue"),
    children: [],
  },
  {
    path: "my-party",
    meta: {
      faIcon: "fort-awesome",
      hideUserFab: true,
    },
    component: () => import("@/views/MyPortal/MyParty.vue"),
  },
  {
    path: "speakers",
    component: () => import("@/views/MySpeakers.vue"),
  },
  {
    path: "schedule",
    component: () => import("@/views/MySchedule.vue"),
  },
  {
    path: "home-town",
    name: "home-town",
    meta: {
      faIcon: "archway",
    },
    component: () => import("@/views/HomeTown/HomeTown.vue"),
  },
  {
    path: "world-map",
    name: "world-map",
    meta: {
      faIcon: "pegasus",
    },
    component: () => import("@/views/WorldMap/WorldMap.vue"),
  },
  {
    path: "my-profile",
    name: "my-profile",
    meta: {
      faIcon: "user-circle",
      hideUserFab: true,
    },
    component: () => import("@/views/UserMenu/MyProfile/MyProfile.vue"),
  },
  ...WorldMapRoutes
];

export default MyPortalRoutes;

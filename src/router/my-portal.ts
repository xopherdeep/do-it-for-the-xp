import WorldMapRoutes from "./world-map";

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
    component: () => import("@/views/MyParty.vue"),
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
    path: "the-city",
    name: "the-city",
    meta: {
      faIcon: "archway",
    },
    component: () => import("@/views/TheCity/TheCity.vue"),
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
    component: () => import("@/views/MyProfile/MyProfile.vue"),
  },
  ...WorldMapRoutes
];

export default MyPortalRoutes;

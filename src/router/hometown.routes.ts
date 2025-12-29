import { RouteRecordRaw } from "vue-router";

export const HometownRoutes: Array<RouteRecordRaw> = [
  // TOWN
  {
    path: "/shop/:merchant?/:userId?",
    name: "shop",
    meta: {
      faIcon: "store",
    },
    component: () =>
      import("@/app/Console/MyPortal/HomeTown/AccessoryShop/AccessoryShop.vue"),
    props: true,
  },
  {
    path: "/bank/:userId?/",
    name: "bank",
    meta: {
      faIcon: "piggy-bank",
    },
    component: () => import("@/app/Console/MyPortal/HomeTown/GoldBank/GoldBank.vue"),
    props: true,
  },
  {
    path: "/hospital/:userId?/",
    name: "hospital",
    component: () =>
      import("@/app/Console/MyPortal/HomeTown/HospitalHub/HospitalHub.vue"),
    props: true,
  },
  {
    path: "/town-hall/:userId?/",
    name: "town-hall",
    component: () => import("@/app/Console/MyPortal/HomeTown/TownHall/TownHall.vue"),
    meta: {
      faIcon: "landmark",
    },
    props: true,
  },
  {
    path: "/user-stats/:userId?/",
    name: "view-stats",
    component: () =>
      import(
        "@/app/Console/MyPortal/HomeTown/HospitalHub/components/XpViewStats.vue"
      ),
    props: true,
  },
  {
    path: "/temple/:temple/:userId?/:x?/:y?",
    name: "temple",
    component: () =>
      import("@/app/Console/TempleGrounds/TempleGrounds.vue"),
    props: true,
  },

  {
    path: "/hotel/:userId?/",
    name: "hotel",
    component: () => import("@/app/Console/MyPortal/HomeTown/HotelHub/HotelHub.vue"),
    props: true,
  },
  // END TOWN
];

export default HometownRoutes;

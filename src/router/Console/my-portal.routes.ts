import WorldMapRoutes from './world-map.routes';

const MyPortalRoutes = [{
  path: '/my-portal/:userId',
  name: 'my-portal',
  component: () => import('@/app/Console/MyPortal/MyPortal.vue'),
  props: true,
  children: [{
    path: "",
    name: "my-home-redirect",
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
    component: () => import("@/app/Console/MyPortal/MyHome/MyHome.vue"),
    children: [],
  },
  {
    path: "my-party",
    meta: {
      faIcon: "fort-awesome",
      hideUserFab: true,
    },
    component: () => import("@/app/Console/MyPortal/MyParty.vue"),
  },
  {
    path: "home-town",
    name: "home-town",
    meta: {
      faIcon: "archway",
    },
    component: () => import("@/app/Console/MyPortal/HomeTown/HomeTown.vue"),
  },
  {
    path: "world-map",
    name: "world-map",
    meta: {
      faIcon: "pegasus",
    },
    component: () => import("@/app/Console/WorldMap/WorldMap.vue"),
  },
  {
    path: 'my-profile',
    name: 'my-profile',
    meta: {
      faIcon: "user-circle",
      hideUserFab: true,
    },
    component: () => import('@/app/Console/MyPortal/UserProfile/UserProfile.vue'),
    props: true
  },
  ...WorldMapRoutes
  ],
}];

export default MyPortalRoutes;

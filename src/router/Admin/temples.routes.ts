import { RouteRecordRaw } from "vue-router";

export const TempleRoutes: RouteRecordRaw[] = [
  {
    path: "temples",
    name: "xp-compendium-temples",
    component: () =>
      import("@/app/Admin/XpTemples"),
  },
  {
    path: "temples/creator/:templeId/rooms/:row/:col",
    name: "xp-room-editor",
    component: () =>
      import(
        "@/app/Admin/XpTemples/components/XpTempleCreator/XpRoomEditorPage.vue"
      ),
    props: true,
  },
  {
    path: "temples/:templeId",
    component: () =>
      import(
        "@/app/Admin/XpTemples/components/XpTempleSettings.vue"
      ),
    props: true,
    children: [
      {
        path: "",
        name: "xp-temple-settings",
        redirect: (to) => `/game-master/compendium/setup/temples/${to.params.templeId}/dashboard`,
      },
      {
        path: "dashboard",
        name: "xp-temple-dashboard",
        component: () =>
          import(
            "@/app/Admin/XpTemples/components/tabs/XpTempleDashboard.vue"
          ),
        props: true,
      },
      {
        path: "layout",
        name: "xp-temple-layout",
        component: () =>
          import(
            "@/app/Admin/XpTemples/components/tabs/XpTempleLayout.vue"
          ),
        props: true,
      },
      {
        path: "rooms",
        name: "xp-temple-rooms",
        component: () =>
          import(
            "@/app/Admin/XpTemples/components/tabs/XpTempleRooms.vue"
          ),
        props: true,
      },
      {
        path: "beasts",
        name: "xp-temple-beasts",
        component: () =>
          import(
            "@/app/Admin/XpTemples/components/tabs/XpTempleBeasts.vue"
          ),
        props: true,
      },
      {
        path: "attributes",
        component: () =>
          import(
            "@/app/Admin/XpTemples/components/tabs/XpTempleConfig.vue"
          ),
        props: true,
        children: [
          {
            path: "",
            name: "xp-temple-attributes",
            redirect: (to) => `/game-master/compendium/setup/temples/${to.params.templeId}/attributes/general`,
          },
          {
            path: "general",
            name: "xp-temple-attributes-general",
            component: () =>
              import(
                "@/app/Admin/XpTemples/components/tabs/XpTempleAttributes.vue"
              ),
            props: (route) => ({ templeId: route.params.templeId, tab: 'general' }),
          },
          {
            path: "audit",
            name: "xp-temple-attributes-audit",
            component: () =>
              import(
                "@/app/Admin/XpTemples/components/tabs/XpTempleAttributes.vue"
              ),
            props: (route) => ({ templeId: route.params.templeId, tab: 'audit' }),
          },
          {
            path: "navigator",
            name: "xp-temple-attributes-navigator",
            component: () =>
              import(
                "@/app/Admin/XpTemples/components/tabs/XpTempleAttributes.vue"
              ),
            props: (route) => ({ templeId: route.params.templeId, tab: 'navigator' }),
          },
        ]
      },
      {
        path: "rooms/:row/:col",
        name: "xp-temple-room-editor",
        component: () =>
          import(
            "@/app/Admin/XpTemples/components/XpTempleCreator/XpRoomEditorPage.vue"
          ),
        props: true,
      },
    ],
  },
];

export default TempleRoutes;

import { RouteRecordRaw } from "vue-router";

export const EconomyRoutes: RouteRecordRaw[] = [
  {
    path: "economy",
    name: "xp-economy-dashboard-root",
    component: () =>
      import(
        "@/app/Admin/XpAccessories/components/XpEconomyDashboard.vue"
      ),
    children: [
      {
        path: "",
        redirect: "/game-master/compendium/setup/economy/dashboard",
      },
      {
        path: "dashboard",
        name: "xp-economy-dashboard",
        component: () =>
          import(
            "@/app/Admin/XpAccessories/components/tabs/XpEconomySplashTab.vue"
          ),
      },
      {
        path: "shops",
        name: "xp-economy-shops",
        component: () =>
          import(
            "@/app/Admin/XpAccessories/components/tabs/XpEconomyShops.vue"
          ),
      },
      {
        path: "items",
        name: "xp-economy-items",
        component: () =>
          import(
            "@/app/Admin/XpAccessories/components/tabs/XpEconomyItems.vue"
          ),
      },
      {
        path: "key-items",
        name: "xp-economy-key-items",
        component: () =>
          import(
            "@/app/Admin/XpAccessories/components/tabs/XpEconomyKeyItems.vue"
          ),
      },
    ],
  },
  {
    path: "economy/global",
    name: "xp-economy-global",
    component: () =>
      import(
        "@/app/Admin/XpAccessories/components/XpAccessoriesGlobalList.vue"
      ),
  },
  {
    path: "economy/shops/:shopId",
    name: "xp-shop-details",
    component: () =>
      import(
        "@/app/Admin/XpAccessories/components/XpShopDetails.vue"
      ),
    props: true,
    children: [
      {
        path: "",
        redirect: (to) =>
          `/game-master/compendium/setup/economy/shops/${to.params.shopId}/dashboard`,
      },
      {
        path: "dashboard",
        name: "xp-shop-dashboard",
        component: () =>
          import(
            "@/app/Admin/XpAccessories/components/tabs/XpShopDashboardTab.vue"
          ),
        props: true,
      },
      {
        path: "items",
        name: "xp-shop-items",
        component: () =>
          import(
            "@/app/Admin/XpAccessories/components/tabs/XpShopItemsTab.vue"
          ),
        props: true,
      },
      {
        path: "hours",
        name: "xp-shop-hours",
        component: () =>
          import(
            "@/app/Admin/XpAccessories/components/tabs/XpShopHoursTab.vue"
          ),
        props: true,
      },
      {
        path: "decorate",
        name: "xp-shop-decorate",
        component: () =>
          import(
            "@/app/Admin/XpAccessories/components/tabs/XpShopDecorateTab.vue"
          ),
        props: true,
      },
      {
        path: "clerk",
        name: "xp-shop-clerk",
        component: () =>
          import(
            "@/app/Admin/XpAccessories/components/tabs/XpShopClerkTab.vue"
          ),
        props: true,
      },
    ],
  },
  {
    path: "economy/create-shop/:id?",
    name: "xp-create-update-shop",
    component: () =>
      import(
        "@/app/Admin/XpAccessories/components/XpCreateUpdateShop.vue"
      ),
    props: true,
  },
  {
    path: "economy/create-update/:id?",
    name: "xp-create-update-accessory",
    component: () =>
      import(
        "@/app/Admin/XpAccessories/components/XpCreateUpdateAccessory.vue"
      ),
  },
];

export default EconomyRoutes;

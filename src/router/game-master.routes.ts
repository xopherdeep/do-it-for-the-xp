import { RouteRecordRaw } from "vue-router";

export const GameMasterRoutes: RouteRecordRaw[] = [{
  path: "/game-master",
  name: "game-master",
  component: () =>
    import("@/app/Admin/XpGameMaster.vue"),
  children: [
    {
      path: "",
      name: "dashboard",
      redirect: "/game-master/dashboard",
    },
    {
      path: "dashboard",
      name: "xp-dashboard",
      component: () =>
        import(
          "../app/Admin/XpDashboard/XpDashboard.vue"
        ),
    },
    {
      path: "compendium",
      name: "xp-compendium",
      component: () =>
        import(
          "../app/Admin/XpCompendium/CompendiumRoot.vue"
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
              "../app/Admin/XpCompendium/XpCompendium.vue"
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
                  "../app/Admin/XpCompendium/CompendiumDashboard.vue"
                ),
            },
            {
              path: "achievements",
              name: "xp-achievements",
              component: () =>
                import(
                  "@/app/Admin/XpAchievements/XpAchievements.vue"
                ),
            },
            {
              path: "achievements/config",
              redirect: "/game-master/compendium/setup/achievements/config/new/dashboard",
            },
            {
              path: "achievements/config/:id",
              name: "xp-achievement-config",
              component: () =>
                import(
                  "@/app/Admin/XpAchievements/XpConfigAchievement/XpConfigAchievement.vue"
                ),
              props: true,
              children: [
                {
                  path: "",
                  redirect: (to: any) => `/game-master/compendium/setup/achievements/config/${to.params.id || 'new'}/dashboard`,
                },
                {
                  path: "dashboard",
                  name: "xp-achievement-config-dashboard",
                  component: () => import("@/app/Admin/XpAchievements/XpConfigAchievement/components/tabs/QuestDashboardTab.vue"),
                  props: true,
                },
                {
                  path: "heros",
                  name: "xp-achievement-config-heros",
                  component: () => import("@/app/Admin/XpAchievements/XpConfigAchievement/components/tabs/QuestHerosTab.vue"),
                  props: true,
                },
                {
                  path: "when",
                  name: "xp-achievement-config-when",
                  component: () => import("@/app/Admin/XpAchievements/XpConfigAchievement/components/tabs/QuestScheduleTab.vue"),
                  props: true,
                },
                {
                  path: "points",
                  name: "xp-achievement-config-points",
                  component: () => import("@/app/Admin/XpAchievements/XpConfigAchievement/components/tabs/QuestRewardsTab.vue"),
                  props: true,
                },
                {
                  path: "quest-type",
                  name: "xp-achievement-config-type",
                  component: () => import("@/app/Admin/XpAchievements/XpConfigAchievement/components/tabs/QuestTypeTab.vue"),
                  props: true,
                },
              ]
            },
            {
              path: "bestiary",
              name: "xp-bestiary",
              component: () =>
                import(
                  "@/app/Admin/XpBestiary/XpBestiary.vue"
                ),
            },
            {
              path: "bestiary/select",
              name: "xp-bestiary-select",
              component: () =>
                import(
                  "@/app/Admin/XpBestiary/XpBeastSelectionPage.vue"
                ),
            },
            {
              path: "bestiary/create-update/:id?",
              name: "xp-create-update-beast",
              component: () =>
                import(
                  "@/app/Admin/XpBestiary/components/XpAddBeast.vue"
                ),
              props: true,
            },
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
                      "../app/Admin/XpAccessories/components/tabs/XpShopDashboardTab.vue"
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
            {
              path: "abilities",
              name: "xp-abilities",
              component: () =>
                import(
                  "@/app/Admin/XpAbilities/XpAbilities.vue"
                ),
            },
            {
              path: "abilities/create-update/:id?",
              name: "xp-create-update-ability",
              component: () =>
                import(
                  "@/app/Admin/XpAbilities/components/XpCreateUpdateAbility.vue"
                ),
              props: true,
            },
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
              name: "xp-temple-settings",
              component: () =>
                import(
                  "@/app/Admin/XpTemples/components/XpTempleSettings.vue"
                ),
              props: true,
              children: [
                {
                  path: "",
                  redirect: (to) => `/game-master/compendium/setup/temples/${to.params.templeId}/dashboard`,
                },
                {
                  path: "dashboard",
                  name: "xp-temple-dashboard",
                  component: () =>
                    import(
                      "../app/Admin/XpTemples/components/tabs/XpTempleDashboard.vue"
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
                  name: "xp-temple-attributes",
                  component: () =>
                    import(
                      "@/app/Admin/XpTemples/components/tabs/XpTempleConfig.vue"
                    ),
                  props: true,
                  children: [
                    {
                      path: "",
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
          ],
        },
      ],
    },
    {
      path: "chat",
      name: "xp-chat",
      component: () =>
        import("../app/Admin/XpChat/XpChat.vue"),
    },
    {
      path: "do-this-not-that/:id?",
      name: "xp-do-this-not-that",
      component: () =>
        import(
          "@/app/Admin/XpDoThisNotThat/XpDoThisNotThat.vue"
        ),
      props: true,
    },

    {
      path: "add-beast/:id?",
      name: "xp-add-beast",
      component: () =>
        import(
          "@/app/Admin/XpBestiary/components/XpAddBeast.vue"
        ),
      props: true,
    },
    {
      path: "add-ability/:id?",
      name: "xp-add-ability",
      component: () =>
        import(
          "@/app/Admin/XpAbilities/components/XpCreateUpdateAbility.vue"
        ),
      props: true,
    },
    {
      path: "discover-achievements",
      name: "xp-discover-achievements",
      component: () =>
        import(
          "@/app/Admin/XpAchievements/XpDiscoverAchievements/XpDiscoverAchievements.vue"
        ),
    },
  ],
}];

export default GameMasterRoutes;// touch

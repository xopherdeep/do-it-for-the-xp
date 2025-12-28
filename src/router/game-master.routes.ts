import { RouteRecordRaw } from "vue-router";

export const GameMasterRoutes: RouteRecordRaw[] = [{
  path: "/game-master",
  name: "game-master",
  component: () =>
    import("@/views/App/SideMenu/XpGameMaster/XpGameMaster.vue"),
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
          "../views/App/SideMenu/XpGameMaster/XpDashboard/XpDashboard.vue"
        ),
    },
    {
      path: "compendium",
      name: "xp-compendium",
      component: () =>
        import(
          "../views/App/SideMenu/XpGameMaster/XpCompendium/CompendiumRoot.vue"
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
              "../views/App/SideMenu/XpGameMaster/XpCompendium/XpCompendium.vue"
            ),
          children: [
            {
              path: "",
              redirect: "/game-master/compendium/setup/splash",
            },
            {
              path: "splash",
              name: "xp-compendium-splash",
              component: () =>
                import(
                  "@/views/App/SideMenu/XpGameMaster/XpCompendium/CompendiumSplash.vue"
                ),
            },
            {
              path: "achievements",
              name: "xp-achievements",
              component: () =>
                import(
                  "@/views/App/SideMenu/XpGameMaster/XpAchievements/XpAchievements.vue"
                ),
            },
            {
              path: "achievements/config",
              redirect: "/game-master/compendium/setup/achievements/config/new/splash",
            },
            {
              path: "achievements/config/:id",
              name: "xp-achievement-config",
              component: () =>
                import(
                  "@/views/App/SideMenu/XpGameMaster/XpAchievements/XpAddAchievement/XpAddAchievement.vue"
                ),
              props: true,
              children: [
                {
                  path: "",
                  redirect: (to: any) => `/game-master/compendium/setup/achievements/config/${to.params.id || 'new'}/splash`,
                },
                {
                  path: "splash",
                  name: "xp-achievement-config-splash",
                  component: () => import("@/views/App/SideMenu/XpGameMaster/XpAchievements/XpAddAchievement/components/tabs/QuestSplashTab.vue"),
                  props: true,
                },
                {
                  path: "heros",
                  name: "xp-achievement-config-heros",
                  component: () => import("@/views/App/SideMenu/XpGameMaster/XpAchievements/XpAddAchievement/components/tabs/QuestHerosTab.vue"),
                  props: true,
                },
                {
                  path: "when",
                  name: "xp-achievement-config-when",
                  component: () => import("@/views/App/SideMenu/XpGameMaster/XpAchievements/XpAddAchievement/components/tabs/QuestScheduleTab.vue"),
                  props: true,
                },
                {
                  path: "points",
                  name: "xp-achievement-config-points",
                  component: () => import("@/views/App/SideMenu/XpGameMaster/XpAchievements/XpAddAchievement/components/tabs/QuestRewardsTab.vue"),
                  props: true,
                },
                {
                  path: "quest-type",
                  name: "xp-achievement-config-type",
                  component: () => import("@/views/App/SideMenu/XpGameMaster/XpAchievements/XpAddAchievement/components/tabs/QuestTypeTab.vue"),
                  props: true,
                },
              ]
            },
            {
              path: "bestiary",
              name: "xp-bestiary",
              component: () =>
                import(
                  "@/views/App/SideMenu/XpGameMaster/XpBestiary/XpBestiary.vue"
                ),
            },
            {
              path: "bestiary/select",
              name: "xp-bestiary-select",
              component: () =>
                import(
                  "@/views/App/SideMenu/XpGameMaster/XpBestiary/XpBeastSelectionPage.vue"
                ),
            },
            {
              path: "bestiary/create-update/:id?",
              name: "xp-create-update-beast",
              component: () =>
                import(
                  "@/views/App/SideMenu/XpGameMaster/XpBestiary/components/XpAddBeast.vue"
                ),
              props: true,
            },
            {
              path: "economy",
              name: "xp-economy-dashboard-root",
              component: () =>
                import(
                  "@/views/App/SideMenu/XpGameMaster/XpAccessories/components/XpEconomyDashboard.vue"
                ),
              children: [
                {
                  path: "",
                  redirect: "/game-master/compendium/setup/economy/splash",
                },
                {
                  path: "splash",
                  name: "xp-economy-splash",
                  component: () =>
                    import(
                      "@/views/App/SideMenu/XpGameMaster/XpAccessories/components/tabs/XpEconomySplash.vue"
                    ),
                },
                {
                  path: "shops",
                  name: "xp-economy-shops",
                  component: () =>
                    import(
                      "@/views/App/SideMenu/XpGameMaster/XpAccessories/components/tabs/XpEconomyShops.vue"
                    ),
                },
                {
                  path: "items",
                  name: "xp-economy-items",
                  component: () =>
                    import(
                      "@/views/App/SideMenu/XpGameMaster/XpAccessories/components/tabs/XpEconomyItems.vue"
                    ),
                },
                {
                  path: "key-items",
                  name: "xp-economy-key-items",
                  component: () =>
                    import(
                      "@/views/App/SideMenu/XpGameMaster/XpAccessories/components/tabs/XpEconomyKeyItems.vue"
                    ),
                },
              ],
            },
            {
              path: "economy/global",
              name: "xp-economy-global",
              component: () =>
                import(
                  "@/views/App/SideMenu/XpGameMaster/XpAccessories/components/XpAccessoriesGlobalList.vue"
                ),
            },
            {
              path: "economy/shops/:shopId",
              name: "xp-shop-details",
              component: () =>
                import(
                  "@/views/App/SideMenu/XpGameMaster/XpAccessories/components/XpShopDetails.vue"
                ),
              props: true,
              children: [
                {
                  path: "",
                  redirect: (to) =>
                    `/game-master/compendium/setup/economy/shops/${to.params.shopId}/splash`,
                },
                {
                  path: "splash",
                  name: "xp-shop-splash",
                  component: () =>
                    import(
                      "@/views/App/SideMenu/XpGameMaster/XpAccessories/components/tabs/XpShopSplashTab.vue"
                    ),
                  props: true,
                },
                {
                  path: "items",
                  name: "xp-shop-items",
                  component: () =>
                    import(
                      "@/views/App/SideMenu/XpGameMaster/XpAccessories/components/tabs/XpShopItemsTab.vue"
                    ),
                  props: true,
                },
                {
                  path: "hours",
                  name: "xp-shop-hours",
                  component: () =>
                    import(
                      "@/views/App/SideMenu/XpGameMaster/XpAccessories/components/tabs/XpShopHoursTab.vue"
                    ),
                  props: true,
                },
                {
                  path: "decorate",
                  name: "xp-shop-decorate",
                  component: () =>
                    import(
                      "@/views/App/SideMenu/XpGameMaster/XpAccessories/components/tabs/XpShopDecorateTab.vue"
                    ),
                  props: true,
                },
                {
                  path: "clerk",
                  name: "xp-shop-clerk",
                  component: () =>
                    import(
                      "@/views/App/SideMenu/XpGameMaster/XpAccessories/components/tabs/XpShopClerkTab.vue"
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
                  "@/views/App/SideMenu/XpGameMaster/XpAccessories/components/XpCreateUpdateShop.vue"
                ),
              props: true,
            },
            {
              path: "economy/create-update/:id?",
              name: "xp-create-update-accessory",
              component: () =>
                import(
                  "@/views/App/SideMenu/XpGameMaster/XpAccessories/components/XpCreateUpdateAccessory.vue"
                ),
            },
            {
              path: "abilities",
              name: "xp-abilities",
              component: () =>
                import(
                  "@/views/App/SideMenu/XpGameMaster/XpAbilities/XpAbilities.vue"
                ),
            },
            {
              path: "abilities/create-update/:id?",
              name: "xp-create-update-ability",
              component: () =>
                import(
                  "@/views/App/SideMenu/XpGameMaster/XpAbilities/components/XpCreateUpdateAbility.vue"
                ),
              props: true,
            },
            {
              path: "temples",
              name: "xp-compendium-temples",
              component: () =>
                import("../views/App/SideMenu/XpGameMaster/XpTemples"),
            },
            {
              path: "temples/creator/:templeId?",
              name: "xp-temple-creator",
              component: () =>
                import(
                  "@/views/App/SideMenu/XpGameMaster/XpTemples/components/XpTempleCreator/TempleFloorEditor.vue"
                ),
              props: true,
            },
            {
              path: "temples/creator/:templeId/rooms/:row/:col",
              name: "xp-room-editor",
              component: () =>
                import(
                  "@/views/App/SideMenu/XpGameMaster/XpTemples/components/XpTempleCreator/XpRoomEditorPage.vue"
                ),
              props: true,
            },
            {
              path: "temples/:templeId",
              name: "xp-temple-settings",
              component: () =>
                import(
                  "@/views/App/SideMenu/XpGameMaster/XpTemples/components/XpTempleSettings.vue"
                ),
              props: true,
              children: [
                {
                  path: "",
                  redirect: (to) => `/game-master/compendium/setup/temples/${to.params.templeId}/splash`,
                },
                {
                  path: "splash",
                  name: "xp-temple-splash",
                  component: () =>
                    import(
                      "@/views/App/SideMenu/XpGameMaster/XpTemples/components/tabs/XpTempleSplash.vue"
                    ),
                  props: true,
                },
                {
                  path: "layout",
                  name: "xp-temple-layout",
                  component: () =>
                    import(
                      "@/views/App/SideMenu/XpGameMaster/XpTemples/components/tabs/XpTempleLayout.vue"
                    ),
                  props: true,
                },
                {
                  path: "rooms",
                  name: "xp-temple-rooms",
                  component: () =>
                    import(
                      "@/views/App/SideMenu/XpGameMaster/XpTemples/components/tabs/XpTempleRooms.vue"
                    ),
                  props: true,
                },
                {
                  path: "beasts",
                  name: "xp-temple-beasts",
                  component: () =>
                    import(
                      "@/views/App/SideMenu/XpGameMaster/XpTemples/components/tabs/XpTempleBeasts.vue"
                    ),
                  props: true,
                },
                {
                  path: "attributes",
                  name: "xp-temple-attributes",
                  component: () =>
                    import(
                      "@/views/App/SideMenu/XpGameMaster/XpTemples/components/tabs/XpTempleConfig.vue"
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
                          "@/views/App/SideMenu/XpGameMaster/XpTemples/components/tabs/XpTempleAttributes.vue"
                        ),
                      props: (route) => ({ templeId: route.params.templeId, tab: 'general' }),
                    },
                    {
                      path: "audit",
                      name: "xp-temple-attributes-audit",
                      component: () =>
                        import(
                          "@/views/App/SideMenu/XpGameMaster/XpTemples/components/tabs/XpTempleAttributes.vue"
                        ),
                      props: (route) => ({ templeId: route.params.templeId, tab: 'audit' }),
                    },
                    {
                      path: "navigator",
                      name: "xp-temple-attributes-navigator",
                      component: () =>
                        import(
                          "@/views/App/SideMenu/XpGameMaster/XpTemples/components/tabs/XpTempleAttributes.vue"
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
                      "@/views/App/SideMenu/XpGameMaster/XpTemples/components/XpTempleCreator/XpRoomEditorPage.vue"
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
        import("../views/App/SideMenu/XpGameMaster/XpChat/XpChat.vue"),
    },
    {
      path: "do-this-not-that/:id?",
      name: "xp-do-this-not-that",
      component: () =>
        import(
          "@/views/App/SideMenu/XpGameMaster/XpDoThisNotThat/XpDoThisNotThat.vue"
        ),
      props: true,
    },

    {
      path: "add-beast/:id?",
      name: "xp-add-beast",
      component: () =>
        import(
          "@/views/App/SideMenu/XpGameMaster/XpBestiary/components/XpAddBeast.vue"
        ),
      props: true,
    },
    {
      path: "add-ability/:id?",
      name: "xp-add-ability",
      component: () =>
        import(
          "@/views/App/SideMenu/XpGameMaster/XpAbilities/components/XpCreateUpdateAbility.vue"
        ),
      props: true,
    },
    {
      path: "discover-achievements",
      name: "xp-discover-achievements",
      component: () =>
        import(
          "@/views/App/SideMenu/XpGameMaster/XpAchievements/XpDiscoverAchievements/XpDiscoverAchievements.vue"
        ),
    },
  ],
}];

export default GameMasterRoutes;// touch

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
          "../views/App/SideMenu/XpGameMaster/XpCompendium/XpCompendium.vue"
        ),
      children: [
        {
          path: "",
          name: "achievements",
          redirect: "/game-master/compendium/splash",
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
          path: "accessories",
          name: "xp-accessories",
          component: () =>
            import(
              "@/views/App/SideMenu/XpGameMaster/XpAccessories/XpAccessories.vue"
            ),
        },
        {
          path: "accessories/create-update/:id?",
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
          path: "temple/:templeId",
          name: "xp-compendium-temple-settings",
          component: () =>
            import(
              "@/views/App/SideMenu/XpGameMaster/XpTemples/components/XpTempleSettings.vue"
            ),
          props: true,
        },
        {
          path: "temples/creator/:templeId?",
          name: "xp-temple-creator",
          component: () =>
            import(
              "@/views/App/SideMenu/XpGameMaster/XpTemples/components/XpTempleCreator/XpTempleCreator.vue"
            ),
          props: true,
        },
        {
          path: "temples/creator/:templeId/room/:row/:col",
          name: "xp-room-editor",
          component: () =>
            import(
              "@/views/App/SideMenu/XpGameMaster/XpTemples/components/XpTempleCreator/XpRoomEditorPage.vue"
            ),
          props: true,
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
      path: "add-achievement/:id?",
      name: "xp-add-achievement",
      component: () =>
        import(
          "@/views/App/SideMenu/XpGameMaster/XpAchievements/XpAddAchievement/XpAddAchievement.vue"
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

export default GameMasterRoutes;
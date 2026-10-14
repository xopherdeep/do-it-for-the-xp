import { RouteRecordRaw } from "vue-router";

export const SettingsRoutes: RouteRecordRaw[] = [{
  path: "/xp-settings",
  name: "xp-settings",
  component: () => import("@/app/SideMenu/XpSettings/XpSettings.vue"),
  children: [
    {
      path: "",
      name: "xp-settings-home",
      component: () =>
        import(
          "@/app/SideMenu/XpSettings/components/XpSettingsHome/XpSettingsHome.vue"
        ),
    },
    {
      path: "general",
      name: "xp-settings-general",
      component: () =>
        import(
          "@/app/SideMenu/XpSettings/components/GeneralSettings.vue"
        ),
    },
    {
      path: "packs",
      name: "xp-settings-packs",
      component: () =>
        import(
          "@/app/SideMenu/XpSettings/components/PacksSettings.vue"
        ),
    },
    {
      path: "family",
      name: "xp-settings-family",
      component: () =>
        import(
          "@/app/SideMenu/XpSettings/components/FamilySettings.vue"
        ),
    },
    {
      path: "sound",
      name: "xp-settings-sound",
      component: () =>
        import(
          "@/app/SideMenu/XpSettings/components/SoundSettings.vue"
        ),
    },
    {
      path: "notifications",
      name: "xp-settings-notifications",
      component: () =>
        import(
          "@/app/SideMenu/XpSettings/components/NotificationSettings.vue"
        ),
    },
    {
      path: "theme",
      name: "xp-settings-theme",
      component: () =>
        import(
          "@/app/SideMenu/XpSettings/components/ThemeSettings.vue"
        ),
    },
    {
      path: "pro",
      name: "xp-settings-pro",
      component: () =>
        import(
          "@/app/SideMenu/XpSettings/components/ProSettings.vue"
        ),
    },
    // Chore, Reward and Party were mock pages whose switches saved nothing; old links land on Settings
    ...["chore", "reward", "party"].map((path) => ({ path, redirect: { name: "xp-settings-home" } })),
  ],
}];

export default SettingsRoutes;
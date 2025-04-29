import { RouteRecordRaw } from "vue-router";

export const SettingsRoutes: RouteRecordRaw[] = [{
  path: "/xp-settings",
  name: "xp-settings",
  component: () => import("@/views/App/SideMenu/XpSettings/XpSettings.vue"),
  children: [
    {
      path: "",
      name: "xp-settings-home",
      component: () =>
        import(
          "@/views/App/SideMenu/XpSettings/components/XpSettingsHome/XpSettingsHome.vue"
        ),
    },
    {
      path: "general",
      name: "xp-settings-general",
      component: () =>
        import(
          "@/views/App/SideMenu/XpSettings/components/GeneralSettings.vue"
        ),
    },
    {
      path: "family",
      name: "xp-settings-family",
      component: () =>
        import(
          "@/views/App/SideMenu/XpSettings/components/FamilySettings.vue"
        ),
    },
    {
      path: "sound",
      name: "xp-settings-sound",
      component: () =>
        import(
          "@/views/App/SideMenu/XpSettings/components/SoundSettings.vue"
        ),
    },
    {
      path: "notifications",
      name: "xp-settings-notifications",
      component: () =>
        import(
          "@/views/App/SideMenu/XpSettings/components/NotificationSettings.vue"
        ),
    },
    {
      path: "reward",
      name: "xp-settings-reward",
      component: () =>
        import(
          "@/views/App/SideMenu/XpSettings/components/RewardSettings.vue"
        ),
    },
    {
      path: "party",
      name: "xp-settings-party",
      component: () =>
        import(
          "@/views/App/SideMenu/XpSettings/components/PartySettings.vue"
        ),
    },
    {
      path: "theme",
      name: "xp-settings-theme",
      component: () =>
        import(
          "@/views/App/SideMenu/XpSettings/components/ThemeSettings.vue"
        ),
    },
    {
      path: "chore",
      name: "xp-settings-chore",
      component: () =>
        import(
          "@/views/App/SideMenu/XpSettings/components/XpChoreSettings/ChoreSettings.vue"
        ),
    },
  ],
}];

export default SettingsRoutes;
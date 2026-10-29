import { RouteRecordRaw } from "vue-router";

export const SettingsRoutes: RouteRecordRaw[] = [{
  path: "/xp-settings",
  name: "xp-settings",
  component: () => import("@/app/SideMenu/XpSettings/XpSettings.vue"),
  meta: {
    requiresAuth: false,
  },
  children: [
    {
      path: "",
      name: "xp-settings-home",
      component: () =>
        import(
          "@/app/SideMenu/XpSettings/components/XpSettingsHome/XpSettingsHome.vue"
        ),
      meta: {
        requiresAuth: false,
      },
    },
    {
      path: "general",
      name: "xp-settings-general",
      component: () =>
        import(
          "@/app/SideMenu/XpSettings/components/GeneralSettings.vue"
        ),
      meta: {
        requiresAuth: false,
      },
    },
    {
      path: "packs",
      name: "xp-settings-packs",
      component: () =>
        import(
          "@/app/SideMenu/XpSettings/components/PacksSettings.vue"
        ),
      meta: {
        requiresAuth: false,
      },
    },
    {
      path: "family",
      name: "xp-settings-family",
      component: () =>
        import(
          "@/app/SideMenu/XpSettings/components/FamilySettings.vue"
        ),
      meta: {
        requiresAuth: false,
      },
    },
    {
      path: "sound",
      name: "xp-settings-sound",
      component: () =>
        import(
          "@/app/SideMenu/XpSettings/components/SoundSettings.vue"
        ),
      meta: {
        requiresAuth: false,
      },
    },
    {
      path: "video",
      name: "xp-settings-video",
      component: () =>
        import(
          "@/app/SideMenu/XpSettings/components/VideoSettings.vue"
        ),
      meta: {
        requiresAuth: false,
      },
    },
    {
      path: "notifications",
      name: "xp-settings-notifications",
      component: () =>
        import(
          "@/app/SideMenu/XpSettings/components/NotificationSettings.vue"
        ),
      meta: {
        requiresAuth: false,
      },
    },
    {
      path: "theme",
      name: "xp-settings-theme",
      component: () =>
        import(
          "@/app/SideMenu/XpSettings/components/ThemeSettings.vue"
        ),
      meta: {
        requiresAuth: false,
      },
    },
    {
      path: "pro",
      name: "xp-settings-pro",
      component: () =>
        import(
          "@/app/SideMenu/XpSettings/components/ProSettings.vue"
        ),
      meta: {
        requiresAuth: false,
      },
    },
    // The Game Master's Town Hall link, plan and sign-in options
    {
      path: "account",
      name: "xp-settings-account",
      component: () => import("@/app/SideMenu/XpSettings/components/AccountSettings.vue"),
      meta: {
        requiresAuth: false,
      },
    },
    // Chore and Reward are working pages; Party still lists planned settings only (greyed out, Coming soon)
    {
      path: "chore",
      name: "xp-settings-chore",
      component: () => import("@/app/SideMenu/XpSettings/components/ChoreSettings.vue"),
      meta: {
        requiresAuth: false,
      },
    },
    {
      path: "reward",
      name: "xp-settings-reward",
      component: () => import("@/app/SideMenu/XpSettings/components/RewardSettings.vue"),
      meta: {
        requiresAuth: false,
      },
    },
    {
      path: "party",
      name: "xp-settings-party",
      component: () => import("@/app/SideMenu/XpSettings/components/PartySettings.vue"),
      meta: {
        requiresAuth: false,
      },
    },
  ],
}];

export default SettingsRoutes;
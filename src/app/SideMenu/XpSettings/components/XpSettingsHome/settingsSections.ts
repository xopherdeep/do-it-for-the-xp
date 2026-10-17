/**
 * What the Settings page lists, grouped by the question a person is asking: who plays (the family), how the game runs
 * (the rules a Game Master sets), what this phone does (alerts, sound, look, backup), and the account and plan.
 * Each entry is one page under /xp-settings.
 */
export interface SettingsItem {
  id: string;
  title: string;
  description: string;
  /** An image under src/assets/icons */
  icon: string;
  route: string;
  /** Nothing on the page works yet: the row wears a Soon badge */
  soon?: boolean;
}

export interface SettingsSection {
  id: string;
  title: string;
  items: SettingsItem[];
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "family",
    title: "The family",
    items: [
      {
        id: "family",
        title: "Family",
        description: "Add Game Masters and heroes, link phones, set item rules.",
        icon: require("@/assets/icons/team.png"),
        route: "/xp-settings/family",
      },
      {
        id: "party",
        title: "Party",
        description: "Play together with other families.",
        icon: require("@/assets/icons/collaboration.png"),
        route: "/xp-settings/party",
        soon: true,
      },
    ],
  },
  {
    id: "game",
    title: "The game",
    items: [
      {
        id: "chore",
        title: "Chores",
        description: "Daily streaks, and what happens when a chore is late.",
        icon: require("@/assets/icons/achievements.svg"),
        route: "/xp-settings/chore",
      },
      {
        id: "reward",
        title: "Rewards",
        description: "Cash out GP: the rate and who can.",
        icon: require("@/assets/icons/gp.svg"),
        route: "/xp-settings/reward",
      },
      {
        id: "packs",
        title: "Packs",
        description: "Ready-made quests, beasts and rewards for any group.",
        icon: require("@/assets/icons/target.png"),
        route: "/xp-settings/packs",
      },
    ],
  },
  {
    id: "device",
    title: "This device",
    items: [
      {
        id: "notifications",
        title: "Alerts",
        description: "Chore and approval reminders, and ambush alerts.",
        icon: require("@/assets/icons/notification.png"),
        route: "/xp-settings/notifications",
      },
      {
        id: "sound",
        title: "Sound",
        description: "Volume for music, sound effects and menus.",
        icon: require("@/assets/icons/listener.png"),
        route: "/xp-settings/sound",
      },
      {
        id: "theme",
        title: "Theme",
        description: "The game style the app wears and its menu sounds.",
        icon: require("@/assets/icons/innovation.png"),
        route: "/xp-settings/theme",
      },
      {
        id: "general",
        title: "General",
        description: "Back up everything to a file, or restore from one.",
        icon: require("@/assets/icons/settings.png"),
        route: "/xp-settings/general",
      },
    ],
  },
  {
    id: "account",
    title: "Account & plan",
    items: [
      {
        id: "account",
        title: "Account",
        description: "The family's Town Hall account, plan and sign-in options.",
        icon: require("@/assets/icons/014-individual.svg"),
        route: "/xp-settings/account",
      },
      {
        id: "pro",
        title: "XP Pro",
        description: "Your plan and key, or restore Pro on this device.",
        icon: require("@/assets/icons/new.png"),
        route: "/xp-settings/pro",
      },
    ],
  },
];

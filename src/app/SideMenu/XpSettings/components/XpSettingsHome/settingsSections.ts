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
  /** The page the row opens; empty for a row that does something instead (it has an `action`) */
  route: string;
  /** Nothing on the page works yet: the row wears a Soon badge */
  soon?: boolean;
  /** What the row does when it is tapped, instead of opening a page */
  action?: SettingsAction;
}

/** The things a Settings row can do instead of opening a page */
export type SettingsAction = "unlink-phone";

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
        description: "Add Game Masters and heroes, link phones, set item rules and bedtime.",
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
        description: "Daily streaks, late chores, and auto-saving GP.",
        icon: require("@/assets/icons/achievements.svg"),
        route: "/xp-settings/chore",
      },
      {
        id: "reward",
        title: "Rewards",
        description: "Cash out GP, and which purchases wait for you.",
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
        id: "video",
        title: "Video",
        description: "How heroes and towns are drawn on this device.",
        icon: require("@/assets/icons/mobile-game.svg"),
        route: "/xp-settings/video",
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
        description: "Backups, guides, the landing page and the first day of the week.",
        icon: require("@/assets/icons/settings.png"),
        route: "/xp-settings/general",
      },
    ],
  },
  {
    id: "account",
    title: "Account",
    items: [
      {
        id: "account",
        title: "Account",
        description: "The family's Town Hall account, plan and sign-in options.",
        icon: require("@/assets/icons/014-individual.svg"),
        route: "/xp-settings/account",
      },
    ],
  },
];

/** XP Pro: the plan is not a setting like the others, so it closes the page as one full-width card */
export const PRO_ITEM: SettingsItem = {
  id: "pro",
  title: "XP Pro",
  description: "Your plan and key, or restore Pro on this device.",
  icon: require("@/assets/icons/new.png"),
  route: "/xp-settings/pro",
};

/** Every page the Settings page opens, in the order it shows them */
export const ALL_SETTINGS_ITEMS: SettingsItem[] = [...SETTINGS_SECTIONS.flatMap((section) => section.items), PRO_ITEM];

/** The kid phone's way out: the hero rests, the phone forgets the family, and the picker opens (the sync spec, section 7) */
export const UNLINK_ITEM: SettingsItem = {
  id: "unlink-phone",
  title: "Unlink this phone",
  description: "Take this phone off the family. A new link code puts it back.",
  icon: require("@/assets/icons/mobile-game.svg"),
  route: "",
  action: "unlink-phone",
};

/** What a kid phone does not keep from the lists above: the Game Master's pages (the family, packs, the Town Hall account) */
const GAME_MASTER_SECTIONS = ["family", "account"];
const GAME_MASTER_ITEMS = ["packs"];

/** General without its Backup & Restore card (a kid phone never saves or restores the family's file) */
const KID_GENERAL_DESCRIPTION = "Guides and the landing page.";

const forKidPhone = (section: SettingsSection): SettingsSection => ({
  ...section,
  items: section.items
    .filter((item) => !GAME_MASTER_ITEMS.includes(item.id))
    .map((item) => (item.id === "general" ? { ...item, description: KID_GENERAL_DESCRIPTION } : item)),
});

/**
 * The sections the Settings page lists. A kid phone (family sync, section 7) keeps the game's chores and rewards and the
 * device's own pages, loses the Game Master's (Family, Packs, Account) and Backup & Restore, and gains Unlink this phone
 * at the end of "This device".
 */
export function sectionsFor(options: { isKidMode: boolean }): SettingsSection[] {
  if (!options.isKidMode) return SETTINGS_SECTIONS;
  return SETTINGS_SECTIONS.filter((section) => !GAME_MASTER_SECTIONS.includes(section.id))
    .map(forKidPhone)
    .map((section) => (section.id === "device" ? { ...section, items: [...section.items, UNLINK_ITEM] } : section));
}

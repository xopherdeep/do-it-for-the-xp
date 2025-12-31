export const USER_MENU_CONFIG = {
  talk: {
    label: "Chat",
    icon: "fa-comments",
    id: "talk-to"
  },
  funds: {
    label: "Funds",
    icon: "fa-wallet",
    id: "wallet"
  },
  quests: {
    label: "Quests",
    icon: "fa-book-dead",
    id: "staff"
  },
  powers: {
    label: "Powers",
    icon: "fa-book-spells",
    id: "abilities"
  },
  goods: {
    label: "Goods",
    icon: "fa-backpack",
    id: "my-inventory"
  },
  stats: {
    label: "Stats",
    icon: "fa-seedling",
    action: "openProfile"
  },
  notifications: {
    label: "Notifications",
    icon: "fa-bell-exclamation",
    id: "notifications"
  },
  saveQuit: {
    label: "Save & Quit",
    icon: "fa-sign-out",
    id: "save-quit"
  }
} as const;

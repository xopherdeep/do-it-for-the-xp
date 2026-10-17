/** The switches a hero's profile carries, in the order the edit form lists them. */
export type FeatureKey = "rewards" | "goals" | "battles" | "community";

export interface FeatureOption {
  key: FeatureKey;
  title: string;
  hint: string;
  /** The wizard's shorter name for the same switch */
  short: string;
}

export const FEATURE_OPTIONS: FeatureOption[] = [
  { key: "rewards", title: "Buy from Shops", short: "Buy from shops", hint: "Allowed this player access to shops and purchase rewards." },
  { key: "goals", title: "Save towards Goals", short: "Save towards goals", hint: "Allowed player access to the banks and saves toward goals." },
  {
    key: "battles",
    title: "Random Battles",
    short: "Random battles",
    hint: "Turn on/off random battles. If off, players will have to manually check their achievements.",
  },
  { key: "community", title: "Participate in Town Hall", short: "Town Hall", hint: "For players who want to participate in Town Hall." },
];

/** The tabs under an existing hero's edit form. `flagsGameMaster` marks the tab that needs a Game Master's PIN. */
export interface EditTab {
  value: "info" | "account" | "features";
  icon: string;
  label: string;
  iconClass?: string;
  flagsGameMaster?: boolean;
}

export const EDIT_TABS: EditTab[] = [
  { value: "info", icon: "fa-user", label: "Who" },
  { value: "account", icon: "fa-fingerprint", label: "Pin", flagsGameMaster: true },
  { value: "features", icon: "fa-gamepad", label: "On/Off", iconClass: "text-primary" },
];

/** Who is playing, on the new-hero wizard's secret-code step. */
export const ROLE_CHOICES = [
  { isGameMaster: false, icon: "fa-shield-alt", title: "Hero", hint: "Does quests, earns loot" },
  { isGameMaster: true, icon: "fa-crown", title: "Game Master", hint: "A parent who runs the game" },
];

/** One card on the class and food steps of the new-hero wizard. */
export interface ChoiceCard {
  key: string;
  label: string;
  icon: string;
  hint?: string;
}

/** The look and feel on the new-hero wizard's style step: the two skins of the whole app, chosen once and kept on the hero. */
export const SKIN_CHOICES: ChoiceCard[] = [
  { key: "retro", label: "Retro", icon: "fa-gamepad", hint: "Pixel windows, like an old RPG" },
  { key: "modern", label: "Modern", icon: "fa-mobile-alt", hint: "Clean phone-app screens" },
];

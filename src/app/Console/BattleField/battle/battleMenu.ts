import { classKey } from "@/lib/services/abilities/heroAbilityStatus";

/** One entry in the in-dialog command menu (Tackle / Defend / Goods / Run Away, or a confirm pair). */
export interface BattleMenuAction {
  id: string;
  label: string;
  faIcon: string;
  click: () => void;
  /** Spans both menu columns (the Run Away row). */
  fullWidth?: boolean;
}

/** What each class tackles with, keyed by classKey ("White Mage" -> "whitemage"); Font Awesome Pro 5 names. */
export const CLASS_WEAPON_ICONS: Record<string, string> = {
  warrior: "axe",
  knight: "sword",
  berserker: "axe-battle",
  paladin: "mace",
  mage: "staff",
  whitemage: "hand-holding-magic",
  blackmage: "wand-magic",
  sage: "book-spells",
  thief: "dagger",
  assassin: "swords",
  ranger: "bow-arrow",
  ninja: "sickle",
  monk: "fist-raised",
  martialartist: "hand-rock",
  mystic: "hand-sparkles",
};

/** A hero with no class (or one the map does not know) tackles with a fist. */
export const DEFAULT_TACKLE_ICON = "fist-raised";

/** The Tackle button's icon: the weapon of the hero's class, whatever case or spacing the profile stored. */
export const tackleIcon = (jobClass: unknown): string =>
  (typeof jobClass === "string" && CLASS_WEAPON_ICONS[classKey(jobClass)]) || DEFAULT_TACKLE_ICON;

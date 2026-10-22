import { classKey } from "@/lib/services/abilities/heroAbilityStatus";
import type { BattleMenuStatus } from "@/lib/services/battle/BattleMenuStatus";

/** One entry in the in-dialog command menu (Tackle / Defend / Powers / Goods / Run Away, or a confirm pair). */
export interface BattleMenuAction {
  id: string;
  label: string;
  faIcon: string;
  click: () => void;
  /** Spans both menu columns (the Tackle row). */
  fullWidth?: boolean;
  /** A short line under the label: what the command can do right now ("2 chores", "3 MP", "x2"). */
  note?: string;
  /** The command cannot be used now; the row is dimmed and ignores taps. */
  disabled?: boolean;
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

/**
 * Puts the status of Tackle, Powers and Goods on the normal command layout: each gets its note and disabled flag,
 * and Tackle leads the list across both columns. Any other action, and a layout with no `attack` (the confirm pairs),
 * passes through unchanged.
 */
export const applyMenuStatus = (actions: BattleMenuAction[], status: BattleMenuStatus): BattleMenuAction[] => {
  if (!actions.some((action) => action.id === "attack")) return actions;
  return actions.map((action) => {
    switch (action.id) {
      case "attack":
        return { ...action, fullWidth: true, note: status.tackle.note, disabled: !status.tackle.enabled };
      case "powers":
        return { ...action, note: status.powers.note, disabled: !status.powers.enabled };
      case "item":
        return { ...action, note: status.goods.note, disabled: !status.goods.enabled };
      default:
        return action;
    }
  });
};

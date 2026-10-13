import { computed, type ComputedRef } from "vue";
import { useGameStore } from "@/lib/store/stores/game";
import { play$fx } from "@/assets/fx";

/**
 * The phone apps kit (XpApp*). One kit, two skins that follow the Retro / Modern toggle of the profile modal
 * (`useGameStore().fabStyle`). A page puts `rootClass` and `rootStyle` on its `ion-page` root; every kit component
 * and `_xp-app.scss` read the skin from that class and the accent from `--xp-app-accent`.
 */

export type AppSkin = "retro" | "modern";

/** One accent per app, used sparingly: the app icon tile, the active state and the primary buttons. */
export const XP_APP_ACCENTS = {
  quests: "#8a63d2",
  goods: "#d9483b",
  spells: "#3a8fe6",
  workbench: "#e08a2e",
  storage: "#2fa9a0",
  kitchen: "#c9971f",
  calendar: "#3fbf5f",
} as const;

export type AppAccentName = keyof typeof XP_APP_ACCENTS;

/** Used when a page gives no accent: the cream of the RPG windows. */
export const XP_APP_DEFAULT_ACCENT = "#e7e6b3";

export interface AppSkinState {
  skin: ComputedRef<AppSkin>;
  rootClass: ComputedRef<string[]>;
  rootStyle: ComputedRef<{ "--xp-app-accent": string }>;
}

/** `accent` is a CSS colour (`#3fbf5f`) or one of the app names above (`'quests'`). */
export function useAppSkin(accent?: string): AppSkinState {
  const gameStore = useGameStore();

  const color = accent ? XP_APP_ACCENTS[accent as AppAccentName] ?? accent : XP_APP_DEFAULT_ACCENT;

  const skin = computed<AppSkin>(() => (gameStore.fabStyle === "modern" ? "modern" : "retro"));
  const rootClass = computed(() => ["xp-app", `xp-app--${skin.value}`]);
  const rootStyle = computed(() => ({ "--xp-app-accent": color }));

  return { skin, rootClass, rootStyle };
}

/**
 * Options to spread into `actionSheetController.create({...})` (or `v-bind` on an `<ion-action-sheet>`) so an app's
 * sheet keeps the Earthbound box but rings it in the app's accent: `create({ header, buttons, ...appSheet("storage") })`.
 * The sheet is an overlay outside the page and Ionic owns its style attribute, so the accent travels as a class
 * (`xp-app-sheet--storage`) that `_xp-app.scss` maps to the colour. Extra classes are kept.
 */
export function appSheet(accent?: string, ...extraClasses: string[]): { cssClass: string[] } {
  const named = accent && accent in XP_APP_ACCENTS ? [`xp-app-sheet--${accent}`] : [];
  return { cssClass: ["xp-app-sheet", ...named, ...extraClasses] };
}

const FA_STYLE_CLASSES = new Set([
  "fa", "fad", "fas", "far", "fal", "fab", "fat",
  "fa-solid", "fa-duotone", "fa-regular", "fa-light", "fa-thin", "fa-brands",
]);

/** `box`, `fa-box` or a full class list (`fad fa-box`) become the icon classes that follow `fad` (the kit is duotone). */
export function appIconClass(icon?: string): string {
  return (icon ?? "")
    .split(/\s+/)
    .filter((token) => token && !FA_STYLE_CLASSES.has(token))
    .map((token) => (token.startsWith("fa-") ? token : `fa-${token}`))
    .join(" ");
}

let sheetSoundsInstalled = false;

/**
 * Every action sheet already sounds when it opens; closing one without picking (Cancel, a tap on the backdrop, the
 * back button) now plays the menu-close sound too (owner 2026-10-13). A picked button plays its own sound. Installed
 * once, when this module loads (the kit components are registered globally at startup).
 */
export function installSheetSounds(): void {
  if (sheetSoundsInstalled || typeof document === "undefined") return;
  sheetSoundsInstalled = true;
  document.addEventListener("ionActionSheetWillDismiss", (event) => {
    const role = (event as CustomEvent<{ role?: string }>).detail?.role;
    const closedWithoutPick = role === undefined || role === "cancel" || role === "backdrop";
    if (closedWithoutPick) play$fx("closeMenu");
  });
}

installSheetSounds();

import {
  FACE_STYLES,
  FANTASY_SKIN_TONES,
  HAIR_STYLES,
  HAT_STYLES,
  LOOK_COLORS,
  OUTFIT_STYLES,
  REAL_SKIN_TONES,
  SKIN_TONES,
  SKIN_TONE_NAMES,
  type HeroLook,
  type SkinTone,
} from "@/lib/hero-look/types";

/**
 * What the look editor offers: the tabs (categories) and the option lists behind each one, plus the small
 * pure helpers the editor and the pages around it share. No Vue and no Ionic in here, so specs need neither.
 */

/** A colour choice: `value` is what the look stores, `color` what the swatch paints */
export interface Swatch {
  value: string;
  color: string;
  name: string;
}

export interface ColorGroup {
  key: keyof HeroLook;
  label: string;
  swatches: Swatch[];
}

export type LookTabId = "body" | "hair" | "face" | "outfit" | "hat";
/** How the stage frames the hero for a tab: the head and shoulders, or the whole body */
export type LookFocus = "bust" | "full";
/** A source of numbers in [0, 1): `Math.random`, or a seeded one in specs */
export type Rng = () => number;

export interface LookTab {
  id: LookTabId;
  label: string;
  /** Font Awesome icon (duotone) shown above the label on the tab strip */
  icon: string;
  focus: LookFocus;
  /** How its picture tiles are framed, when that differs from the stage (Body: the stage shows the whole hero, the tiles show the face) */
  tileFocus?: LookFocus;
  /** Hair is judged without a hat, so its tiles and the stage take the hat off */
  bareHead?: boolean;
  /** `headings`: an option id that starts a titled section of the tiles, mapped to the heading text */
  styles?: { key: keyof HeroLook; options: string[]; headings?: Record<string, string> };
  colors: ColorGroup[];
}

const palette = (): Swatch[] => LOOK_COLORS.map((color) => ({ value: color, color, name: color }));

export const TABS: LookTab[] = [
  {
    id: "body",
    label: "Body",
    icon: "fa-user",
    focus: "full",
    tileFocus: "bust",
    styles: { key: "skin", options: [...REAL_SKIN_TONES, ...FANTASY_SKIN_TONES], headings: { orc: "Fantasy" } },
    colors: [],
  },
  {
    id: "hair",
    label: "Hair",
    icon: "fa-cut",
    focus: "bust",
    bareHead: true,
    styles: { key: "hair", options: HAIR_STYLES },
    colors: [{ key: "hairColor", label: "Hair colour", swatches: palette() }],
  },
  {
    id: "face",
    label: "Face",
    icon: "fa-smile",
    focus: "bust",
    styles: { key: "face", options: FACE_STYLES },
    colors: [{ key: "eyeColor", label: "Eye colour", swatches: palette() }],
  },
  {
    id: "outfit",
    label: "Outfit",
    icon: "fa-tshirt",
    focus: "full",
    styles: { key: "outfit", options: OUTFIT_STYLES },
    colors: [
      { key: "outfitColor", label: "Main", swatches: palette() },
      { key: "outfitAccent", label: "Trim", swatches: palette() },
    ],
  },
  {
    id: "hat",
    label: "Hat",
    icon: "fa-hat-wizard",
    focus: "bust",
    styles: { key: "hat", options: HAT_STYLES },
    colors: [{ key: "hatColor", label: "Hat colour", swatches: palette() }],
  },
];

export const tabById = (id: LookTabId): LookTab => TABS.find((tab) => tab.id === id) || TABS[0];

/** A style tile's look: the draft with that one option applied (and no hat on the hair tab, so the hair shows) */
export const tileLook = (draft: HeroLook, tab: LookTab, option: string): HeroLook => {
  const look: HeroLook = { ...draft };
  if (tab.styles) Object.assign(look, { [tab.styles.key]: option });
  if (tab.bareHead) look.hat = "none";
  return look;
};

/** The look the big stage draws for a tab: the draft, bare-headed on the hair tab */
export const stageLook = (draft: HeroLook, tab: LookTab): HeroLook =>
  tab.bareHead ? { ...draft, hat: "none" } : draft;

/** "ponytail" -> "Ponytail" */
export const styleLabel = (style: string): string => style.charAt(0).toUpperCase() + style.slice(1);

/** What a tile is called: skin tones have names of their own ("Frost Blue"), every other option is its capitalised id */
export const optionLabel = (tab: LookTab, option: string): string =>
  tab.styles?.key === "skin" ? SKIN_TONE_NAMES[option as SkinTone] || styleLabel(option) : styleLabel(option);

/** The colour a tile is painted with, for the options that are colours (skin tones); undefined for the rest */
export const optionSwatch = (tab: LookTab, option: string): string | undefined =>
  tab.styles?.key === "skin" ? SKIN_TONES[option as SkinTone] : undefined;

/** The equipped items as far as the look cares: hand slots hold lists of plain item data with a `faIcon` */
export interface HandSlots {
  leftHand?: unknown;
  rightHand?: unknown;
}

/** The first item in a hand slot: the equipment screen keeps items as plain data with a `faIcon` */
export const handIcon = (slot: unknown): string | undefined => {
  const first = Array.isArray(slot) ? slot[0] : undefined;
  const icon = first && typeof first.faIcon === "string" ? first.faIcon : undefined;
  return icon || undefined;
};

/**
 * The look as it is drawn: the hands mirror the equipped items at render time. They are not part of what is
 * saved, so the stored look never carries them (see `withoutHands`).
 */
export const withHands = (look: HeroLook, equipment?: HandSlots | null): HeroLook => ({
  ...look,
  leftHand: handIcon(equipment?.leftHand),
  rightHand: handIcon(equipment?.rightHand),
});

/** The look as it is stored: without the hand icons */
export const withoutHands = (look: HeroLook): HeroLook => {
  const copy = { ...look };
  delete copy.leftHand;
  delete copy.rightHand;
  return copy;
};

/** Hair and eye colours people really have: random heroes lean on these so they read as people, not confetti */
export const NATURAL_HAIR: string[] = ["#5a3a1e", "#2b2b3a", "#1f1f1f", "#e8b22b", "#e3732c", "#8d8d8d", "#e8d5a8"];
export const EYE_COLORS: string[] = ["#2b2b3a", "#1f1f1f", "#5a3a1e", "#2f5fb3", "#3f7d4e", "#6b3fa0"];

const REAL_HATS = HAT_STYLES.filter((hat) => hat !== "none");

const pick = <T>(list: T[], rng: Rng): T => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

/** A random hero: a real skin tone six times in seven, a plain head of hair most of the time, a hat about half of the time, a trim that stands out from the outfit */
export const randomLook = (rng: Rng = Math.random): HeroLook => {
  const outfitColor = pick(LOOK_COLORS, rng);
  return {
    skin: rng() < 1 / 7 ? pick(FANTASY_SKIN_TONES, rng) : pick(REAL_SKIN_TONES, rng),
    hair: pick(HAIR_STYLES, rng),
    hairColor: rng() < 0.75 ? pick(NATURAL_HAIR, rng) : pick(LOOK_COLORS, rng),
    face: pick(FACE_STYLES, rng),
    eyeColor: pick(EYE_COLORS, rng),
    outfit: pick(OUTFIT_STYLES, rng),
    outfitColor,
    outfitAccent: pick(LOOK_COLORS.filter((color) => color !== outfitColor), rng),
    hat: rng() < 0.5 ? "none" : pick(REAL_HATS, rng),
    hatColor: pick(LOOK_COLORS, rng),
  };
};

/** The fields that make a look: the hands come from the equipment and do not count */
const LOOK_KEYS: (keyof HeroLook)[] = [
  "skin",
  "hair",
  "hairColor",
  "face",
  "eyeColor",
  "outfit",
  "outfitColor",
  "outfitAccent",
  "hat",
  "hatColor",
];

export const sameLook = (a: HeroLook, b: HeroLook): boolean => LOOK_KEYS.every((key) => a[key] === b[key]);

/** `count` random heroes, no two alike; with a random source that cannot tell them apart it pads with the repeats */
export const starterLineup = (count: number, rng: Rng = Math.random): HeroLook[] => {
  const lineup: HeroLook[] = [];
  const repeats: HeroLook[] = [];
  for (let draws = 0; lineup.length < count && draws < count * 20; draws++) {
    const look = randomLook(rng);
    (lineup.some((other) => sameLook(other, look)) ? repeats : lineup).push(look);
  }
  return lineup.concat(repeats).slice(0, count);
};

/** The undo history: the latest look goes on the end, a repeat of the last one is not worth a step, the oldest fall off the front */
export const pushHistory = (history: HeroLook[], look: HeroLook, cap = 50): HeroLook[] => {
  const last = history[history.length - 1];
  if (last && sameLook(last, look)) return [...history];
  return [...history, look].slice(-cap);
};

/** Takes the latest look off the end of the history (`look` is undefined when there is nothing to undo) */
export const popHistory = (history: HeroLook[]): { history: HeroLook[]; look: HeroLook | undefined } => ({
  history: history.slice(0, -1),
  look: history[history.length - 1],
});

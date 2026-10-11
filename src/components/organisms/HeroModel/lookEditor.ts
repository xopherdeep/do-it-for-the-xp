import {
  FACE_STYLES,
  HAIR_STYLES,
  HAT_STYLES,
  LOOK_COLORS,
  OUTFIT_STYLES,
  SKIN_TONES,
  type HeroLook,
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

export interface LookTab {
  id: string;
  label: string;
  /** Font Awesome icon (duotone) shown above the label on the tab strip */
  icon: string;
  styles?: { key: keyof HeroLook; options: string[] };
  colors: ColorGroup[];
}

const palette = (): Swatch[] => LOOK_COLORS.map((color) => ({ value: color, color, name: color }));
const skinTones = (): Swatch[] =>
  (Object.keys(SKIN_TONES) as (keyof typeof SKIN_TONES)[]).map((tone) => ({
    value: tone,
    color: SKIN_TONES[tone],
    name: tone,
  }));

export const TABS: LookTab[] = [
  { id: "body", label: "Body", icon: "fa-user", colors: [{ key: "skin", label: "Skin tone", swatches: skinTones() }] },
  {
    id: "hair",
    label: "Hair",
    icon: "fa-cut",
    styles: { key: "hair", options: HAIR_STYLES },
    colors: [{ key: "hairColor", label: "Hair colour", swatches: palette() }],
  },
  {
    id: "face",
    label: "Face",
    icon: "fa-smile",
    styles: { key: "face", options: FACE_STYLES },
    colors: [{ key: "eyeColor", label: "Eye colour", swatches: palette() }],
  },
  {
    id: "outfit",
    label: "Outfit",
    icon: "fa-tshirt",
    styles: { key: "outfit", options: OUTFIT_STYLES },
    colors: [
      { key: "outfitColor", label: "Outfit colour", swatches: palette() },
      { key: "outfitAccent", label: "Trim colour", swatches: palette() },
    ],
  },
  {
    id: "hat",
    label: "Hat",
    icon: "fa-hat-wizard",
    styles: { key: "hat", options: HAT_STYLES },
    colors: [{ key: "hatColor", label: "Hat colour", swatches: palette() }],
  },
];

/** "ponytail" -> "Ponytail" */
export const styleLabel = (style: string): string => style.charAt(0).toUpperCase() + style.slice(1);

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

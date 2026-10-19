/**
 * The hero's look: a voxel character (Unrailed-style blocky) described by part ids and colours.
 * Stored on the profile as `look`; the renderer builds it, the customiser edits it, a snapshot of it
 * becomes the avatar everywhere else.
 */
export type SkinTone =
  | "porcelain"
  | "pale"
  | "rose"
  | "peach"
  | "honey"
  | "tan"
  | "olive"
  | "sienna"
  | "brown"
  | "umber"
  | "deep"
  | "ebony"
  | "orc"
  | "frost"
  | "lavender"
  | "stone"
  | "ember"
  | "gold";
export type HairStyle = "none" | "short" | "bob" | "spiky" | "ponytail" | "curly" | "buzz" | "long" | "mohawk" | "bun";
/** The eight outfits every hero can wear from the start */
export type StarterOutfitStyle = "tunic" | "overalls" | "armor" | "robe" | "hoodie" | "dress" | "tracksuit" | "pyjamas";
/** A class name lower-cased with spaces as hyphens ("White Mage" is "white-mage") */
export type ClassSlug =
  | "warrior"
  | "mage"
  | "thief"
  | "monk"
  | "knight"
  | "berserker"
  | "white-mage"
  | "black-mage"
  | "assassin"
  | "ranger"
  | "martial-artist"
  | "mystic"
  | "paladin"
  | "ninja"
  | "sage";
/** A class outfit is earned at class level 1, 5 and 10: "warrior-1", "white-mage-5", "martial-artist-10" */
export type ClassOutfitStyle = `${ClassSlug}-${1 | 5 | 10}`;
export type OutfitStyle = StarterOutfitStyle | ClassOutfitStyle;
export type HatStyle = "none" | "cap" | "crown" | "wizard" | "helmet" | "beanie" | "headband" | "bandana" | "flower";
export type FaceStyle = "smile" | "grin" | "determined" | "sleepy" | "wink" | "surprised";

export interface HeroLook {
  skin: SkinTone;
  hair: HairStyle;
  /** CSS hex colour */
  hairColor: string;
  face: FaceStyle;
  eyeColor: string;
  outfit: OutfitStyle;
  outfitColor: string;
  /** Second colour of the outfit (trim, overalls bib, robe belt) */
  outfitAccent: string;
  hat: HatStyle;
  hatColor: string;
  /** Font Awesome icon names of the items in each hand, mirrored from the equipment slots; may be empty */
  leftHand?: string;
  rightHand?: string;
}

export type HeroAnimation = "idle" | "wave" | "walk" | "victory" | "hurt" | "dance" | "hop";

export const DEFAULT_LOOK: HeroLook = {
  skin: "peach",
  hair: "short",
  hairColor: "#5a3a1e",
  face: "smile",
  eyeColor: "#2b2b3a",
  outfit: "tunic",
  outfitColor: "#3f7d4e",
  outfitAccent: "#e8d5a8",
  hat: "none",
  hatColor: "#b8342b",
};

/** Light to deep, then the fantasy hues; the original six (peach, tan, brown, deep, olive, pale) keep their hexes */
export const SKIN_TONES: Record<SkinTone, string> = {
  porcelain: "#fbeee6",
  pale: "#f7e3d3",
  rose: "#f3c6b8",
  peach: "#f1c9a5",
  honey: "#e0b07a",
  tan: "#d9a877",
  olive: "#c9b07a",
  sienna: "#c08250",
  brown: "#a86b3c",
  umber: "#8a5530",
  deep: "#6b3f22",
  ebony: "#4a2a18",
  orc: "#7fae5a",
  frost: "#9cc7e6",
  lavender: "#b9a3e0",
  stone: "#9a9a94",
  ember: "#d0584a",
  gold: "#e8c45a",
};

/** What a tone is called on its tile */
export const SKIN_TONE_NAMES: Record<SkinTone, string> = {
  porcelain: "Porcelain",
  pale: "Pale",
  rose: "Rose",
  peach: "Peach",
  honey: "Honey",
  tan: "Tan",
  olive: "Olive",
  sienna: "Sienna",
  brown: "Brown",
  umber: "Umber",
  deep: "Deep",
  ebony: "Ebony",
  orc: "Orc Green",
  frost: "Frost Blue",
  lavender: "Lavender",
  stone: "Stone Grey",
  ember: "Ember Red",
  gold: "Gold",
};

/** The tones people really have (the first twelve, light to deep) and the fantasy hues that follow them */
export const REAL_SKIN_TONES: SkinTone[] = [
  "porcelain", "pale", "rose", "peach", "honey", "tan", "olive", "sienna", "brown", "umber", "deep", "ebony",
];
export const FANTASY_SKIN_TONES: SkinTone[] = ["orc", "frost", "lavender", "stone", "ember", "gold"];

/** The palette offered by the colour pickers: warm, saturated, reads on the dark RPG boxes */
export const LOOK_COLORS: string[] = [
  "#b8342b", "#e3732c", "#e8b22b", "#3f7d4e", "#2b8a8a", "#2f5fb3", "#6b3fa0", "#c54a8a",
  "#5a3a1e", "#2b2b3a", "#e8d5a8", "#f5f5f5", "#8d8d8d", "#1f1f1f", "#f1c9a5", "#9bd36a",
];

/** Option lists for the pickers */
export const HAIR_STYLES: HairStyle[] = ["none", "short", "bob", "spiky", "ponytail", "curly", "buzz", "long", "mohawk", "bun"];
export const OUTFIT_STYLES: OutfitStyle[] = ["tunic", "overalls", "armor", "robe", "hoodie", "dress", "tracksuit", "pyjamas"];
export const HAT_STYLES: HatStyle[] = ["none", "cap", "crown", "wizard", "helmet", "beanie", "headband", "bandana", "flower"];
export const FACE_STYLES: FaceStyle[] = ["smile", "grin", "determined", "sleepy", "wink", "surprised"];

export const isHeroLook = (value: unknown): value is HeroLook =>
  !!value && typeof value === "object" && "skin" in value && "outfit" in value && "hair" in value;

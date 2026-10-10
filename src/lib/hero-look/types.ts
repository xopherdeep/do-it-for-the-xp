/**
 * The hero's look: a voxel character (Unrailed-style blocky) described by part ids and colours.
 * Stored on the profile as `look`; the renderer builds it, the customiser edits it, a snapshot of it
 * becomes the avatar everywhere else.
 */
export type SkinTone = "peach" | "tan" | "brown" | "deep" | "olive" | "pale";
export type HairStyle = "none" | "short" | "bob" | "spiky" | "ponytail" | "curly" | "buzz" | "long" | "mohawk" | "bun";
export type OutfitStyle = "tunic" | "overalls" | "armor" | "robe" | "hoodie" | "dress" | "tracksuit" | "pyjamas";
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

export type HeroAnimation = "idle" | "wave" | "walk" | "victory" | "hurt" | "dance";

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

export const SKIN_TONES: Record<SkinTone, string> = {
  peach: "#f1c9a5",
  tan: "#d9a877",
  brown: "#a86b3c",
  deep: "#6b3f22",
  olive: "#c9b07a",
  pale: "#f7e3d3",
};

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

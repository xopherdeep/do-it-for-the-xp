/**
 * The look catalogue (pure, no Vue): every piece a hero can wear, its slot, its name and where it comes from.
 * The starter set is what existed before; the 45 class outfits are earned at class level 1, 5 and 10.
 * Which pieces a hero owns is decided elsewhere, from class progress; nothing here is stored on a profile.
 */
import { JOB_CLASS_OPTIONS } from "@/constants/JOB_CLASS_OPTIONS";
import {
  FACE_STYLES,
  HAIR_STYLES,
  HAT_STYLES,
  LOOK_COLORS,
  OUTFIT_STYLES,
  type ClassOutfitStyle,
  type ClassSlug,
  type FaceStyle,
  type HairStyle,
  type HatStyle,
  type OutfitStyle,
  type StarterOutfitStyle,
} from "./types";

export type PieceSlot = "hair" | "face" | "outfit" | "hat" | "color";

export type ClassOutfitLevel = 1 | 5 | 10;

export type LookSource =
  | { kind: "starter" }
  | { kind: "class"; jobClass: string; level: ClassOutfitLevel }
  | { kind: "gift" };

export interface LookPiece {
  /** `${slot}:${value}`, e.g. "outfit:white-mage-5" or "color:#b8342b" */
  id: string;
  slot: PieceSlot;
  value: string;
  name: string;
  source: LookSource;
  /** A class outfit's own colours, put on with the outfit the first time it is worn */
  colors?: { outfitColor: string; outfitAccent: string };
}

/** Class outfits come at these class levels, in this order */
const CLASS_OUTFIT_LEVELS: readonly ClassOutfitLevel[] = [1, 5, 10];

/** "White Mage" is "white-mage" */
export const classSlug = (jobClass: string): string => jobClass.trim().toLowerCase().replace(/\s+/g, "-");

/** The spec's table of names: level 1, level 5, level 10 */
const CLASS_OUTFIT_NAMES: Record<ClassSlug, [string, string, string]> = {
  warrior: ["Leather Jerkin", "Chainmail Hauberk", "Battle Plate"],
  mage: ["Apprentice Robe", "Star Robe", "Archmage Mantle"],
  thief: ["Hooded Vest", "Shadow Leathers", "Phantom Cloak"],
  monk: ["Training Gi", "Sash Robes", "Iron Fist Vestments"],
  knight: ["Squire's Tabard", "Knight's Mail", "Crested Plate"],
  berserker: ["Fur Harness", "Warpaint Hide", "Wolfpelt Mantle"],
  "white-mage": ["Healer's Smock", "White Robe", "Dawn Vestments"],
  "black-mage": ["Dark Tunic", "Night Robe", "Void Mantle"],
  assassin: ["Grey Wrap", "Blade Leathers", "Nightshade Cloak"],
  ranger: ["Scout's Jacket", "Forest Mail", "Hawkfeather Cloak"],
  "martial-artist": ["Sparring Gi", "Belted Gi", "Dragon Gi"],
  mystic: ["Seer's Shawl", "Moon Robe", "Celestial Mantle"],
  paladin: ["Oath Tabard", "Radiant Plate", "Sunfire Regalia"],
  ninja: ["Shinobi Wrap", "Shadow Shozoku", "Storm Shozoku"],
  sage: ["Scholar's Robe", "Sage's Vestments", "Worldtree Mantle"],
};

/** One colour pair (main, trim) per class, shared by its three outfits so the class reads at every level */
const CLASS_OUTFIT_COLORS: Record<ClassSlug, { outfitColor: string; outfitAccent: string }> = {
  warrior: { outfitColor: "#b8342b", outfitAccent: "#8d8d8d" },
  mage: { outfitColor: "#2f5fb3", outfitAccent: "#e8b22b" },
  thief: { outfitColor: "#2b2b3a", outfitAccent: "#8d8d8d" },
  monk: { outfitColor: "#e3732c", outfitAccent: "#e8d5a8" },
  knight: { outfitColor: "#8d8d8d", outfitAccent: "#2f5fb3" },
  berserker: { outfitColor: "#5a3a1e", outfitAccent: "#b8342b" },
  "white-mage": { outfitColor: "#f5f5f5", outfitAccent: "#b8342b" },
  "black-mage": { outfitColor: "#1f1f1f", outfitAccent: "#6b3fa0" },
  assassin: { outfitColor: "#2b2b3a", outfitAccent: "#c54a8a" },
  ranger: { outfitColor: "#3f7d4e", outfitAccent: "#5a3a1e" },
  "martial-artist": { outfitColor: "#f5f5f5", outfitAccent: "#1f1f1f" },
  mystic: { outfitColor: "#6b3fa0", outfitAccent: "#2b8a8a" },
  paladin: { outfitColor: "#e8d5a8", outfitAccent: "#e8b22b" },
  ninja: { outfitColor: "#1f1f1f", outfitAccent: "#b8342b" },
  sage: { outfitColor: "#2b8a8a", outfitAccent: "#e8d5a8" },
};

const HAIR_NAMES: Record<HairStyle, string> = {
  none: "No Hair",
  short: "Short",
  bob: "Bob",
  spiky: "Spiky",
  ponytail: "Ponytail",
  curly: "Curly",
  buzz: "Buzz Cut",
  long: "Long",
  mohawk: "Mohawk",
  bun: "Bun",
};

const FACE_NAMES: Record<FaceStyle, string> = {
  smile: "Smile",
  grin: "Grin",
  determined: "Determined",
  sleepy: "Sleepy",
  wink: "Wink",
  surprised: "Surprised",
};

const STARTER_OUTFIT_NAMES: Record<StarterOutfitStyle, string> = {
  tunic: "Tunic",
  overalls: "Overalls",
  armor: "Armor",
  robe: "Robe",
  hoodie: "Hoodie",
  dress: "Dress",
  tracksuit: "Tracksuit",
  pyjamas: "Pyjamas",
};

const HAT_NAMES: Record<HatStyle, string> = {
  none: "No Hat",
  cap: "Cap",
  crown: "Crown",
  wizard: "Wizard Hat",
  helmet: "Helmet",
  beanie: "Beanie",
  headband: "Headband",
  bandana: "Bandana",
  flower: "Flower",
};

/** What a colour is called; a colour added to LOOK_COLORS later falls back to its hex until it is named here */
const COLOR_NAMES: Record<string, string> = {
  "#b8342b": "Crimson",
  "#e3732c": "Orange",
  "#e8b22b": "Gold",
  "#3f7d4e": "Forest",
  "#2b8a8a": "Teal",
  "#2f5fb3": "Royal Blue",
  "#6b3fa0": "Violet",
  "#c54a8a": "Magenta",
  "#5a3a1e": "Brown",
  "#2b2b3a": "Midnight",
  "#e8d5a8": "Sand",
  "#f5f5f5": "Snow",
  "#8d8d8d": "Steel",
  "#1f1f1f": "Black",
  "#f1c9a5": "Peach",
  "#9bd36a": "Lime",
};

const starterPiece = (slot: PieceSlot, value: string, name: string): LookPiece => ({
  id: `${slot}:${value}`,
  slot,
  value,
  name,
  source: { kind: "starter" },
});

const STARTER_PIECES: LookPiece[] = [
  ...HAIR_STYLES.map((value) => starterPiece("hair", value, HAIR_NAMES[value])),
  ...FACE_STYLES.map((value) => starterPiece("face", value, FACE_NAMES[value])),
  ...OUTFIT_STYLES.map((value) => starterPiece("outfit", value, STARTER_OUTFIT_NAMES[value as StarterOutfitStyle])),
  ...HAT_STYLES.map((value) => starterPiece("hat", value, HAT_NAMES[value])),
  ...LOOK_COLORS.map((hex) => starterPiece("color", hex.toLowerCase(), COLOR_NAMES[hex.toLowerCase()] || hex)),
];

/** The class's three outfits in level order; a class the table does not know gets none */
const classPiecesFor = (jobClass: string): LookPiece[] => {
  const slug = classSlug(jobClass) as ClassSlug;
  const names = CLASS_OUTFIT_NAMES[slug];
  const colors = CLASS_OUTFIT_COLORS[slug];
  if (!names || !colors) return [];
  return CLASS_OUTFIT_LEVELS.map((level, index): LookPiece => {
    const value: ClassOutfitStyle = `${slug}-${level}`;
    return {
      id: `outfit:${value}`,
      slot: "outfit",
      value,
      name: names[index],
      source: { kind: "class", jobClass, level },
      colors: { ...colors },
    };
  });
};

const CLASS_PIECES: LookPiece[] = JOB_CLASS_OPTIONS.flatMap(({ name }) => classPiecesFor(name));

/** The eight outfits that exist from the start (the builder's starter row) */
export const STARTER_OUTFIT_STYLES: OutfitStyle[] = [...OUTFIT_STYLES];

/** The 45 class outfit values, class order (JOB_CLASS_OPTIONS) then level order */
export const CLASS_OUTFIT_STYLES: OutfitStyle[] = CLASS_PIECES.map((piece) => piece.value as OutfitStyle);

/** Starter pieces first, then the class outfits grouped by class */
export const LOOK_CATALOG: readonly LookPiece[] = Object.freeze([...STARTER_PIECES, ...CLASS_PIECES]);

const PIECES_BY_ID: ReadonlyMap<string, LookPiece> = new Map<string, LookPiece>(
  LOOK_CATALOG.map((piece): [string, LookPiece] => [piece.id, piece]),
);

export const pieceById = (id: string): LookPiece | undefined => PIECES_BY_ID.get(id);

/** Starter pieces first, then class pieces grouped by class */
export const piecesForSlot = (slot: PieceSlot): LookPiece[] => LOOK_CATALOG.filter((piece) => piece.slot === slot);

/** The class's three outfits in level order (empty for a name that is not a class) */
export const classOutfitPieces = (jobClass: string): LookPiece[] => {
  const slug = classSlug(jobClass);
  return CLASS_PIECES.filter((piece) => piece.source.kind === "class" && classSlug(piece.source.jobClass) === slug);
};

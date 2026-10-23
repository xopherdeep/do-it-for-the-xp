import { DEFAULT_LOOK } from "@/lib/hero-look/types";
import type { HeroLook } from "@/lib/hero-look/types";

/**
 * The fixed line-up the VoxelLab shows and the perf spec measures: the default hero, an armoured fighter, a robed
 * wizard, a hoodie, and the heaviest look there is (armour, wizard hat, long hair, a shield and a sword).
 */
export const BENCH_LOOKS: HeroLook[] = [
  DEFAULT_LOOK,
  { ...DEFAULT_LOOK, skin: "brown", hair: "spiky", hairColor: "#e8c040", outfit: "armor", outfitColor: "#8a96a8", hat: "none", rightHand: "fa-sword", leftHand: "fa-shield" },
  { ...DEFAULT_LOOK, skin: "pale", hair: "long", hairColor: "#2a2030", outfit: "robe", outfitColor: "#4a3a8a", hat: "wizard", hatColor: "#3050a0", rightHand: "fa-wand-magic" },
  { ...DEFAULT_LOOK, skin: "tan", hair: "curly", hairColor: "#c05a28", outfit: "hoodie", outfitColor: "#2a8a8a", hat: "cap", hatColor: "#c03030" },
  { ...DEFAULT_LOOK, outfit: "armor", hat: "wizard", hair: "long", leftHand: "shield", rightHand: "sword" },
];

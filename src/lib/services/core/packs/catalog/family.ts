/** The Family pack: the starter world (StarterWorld.ts), a whole ready-made Compendium for a family with kids */
import {
  STARTER_ABILITIES,
  STARTER_ACCESSORIES,
  STARTER_BEASTS,
  STARTER_CATEGORIES,
  STARTER_DOS_DONTS,
  STARTER_QUESTS,
  starterShops,
} from "@/lib/services/core/StarterWorld";
import { PACK_FORMAT, PACK_FORMAT_VERSION } from "../packFormat";
import type { XpPack } from "../packFormat";

export const FAMILY_PACK: XpPack = {
  format: PACK_FORMAT,
  formatVersion: PACK_FORMAT_VERSION,
  id: "family",
  name: "Family",
  version: "1.1.0",
  audience: "Families with kids",
  description: "The starter world: everyday chores as beasts to tame, family time, boss fights, house rules and real rewards.",
  icon: "home-heart",
  author: "Do It For The XP",
  terms: { member: "Hero", members: "Heroes", gm: "Game Master" },
  content: {
    categories: STARTER_CATEGORIES,
    beasts: STARTER_BEASTS,
    quests: STARTER_QUESTS,
    abilities: STARTER_ABILITIES,
    rewards: STARTER_ACCESSORIES,
    dosDonts: STARTER_DOS_DONTS,
    shopStock: Object.fromEntries(starterShops().map((shop) => [shop.id, shop.items.map((item) => item.itemId)])),
  },
};

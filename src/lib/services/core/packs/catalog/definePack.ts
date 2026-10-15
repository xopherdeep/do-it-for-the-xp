/**
 * Writes a built-in pack from one-line seeds: categories, quests, house rules and rewards. Every quest's beast comes
 * from the beast library, the rewards go on the Hometown Market's shelf, and Powers are picked from the presets by
 * id, so a pack file stays short and reads like a list of chores.
 */
import { HYBRID_PRESETS, REAL_LIFE_PRESETS, TECH_MAGE_PRESETS, TIME_MAGE_PRESETS } from "@/lib/services/abilities/AbilityPresets";
import { PRIVILEGE_PRESETS } from "@/lib/services/abilities/privilegePresets";
import { rewardFromPreset } from "@/lib/services/shops/rewardPresets";
import type { RewardPreset } from "@/lib/services/shops/rewardPresets";
import type { AchievementCategoryInterface } from "@/lib/databases/AchievementDb";
import { Rarity } from "@/lib/databases/AccessoriesDb";
import { beastsForQuests, doDontFromSeed, questFromSeed } from "../packSeeds";
import type { DoDontSeed, QuestSeed } from "../packSeeds";
import { PACK_FORMAT, PACK_FORMAT_VERSION } from "../packFormat";
import type { XpPack } from "../packFormat";

const ALL_POWERS = [...REAL_LIFE_PRESETS, ...TIME_MAGE_PRESETS, ...TECH_MAGE_PRESETS, ...HYBRID_PRESETS, ...PRIVILEGE_PRESETS];

export interface PackSeeds {
  categories: AchievementCategoryInterface[];
  quests: QuestSeed[];
  dosDonts?: DoDontSeed[];
  rewards?: RewardPreset[];
  /** Preset Power ids (AbilityPresets.ts, and the timed privileges in privilegePresets.ts) */
  powers?: string[];
}

export const definePack = (meta: Omit<XpPack, "format" | "formatVersion" | "content">, seeds: PackSeeds): XpPack => {
  const quests = seeds.quests.map(questFromSeed);
  const rewards = (seeds.rewards ?? []).map(rewardFromPreset);
  const abilities = (seeds.powers ?? []).map((id) => {
    const power = ALL_POWERS.find((preset) => preset.id === id);
    if (!power) throw new Error(`No preset Power "${id}"`);
    return { ...power, isPreset: true };
  });
  return {
    format: PACK_FORMAT,
    formatVersion: PACK_FORMAT_VERSION,
    author: "Do It For The XP",
    ...meta,
    content: {
      categories: seeds.categories,
      beasts: beastsForQuests(quests),
      quests,
      ...(abilities.length ? { abilities } : {}),
      ...(rewards.length ? { rewards, shopStock: { "hometown-market": rewards.map((reward) => String(reward.id)) } } : {}),
      ...(seeds.dosDonts?.length ? { dosDonts: seeds.dosDonts.map(doDontFromSeed) } : {}),
    },
  };
};

const rarityOf = (basePrice: number): Rarity => {
  const isCheap = basePrice < 150;
  if (isCheap) return Rarity.Common;
  return basePrice < 400 ? Rarity.Uncommon : Rarity.Rare;
};

/** A real-life reward, its rarity read off the price the way the preset rewards climb the wallet ladder */
export const reward = (id: string, name: string, description: string, basePrice: number, icon: string): RewardPreset => ({
  id,
  name,
  description,
  basePrice,
  rarity: rarityOf(basePrice),
  icon,
});

/**
 * The content pack file: a self-contained, versioned bundle of game content (quest categories, beasts, quests,
 * Powers, rewards, shop stock and Do This, Not That rules) that a Game Master loads from Settings > Packs.
 *
 * A pack is plain JSON on purpose, so a pack can later be exported, imported and shared (the Town Hall) without a
 * new format. Every record carries the id it is stored under; a pack owns the ids it lists, so loading it again
 * replaces only those records, and removing it takes back only those records. Ids a pack shares with another pack
 * (a library beast, a preset reward) are kept while any other loaded pack still lists them.
 *
 * Shop stock is a list of item ids per shop, never a whole shop record: two packs can both stock the Hometown
 * Market, and loading one never drops what another put on the shelf.
 *
 * `formatVersion` is the shape of this file (bump it on a breaking change and teach parsePack the old one);
 * `version` is the pack's own content version, chosen by its author.
 */
import type { Achievement, AchievementCategoryInterface } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { Accessory } from "@/lib/databases/AccessoriesDb";
import type { DosDont } from "@/lib/databases/DosDontsDb";
import type { Ability } from "@/types/abilities";

export const PACK_FORMAT = "xp-pack";
export const PACK_FORMAT_VERSION = 1;

/** What the pack calls the players and the Game Master. Shown on the pack card; the app's own wording stays as is for now */
export interface PackTerms {
  /** One player: Hero, Student, Teammate */
  member: string;
  members: string;
  /** The person who runs the game: Game Master, Teacher, Team Lead */
  gm: string;
}

export interface PackContent {
  categories?: AchievementCategoryInterface[];
  beasts?: Beast[];
  quests?: Achievement[];
  abilities?: Ability[];
  /** Consumables and real-life rewards, sold in the shops through `shopStock` */
  rewards?: Accessory[];
  dosDonts?: DosDont[];
  /** Shop id (from the shop registry) to the item ids the pack puts on its shelf */
  shopStock?: Record<string, string[]>;
}

export interface XpPack {
  format: typeof PACK_FORMAT;
  formatVersion: typeof PACK_FORMAT_VERSION;
  /** Stable id, lowercase with dashes: "family", "classroom" */
  id: string;
  name: string;
  /** Content version, like "1.0.0" */
  version: string;
  /** Who it is for, in a few words: "Families with kids" */
  audience: string;
  /** One or two short sentences for the pack card */
  description: string;
  /** Font Awesome duotone icon name, without the fa- prefix */
  icon?: string;
  author?: string;
  terms?: PackTerms;
  content: PackContent;
}

/** The file is not a pack this app can read. Thrown before anything is touched. */
export class PackFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PackFormatError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const RECORD_LISTS = ["categories", "beasts", "quests", "abilities", "rewards", "dosDonts"] as const;
const TEXT_FIELDS = ["id", "name", "version", "audience", "description"] as const;

/** Checks the shape of a pack (text or parsed JSON) and returns it; throws PackFormatError for anything it can't load */
export const parsePack = (input: string | unknown): XpPack => {
  let data: unknown = input;
  if (typeof input === "string") {
    try {
      data = JSON.parse(input);
    } catch {
      throw new PackFormatError("The file is not valid JSON.");
    }
  }
  if (!isRecord(data) || data.format !== PACK_FORMAT) {
    throw new PackFormatError("This file is not an XP pack.");
  }
  if (data.formatVersion !== PACK_FORMAT_VERSION) {
    throw new PackFormatError(`This pack was made for pack format ${String(data.formatVersion)}; this app reads format ${PACK_FORMAT_VERSION}.`);
  }
  for (const field of TEXT_FIELDS) {
    if (typeof data[field] !== "string" || !(data[field] as string).trim()) {
      throw new PackFormatError(`The pack needs a "${field}".`);
    }
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.id as string)) {
    throw new PackFormatError("A pack id is lowercase letters, numbers and dashes.");
  }
  const content = data.content;
  if (!isRecord(content)) throw new PackFormatError("The pack has no content.");
  for (const list of RECORD_LISTS) {
    const records = content[list];
    if (records === undefined) continue;
    if (!Array.isArray(records)) throw new PackFormatError(`"${list}" must be a list.`);
    const seen = new Set<string>();
    records.forEach((record, index) => {
      if (!isRecord(record) || (typeof record.id !== "string" && typeof record.id !== "number") || record.id === "") {
        throw new PackFormatError(`"${list}", entry ${index + 1}: every entry needs an "id".`);
      }
      const id = String(record.id);
      if (seen.has(id)) throw new PackFormatError(`"${list}" lists the id "${id}" more than once.`);
      seen.add(id);
    });
  }
  if (content.shopStock !== undefined) {
    if (!isRecord(content.shopStock)) throw new PackFormatError(`"shopStock" must map shop ids to item ids.`);
    for (const [shopId, itemIds] of Object.entries(content.shopStock)) {
      if (!Array.isArray(itemIds) || !itemIds.every((itemId) => typeof itemId === "string")) {
        throw new PackFormatError(`"shopStock.${shopId}" must be a list of item ids.`);
      }
    }
  }
  return data as unknown as XpPack;
};

/** The pack as the text of a .json file, ready to share */
export const packToJson = (pack: XpPack): string => JSON.stringify(pack, null, 2);

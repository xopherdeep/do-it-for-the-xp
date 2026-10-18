/**
 * A family's own content as a pack (packFormat.ts), so a Game Master can save it to a file or share it in the Town Hall.
 *
 * "Own" is every quest, Power, reward and house rule no known pack lists (the built-ins and the packs the family added):
 * what the family made itself, and what the Home chores and Moving House builders made for it. A beast or quest category
 * an exported quest uses comes along whoever made it, so the quest still has its beast in the family that loads it.
 *
 * Nothing that only means something in this home leaves it: the heroes a quest or reward is for, who made it, what was
 * bought and when a Power was last cast. A picture kept only on this device (blob:, file:) is dropped, since no other
 * device can show it. All pure.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Accessory } from "@/lib/databases/AccessoriesDb";
import type { ShopInterface } from "@/lib/databases/ShopsDb";
import type { Ability } from "@/types/abilities";
import { PACK_FORMAT, PACK_FORMAT_VERSION } from "./packFormat";
import type { PackContent, XpPack } from "./packFormat";
import { packIds } from "./packService";
import type { PackList, PackSnapshot } from "./packService";

/** What the Game Master writes about the pack before it is saved or shared */
export interface PackDetails {
  name: string;
  description: string;
  /** Kept from the last export, so a pack saved again replaces the old one wherever it was loaded */
  id?: string;
  author?: string;
}

export const OWN_PACK_ICON = "home-heart";
export const OWN_PACK_AUDIENCE = "Families like ours";

/** A pack id from its name: "The Smiths' Chores" is "the-smiths-chores" */
export const packSlug = (name: string): string =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "") || "pack";

/**
 * A new id for a family's pack: its name and a short tag of its own, so two families who both call theirs "Chores" never
 * replace each other's pack. `tag` is passed in (the caller rolls it) so this stays deterministic.
 */
export const newPackId = (name: string, tag: string): string => `${packSlug(name)}-${tag.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

/** The name of the saved file: "xp-pack-the-smiths-chores-k3f9.json" */
export const packFileName = (pack: Pick<XpPack, "id">): string => `xp-pack-${pack.id}.json`;

/** Pictures that live only on this device */
const isDeviceOnlyUrl = (url: unknown): boolean => typeof url === "string" && /^(blob|file|capacitor|content):/i.test(url);

const withoutDeviceImages = <T extends { imageUrl?: string; localImage?: string }>(record: T): T => {
  const copy = { ...record };
  if (isDeviceOnlyUrl(copy.imageUrl)) delete copy.imageUrl;
  if (isDeviceOnlyUrl(copy.localImage)) delete copy.localImage;
  return copy;
};

const scrubQuest = (quest: Achievement): Achievement => {
  const { createdBy: _createdBy, draft: _draft, ...rest } = withoutDeviceImages(quest);
  return { ...rest, assignee: [] };
};

const scrubReward = (reward: Accessory): Accessory => {
  const { purchaseHistory: _history, ...rest } = withoutDeviceImages(reward);
  const inventory = rest.inventory ? { total: rest.inventory.total, available: rest.inventory.total, reserved: 0 } : undefined;
  return { ...rest, availableToMembers: [], ...(inventory ? { inventory } : {}) };
};

const scrubAbility = (ability: Ability): Ability => {
  const { lastUsed: _lastUsed, ...rest } = ability;
  return rest;
};

const valuesOf = <T>(store: ReadonlyMap<string, unknown>): T[] => Array.from(store.values()) as T[];

/** Every id the known packs list, per list */
const knownIds = (packs: readonly XpPack[]): Record<PackList, Set<string>> => {
  const known: Record<PackList, Set<string>> = {
    categories: new Set(),
    beasts: new Set(),
    quests: new Set(),
    abilities: new Set(),
    rewards: new Set(),
    dosDonts: new Set(),
  };
  for (const pack of packs) {
    const ids = packIds(pack);
    for (const list of Object.keys(known) as PackList[]) ids[list].forEach((id) => known[list].add(id));
  }
  return known;
};

const isOwn = (known: Set<string>) => (record: { id?: unknown }) => record.id !== undefined && !known.has(String(record.id));

/** A list for the pack's content, or nothing when it is empty */
const listIn = <K extends keyof PackContent>(key: K, list: unknown[]): Partial<PackContent> => (list.length ? { [key]: list } : {});

/** The family's own content, ready to go in a pack. Empty lists are left out. */
export const ownContent = (snapshot: PackSnapshot, knownPacks: readonly XpPack[]): PackContent => {
  const known = knownIds(knownPacks);
  const quests = valuesOf<Achievement>(snapshot.__achievements)
    .filter(isOwn(known.quests))
    .filter((quest) => !quest.draft)
    .map(scrubQuest);
  const abilities = valuesOf<Ability>(snapshot.__abilities)
    .filter(isOwn(known.abilities))
    .filter((ability) => !ability.isPreset)
    .map(scrubAbility);
  const rewards = valuesOf<Accessory>(snapshot.__accessories).filter(isOwn(known.rewards)).map(scrubReward);
  const dosDonts = valuesOf<{ id: string }>(snapshot.__dosDonts).filter(isOwn(known.dosDonts)) as PackContent["dosDonts"];

  // What the quests stand on comes along, whoever made it
  const beastIds = new Set(quests.map((quest) => String(quest.beastId ?? "")).filter(Boolean));
  const categoryIds = new Set(quests.map((quest) => String(quest.categoryId ?? "")).filter(Boolean));
  const beasts = valuesOf<{ id: string; imageUrl?: string; localImage?: string }>(snapshot.__beasts)
    .filter((beast) => beastIds.has(String(beast.id)))
    .map(withoutDeviceImages) as PackContent["beasts"];
  const categories = valuesOf<{ id: string; name: string }>(snapshot.__achievementCategories).filter((category) =>
    categoryIds.has(String(category.id))
  );

  // The rewards go back on the shelves they sit on here
  const rewardIds = new Set(rewards.map((reward) => String(reward.id)));
  const shopStock: Record<string, string[]> = {};
  for (const shop of valuesOf<ShopInterface>(snapshot.__shops)) {
    const shelved = (shop.items ?? []).map((item) => String(item.itemId)).filter((itemId) => rewardIds.has(itemId));
    const hasOwnRewards = shelved.length > 0;
    if (hasOwnRewards) shopStock[shop.id] = Array.from(new Set(shelved));
  }

  return {
    ...listIn("categories", categories),
    ...listIn("beasts", beasts ?? []),
    ...listIn("quests", quests),
    ...listIn("abilities", abilities),
    ...listIn("rewards", rewards),
    ...listIn("dosDonts", dosDonts ?? []),
    ...(Object.keys(shopStock).length ? { shopStock } : {}),
  };
};

/** Whether there is anything of the family's own to share: quests, Powers, rewards or house rules (beasts only come with quests) */
export const hasOwnContent = (content: PackContent): boolean =>
  Boolean(content.quests?.length || content.abilities?.length || content.rewards?.length || content.dosDonts?.length);

/** The family's pack. `id` comes from the details when the family saved one before, else from `newId` */
export const buildOwnPack = (
  snapshot: PackSnapshot,
  knownPacks: readonly XpPack[],
  details: PackDetails,
  newId: string,
  version = "1.0.0"
): XpPack => {
  const name = details.name.trim();
  const description = details.description.trim() || `Quests and rewards from ${name}.`;
  const author = details.author?.trim();
  // The family's own earlier export is not "known": saving again takes in what was in it and what was made since
  const id = details.id || newId;
  const others = knownPacks.filter((pack) => pack.id !== id);
  return {
    format: PACK_FORMAT,
    formatVersion: PACK_FORMAT_VERSION,
    id,
    name,
    version,
    audience: OWN_PACK_AUDIENCE,
    description,
    icon: OWN_PACK_ICON,
    ...(author ? { author } : {}),
    content: ownContent(snapshot, others),
  };
};

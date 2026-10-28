import AchievementDb, { achievementStorage, type Achievement } from "@/lib/databases/AchievementDb";
import AbilitiesDb, { abilitiesStorage } from "@/lib/databases/AbilitiesDb";
import AccessoriesDb, { accessoriesStorage, type Accessory } from "@/lib/databases/AccessoriesDb";
import BestiaryDb, { beastStorage, type Beast } from "@/lib/databases/BestiaryDb";
import shopsDb, { ShopItemType, type ShopInterface } from "@/lib/databases/ShopsDb";
import templeDb, { type TempleInterface } from "@/lib/databases/TempleDb";
import { getTempleProgressDb, toTempleProgress, templeProgressKey, type TempleProgressEntry } from "@/lib/databases/TempleProgressDb";
import { SHOP_METADATA } from "@/lib/engine/core/shopRegistry";
import { TEMPLE_METADATA } from "@/lib/engine/temples/templeRegistry";
import { isProjectQuestId } from "@/lib/services/projects/projectIds";
import { settleInBackground } from "@/lib/services/projects/settleInBackground";
import { useTempleCreatorStore } from "@/lib/store/stores/temple-creator";
import { useUserStore } from "@/lib/store/stores/user";
import type { Ability } from "@/hooks/abilities/abilityConstants";
import {
  heroWithoutQuest,
  mergeLinks,
  prerequisiteLinks,
  questLinks,
  shelfLinks,
  shopRoomLinks,
  unlinkPrerequisite,
  unlinkQuest,
  unlinkShop,
  unstock,
  usageNote,
  type LinkedHero,
} from "./contentLinks";

/**
 * The Game Master deletes a quest, an item, a Power, a shop or a temple. Each delete takes the record off everything
 * that names it first (contentLinks.ts), then removes it: if the unlinking fails the record is still there, and
 * nothing is left pointing at a record that is gone. Each `usageOf*` is the line the confirm shows; it throws when the
 * records cannot be read, and a screen that gets no answer does not delete.
 */

const achievementDb = new AchievementDb(achievementStorage);
const abilitiesDb = new AbilitiesDb(abilitiesStorage);
const accessoriesDb = new AccessoriesDb(accessoriesStorage);
const bestiaryDb = new BestiaryDb(beastStorage);

const storedTemples = async (): Promise<TempleInterface[]> =>
  ((await templeDb.getAll()) as TempleInterface[]).filter((temple) => temple?.id);

const storedShops = (): Promise<ShopInterface[]> => shopsDb.getShops();

/** The temple creator keeps its own copy of the temple it has open: drop it when that temple changed or went */
const forgetInCreator = (templeIds: string[]): void => {
  const creator = useTempleCreatorStore();
  const isOpenInCreator = !!creator.loadedTempleId && templeIds.includes(creator.loadedTempleId);
  if (isOpenInCreator) creator.reset();
};

const saveTemples = async (temples: TempleInterface[]): Promise<void> => {
  for (const temple of temples) await templeDb.setTemple(temple);
  forgetInCreator(temples.map((temple) => temple.id));
};

// ---- Quests ------------------------------------------------------------------------------------------------------

const questRecords = async () => {
  const [quests, beasts, temples] = await Promise.all([
    achievementDb.getTasks(),
    bestiaryDb.getBeasts() as Promise<Beast[]>,
    storedTemples(),
  ]);
  return { quests, beasts: beasts.filter((beast) => beast?.id), temples };
};

export const usageOfQuest = async (questId: string): Promise<string> =>
  usageNote(questLinks(String(questId), await questRecords()));

/** Take the quest off quests, beasts, temple rooms and each hero's grudges and Power effects, then remove it */
export async function deleteQuest(quest: Pick<Achievement, "id">): Promise<void> {
  const questId = String(quest.id);
  const changed = unlinkQuest(questId, await questRecords());
  for (const other of changed.quests) await achievementDb.setTask(other);
  for (const beast of changed.beasts) await bestiaryDb.setBeast(beast);
  await saveTemples(changed.temples);

  const userStore = useUserStore();
  const heroes = (Object.values(userStore.users ?? {}) as LinkedHero[]).filter((hero) => hero?.id);
  for (const hero of heroes) {
    const { questGrudges, questEffects } = heroWithoutQuest(questId, hero);
    if (questGrudges) userStore.setQuestGrudges(hero.id, questGrudges);
    if (questEffects) userStore.setQuestEffects(hero.id, questEffects);
  }

  // A claim the hero already made stays in Approvals: it carries its own name and rewards, so it can still be paid
  await achievementDb.deleteTask(quest as Achievement);
  // A tower chore may have been its floor's last open one: the project settles what is ready (the next floor wakes)
  if (isProjectQuestId(questId)) void settleInBackground();
}

// ---- Items -------------------------------------------------------------------------------------------------------

export const usageOfItem = async (itemId: string): Promise<string> =>
  usageNote(shelfLinks(String(itemId), ShopItemType.Accessory, await storedShops()));

/** Take the item off every shop shelf, then remove it. Heroes keep the copies they already bought. */
export async function deleteItem(item: Pick<Accessory, "id">): Promise<void> {
  const itemId = String(item.id);
  for (const shop of unstock(itemId, ShopItemType.Accessory, await storedShops())) await shopsDb.setShop(shop);
  await accessoriesDb.deleteAccessory(item as Accessory);
}

// ---- Powers ------------------------------------------------------------------------------------------------------

const powerRecords = async () => {
  const [shops, powers] = await Promise.all([storedShops(), abilitiesDb.getAbilities() as Promise<Ability[]>]);
  return { shops, powers: powers.filter((power) => power?.id) };
};

export const usageOfPower = async (powerId: string): Promise<string> => {
  const { shops, powers } = await powerRecords();
  const id = String(powerId);
  return usageNote(mergeLinks(shelfLinks(id, ShopItemType.Ability, shops), prerequisiteLinks(id, powers)));
};

/** Take the Power off shop shelves and out of other Powers' prerequisites, then remove it */
export async function deletePower(power: Pick<Ability, "id">): Promise<void> {
  const powerId = String(power.id);
  const { shops, powers } = await powerRecords();
  for (const shop of unstock(powerId, ShopItemType.Ability, shops)) await shopsDb.setShop(shop);
  for (const other of unlinkPrerequisite(powerId, powers)) await abilitiesDb.setAbility(other);
  await abilitiesDb.deleteAbility(power as Ability);
}

// ---- Shops -------------------------------------------------------------------------------------------------------

/** A shop from the registry stands at a place on the map and comes back on the next sync: only the Game Master's own go */
export const isBuiltInShop = (shopId: string): boolean => !!SHOP_METADATA[shopId];

export const usageOfShop = async (shopId: string): Promise<string> =>
  usageNote(shopRoomLinks(String(shopId), await storedTemples()));

/** Take the shop out of temple shop rooms, then remove it */
export async function deleteShop(shopId: string): Promise<void> {
  const isBuiltIn = isBuiltInShop(shopId);
  if (isBuiltIn) throw new Error(`${shopId} is a built-in shop`);
  await saveTemples(unlinkShop(shopId, await storedTemples()));
  await shopsDb.remove(shopId);
}

// ---- Temples -----------------------------------------------------------------------------------------------------

/** The nine shipped temples are imported again on the next visit (ensureBuiltInTemples): only the Game Master's own go */
export const isBuiltInTemple = (templeId: string): boolean => !!TEMPLE_METADATA[templeId];

/** How many heroes have a run saved in this temple: the confirm says their progress goes with it */
export const heroesInTemple = async (templeId: string): Promise<number> => {
  const entries = (await getTempleProgressDb().getAll()).map(toTempleProgress);
  return entries.filter((entry) => entry?.templeId === templeId).length;
};

/** Remove the temple and every hero's saved run in it (their blood moons live on that run too) */
export async function deleteTemple(templeId: string): Promise<void> {
  const isBuiltIn = isBuiltInTemple(templeId);
  if (isBuiltIn) throw new Error(`${templeId} is a built-in temple`);
  const progressDb = getTempleProgressDb();
  const entries = (await progressDb.getAll()).map(toTempleProgress);
  const runsHere = entries.filter((entry): entry is TempleProgressEntry => entry?.templeId === templeId);
  for (const entry of runsHere) await progressDb.remove(templeProgressKey(entry.userId, entry.templeId));
  await templeDb.remove(templeId);
  forgetInCreator([templeId]);
}

/**
 * Where a quest, an item, a Power or a shop is used, and how to let go of it before the Game Master deletes it.
 * (Beasts have their own module, services/bestiary/beastLinks.ts.)
 *
 * - A quest is named by other quests (`subAchievementIds`), by beasts (`achievementIds`), by temple rooms
 *   (`content.questId` / `content.questIds`) and by each hero's grudge marks and Power effects (keyed by quest id).
 * - An item or a Power is stocked on shop shelves (`items[].itemId` with its type); a Power can also be a
 *   prerequisite of another Power.
 * - A shop is named by temple shop rooms (`content.shopId`).
 *
 * Pure: nothing here reads or writes storage. The caller loads the records, saves the ones `unlink*` hands back
 * (the inputs are left as they were) and only then removes the record itself.
 */

/** The slice of an Achievement this module reads. */
export interface LinkedQuest {
  id: string;
  achievementName?: string;
  subAchievementIds?: string[];
}

/** The slice of a Beast this module reads. */
export interface LinkedBeast {
  id?: string;
  name?: string;
  achievementIds?: string[];
}

/** The slice of a temple Room this module reads. */
export interface LinkedRoom {
  content?: { questId?: unknown; questIds?: unknown; shopId?: unknown; [key: string]: unknown };
  [key: string]: unknown;
}

/** The slice of a TempleInterface this module reads. */
export interface LinkedTemple {
  id: string;
  dungeonLayout?: { rooms?: Record<string, LinkedRoom>; [key: string]: unknown };
  rooms?: Record<string, LinkedRoom>;
}

/** The slice of a ShopInterface this module reads. */
export interface LinkedShop {
  id: string;
  name?: string;
  items?: { itemId: string; type: number }[];
}

/** The slice of an Ability this module reads. */
export interface LinkedPower {
  id: string;
  name?: string;
  prerequisites?: string[];
}

/** The slice of a hero this module reads: their grudge marks and Power effects, keyed by quest id */
export interface LinkedHero {
  id: string;
  questGrudges?: Record<string, unknown>;
  questEffects?: Record<string, unknown>;
}

/** What names the record about to be deleted: shown in the confirm, so the Game Master knows what changes */
export interface ContentLinks {
  quests: string[];
  beasts: string[];
  shops: string[];
  powers: string[];
  rooms: { templeId: string; roomKey: string }[];
}

const noLinks = (): ContentLinks => ({ quests: [], beasts: [], shops: [], powers: [], rooms: [] });

const isRecord = (value: unknown): value is Record<string, LinkedRoom> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const listOf = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);

/** Both places a temple can keep its rooms (a temple may carry either, or both) */
const roomMaps = (temple: LinkedTemple): Record<string, LinkedRoom>[] =>
  [temple.dungeonLayout?.rooms, temple.rooms].filter(isRecord);

/** Every room of the temples that `uses` picks, each listed once even when both room maps hold it */
const roomsWhere = (temples: LinkedTemple[], uses: (room: LinkedRoom) => boolean): ContentLinks["rooms"] => {
  const found: ContentLinks["rooms"] = [];
  for (const temple of temples) {
    const listed = new Set<string>();
    for (const rooms of roomMaps(temple)) {
      for (const [roomKey, room] of Object.entries(rooms)) {
        const shouldSkip = listed.has(roomKey) || !uses(room);
        if (shouldSkip) continue;
        listed.add(roomKey);
        found.push({ templeId: temple.id, roomKey });
      }
    }
  }
  return found;
};

/** The temples where `uses` picks a room, with `detach` applied to those rooms; the rest of each temple stays */
const detachTemples = <T extends LinkedTemple>(
  temples: T[],
  uses: (room: LinkedRoom) => boolean,
  detach: (room: LinkedRoom) => LinkedRoom
): T[] => {
  const detachRooms = (rooms: Record<string, LinkedRoom>): Record<string, LinkedRoom> =>
    Object.fromEntries(Object.entries(rooms).map(([key, room]) => [key, uses(room) ? detach(room) : room]));

  return temples
    .filter((temple) => roomMaps(temple).some((rooms) => Object.values(rooms).some(uses)))
    .map((temple) => {
      const next: T = { ...temple };
      const layoutRooms = temple.dungeonLayout?.rooms;
      if (isRecord(layoutRooms)) next.dungeonLayout = { ...temple.dungeonLayout, rooms: detachRooms(layoutRooms) };
      if (isRecord(temple.rooms)) next.rooms = detachRooms(temple.rooms);
      return next;
    });
};

// ---- Quests ------------------------------------------------------------------------------------------------------

const roomHoldsQuest = (questId: string) => (room: LinkedRoom): boolean => {
  const content = room?.content;
  if (!content) return false;
  return String(content.questId ?? "") === questId || listOf(content.questIds).includes(questId);
};

/**
 * A quest room that loses its only pick reads as a plain beast room (questRooms.resolveRoom), which is what a room
 * the Game Master never gave a quest does; its other picks stay in order.
 */
const detachQuestRoom = (questId: string) => (room: LinkedRoom): LinkedRoom => {
  const content = { ...room.content };
  const isTheSinglePick = String(content.questId ?? "") === questId;
  if (isTheSinglePick) delete content.questId;
  const kept = listOf(content.questIds).filter((id) => id !== questId);
  const hasOtherPicks = kept.length > 0;
  if (hasOtherPicks) content.questIds = kept;
  else delete content.questIds;
  return { ...room, content };
};

export interface QuestLinkRecords<Q extends LinkedQuest, B extends LinkedBeast, T extends LinkedTemple> {
  quests: Q[];
  beasts: B[];
  temples: T[];
}

/** Every other quest, beast and temple room that names this quest */
export function questLinks(
  questId: string,
  { quests, beasts, temples }: QuestLinkRecords<LinkedQuest, LinkedBeast, LinkedTemple>
): ContentLinks {
  const links = noLinks();
  if (!questId) return links;
  links.quests = quests
    .filter((quest) => quest.id !== questId && listOf(quest.subAchievementIds).includes(questId))
    .map((quest) => quest.achievementName || "");
  links.beasts = beasts.filter((beast) => listOf(beast.achievementIds).includes(questId)).map((beast) => beast.name || "");
  links.rooms = roomsWhere(temples, roomHoldsQuest(questId));
  return links;
}

/** The quests, beasts and temples that change when this quest goes, with the quest taken off them */
export function unlinkQuest<Q extends LinkedQuest, B extends LinkedBeast, T extends LinkedTemple>(
  questId: string,
  { quests, beasts, temples }: QuestLinkRecords<Q, B, T>
): QuestLinkRecords<Q, B, T> {
  if (!questId) return { quests: [], beasts: [], temples: [] };
  const without = (ids: unknown) => listOf(ids).filter((id) => id !== questId);
  return {
    quests: quests
      .filter((quest) => quest.id !== questId && listOf(quest.subAchievementIds).includes(questId))
      .map((quest) => ({ ...quest, subAchievementIds: without(quest.subAchievementIds) })),
    beasts: beasts
      .filter((beast) => listOf(beast.achievementIds).includes(questId))
      .map((beast) => ({ ...beast, achievementIds: without(beast.achievementIds) })),
    temples: detachTemples(temples, roomHoldsQuest(questId), detachQuestRoom(questId)),
  };
}

/** The Power effects that are kept per quest (PowerBoardEffects: snoozes and extra time) */
const PER_QUEST_EFFECTS = ["snoozedOn", "extendedUntil"] as const;

const withoutKey = (record: unknown, key: string): Record<string, unknown> | null => {
  const hasKey = isRecord(record) && Object.prototype.hasOwnProperty.call(record, key);
  if (!hasKey) return null;
  const { [key]: _dropped, ...rest } = record as Record<string, unknown>;
  return rest;
};

/**
 * A hero's grudge marks and per-quest Power effects with this quest's entry dropped: only the parts that held it
 * come back, so a hero who never met the quest is not written. (Flee counts and the quest log are history and stay.)
 */
export function heroWithoutQuest(
  questId: string,
  hero: LinkedHero
): { questGrudges?: Record<string, unknown>; questEffects?: Record<string, unknown> } {
  const changes: { questGrudges?: Record<string, unknown>; questEffects?: Record<string, unknown> } = {};
  if (!questId) return changes;

  const grudges = withoutKey(hero.questGrudges, questId);
  if (grudges) changes.questGrudges = grudges;

  const effects = hero.questEffects;
  if (!isRecord(effects)) return changes;
  let nextEffects: Record<string, unknown> | null = null;
  for (const field of PER_QUEST_EFFECTS) {
    const kept = withoutKey((nextEffects ?? effects)[field], questId);
    if (kept) nextEffects = { ...(nextEffects ?? effects), [field]: kept };
  }
  if (nextEffects) changes.questEffects = nextEffects;
  return changes;
}

// ---- Shop shelves: items and Powers ------------------------------------------------------------------------------

/** ShopItemType in ShopsDb: a shelf row is a Power (0) or an item (1) */
export const SHELF_POWER = 0;
export const SHELF_ITEM = 1;

const stocks = (shop: LinkedShop, itemId: string, type: number): boolean =>
  (shop.items ?? []).some((row) => row.itemId === itemId && Number(row.type) === type);

/** The shops whose shelves hold this item or Power */
export function shelfLinks(itemId: string, type: number, shops: LinkedShop[]): ContentLinks {
  const links = noLinks();
  if (!itemId) return links;
  links.shops = shops.filter((shop) => stocks(shop, itemId, type)).map((shop) => shop.name || "");
  return links;
}

/** The shops that change when this item or Power goes, with its rows taken off their shelves */
export function unstock<S extends LinkedShop>(itemId: string, type: number, shops: S[]): S[] {
  if (!itemId) return [];
  return shops
    .filter((shop) => stocks(shop, itemId, type))
    .map((shop) => ({
      ...shop,
      items: (shop.items ?? []).filter((row) => !(row.itemId === itemId && Number(row.type) === type)),
    }));
}

/** The Powers that need this one first */
export function prerequisiteLinks(powerId: string, powers: LinkedPower[]): ContentLinks {
  const links = noLinks();
  if (!powerId) return links;
  links.powers = powers
    .filter((power) => power.id !== powerId && listOf(power.prerequisites).includes(powerId))
    .map((power) => power.name || "");
  return links;
}

/** The Powers that change when this one goes: it is no longer a step before them */
export function unlinkPrerequisite<P extends LinkedPower>(powerId: string, powers: P[]): P[] {
  if (!powerId) return [];
  return powers
    .filter((power) => power.id !== powerId && listOf(power.prerequisites).includes(powerId))
    .map((power) => ({ ...power, prerequisites: listOf(power.prerequisites).filter((id) => id !== powerId) }));
}

// ---- Shops in temple rooms ---------------------------------------------------------------------------------------

const roomSellsAt = (shopId: string) => (room: LinkedRoom): boolean => String(room?.content?.shopId ?? "") === shopId;

const detachShopRoom = (room: LinkedRoom): LinkedRoom => {
  const content = { ...room.content };
  delete content.shopId;
  return { ...room, content };
};

/** The temple rooms that open this shop */
export function shopRoomLinks(shopId: string, temples: LinkedTemple[]): ContentLinks {
  const links = noLinks();
  if (!shopId) return links;
  links.rooms = roomsWhere(temples, roomSellsAt(shopId));
  return links;
}

/** The temples that change when this shop goes: their shop rooms no longer name it (the room editor asks again) */
export function unlinkShop<T extends LinkedTemple>(shopId: string, temples: T[]): T[] {
  if (!shopId) return [];
  return detachTemples(temples, roomSellsAt(shopId), detachShopRoom);
}

// ---- The confirm ---------------------------------------------------------------------------------------------------

const NAMES_SHOWN = 4;

const count = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

/** "2 quests (Dishes, Laundry)"; empty for none */
const named = (names: string[], one: string, unnamed: string): string => {
  const isNone = names.length === 0;
  if (isNone) return "";
  const shown = names.slice(0, NAMES_SHOWN).map((name) => name || unnamed).join(", ");
  const more = names.length > NAMES_SHOWN ? `, +${names.length - NAMES_SHOWN} more` : "";
  return `${count(names.length, one)} (${shown}${more})`;
};

const joinParts = (parts: string[]): string =>
  parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;

/** "Used by 2 quests (Dishes, Laundry), 1 shop (Market) and 3 temple rooms"; empty when nothing uses it */
export function usageNote(links: ContentLinks): string {
  const parts = [
    named(links.quests, "quest", "Unnamed quest"),
    named(links.beasts, "beast", "Unnamed beast"),
    named(links.shops, "shop", "Unnamed shop"),
    named(links.powers, "Power", "Unnamed Power"),
    links.rooms.length ? count(links.rooms.length, "temple room") : "",
  ].filter(Boolean);
  return parts.length ? `Used by ${joinParts(parts)}` : "";
}

/** Several lookups for one record (a Power on shelves and as a prerequisite) as one list */
export function mergeLinks(...all: ContentLinks[]): ContentLinks {
  return all.reduce(
    (merged, links) => ({
      quests: [...merged.quests, ...links.quests],
      beasts: [...merged.beasts, ...links.beasts],
      shops: [...merged.shops, ...links.shops],
      powers: [...merged.powers, ...links.powers],
      rooms: [...merged.rooms, ...links.rooms],
    }),
    noLinks()
  );
}

/**
 * Where a beast is used, and how to let go of it before it is deleted.
 *
 * Quests point at a beast through `beastId`. Temple rooms list beasts in `content.beasts` and a mimic can name
 * one in `content.mimicBeastId` (the room's `dungeonLayout.rooms`, or `rooms` on older temples). Pure: nothing
 * here reads or writes storage; the caller loads the records and saves the ones `unlink` hands back.
 */

/** The slice of an Achievement this module reads. */
export interface QuestRef {
  id: string;
  achievementName?: string;
  beastId?: string;
  adventureType?: string;
}

/** The slice of a temple Room this module reads. */
export interface RoomRef {
  content?: { beasts?: unknown; mimicBeastId?: unknown; [key: string]: unknown };
  [key: string]: unknown;
}

/** The slice of a TempleInterface this module reads. */
export interface TempleRef {
  id: string;
  dungeonLayout?: { rooms?: Record<string, RoomRef> };
  rooms?: Record<string, RoomRef>;
}

export interface BeastLinks {
  quests: { id: string; name: string }[];
  rooms: { templeId: string; roomKey: string }[];
}

const BEAST_QUEST = "beast";
const PLAIN_QUEST = "simple";
const NAMES_SHOWN = 5;

const isRecord = (value: unknown): value is Record<string, RoomRef> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Both places a temple can keep its rooms (a temple may carry either, or both) */
const roomMaps = (temple: TempleRef): Record<string, RoomRef>[] =>
  [temple.dungeonLayout?.rooms, temple.rooms].filter(isRecord);

const roomUsesBeast = (room: RoomRef | undefined, beastId: string): boolean => {
  const content = room?.content;
  if (!content) return false;
  const listed = Array.isArray(content.beasts) && content.beasts.includes(beastId);
  return listed || content.mimicBeastId === beastId;
};

const templeUsesBeast = (temple: TempleRef, beastId: string): boolean =>
  roomMaps(temple).some((rooms) => Object.values(rooms).some((room) => roomUsesBeast(room, beastId)));

/** Every quest and temple room that names this beast. A room is listed once however often it names it. */
export function linksTo(beastId: string, quests: QuestRef[], temples: TempleRef[]): BeastLinks {
  const links: BeastLinks = { quests: [], rooms: [] };
  if (!beastId) return links;

  for (const quest of quests) {
    const isLinked = quest.beastId === beastId;
    if (isLinked) links.quests.push({ id: quest.id, name: quest.achievementName || "" });
  }

  for (const temple of temples) {
    const listed = new Set<string>();
    for (const rooms of roomMaps(temple)) {
      for (const [roomKey, room] of Object.entries(rooms)) {
        const shouldSkipRoom = listed.has(roomKey) || !roomUsesBeast(room, beastId);
        if (shouldSkipRoom) continue;
        listed.add(roomKey);
        links.rooms.push({ templeId: temple.id, roomKey });
      }
    }
  }
  return links;
}

/**
 * A quest with no beast to fight is a chore the battle screen turns into its own enemy (encounterLoader), but
 * the quest editor refuses a "beast" quest that has no beast. So a beast quest goes back to a plain one; a quest
 * of any other type only loses the stray id.
 */
const detachQuest = <Q extends QuestRef>(quest: Q): Q => ({
  ...quest,
  beastId: "",
  ...(quest.adventureType === BEAST_QUEST ? { adventureType: PLAIN_QUEST } : {}),
});

/** A room with no beast listed falls back to a random one in battle, which is what an unconfigured room does */
const detachRoom = (room: RoomRef, beastId: string): RoomRef => {
  const content = { ...room.content };
  if (Array.isArray(content.beasts)) content.beasts = content.beasts.filter((id) => id !== beastId);
  const isMimicOfBeast = content.mimicBeastId === beastId;
  if (isMimicOfBeast) content.mimicBeastId = null;
  return { ...room, content };
};

const detachRooms = (rooms: Record<string, RoomRef>, beastId: string): Record<string, RoomRef> => {
  const next: Record<string, RoomRef> = {};
  for (const [roomKey, room] of Object.entries(rooms)) {
    next[roomKey] = roomUsesBeast(room, beastId) ? detachRoom(room, beastId) : room;
  }
  return next;
};

const detachTemple = <T extends TempleRef>(temple: T, beastId: string): T => {
  const patch: Pick<TempleRef, "dungeonLayout" | "rooms"> = {};
  const layoutRooms = temple.dungeonLayout?.rooms;
  if (layoutRooms) {
    patch.dungeonLayout = { ...temple.dungeonLayout, rooms: detachRooms(layoutRooms, beastId) };
  }
  const { rooms } = temple;
  if (rooms) patch.rooms = detachRooms(rooms, beastId);
  return { ...temple, ...patch };
};

/**
 * The records that change when this beast goes: quests with the beast cleared, temples with it dropped from
 * their rooms. The inputs are left as they were; save what comes back.
 */
export function unlink<Q extends QuestRef, T extends TempleRef>(
  beastId: string,
  quests: Q[],
  temples: T[]
): { quests: Q[]; temples: T[] } {
  if (!beastId) return { quests: [], temples: [] };
  return {
    quests: quests.filter((quest) => quest.beastId === beastId).map(detachQuest),
    temples: temples.filter((temple) => templeUsesBeast(temple, beastId)).map((temple) => detachTemple(temple, beastId)),
  };
}

const count = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

/** "Used by 2 quests (Dishes, Laundry) and 1 temple room"; empty when nothing links to the beast */
export function usageNote(links: BeastLinks): string {
  const { quests, rooms } = links;
  const isUnlinked = !quests.length && !rooms.length;
  if (isUnlinked) return "";

  const parts: string[] = [];
  const hasQuests = quests.length > 0;
  if (hasQuests) {
    const names = quests.map((quest) => quest.name || "Unnamed quest");
    const shown = names.slice(0, NAMES_SHOWN).join(", ");
    const more = names.length > NAMES_SHOWN ? `, +${names.length - NAMES_SHOWN} more` : "";
    parts.push(`${count(quests.length, "quest")} (${shown}${more})`);
  }
  const hasRooms = rooms.length > 0;
  if (hasRooms) parts.push(count(rooms.length, "temple room"));
  return `Used by ${parts.join(" and ")}`;
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Ionic alerts render their message as HTML, and quest and beast names are typed by hand */
export const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

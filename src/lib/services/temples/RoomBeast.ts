import type { Beast } from "@/lib/databases/BestiaryDb";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import { isClassicBeastId } from "@/lib/services/core/classicBeasts";
import { adoptLibraryBeast } from "@/lib/services/bestiary/librarySuggest";

/**
 * Which beast lives in a temple's combat room. The room screen (the voxel monster and the "A Monster approaches!"
 * reveal) and the battle both ask the rule below, so the beast the hero sees is the beast the hero fights.
 */

/** The element a temple fights with: a generated temple carries its own; the nine shipped temples take it from their id. */
export const templeElementFor = (templeId: string, recordElement?: string): string => {
  const id = String(templeId || "");
  const carriesOwnElement = id.startsWith("gen-") && recordElement && recordElement !== "none";
  if (carriesOwnElement) return recordElement;
  return id.replace("-temple", "") || "wind";
};

export interface StandInMonster {
  name: string;
  avatarId: number;
}

const formatMonsterName = (text: string): string =>
  text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b([a-z])/g, (l) => l.toUpperCase());

const BOSS_NAMES: Record<string, string> = {
  fire: "Ifrit",
  earth: "Titan",
  water: "Leviathan",
  ice: "Frost Giant",
  light: "Seraph",
  shadow: "Shadowlord",
  wind: "Tempest Wyrm",
  moon: "Eclipse Dragon",
  storm: "Thunder Drake",
};

const MINIBOSS_NAMES: Record<string, string> = {
  fire: "Fire Elemental",
  earth: "Stone Guardian",
  water: "Giant Squid",
  ice: "Ice Wyrm",
  light: "Radiant Guardian",
  shadow: "Dark Phantom",
  wind: "Gale Chimera",
  moon: "Lunar Phantom",
  storm: "Storm Drake",
};

const MOB_NAMES: Record<string, string> = {
  fire: "Fire Imp",
  earth: "Rock Golem",
  water: "Water Elemental",
  ice: "Ice Golem",
  light: "Light Sentinel",
  shadow: "Shadow Stalker",
  wind: "Gale Sprite",
  moon: "Moon Bat",
  storm: "Spark Wisp",
};

const BOSS_AVATARS: Record<string, number> = {
  fire: 46, earth: 14, water: 3, ice: 32, light: 5, shadow: 18, wind: 1, moon: 1, storm: 1,
};

const MINIBOSS_AVATARS: Record<string, number> = {
  fire: 22, earth: 28, water: 40, ice: 35, light: 25, shadow: 41, wind: 19, moon: 43, storm: 29,
};

const MOB_AVATARS: Record<string, number> = {
  fire: 12, earth: 27, water: 21, ice: 31, light: 24, shadow: 42, wind: 74, moon: 74, storm: 74,
};

/** What a combat room shows when the bestiary has nothing for it. */
export const standInMonster = (room: Room, element: string): StandInMonster => {
  const authoredName = room.content?.name || room.content?.monsterName || room.content?.beastName;
  const rawMonsterType = room.content?.monsterType;
  const roomType = room.type;

  let name = "";
  if (authoredName) {
    name = authoredName;
  } else if (rawMonsterType && rawMonsterType !== "small") {
    name = formatMonsterName(rawMonsterType);
  } else if (roomType === "boss") {
    name = BOSS_NAMES[element] || "Ancient Dragon";
  } else if (roomType === "miniboss") {
    name = MINIBOSS_NAMES[element] || "Dungeon Chimera";
  } else {
    name = MOB_NAMES[element] || "Dust Bunny";
  }

  let avatarId = 74;
  if (roomType === "boss") {
    avatarId = BOSS_AVATARS[element] || 1;
  } else if (roomType === "miniboss") {
    avatarId = MINIBOSS_AVATARS[element] || 19;
  } else {
    avatarId = MOB_AVATARS[element] || 74;
  }

  return { name, avatarId };
};

const squash = (text: string): string => text.toLowerCase().replace(/[-_ ]/g, "");

/** The beast a quest template is bound to: the family's own, else the library's (adopted under the same id). */
const pickTemplateBeast = (beastId: string | undefined, beasts: Beast[]): Beast | null => {
  if (!beastId) return null;
  const own = beasts.find((b) => String(b.id) === String(beastId));
  if (own) return own;
  const fromLibrary = BEAST_LIBRARY.find((b) => String(b.id) === String(beastId));
  return fromLibrary ? adoptLibraryBeast(fromLibrary) : null;
};

/**
 * The bestiary beast that lives in a combat room: the same answer for the room screen and the battle.
 *  1. an authored beast (content.beasts[0]) is that beast, or null when the bestiary no longer has it (no substitute)
 *  2. a quest room's template beast (content.quest.beastId, docs/Quest-Rooms-Spec.md 5.2 step 3: the room is dormant and
 *     plays as a classic fight with it): the family's own beast, else the library's, ready to be adopted (same id)
 *  3. a monsterType other than "small" is the first beast whose name contains it
 *  4. otherwise the temple element's beasts, indexed by (row + col) % count (never a classic beast: those are only authored in)
 *  5. null: the caller shows the stand-in
 * A quest room that a live quest fills fights that quest's beast instead (questRooms.roomQuestState); this answers for
 * the rooms that no quest fills.
 */
export const pickRoomBeast = (room: Room, element: string, row: number, col: number, beasts: Beast[]): Beast | null => {
  const authoredId = room.content?.beasts?.[0];
  if (authoredId) return beasts.find((b) => String(b.id) === String(authoredId)) ?? null;

  const templateBeast = pickTemplateBeast(room.content?.quest?.beastId, beasts);
  if (templateBeast) return templateBeast;

  const type = squash(String(room.content?.monsterType || ""));
  const hasNamedMonsterType = type && type !== "small";
  if (hasNamedMonsterType) {
    const typeMatch = beasts.find((b) => squash(b.name || "").includes(type));
    if (typeMatch) return typeMatch;
  }

  const native = beasts.filter((b) => b.element === element && !isClassicBeastId(b.id));
  return native.length ? native[(row + col) % native.length] : null;
};

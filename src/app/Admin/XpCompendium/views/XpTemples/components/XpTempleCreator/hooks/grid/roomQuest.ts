/**
 * Room records for the quest room flow of the temple editor (docs/Quest-Rooms-Spec.md section 9): what a room's
 * content says once a Game Master picks a quest for it, how a room stops being a quest room, which entry the type
 * picker shows for a room, what the room's quest card reads and which quest the picker opens on. Pure: the picker
 * screens call these.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Room, RoomQuestTemplate } from "@/lib/engine/core/dungeons/types";
import {
  fillsTemplate,
  headlineQuest,
  isQuestRoom,
  liveRoomQuests,
  questBeastId,
  questTier,
  roomQuestIds,
  type QuestTier,
} from "@/lib/services/temples/questRooms";
import { ensureContent, retypeRoom } from "./roomContent";

/** The type picker's guide key for a quest room. It is not an engine type: the room's `type` is its tier. */
export const QUEST_ROOM_KEY = "quest";

/**
 * Picks `quest` for the room: writes `content.questId` (a list of quests the room held gives way to the one pick),
 * sets the room `type` from the quest's tier, and seals a miniboss or boss room on entry when the Game Master has
 * not chosen yet (a boss fight is always sealed). A room of the tier's own kind keeps everything else it holds, a
 * shipped template included: it takes over if the quest is ever deleted (5.2). A room of another kind is rebuilt
 * for the tier first (`retypeRoom`), so a chest's loot does not follow it into a miniboss. Returns the tier. The
 * cell's shared token (M001, MINI, BOSS) becomes a unique symbol when the room is saved.
 */
export function applyQuestPick(room: Room, quest: Pick<Achievement, "id" | "difficulty">): QuestTier {
  const tier = questTier(quest.difficulty);
  retypeRoom(room, tier);
  const content = ensureContent(room);
  content.questId = String(quest.id);
  delete content.questIds;
  const isSealedByDefault = tier !== "monster" && content.lockOnEnter === undefined;
  if (isSealedByDefault) content.lockOnEnter = true;
  return tier;
}

/** Makes a quest room a classic room again: no quest, no list of quests, no shipped template. */
export function releaseQuest(room: Room): void {
  const content = room.content;
  if (!content) return;
  delete content.questId;
  delete content.questIds;
  delete content.quest;
}

/** What the type picker calls the room: `quest` for a room that holds a quest or a template, else its type. */
export function pickerTypeOf(room: Partial<Room> | null | undefined): string {
  if (!room) return "";
  return isQuestRoom(room) ? QUEST_ROOM_KEY : String(room.type ?? "");
}

/**
 * What a quest room holds, for its quest card:
 * - `picked`: the Game Master's quest (the biggest live one when the room lists several), and `moreChores`, how many
 *   other live quests a list room holds besides it (left out when there are none);
 * - `missing`: the room names quests and none is live (gone, or only drafts), with the shipped template when it has one;
 * - `template`: a shipped template, with the live quest that has its beast (at the template's tier or higher) when one fills it;
 * - `none`: not a quest room.
 */
export type RoomQuestHolding =
  | { kind: "picked"; quest: Achievement; moreChores?: number }
  | { kind: "missing"; template?: RoomQuestTemplate }
  | { kind: "template"; template: RoomQuestTemplate; filler?: Achievement }
  | { kind: "none" };

/** The live quests a room holds besides its headline, each counted once */
const otherLiveChores = (room: Partial<Room> | null | undefined, quests: readonly Achievement[], headline: Achievement): number => {
  const ids = new Set(liveRoomQuests(room, quests).map((quest) => String(quest.id)));
  ids.delete(String(headline.id));
  return ids.size;
};

export function describeRoomQuest(room: Partial<Room> | null | undefined, quests: readonly Achievement[]): RoomQuestHolding {
  const template = room?.content?.quest;
  const holdsQuests = roomQuestIds(room).length > 0;
  if (holdsQuests) {
    const picked = headlineQuest(room, quests);
    if (!picked) return template ? { kind: "missing", template } : { kind: "missing" };
    const moreChores = otherLiveChores(room, quests, picked);
    return moreChores > 0 ? { kind: "picked", quest: picked, moreChores } : { kind: "picked", quest: picked };
  }
  if (!template) return { kind: "none" };
  const live = quests.filter((quest) => !quest.draft);
  const filler = live.find((quest) => fillsTemplate(quest, template));
  return filler ? { kind: "template", template, filler } : { kind: "template", template };
}

/**
 * The beast a Test fight from the room fights: the quest's beast, the beast of the live quest that fills a shipped
 * template, or the template's own beast when nothing fills it. Undefined for a room with no quest and no template,
 * or a quest that has no beast (the Game Master chose none).
 */
export function heldBeastId(holding: RoomQuestHolding): string | undefined {
  switch (holding.kind) {
    case "picked":
      return questBeastId(holding.quest);
    case "template":
      return holding.filler ? questBeastId(holding.filler) : String(holding.template.beastId);
    case "missing":
      return holding.template ? String(holding.template.beastId) : undefined;
    default:
      return undefined;
  }
}

/** The live quest a quest room's card shows: the Game Master's pick, or the one that fills the template. */
export function heldQuest(holding: RoomQuestHolding): Achievement | undefined {
  const isPicked = holding.kind === "picked";
  if (isPicked) return holding.quest;
  const isTemplate = holding.kind === "template";
  if (isTemplate) return holding.filler;
  return undefined;
}

/**
 * The line under a list room's card: "+2 more chores here" for the live quests the card does not show, so the Game
 * Master knows a pick from Change quest replaces them all. Empty for any other room.
 */
export function moreChoresLine(holding: RoomQuestHolding): string {
  const count = holding.kind === "picked" ? holding.moreChores ?? 0 : 0;
  const hasMore = count > 0;
  if (!hasMore) return "";
  return `+${count} more ${count === 1 ? "chore" : "chores"} here`;
}

/**
 * The quest the picker opens on: the room's headline quest (the biggest live one of a list), else its `questId` as it
 * stands, so a one-quest room opens on its pick exactly as before, loaded or not. Empty for a room with no quest.
 */
export function preselectedQuestId(room: Partial<Room> | null | undefined, quests: readonly Achievement[]): string {
  const headline = headlineQuest(room, quests);
  return String(headline?.id ?? room?.content?.questId ?? "");
}

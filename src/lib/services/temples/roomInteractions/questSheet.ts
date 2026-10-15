/**
 * What a quest room says to the hero standing in it (docs/Quest-Rooms-Spec.md 5.3). The words are pure
 * (questRoomWords, backLabel, ownersLabel): a room's state in, a title, a line, the fight and the search out.
 * questRoomStateFor / questRoomWordsFor read the board the run keeps (TempleSystem.getQuestBoard), the same one the
 * engine syncs the seals with, so the sheet and the doors agree. A classic room, a dormant room and a run that has
 * not read its board yet answer null: they keep the classic sheet.
 */
import { differenceInCalendarDays, format, startOfDay } from 'date-fns';
import type { Room } from '@/lib/engine/core/dungeons/types';
import type { HeroQuestEffects } from '@/lib/engine/quests/QuestSchedule';
import { clampMarks, marksFor } from '@/lib/services/battle/questGrudge';
import { dueFor, dueLabelFor, nickOf } from '@/lib/services/quests/QuestList';
import { BEAST_LIBRARY } from '@/lib/services/core/beastLibrary';
import {
  isQuestRoom,
  questReturnsAt,
  roomQuestState,
  type RoomQuestState,
  type RoomQuestStatus,
} from '@/lib/services/temples/questRooms';
import { useUserStore } from '@/lib/store/stores/user';
import debug from '@/lib/utils/debug';
import { temples } from './travel';
import { ENCOUNTER_LINES } from './vocabulary';
import type { RoomContext } from './vocabulary';

/** What a quest room's sheet is made of */
export interface QuestRoomWords {
  status: RoomQuestStatus;
  /** The title */
  header: string;
  /** The line under the title: absent for the beast's name (the screen looks it up), '' for none */
  subHeader?: string;
  /** The chore, and when it is due or the beast is back */
  body?: string;
  /** The room offers the fight */
  fight: boolean;
  /** The room offers its one search */
  search: boolean;
  /** The quest's beast, for the picture */
  beastId?: string;
}

export interface QuestRoomWordsInput {
  state: RoomQuestState;
  /** The hero's moment; due times and return days are read against it */
  now: Date;
  /** The hero's item effects, the ones the board was read with */
  effects?: HeroQuestEffects;
  /** Nicks of the heroes the quest is for: a sleeping beast is theirs */
  owners?: readonly string[];
  /** The beast's name, when the caller knows it */
  beastName?: string;
  /** The grudge marks this beast holds against the hero (0-3) */
  grudge?: number;
}

/** "Back tomorrow.", "Back Sat.", "Back Mon 19 Oct."; null for a beast that never returns. `returnsAt` is a midnight. */
export const backLabel = (returnsAt: Date | null, now: Date): string | null => {
  if (!returnsAt) return null;
  const days = differenceInCalendarDays(startOfDay(returnsAt), startOfDay(now));
  const isToday = days <= 0;
  const isTomorrow = days === 1;
  const isThisWeek = days < 7;
  if (isToday) return 'Back today.';
  if (isTomorrow) return 'Back tomorrow.';
  if (isThisWeek) return `Back ${format(returnsAt, 'EEE')}.`;
  return `Back ${format(returnsAt, 'EEE d MMM')}.`;
};

/** Whose sleeping beast it is: "Mia's", "Mia and Leo's", "The party's" for three or more, "Someone's" for none. */
export const ownersLabel = (names: readonly string[]): string => {
  const hasNoOwner = names.length === 0;
  const hasOneOwner = names.length === 1;
  const hasTwoOwners = names.length === 2;
  if (hasNoOwner) return "Someone's";
  if (hasOneOwner) return `${names[0]}'s`;
  if (hasTwoOwners) return `${names[0]} and ${names[1]}'s`;
  return "The party's";
};

/** When the chore is due in the board's own words ("Due 6:00pm", "Due Tomorrow 6:00pm", "Anytime"). */
const dueWords = (
  state: RoomQuestState,
  now: Date,
  effects: HeroQuestEffects | undefined
): string => {
  const { quest, item } = state;
  const due = quest ? dueFor(quest, effects, now) : null;
  const isLate = Boolean(item?.overdue);
  if (!due) return isLate ? 'Overdue' : 'Anytime';
  const label = dueLabelFor(due, now);
  return isLate ? `Was due ${label}` : `Due ${label}`;
};

const joinLine = (...parts: Array<string | null | undefined | false>): string => parts.filter(Boolean).join(' · ');

/**
 * What a quest room says for its state (5.3), or null for the rooms that keep the classic sheet (a classic beast room,
 * a dormant one). The chore's name rides in the body line; the title is the room's voice.
 */
export const questRoomWords = (input: QuestRoomWordsInput): QuestRoomWords | null => {
  const { state, now, effects } = input;
  const { status, quest, beastId } = state;
  const name = quest?.achievementName || 'Untitled Quest';
  const sheet = (words: Omit<QuestRoomWords, 'status' | 'beastId'>): QuestRoomWords => ({ status, beastId, ...words });
  const noFightNoSearch = { fight: false, search: false };

  switch (status) {
    case 'lurking': {
      const marks = clampMarks(input.grudge);
      const grudge = marks > 0 && `Grudge x${marks}`;
      const header = ENCOUNTER_LINES[state.tier ?? 'monster'] ?? ENCOUNTER_LINES.monster;
      const due = dueWords(state, now, effects);
      // A beast has its name under the title; a quest with no beast puts the chore there
      return beastId
        ? sheet({ header, body: joinLine(name, due, grudge), fight: true, search: false })
        : sheet({ header, subHeader: name, body: joinLine(due, grudge), fight: true, search: false });
    }
    case 'pending':
      return sheet({ header: 'Tied up. The Game Master is checking.', body: name, ...noFightNoSearch });
    case 'cleared': {
      const back = backLabel(quest ? questReturnsAt(quest, now, effects) : null, now) ?? 'Gone for good.';
      return sheet({ header: 'Nothing left here but the smell.', body: joinLine(name, back), fight: false, search: true });
    }
    case 'away': {
      const back = backLabel(quest ? questReturnsAt(quest, now, effects) : null, now) ?? 'Gone for good.';
      return sheet({ header: 'The lair is empty.', body: joinLine(name, back), ...noFightNoSearch });
    }
    case 'notYours':
      return sheet({
        header: `${ownersLabel(input.owners ?? [])} ${input.beastName || 'beast'} sleeps here.`,
        // the title already names the beast
        subHeader: '',
        body: name,
        ...noFightNoSearch,
      });
    case 'emptyLair':
      return sheet({ header: 'An empty lair.', body: 'Whatever lived here is gone.', ...noFightNoSearch });
    default:
      return null;
  }
};

// ---------------------------------------------------------------------------------------------------------------------
// Reading the board the run keeps
// ---------------------------------------------------------------------------------------------------------------------

/** The hero's board as the run keeps it (templeSystem/questRooms.ts), or undefined when the run has none for them yet. */
const keptBoard = (templeId: string, heroId: string) => {
  const kept = temples().getQuestBoard(templeId);
  const isTheHerosBoard = kept && String(kept.heroId) === String(heroId);
  return isTheHerosBoard ? kept : undefined;
};

/**
 * A quest room's state for the hero, from the board the run keeps. Null for a room that holds no quest, or while the run
 * has no board of this hero (the classic rules stand), or when the quest cannot be read.
 */
export const questRoomStateFor = (
  room: Room | undefined,
  templeId: string,
  heroId: string,
  now: Date = new Date()
): RoomQuestState | null => {
  const holdsNoQuest = !room || !isQuestRoom(room);
  if (holdsNoQuest) return null;
  const kept = keptBoard(templeId, heroId);
  if (!kept) return null;
  try {
    return roomQuestState(room, String(heroId), kept.board, now, { effects: kept.effects, liveQuests: kept.liveQuests });
  } catch (error) {
    debug.warn(`[RoomInteractions] could not read the quest of a room in ${templeId}; it keeps the classic sheet`, error);
    return null;
  }
};

/** The beast's name when the library knows it (the family's own beasts live in storage, which a sheet does not wait for). */
const libraryBeastName = (beastId?: string): string | undefined =>
  beastId ? BEAST_LIBRARY.find((beast) => String(beast.id) === String(beastId))?.name : undefined;

/** The nicks of the heroes a quest is assigned to. */
const ownersOf = (assignee: readonly (string | number)[] | undefined): string[] => {
  const store = useUserStore();
  return (assignee ?? []).map((id) => nickOf(store.getUserById(String(id)), String(id)));
};

/** The grudge marks the quest's beast holds against the hero standing in the room (5.7), from their profile. */
const grudgeOf = (heroId: string, questId: string | number | undefined): number =>
  marksFor(useUserStore().getUserById(String(heroId))?.questGrudges, questId);

/** A quest room's sheet text for the hero standing in it; null where the classic sheet stands. */
export const questRoomWordsFor = (room: Room, ctx: RoomContext): QuestRoomWords | null => {
  const now = ctx.now ?? new Date();
  const state = questRoomStateFor(room, ctx.templeId, ctx.userId, now);
  if (!state) return null;
  const kept = keptBoard(ctx.templeId, ctx.userId);
  return questRoomWords({
    state,
    now,
    effects: kept?.effects,
    owners: state.status === 'notYours' ? ownersOf(state.quest?.assignee) : undefined,
    beastName: libraryBeastName(state.beastId),
    grudge: state.status === 'lurking' ? grudgeOf(ctx.userId, state.quest?.id) : undefined,
  });
};

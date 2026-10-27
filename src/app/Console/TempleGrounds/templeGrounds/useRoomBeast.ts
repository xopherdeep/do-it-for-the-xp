import { computed, ref, watch } from 'vue';
import BestiaryDb, { beastStorage, type Beast } from '@/lib/databases/BestiaryDb';
import { TempleSystem } from '@/lib/engine/core/dungeons/TempleSystem';
import { BestiaryService } from '@/lib/services/battle/BestiaryService';
import { BEAST_LIBRARY } from '@/lib/services/core/beastLibrary';
import { questRoomStateFor } from '@/lib/services/temples/RoomInteractions';
import { isQuestRoom } from '@/lib/services/temples/questRooms';
import { isRoomSpent } from '@/lib/services/temples/roomInteractions/treasure';
import { pickRoomBeast, standInMonster } from '@/lib/services/temples/RoomBeast';
import debug from '@/lib/utils/debug';
import type { ChoiceRevealState } from './templeReveals';
import type { TempleGroundsProps, TempleState, useTempleMeta } from './useTempleMeta';

const COMBAT_ROOM_TYPES = ['monster', 'miniboss', 'boss'];

type TempleMeta = ReturnType<typeof useTempleMeta>;

export interface RoomBeastDeps
  extends Pick<TempleState, 'currentRoom' | 'currentPosition' | 'currentLevel' | 'isCurrentRoomCleared'> {
  props: TempleGroundsProps;
  /** The hero whose run this is: a quest room reads their quest board */
  progressHeroId: string | undefined;
  templeMeta: TempleMeta['metadata'];
  isGenerated: TempleMeta['isGenerated'];
  templeElement: TempleMeta['element'];
}

/** The beast of a combat room: the voxel monster that roams it, and the card the room's reveal shows. */
export const useRoomBeast = (deps: RoomBeastDeps) => {
  const { props, progressHeroId, currentRoom, currentPosition, currentLevel, isCurrentRoomCleared, templeMeta, isGenerated, templeElement } =
    deps;

  // A combat room whose beasts are already beaten: no second fight, and the room shows a mark
  const isCombatRoomCleared = computed(
    () => !!currentRoom.value && COMBAT_ROOM_TYPES.includes(currentRoom.value.type) && isCurrentRoomCleared.value
  );

  // A beaten beast leaves its spoils: the room is only done once the hero has searched it
  const isLootSearched = computed(() =>
    isRoomSpent({ userId: String(progressHeroId ?? ''), templeId: props.temple, level: currentLevel.value, position: currentPosition.value })
  );

  const bestiaryService = new BestiaryService();
  type CurrentRoom = NonNullable<typeof currentRoom.value>;

  // The beast the room's first beast id names, once the bestiary has been asked (filled in by the watch below the
  // reveal's beast lookup). While it is being asked the voxel monster waits, so it never swaps in front of the hero.
  const roomBeast = ref<{ name: string; avatar: string } | null>(null);
  const beastPending = ref(false);

  // Uncleared combat encounter in the room displays 3D roaming voxel monster
  const showVoxelMonster = computed(
    () =>
      !!currentRoom.value &&
      COMBAT_ROOM_TYPES.includes(currentRoom.value.type) &&
      !isCombatRoomCleared.value &&
      !beastPending.value
  );

  const activeMonster = computed(() => {
    if (!currentRoom.value) {
      return { name: 'Dust Bunny', avatar: bestiaryService.getAvatar(74) };
    }

    if (roomBeast.value) return roomBeast.value;

    const element = templeElement.value || 'fire';
    const info = standInMonster(currentRoom.value, element);
    return {
      name: info.name,
      avatar: bestiaryService.getAvatar(info.avatarId),
    };
  });

  /**
   * The beast an encounter names, as the reveal shows it: its name, and its portrait when it has an avatar.
   * Nothing (never a broken picture) for a beast the bestiary does not know or one that has no avatar.
   */
  type BeastCard = { name: string; art?: ChoiceRevealState['art'] } | null;
  const cardOf = (name: string, src: string): BeastCard => ({ name, art: src ? { src, alt: name, frame: 'beast' } : undefined });
  // A quest's beast the family has not met yet lives in the library (RoomBeast.pickTemplateBeast adopts it the same way)
  const libraryCard = (beastId: string): BeastCard => {
    const entry = BEAST_LIBRARY.find((candidate) => String(candidate.id) === beastId);
    const name = String(entry?.name || '').trim();
    const isUnknownBeast = !entry || !name;
    if (isUnknownBeast) return null;
    return cardOf(name, entry.avatar ? bestiaryService.getAvatar(Number(entry.avatar)) : '');
  };
  // The battle's loader, for a beast the bestiary answers nothing for
  const loaderCard = async (beastId: string): Promise<BeastCard> => {
    const enemy = await bestiaryService.loadBeastById(beastId);
    if (!enemy) return null;
    return cardOf(String(enemy.name || '').trim(), enemy.avatar ? bestiaryService.getAvatar(Number(enemy.avatar)) : '');
  };
  // A bestiary beast's picture: its image, else its stored copy, else its numbered avatar
  const pictureOf = (beast: Beast): string =>
    beast.imageUrl || beast.localImage || (beast.avatar ? bestiaryService.getAvatar(Number(beast.avatar)) : '');
  // The family's bestiary, then the loader; nothing for a beast neither knows
  const bestiaryCard = async (beastId: string): Promise<BeastCard> => {
    const beast = await new BestiaryDb(beastStorage).getBeastById(beastId);
    if (!beast) return loaderCard(beastId);
    const name = String(beast.name || '').trim();
    // BestiaryDb.getBeastById answers an id it does not know with a blank beast, never with nothing
    if (!name) return null;
    return cardOf(name, pictureOf(beast));
  };
  const lookUpBeast = async (beastId: string, isQuestBeast: boolean): Promise<BeastCard> => {
    try {
      const card = await bestiaryCard(beastId);
      const isUnknownBeast = card === null;
      if (isUnknownBeast) return isQuestBeast ? libraryCard(beastId) : null;
      return card;
    } catch (error) {
      debug.warn('Could not look up the beast of this room', error);
      return null;
    }
  };
  // The bestiary is read from storage: each beast is looked up once, and the hero's arrival in its room warms the
  // lookup, so the tap on the monster opens the reveal with the picture already there
  const beastCards = new Map<string, Promise<BeastCard>>();
  const beastCard = (beastId: string, isQuestBeast = false): Promise<BeastCard> => {
    const cardKey = isQuestBeast ? `quest:${beastId}` : beastId;
    let card = beastCards.get(cardKey);
    if (!card) {
      card = lookUpBeast(beastId, isQuestBeast);
      beastCards.set(cardKey, card);
    }
    return card;
  };

  // A quest room's state for the hero, once the run has read its board (the first read can still be under way when the
  // hero arrives). Null for a room that holds no quest, or when the board is not there: the classic rules stand.
  const questStateOf = async (room: CurrentRoom) => {
    if (!progressHeroId) return null;
    try {
      await TempleSystem.getInstance().whenQuestRoomsReady(props.temple);
    } catch (error) {
      debug.warn('[TempleGrounds] the quest board was not read; the room keeps the classic beast', error);
    }
    return questRoomStateFor(room, props.temple, progressHeroId);
  };
  // The face the voxel monster wears for a beast: its portrait, else the stand-in's
  const beastFace = (name: string, src: string | undefined) => ({ name, avatar: src || bestiaryService.getAvatar(74) });
  const showCard = (card: BeastCard) => {
    roomBeast.value = card ? beastFace(card.name, card.art?.src) : null;
  };

  // A room that holds a quest shows the quest's beast (docs/Quest-Rooms-Spec.md 5.3), once the run has its board. A quest
  // with no beast keeps the stand-in. Answers false for a dormant room (no quest fills it yet) or a run with no board: they
  // play as a classic fight.
  const showQuestBeast = async (room: CurrentRoom): Promise<boolean> => {
    beastPending.value = true;
    const questState = await questStateOf(room);
    const holdsQuest = questState && questState.resolution.kind !== 'dormant';
    if (!holdsQuest) return false;
    const questBeastId = questState.beastId;
    const card = questBeastId ? await beastCard(questBeastId, true) : null;
    const isStillInRoom = currentRoom.value === room;
    if (isStillInRoom) {
      showCard(card);
      beastPending.value = false;
    }
    return true;
  };

  const showAuthoredBeast = async (room: CurrentRoom, authoredBeastId: string) => {
    beastPending.value = true;
    const card = await beastCard(authoredBeastId);
    const isStillInRoom = currentRoom.value === room;
    if (isStillInRoom) showCard(card);
    beastPending.value = false;
  };

  // The same beast the battle will load (RoomBeast): a monsterType match, else the element's beasts by position.
  // The voxel monster waits for the lookup so it never swaps in front of the hero.
  const showBestiaryBeast = async (room: CurrentRoom) => {
    beastPending.value = true;
    try {
      const beasts = await new BestiaryDb(beastStorage).getLiveBeasts();
      const hasNoBeasts = !beasts || beasts.length === 0;
      if (hasNoBeasts) return;
      const element = templeElement.value || 'fire';
      const chosen = pickRoomBeast(room, element, currentPosition.value[0], currentPosition.value[1], beasts);

      const isBeastNamed = chosen !== null && Boolean(chosen.name);
      if (!isBeastNamed) return;
      const isStillInRoom = currentRoom.value === room;
      if (isStillInRoom) roomBeast.value = beastFace(chosen.name, pictureOf(chosen));
    } catch (error) {
      // Fall through to the stand-in
      debug.warn('[TempleGrounds] could not look up the room beast', error);
    } finally {
      beastPending.value = false;
    }
  };

  // What the watch follows: the room's place and its first beast. Nothing where there is no beast to show.
  const beastRoomKey = (): string | undefined => {
    const room = currentRoom.value;
    const pos = currentPosition.value;
    const lvl = currentLevel.value;
    const hasNoBeastToShow = !room || !COMBAT_ROOM_TYPES.includes(room.type) || isCombatRoomCleared.value;
    if (hasNoBeastToShow) return undefined;
    return `${lvl}:${pos[0]}:${pos[1]}:${room.content?.beasts?.[0] ?? ''}:${templeMeta.value?.element ?? ''}`;
  };

  // Walking into a room with a beast warms the lookup (the tap on the monster then opens its reveal at once) and
  // hands the voxel monster the same beast, name and portrait. A beast with no portrait keeps the stand-in's face.
  // Each step sets the voxel's wait before its first await: the voxel never shows in the tick between.
  watch(
    beastRoomKey,
    async (roomKey) => {
      roomBeast.value = null;
      if (!roomKey) {
        beastPending.value = false;
        return;
      }

      const room = currentRoom.value;
      if (!room) return;

      if (isQuestRoom(room)) {
        const wasShownByQuest = await showQuestBeast(room);
        if (wasShownByQuest) return;
      }

      const authoredBeastId = room.content?.beasts?.[0];
      if (authoredBeastId) {
        await showAuthoredBeast(room, String(authoredBeastId));
        return;
      }

      // A generated temple's element arrives with its metadata: the voxel waits for it rather than picking by the wrong element
      const isAwaitingTempleMeta = isGenerated.value && !templeMeta.value;
      if (isAwaitingTempleMeta) {
        beastPending.value = true;
        return;
      }

      await showBestiaryBeast(room);
    },
    { immediate: true }
  );

  return { isCombatRoomCleared, isLootSearched, showVoxelMonster, activeMonster, getBeastCard: beastCard };
};

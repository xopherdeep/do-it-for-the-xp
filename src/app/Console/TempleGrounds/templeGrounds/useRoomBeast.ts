import { computed, ref, watch } from 'vue';
import BestiaryDb, { beastStorage } from '@/lib/databases/BestiaryDb';
import { BestiaryService } from '@/lib/services/battle/BestiaryService';
import { pickRoomBeast, standInMonster } from '@/lib/services/temples/RoomBeast';
import debug from '@/lib/utils/debug';
import type { ChoiceRevealState } from './templeReveals';
import type { TempleState, useTempleMeta } from './useTempleMeta';

const COMBAT_ROOM_TYPES = ['monster', 'miniboss', 'boss'];

type TempleMeta = ReturnType<typeof useTempleMeta>;

export interface RoomBeastDeps
  extends Pick<TempleState, 'currentRoom' | 'currentPosition' | 'currentLevel' | 'isCurrentRoomCleared'> {
  templeMeta: TempleMeta['metadata'];
  isGenerated: TempleMeta['isGenerated'];
  templeElement: TempleMeta['element'];
}

/** The beast of a combat room: the voxel monster that roams it, and the card the room's reveal shows. */
export const useRoomBeast = (deps: RoomBeastDeps) => {
  const { currentRoom, currentPosition, currentLevel, isCurrentRoomCleared, templeMeta, isGenerated, templeElement } = deps;

  // A combat room whose beasts are already beaten: no second fight, and the room shows a mark
  const isCombatRoomCleared = computed(
    () => !!currentRoom.value && COMBAT_ROOM_TYPES.includes(currentRoom.value.type) && isCurrentRoomCleared.value
  );

  const bestiaryService = new BestiaryService();

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
  const lookUpBeast = async (beastId: string): Promise<BeastCard> => {
    try {
      const beast = await new BestiaryDb(beastStorage).getBeastById(beastId);
      if (!beast) {
        const fallbackEnemy = await bestiaryService.loadBeastById(beastId);
        if (!fallbackEnemy) return null;
        const name = String(fallbackEnemy.name || '').trim();
        const src = fallbackEnemy.avatar ? bestiaryService.getAvatar(Number(fallbackEnemy.avatar)) : '';
        return { name, art: src ? { src, alt: name, frame: 'beast' } : undefined };
      }
      const name = String(beast.name || '').trim();
      if (!name) return null;
      const src = beast.imageUrl || beast.localImage || (beast.avatar ? bestiaryService.getAvatar(Number(beast.avatar)) : '');
      return { name, art: src ? { src, alt: name, frame: 'beast' } : undefined };
    } catch (error) {
      debug.warn('Could not look up the beast of this room', error);
      return null;
    }
  };
  // The bestiary is read from storage: each beast is looked up once, and the hero's arrival in its room warms the
  // lookup, so the tap on the monster opens the reveal with the picture already there
  const beastCards = new Map<string, Promise<BeastCard>>();
  const beastCard = (beastId: string): Promise<BeastCard> => {
    let card = beastCards.get(beastId);
    if (!card) {
      card = lookUpBeast(beastId);
      beastCards.set(beastId, card);
    }
    return card;
  };
  // Walking into a room with a beast warms the lookup (the tap on the monster then opens its reveal at once) and
  // hands the voxel monster the same beast, name and portrait. A beast with no portrait keeps the stand-in's face.
  watch(
    () => {
      const room = currentRoom.value;
      const pos = currentPosition.value;
      const lvl = currentLevel.value;
      const hasNoBeastToShow = !room || !COMBAT_ROOM_TYPES.includes(room.type) || isCombatRoomCleared.value;
      if (hasNoBeastToShow) return undefined;
      return `${lvl}:${pos[0]}:${pos[1]}:${room.content?.beasts?.[0] ?? ''}:${templeMeta.value?.element ?? ''}`;
    },
    async (roomKey) => {
      roomBeast.value = null;
      if (!roomKey) {
        beastPending.value = false;
        return;
      }

      const room = currentRoom.value;
      if (!room) return;

      const authoredBeastId = room.content?.beasts?.[0];
      if (authoredBeastId) {
        beastPending.value = true;
        const card = await beastCard(String(authoredBeastId));
        if (currentRoom.value === room) {
          roomBeast.value = card ? { name: card.name, avatar: card.art?.src || bestiaryService.getAvatar(74) } : null;
        }
        beastPending.value = false;
        return;
      }

      // A generated temple's element arrives with its metadata: the voxel waits for it rather than picking by the wrong element
      const isAwaitingTempleMeta = isGenerated.value && !templeMeta.value;
      if (isAwaitingTempleMeta) {
        beastPending.value = true;
        return;
      }

      // The same beast the battle will load (RoomBeast): a monsterType match, else the element's beasts by position.
      // The voxel monster waits for the lookup so it never swaps in front of the hero.
      beastPending.value = true;
      try {
        const beasts = await new BestiaryDb(beastStorage).getBeasts();
        const hasBeasts = beasts && beasts.length > 0;
        if (hasBeasts) {
          const element = templeElement.value || 'fire';
          const chosen = pickRoomBeast(room, element, currentPosition.value[0], currentPosition.value[1], beasts);

          const isBeastNamed = chosen !== null && Boolean(chosen.name);
          if (isBeastNamed) {
            const src = chosen.imageUrl || chosen.localImage || (chosen.avatar ? bestiaryService.getAvatar(Number(chosen.avatar)) : '');
            if (currentRoom.value === room) {
              roomBeast.value = {
                name: chosen.name,
                avatar: src || bestiaryService.getAvatar(74),
              };
            }
          }
        }
      } catch (error) {
        // Fall through to the stand-in
        debug.warn('[TempleGrounds] could not look up the room beast', error);
      } finally {
        beastPending.value = false;
      }
    },
    { immediate: true }
  );

  return { isCombatRoomCleared, showVoxelMonster, activeMonster, getBeastCard: beastCard };
};

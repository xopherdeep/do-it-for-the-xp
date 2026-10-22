/**
 * Room interactions: what every kind of temple room says and does.
 *
 * TempleGrounds asks `roomActions` for the action sheet of the room the hero stands in, runs the action
 * the hero picks, and shows the `RoomOutcome` it gets back (a toast, a sound, a shake, a screen to open).
 * `onEnterRoom` is the same for rooms that act the moment the hero walks in (traps, pits).
 * Nothing in here touches the screen, so the whole thing is unit-testable: effects change the Pinia
 * user store (HP, MP, GP, XP, bag) and the TempleSystem (doors, floors, progress), nothing else.
 *
 * "Once" means once per hero per run: what the hero takes from a room (a key, the map, the secret chest, a find,
 * a solved riddle) is kept with their saved run like a chest or a door (see isRoomSpent), so a reload finds it
 * taken and a blood moon gives it back. Springs, camps and traps are once per visit: the memory lives in
 * roomInteractions/visitMemory.ts for the length of the session.
 *
 * This file is the entry point: it builds the sheet of every room kind (roomActions) and re-exports the rest
 * from roomInteractions/ (vocabulary, visitMemory, hero, travel, hazards, shop, puzzle, treasure).
 */
import type { Room } from '@/lib/engine/core/dungeons/types';
import { useUserStore } from '@/lib/store/stores/user';
import { heroEffects, luckyTop } from '@/lib/services/stats/StatEffects';
import { asChestRoom } from './ChestLoot';
import { earnGold, healHero, readGold, readPoints, restoreMana } from './roomInteractions/hero';
import { hasHappened, pick, randomInt, rememberOnce, rngOf, roomKey } from './roomInteractions/visitMemory';
import { stairsSheet, temples } from './roomInteractions/travel';
import { jumpTrap, springTrap } from './roomInteractions/hazards';
import { shopWares } from './roomInteractions/shop';
import { isPuzzleSolved, publicRiddle, riddleFor } from './roomInteractions/puzzle';
import { isChestEmptyIn, isDropWaiting, isPickupTaken, isRoomSpent, openGate, pickUp, spendRoom } from './roomInteractions/treasure';
import { questRoomWordsFor } from './roomInteractions/questSheet';
import { ENCOUNTER_LINES, roomKind, SFX } from './roomInteractions/vocabulary';
import type { RoomAction, RoomContext, RoomOutcome, RoomSheet } from './roomInteractions/vocabulary';

export { DIRECTIONS, nameTheEncounter, roomKind, SFX } from './roomInteractions/vocabulary';
export { backLabel, ownersLabel, questRoomStateFor, questRoomWords, questRoomWordsFor } from './roomInteractions/questSheet';
export type { QuestRoomWords } from './roomInteractions/questSheet';
export type {
  ClearedReward,
  Direction,
  Riddle,
  RoomAction,
  RoomContext,
  RoomIntent,
  RoomOutcome,
  RoomSheet,
  Ware,
} from './roomInteractions/vocabulary';
export { hasHappened, randomInt, rememberOnce, resetVisitMemory, roomKey, templeKey } from './roomInteractions/visitMemory';
export { earnGold, healHero, hurtHero, readGold, readPoints, restoreMana } from './roomInteractions/hero';
export { doorActions, readExits } from './roomInteractions/travel';
export type { Exit, Exits } from './roomInteractions/travel';
export { onEnterRoom } from './roomInteractions/hazards';
export { buyWare, shopWares } from './roomInteractions/shop';
export { answerRiddle, isPuzzleSolved } from './roomInteractions/puzzle';
export { clearTemple, isChestEmptyIn } from './roomInteractions/treasure';

// --- the sheets ------------------------------------------------------------------------------------

const EMPTY_FLAVOUR = [
  'Nothing but dust and a draught.',
  'A cracked pot. Nothing in it.',
  'Your footsteps echo back, a little late.',
  'You find a bone. Not even a good one.',
];

/**
 * Look or search the room once: a `chance` of finding `min`..`max` GP. Trained perception adds to the chance and
 * trained luck lifts the top of the range (docs/Stats-Contract.md); earnGold adds the class and awareness.
 */
const hunt = (
  ctx: RoomContext,
  chance: number,
  min: number,
  max: number,
  found: (gp: number) => string,
  nothing: () => string
): RoomOutcome => {
  const isFirstLook = spendRoom(ctx);
  if (!isFirstLook) return { message: 'You already looked here.' };
  const rng = rngOf(ctx);
  const hero = useUserStore().getUserById(ctx.userId);
  const isEmptyHanded = rng() >= chance + heroEffects(hero).findChanceBonus;
  if (isEmptyHanded) return { message: nothing() };
  const gp = earnGold(ctx.userId, randomInt(min, luckyTop(max, hero), rng));
  return { message: found(gp), sound: SFX.gainGP };
};

const spring = (
  ctx: RoomContext,
  kind: 'hp' | 'mp',
  amount: number,
  doneSound: string
): RoomOutcome => {
  const { now, max } = readPoints(ctx.userId, kind);
  const isFull = now >= max;
  if (isFull) return { message: 'Not thirsty. The spring will keep.' };
  const isFirstDrink = rememberOnce(roomKey(ctx, 'spring'));
  if (!isFirstDrink) return { message: 'The spring is still.' };
  const gain = kind === 'hp' ? healHero(ctx.userId, amount) : restoreMana(ctx.userId, amount);
  return { message: `+${gain} ${kind.toUpperCase()}`, sound: doneSound };
};

const spent = (ctx: RoomContext, topic: string): boolean => hasHappened(roomKey(ctx, topic));

/** What a fight room says while its beast's drop waits to be taken (the screen opens the chest reveal on it) */
const DROP_LINE = 'Something glints where the beast fell.';

/**
 * The action sheet for a room: a header in the temple's voice and the room's own actions.
 * Rooms with nothing to do (or nothing left to do) answer with no actions.
 */
export const roomActions = (given: Room | undefined, ctx: RoomContext): RoomSheet => {
  // The temple keeps a Dragon Egg or `master` room as the Pegasus chest: from here on it is a loot room
  const room = given && asChestRoom(given);
  const kind = roomKind(room);
  if (!room) return { header: 'Something strange.', actions: [] };
  const act = (label: string, run: RoomAction['run']): RoomAction => ({ label, run });
  const sheet = (header: string, actions: RoomAction[] = [], subHeader?: string): RoomSheet => ({ header, subHeader, actions });
  const system = temples();

  switch (kind) {
    case 'entrance':
      return sheet('The way out is behind you.', [act('Leave Temple', () => ({ intent: 'leave' }))]);

    case 'empty':
      return sheet(
        'An empty room. Dust and echoes.',
        isRoomSpent(ctx)
          ? []
          : [
              act('Look around', () => {
                return hunt(ctx, 1 / 3, 1, 5, (gp) => `You found ${gp} GP under a stone!`, () => pick(EMPTY_FLAVOUR, rngOf(ctx)));
              }),
            ]
      );

    case 'gate': {
      if (system.isTempleCleared(ctx.templeId)) {
        return sheet('The gate stands open.', [act('Step through', () => ({ intent: 'leave', sound: SFX.yes }))]);
      }
      const canOpen = system.hasMasterKey(ctx.templeId) || system.isBossBeaten(ctx.templeId);
      if (!canOpen) {
        return sheet(
          'A great gate, sealed.',
          [],
          'It will not budge. The Boss Key, or the beast that guards it, must come first.'
        );
      }
      return sheet('A great gate, sealed.', [act('Open the gate', () => openGate(room, ctx))]);
    }

    case 'health': {
      const amount = Number(room.content?.healthPoints) || 10;
      return sheet(
        spent(ctx, 'spring') ? 'The spring is still.' : 'A spring of clear water.',
        spent(ctx, 'spring') ? [] : [act('Drink', () => spring(ctx, 'hp', amount, SFX.restoreHP))]
      );
    }

    case 'mana': {
      const amount = Number(room.content?.magicPoints ?? room.content?.manaPoints) || 10;
      return sheet(
        spent(ctx, 'spring') ? 'The spring is still.' : 'A spring of silver light.',
        spent(ctx, 'spring') ? [] : [act('Drink', () => spring(ctx, 'mp', amount, SFX.restoreMP))]
      );
    }

    case 'camp':
      return sheet(
        spent(ctx, 'camp') ? 'The fire has burned down.' : 'A safe place to rest.',
        spent(ctx, 'camp')
          ? []
          : [
              act('Make camp', () => {
                const hp = readPoints(ctx.userId, 'hp');
                const mp = readPoints(ctx.userId, 'mp');
                const isFullyRested = hp.now >= hp.max && mp.now >= mp.max;
                if (isFullyRested) return { message: 'Not tired. Maybe later.' };
                rememberOnce(roomKey(ctx, 'camp'));
                healHero(ctx.userId, hp.max - hp.now);
                restoreMana(ctx.userId, mp.max - mp.now);
                return { message: 'You rest by the fire. HP and MP restored.', sound: SFX.restoreAll };
              }),
            ]
      );

    case 'trap': {
      const hasNoWayToDodge = !room.content?.avoidable || spent(ctx, 'trap');
      if (hasNoWayToDodge) {
        return sheet(spent(ctx, 'trap') ? 'A sprung trap. Quiet now.' : 'Something nasty waits underfoot.');
      }
      return sheet('Something nasty waits underfoot.', [
        act('Jump across', () => jumpTrap(room, ctx)),
        act('Walk through', () => springTrap(room, ctx)),
      ]);
    }

    case 'puzzle': {
      if (isPuzzleSolved(ctx)) return sheet('The glyphs have faded.');
      return sheet('Glyphs cover the wall.', [
        act('Study the glyphs', () => ({ intent: 'riddle', riddle: publicRiddle(riddleFor(room), spent(ctx, 'moonlit')) })),
      ]);
    }

    case 'teleport':
      return sheet('A shimmering circle.', [act('Teleport', () => ({ intent: 'teleport' }))]);

    case 'shop':
      return sheet('Can I interest you in my wares?', [
        act('View wares', () => ({ intent: 'shop', wares: shopWares(room, ctx), gp: readGold(ctx.userId) })),
      ]);

    case 'loot':
      return isChestEmptyIn(room)
        ? { ...sheet('An old chest, already opened.', [act('Inspect Empty Chest', () => ({ intent: 'emptyChest' }))]), chest: 'empty' }
        : { ...sheet('A chest!', [act('Open Chest', () => ({ intent: 'openChest' }))]), chest: 'closed' };

    case 'key':
    case 'map':
    case 'compass': {
      const taken = isPickupTaken(kind, ctx);
      const names: Record<string, string> = { key: 'A key glints in the dust.', map: 'A rolled-up map.', compass: 'A compass, still ticking.' };
      return sheet(
        taken ? 'Nothing left here.' : names[kind],
        taken ? [] : [act('Take it', () => pickUp(kind, room, ctx))]
      );
    }

    case 'monster':
    case 'miniboss':
    case 'boss': {
      const searchTheRoom = (): RoomAction[] =>
        isRoomSpent(ctx)
          ? []
          : [act('Search the room', () => hunt(ctx, 1 / 2, 2, 8, (gp) => `You found ${gp} GP in the mess.`, () => 'Nothing but the smell.'))];

      // What the beast dropped waits in the room for a hero with no fight to win: Take it opens the chest reveal on it
      // (the drop is filed apart from the room's search, see isDropWaiting)
      const takeTheDrop = (): RoomAction[] => [act('Take it', () => ({ intent: 'takeDrop' }))];

      // A room that holds a quest tells the truth about it (docs/Quest-Rooms-Spec.md 5.3): the quest's beast, the chore
      // and when it is due, or why there is no fight. A classic room, a dormant one and a run with no board yet fall through.
      const questWords = questRoomWordsFor(room, ctx);
      if (questWords) {
        const { status, header, subHeader, body, beastId, fight, search } = questWords;
        const hasDrop = isDropWaiting(room, ctx, fight);
        const actions: RoomAction[] = [];
        if (fight) actions.push(act('Fight', () => ({ intent: 'fight' })));
        if (hasDrop) actions.push(...takeTheDrop());
        if (search) actions.push(...searchTheRoom());
        const beastDefeated = status === 'cleared' || status === 'pending';
        return {
          ...sheet(header, actions, subHeader),
          body: hasDrop ? [body, DROP_LINE].filter(Boolean).join(' ') : body,
          beastId,
          ...(beastId ? { questBeast: true } : {}),
          ...(beastDefeated ? { beastDefeated } : {}),
          ...(hasDrop ? { drop: 'waiting' as const } : {}),
        };
      }

      if (system.isRoomCleared(ctx.templeId, ctx.level, ctx.position)) {
        const hasDrop = isDropWaiting(room, ctx, false);
        return {
          ...sheet('Nothing left here but the smell.', [...(hasDrop ? takeTheDrop() : []), ...searchTheRoom()]),
          ...(hasDrop ? { body: DROP_LINE, drop: 'waiting' as const } : {}),
          beastDefeated: true,
        };
      }
      const beasts = room.content?.beasts;
      const beastId = Array.isArray(beasts) && beasts.length > 0 ? String(beasts[0]) : undefined;
      return {
        ...sheet(ENCOUNTER_LINES[kind] ?? ENCOUNTER_LINES.monster, [act('Fight', () => ({ intent: 'fight' }))]),
        beastId,
      };
    }

    case 'stairs-up':
      return stairsSheet(room, ctx, 'up');
    case 'stairs-down':
      return stairsSheet(room, ctx, 'down');

    case 'pit':
      return sheet('A hole in the floor. Mind your step.');

    case 'door':
      return sheet('A heavy door. Mind the lock.');

    case 'void':
    case 'wall':
      return sheet('Nothing but dark.');

    case 'secret': {
      const opened = isRoomSpent(ctx);
      return sheet(
        opened ? 'The chamber is bare now.' : 'A hidden chamber!',
        opened
          ? []
          : [
              act('Open the chest', () => {
                const isFirstOpen = spendRoom(ctx);
                if (!isFirstOpen) return { message: 'The chamber is bare now.' };
                // The chest holds its gold, and trained luck can find a little more at the bottom
                const gold = Number(room.content?.gold) || 20;
                const gp = earnGold(ctx.userId, randomInt(gold, luckyTop(gold, useUserStore().getUserById(ctx.userId)), rngOf(ctx)));
                return { message: `A hidden chest! +${gp} GP`, sound: SFX.secret };
              }),
            ]
      );
    }

    case 'save':
      return sheet('A quiet alcove.', [
        act('Save', () => {
          system.saveProgress(ctx.templeId);
          useUserStore().persistUser(ctx.userId);
          return { message: 'Your journey is saved.', sound: SFX.yes };
        }),
      ]);

    default:
      return sheet('Something strange.');
  }
};

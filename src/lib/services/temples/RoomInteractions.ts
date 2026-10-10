/**
 * Room interactions: what every kind of temple room says and does.
 *
 * TempleGrounds asks `roomActions` for the action sheet of the room the hero stands in, runs the action
 * the hero picks, and shows the `RoomOutcome` it gets back (a toast, a sound, a shake, a screen to open).
 * `onEnterRoom` is the same for rooms that act the moment the hero walks in (traps, pits).
 * Nothing in here touches the screen, so the whole thing is unit-testable: effects change the Pinia
 * user store (HP, MP, GP, XP, bag) and the TempleSystem (doors, floors, progress), nothing else.
 *
 * "Once" means once per hero per temple visit: the memory lives in this module for the length of the
 * session (see rememberOnce). A reload starts a new visit, as it does for chests and doors.
 */
import { DungeonManager } from '@/lib/engine/core/dungeons/DungeonManager';
import { ChestSystem } from '@/lib/engine/core/dungeons/ChestSystem';
import { BOSS_DOOR_LINE, TempleSystem } from '@/lib/engine/core/dungeons/TempleSystem';
import type { Room } from '@/lib/engine/core/dungeons/types';
import { useUserStore } from '@/lib/store/stores/user';
import { bonusGp } from '@/lib/services/stats/ClassPassives';

export type Direction = 'north' | 'south' | 'east' | 'west';

/** Look order for "the first locked side" and "the first hazard": clockwise from the top of the map. */
export const DIRECTIONS: Direction[] = ['north', 'east', 'south', 'west'];

const STEP: Record<Direction, [number, number]> = {
  north: [-1, 0],
  east: [0, 1],
  south: [1, 0],
  west: [0, -1],
};

/** Keys of `play$fx` (src/assets/fx). The secret sting is stored as `shhh`; the table has no teleport sound. */
export const SFX = {
  restoreHP: 'restoreHP',
  restoreMP: 'restoreMP',
  restoreAll: 'restoreAll',
  damage: 'damage',
  error: 'error',
  secret: 'shhh',
  teleport: 'okdesuka',
  buy: 'buyItem',
  yes: 'yes',
  loot: 'loot',
  takeItem: 'takeItem',
  useKey: 'useKey',
  gainGP: 'gainGP',
} as const;

// --- the shapes the screen deals in ----------------------------------------------------------------

export interface RoomContext {
  userId: string;
  templeId: string;
  level: string;
  position: [number, number];
  /** Dice. Tests pass a fixed one; the game uses Math.random. */
  rng?: () => number;
}

/** A multiple-choice riddle as the screen shows it: the answer stays here. */
export interface Riddle {
  id: string;
  question: string;
  choices: string[];
}

export interface Ware {
  id: string;
  name: string;
  price: number;
  blurb: string;
  soldOut?: boolean;
}

/** What the screen has to open or do beyond a toast and a sound. */
export type RoomIntent = 'leave' | 'fight' | 'openChest' | 'emptyChest' | 'teleport' | 'riddle' | 'shop' | 'sheet';

export interface RoomOutcome {
  /** A toast, in the temple's voice */
  message?: string;
  /** A `play$fx` key */
  sound?: string;
  /** Shake the game area for 400 ms */
  shake?: boolean;
  intent?: RoomIntent;
  riddle?: Riddle;
  wares?: Ware[];
  /** The hero's wallet, for the shop */
  gp?: number;
  /** The hero fell to 0 HP: HP is back to full already, the screen sends them to game over */
  defeated?: boolean;
  /** The hero is in another room (or floor) now: the screen runs the entry check for it */
  moved?: boolean;
}

export interface RoomAction {
  label: string;
  run: () => RoomOutcome | Promise<RoomOutcome>;
}

export interface RoomSheet {
  header: string;
  subHeader?: string;
  /** The room's own actions; the screen adds Cancel */
  actions: RoomAction[];
}

// --- helpers ---------------------------------------------------------------------------------------

const visitLog = new Set<string>();

/** Remember that something happened this visit. Returns false if it already had. */
export const rememberOnce = (key: string): boolean => {
  if (visitLog.has(key)) return false;
  visitLog.add(key);
  return true;
};
export const hasHappened = (key: string): boolean => visitLog.has(key);
/** Start every hero's visit over (tests; a fresh session does the same by itself). */
export const resetVisitMemory = (): void => visitLog.clear();

const roomKey = (ctx: RoomContext, topic: string): string =>
  `${ctx.userId}|${ctx.templeId}|${ctx.level}|${ctx.position[0]},${ctx.position[1]}|${topic}`;

/** Memory that belongs to the whole temple, not one room (the bottles). */
export const templeKey = (userId: string, templeId: string, topic: string): string => `${userId}|${templeId}|${topic}`;

/** Room kinds go by the names ROOM_ICONS uses; layouts and the DSL spell a few of them differently. */
const TYPE_ALIASES: Record<string, string> = {
  exit: 'entrance',
  savepoint: 'save',
  stairs_up: 'stairs-up',
  stairs_down: 'stairs-down',
  dungeon_map: 'map',
  'dungeon-map': 'map',
};
export const roomKind = (room: Room | undefined): string => {
  const type = room?.type ?? '';
  return TYPE_ALIASES[type] ?? type;
};

export const randomInt = (min: number, max: number, rng: () => number): number =>
  min + Math.floor(rng() * (max - min + 1));

const pick = <T>(list: T[], rng: () => number): T => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

/** "blindingFlash" -> "blinding flash" */
const words = (value: string): string =>
  value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim()
    .toLowerCase();

const titleWords = (value: string): string => words(value).replace(/\b([a-z])/g, (letter) => letter.toUpperCase());

const rngOf = (ctx: RoomContext): (() => number) => ctx.rng ?? Math.random;

/** A hero's HP or MP, whichever way the profile stores it (an object, or a number next to maxHp / maxMp). */
export const readPoints = (userId: string, kind: 'hp' | 'mp'): { now: number; max: number } => {
  const stats = useUserStore().getUserById(userId)?.stats;
  const value = stats?.[kind];
  const topMax = stats?.[kind === 'hp' ? 'maxHp' : 'maxMp'];
  if (value && typeof value === 'object') return { now: Number(value.now) || 0, max: Number(value.max) || 0 };
  const max = typeof topMax === 'number' ? topMax : 100;
  return { now: typeof value === 'number' ? value : max, max };
};

export const readGold = (userId: string): number => {
  const wallet = useUserStore().getUserById(userId)?.stats?.gp?.wallet;
  return typeof wallet === 'number' ? wallet : 0;
};

/**
 * Pay the hero gold found in the temple (chests, searches, the gate) with their class loot bonus on top
 * (Thief, Ninja +25%). Returns the coins actually paid, for the message.
 */
const earnGold = (userId: string, amount: number): number => {
  const store = useUserStore();
  const gp = bonusGp(amount, store.getUserById(userId)?.jobClass);
  // The wallet moves before updateUserGP's first await; the save is not waited for
  if (gp > 0) void store.updateUserGP({ userId, wallet: gp });
  return gp;
};

/** Take HP off a hero. A hero who drops to 0 is stood back up at full HP and reported defeated. */
export const hurtHero = (userId: string, amount: number): { lost: number; defeated: boolean } => {
  const store = useUserStore();
  const before = readPoints(userId, 'hp').now;
  const alive = store.updateUserHP({ userId, amount: -amount });
  const after = readPoints(userId, 'hp');
  if (alive) return { lost: before - after.now, defeated: false };

  // The same as the battle: back to full HP first, then off to the game-over screen
  store.updateUserHP({ userId, amount: after.max });
  return { lost: before, defeated: true };
};

/** Heal a hero by up to `amount`. Returns how much it really restored. */
export const healHero = (userId: string, amount: number): number => {
  const { now, max } = readPoints(userId, 'hp');
  const gain = Math.max(0, Math.min(amount, max - now));
  if (gain > 0) useUserStore().updateUserHP({ userId, amount: gain });
  return gain;
};

export const restoreMana = (userId: string, amount: number): number => {
  const { now, max } = readPoints(userId, 'mp');
  const gain = Math.max(0, Math.min(amount, max - now));
  if (gain > 0) useUserStore().updateUserMP({ userId, amount: gain });
  return gain;
};

const temples = () => TempleSystem.getInstance();

/** What lies in each direction of a room: the room there (if any), and whether this side is locked. */
export interface Exit {
  position: [number, number];
  room?: Room;
  locked: boolean;
}
export type Exits = Record<Direction, Exit>;

export const readExits = (templeId: string, level: string, position: [number, number]): Exits => {
  const manager = DungeonManager.getInstance();
  const here = manager.getRoom(templeId, position, level);
  const exit = (direction: Direction): Exit => {
    const next: [number, number] = [position[0] + STEP[direction][0], position[1] + STEP[direction][1]];
    return { position: next, room: manager.getRoom(templeId, next, level), locked: Boolean(here?.locked?.[direction]) };
  };
  return { north: exit('north'), east: exit('east'), south: exit('south'), west: exit('west') };
};

/**
 * The sheet for a door the hero taps: a small lock asks for a key, the boss door asks for the master key and
 * refuses everything else ("A big lock. This needs the Boss Key."), an open way has nothing to say.
 */
export const doorActions = (ctx: RoomContext, direction: Direction): RoomSheet => {
  const system = temples();
  const open = (done: string): RoomOutcome =>
    system.unlockDoor(ctx.templeId, ctx.position, direction)
      ? { message: done, sound: SFX.useKey }
      : { message: system.explainDoor(ctx.templeId, ctx.position, direction) ?? 'The door will not open.', sound: SFX.error };

  switch (system.doorKind(ctx.templeId, ctx.position, direction, ctx.level)) {
    case 'master':
      return system.hasMasterKey(ctx.templeId)
        ? { header: 'The Boss Door', subHeader: 'The Boss Key fits the big lock.', actions: [{ label: 'Open the door', run: () => open('The big lock falls away.') }] }
        : { header: 'The Boss Door', subHeader: BOSS_DOOR_LINE, actions: [] };
    case 'locked':
      return (system.getTempleState(ctx.templeId)?.playerKeys ?? 0) > 0
        ? { header: 'Locked Door', subHeader: 'Would you like to use a key to unlock this door?', actions: [{ label: 'Unlock (-1 Key)', run: () => open('Door unlocked!') }] }
        : { header: 'Locked Door', subHeader: 'You need a key to unlock this door!', actions: [] };
    default:
      return { header: 'The way is open.', actions: [] };
  }
};

/** A chest is empty when the room says so, or its chest in the ChestSystem is. */
export const isChestEmptyIn = (room: Room): boolean => {
  if (room.type !== 'loot' || room.isEmpty || !room.content) return true;
  if (room.content.chestId) {
    const chest = ChestSystem.getInstance().getChest(room.content.chestId);
    if (chest?.isEmpty) return true;
  }
  return false;
};

/** Floors a hero can climb to or fall to: the next one up or down the temple's own list. */
const neighbourFloor = (templeId: string, level: string, step: 1 | -1): string | undefined => {
  const floors = temples().getFloors(templeId);
  return floors[floors.indexOf(level) + step];
};

/** Put the hero on `floor`, trying each spot in turn. Returns true on the first one they can stand on. */
const arriveOn = (templeId: string, floor: string, spots: Array<[number, number] | undefined>): boolean => {
  for (const spot of spots) {
    if (spot && temples().changeLevel(templeId, floor, spot)) return true;
  }
  return false;
};

/** The first room of the given kinds on a floor. */
const findRoomOfKind = (templeId: string, floor: string, kinds: string[]): [number, number] | undefined => {
  const manager = DungeonManager.getInstance();
  const grid = manager.getMazeGrid(templeId, floor);
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (kinds.includes(roomKind(manager.getRoom(templeId, [row, col], floor)))) return [row, col];
    }
  }
  return undefined;
};

// --- riddles ---------------------------------------------------------------------------------------

interface RiddleDef extends Riddle {
  /** Index into choices */
  answer: number;
}

const RIDDLES: Record<string, RiddleDef> = {
  stonePillars: {
    id: 'stonePillars',
    question: 'I stand on no feet and hold up the sky of this room. What am I?',
    choices: ['A shadow', 'A door', 'A pillar'],
    answer: 2,
  },
  prismAlignment: {
    id: 'prismAlignment',
    question: 'I turn one white beam into a rainbow. What am I?',
    choices: ['A candle', 'A prism', 'A mirror'],
    answer: 1,
  },
  shadowReflection: {
    id: 'shadowReflection',
    question: 'I follow you everywhere and vanish in the dark. What am I?',
    choices: ['Your shadow', 'Your echo', 'Your breath'],
    answer: 0,
  },
  waterLevels: {
    id: 'waterLevels',
    question: 'I have a bed but never sleep, and a mouth but never speak. What am I?',
    choices: ['A well', 'A lamp', 'A river'],
    answer: 2,
  },
  fireSequence: {
    id: 'fireSequence',
    question: 'I eat and eat and am always hungry. Give me water and I die. What am I?',
    choices: ['A wolf', 'A fire', 'A moth'],
    answer: 1,
  },
  mirrorIce: {
    id: 'mirrorIce',
    question: 'I show your face but hold no words. Break me and the luck goes with me. What am I?',
    choices: ['A mirror', 'A window', 'A frozen pond'],
    answer: 0,
  },
  generic: {
    id: 'generic',
    question: 'I have keys but open no doors. What am I?',
    choices: ['A map', 'A piano', 'A chest'],
    answer: 1,
  },
};

const riddleFor = (room: Room): RiddleDef => RIDDLES[String(room.content?.puzzleType)] ?? RIDDLES.generic;

const publicRiddle = ({ id, question, choices }: RiddleDef): Riddle => ({ id, question, choices: [...choices] });

// --- shop ------------------------------------------------------------------------------------------

const POTION_ID = 'potion-of-vigor';
const POTION_PRICE = 15;
const POTION_HEAL = 20;
const SPECIAL_DEFAULT_PRICE = 50;

/** The wares on offer in a shop room, with what the hero already bought taken off the shelf. */
export const shopWares = (room: Room, ctx: RoomContext): Ware[] => {
  const wares: Ware[] = [
    { id: POTION_ID, name: 'Potion of Vigor', price: POTION_PRICE, blurb: `restore ${POTION_HEAL} HP` },
  ];
  const special = room.content?.specialItem;
  if (typeof special === 'string' && special) {
    wares.push({
      id: `special:${special}`,
      name: titleWords(special),
      price: Number(room.content?.specialItemPrice ?? room.content?.price) || SPECIAL_DEFAULT_PRICE,
      blurb: 'a rare find',
      soldOut: hasHappened(roomKey(ctx, `bought:${special}`)),
    });
  }
  return wares;
};

/** Buy one thing from the shop room. Not enough GP changes nothing. */
export const buyWare = (room: Room, ctx: RoomContext, wareId: string): RoomOutcome => {
  const ware = shopWares(room, ctx).find((item) => item.id === wareId);
  if (!ware) return { message: 'We do not carry that.', sound: SFX.error };
  if (ware.soldOut) return { message: 'Sold out. Sorry, friend.', sound: SFX.error };
  if (readGold(ctx.userId) < ware.price) return { message: 'Not enough GP', sound: SFX.error };

  const store = useUserStore();
  if (ware.id === POTION_ID) {
    const hp = readPoints(ctx.userId, 'hp');
    if (hp.now >= hp.max) return { message: 'You are in fine shape already. Keep your GP.', sound: SFX.error };
    void store.updateUserGP({ userId: ctx.userId, wallet: -ware.price });
    const healed = healHero(ctx.userId, POTION_HEAL);
    return { message: `Potion of Vigor: +${healed} HP`, sound: SFX.buy };
  }

  const special = ware.id.slice('special:'.length);
  void store.updateUserGP({ userId: ctx.userId, wallet: -ware.price });
  store.addInventoryItem(ctx.userId, { name: special, source: ctx.templeId });
  rememberOnce(roomKey(ctx, `bought:${special}`));
  return { message: `${ware.name} is in your bag.`, sound: SFX.buy };
};

// --- puzzle ----------------------------------------------------------------------------------------

/** Answer the room's riddle with the index of a choice. */
export const answerRiddle = (room: Room, ctx: RoomContext, choice: number): RoomOutcome => {
  if (hasHappened(roomKey(ctx, 'puzzle'))) return { message: 'The glyphs have faded.' };

  if (choice !== riddleFor(room).answer) {
    const { defeated } = hurtHero(ctx.userId, 3);
    return {
      message: defeated ? 'Wrong. The wall glows hot. You black out.' : 'Wrong. The wall glows hot.',
      sound: SFX.damage,
      shake: true,
      defeated: defeated || undefined,
    };
  }

  rememberOnce(roomKey(ctx, 'puzzle'));
  const opened = temples().openDoorsAround(ctx.templeId, ctx.position, ctx.level);
  return {
    message: opened > 0 ? 'The glyphs fade. A door unlocks.' : 'The glyphs fade. Nothing here was locked.',
    sound: SFX.secret,
  };
};

// --- traps and pits --------------------------------------------------------------------------------

const trapDamage = (room: Room): number => {
  const damage = Number(room.content?.damage);
  return Number.isFinite(damage) && damage > 0 ? damage : 5;
};

const springTrap = (room: Room, ctx: RoomContext): RoomOutcome => {
  rememberOnce(roomKey(ctx, 'trap'));
  const damage = trapDamage(room);
  const { lost, defeated } = hurtHero(ctx.userId, damage);
  const name = words(String(room.content?.trapType ?? 'hidden'));
  return {
    message: `The ${name} trap bites: -${lost} HP${defeated ? '. You black out.' : ''}`,
    sound: SFX.damage,
    shake: true,
    defeated: defeated || undefined,
  };
};

const jumpTrap = (room: Room, ctx: RoomContext): RoomOutcome => {
  const stats = useUserStore().getUserById(ctx.userId)?.stats;
  const agility = Number(stats?.special?.agility ?? stats?.agility) || 0;
  if (agility >= 8 || rngOf(ctx)() < 0.5) {
    rememberOnce(roomKey(ctx, 'trap'));
    return { message: 'You leap clear of the trap.', sound: SFX.yes };
  }
  return springTrap(room, ctx);
};

const fallInPit = (ctx: RoomContext): RoomOutcome => {
  const { lost, defeated } = hurtHero(ctx.userId, 5);
  if (defeated) return { message: `The pit swallows you: -${lost} HP. You black out.`, sound: SFX.damage, shake: true, defeated: true };

  const below = neighbourFloor(ctx.templeId, ctx.level, -1);
  if (below && arriveOn(ctx.templeId, below, [ctx.position, findRoomOfKind(ctx.templeId, below, ['stairs-up'])])) {
    return { message: `You fall to ${below}: -${lost} HP`, sound: SFX.damage, shake: true, moved: true };
  }
  return { message: `You land hard at the bottom: -${lost} HP`, sound: SFX.damage, shake: true };
};

/**
 * What a room does the moment the hero walks in. Null when it waits for the hero to act instead.
 * A trap hurts once per visit; one the hero can dodge opens its sheet first (intent 'sheet').
 */
export const onEnterRoom = (room: Room | undefined, ctx: RoomContext): RoomOutcome | null => {
  const kind = roomKind(room);
  if (!room) return null;

  if (kind === 'trap') {
    if (hasHappened(roomKey(ctx, 'trap'))) return null;
    return room.content?.avoidable ? { intent: 'sheet' } : springTrap(room, ctx);
  }

  if (kind === 'pit') {
    // With a floor below the pit always drops the hero; with none it only bruises them once
    const hasFloorBelow = Boolean(neighbourFloor(ctx.templeId, ctx.level, -1));
    if (!hasFloorBelow && !rememberOnce(roomKey(ctx, 'pit'))) return null;
    return fallInPit(ctx);
  }

  return null;
};

// --- stairs ----------------------------------------------------------------------------------------

const climb = (room: Room, ctx: RoomContext, way: 'up' | 'down'): RoomOutcome => {
  const rubble: RoomOutcome = { message: 'The stairs are blocked by rubble.', sound: SFX.error };
  const target = (room.content?.targetLevel as string | undefined) ?? neighbourFloor(ctx.templeId, ctx.level, way === 'up' ? 1 : -1);
  if (!target || !temples().getFloors(ctx.templeId).includes(target) || target === ctx.level) return rubble;

  const coords = room.content?.targetCoords;
  const landing = findRoomOfKind(ctx.templeId, target, [way === 'up' ? 'stairs-down' : 'stairs-up']);
  const requested: [number, number] | undefined = coords ? [Number(coords.y), Number(coords.x)] : undefined;
  if (!arriveOn(ctx.templeId, target, [requested, landing, ctx.position])) return rubble;

  return { message: `You climb ${way} to ${target}.`, sound: SFX.yes, moved: true };
};

// --- the sheets ------------------------------------------------------------------------------------

const EMPTY_FLAVOUR = [
  'Nothing but dust and a draught.',
  'A cracked pot. Nothing in it.',
  'Your footsteps echo back, a little late.',
  'You find a bone. Not even a good one.',
];

const hunt = (
  ctx: RoomContext,
  topic: string,
  chance: number,
  min: number,
  max: number,
  found: (gp: number) => string,
  nothing: () => string
): RoomOutcome => {
  if (!rememberOnce(roomKey(ctx, topic))) return { message: 'You already looked here.' };
  const rng = rngOf(ctx);
  if (rng() >= chance) return { message: nothing() };
  const gp = earnGold(ctx.userId, randomInt(min, max, rng));
  return { message: found(gp), sound: SFX.gainGP };
};

const spring = (
  ctx: RoomContext,
  kind: 'hp' | 'mp',
  amount: number,
  doneSound: string
): RoomOutcome => {
  const { now, max } = readPoints(ctx.userId, kind);
  if (now >= max) return { message: 'Not thirsty. The spring will keep.' };
  if (!rememberOnce(roomKey(ctx, 'spring'))) return { message: 'The spring is still.' };
  const gain = kind === 'hp' ? healHero(ctx.userId, amount) : restoreMana(ctx.userId, amount);
  return { message: `+${gain} ${kind.toUpperCase()}`, sound: doneSound };
};

const spent = (ctx: RoomContext, topic: string): boolean => hasHappened(roomKey(ctx, topic));

/**
 * The action sheet for a room: a header in the temple's voice and the room's own actions.
 * Rooms with nothing to do (or nothing left to do) answer with no actions.
 */
export const roomActions = (room: Room | undefined, ctx: RoomContext): RoomSheet => {
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
        spent(ctx, 'look')
          ? []
          : [
              act('Look around', () => {
                return hunt(ctx, 'look', 1 / 3, 1, 5, (gp) => `You found ${gp} GP under a stone!`, () => pick(EMPTY_FLAVOUR, rngOf(ctx)));
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
          'It will not budge. The master key, or the beast that guards it, must come first.'
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
                if (hp.now >= hp.max && mp.now >= mp.max) return { message: 'Not tired. Maybe later.' };
                rememberOnce(roomKey(ctx, 'camp'));
                healHero(ctx.userId, hp.max - hp.now);
                restoreMana(ctx.userId, mp.max - mp.now);
                return { message: 'You rest by the fire. HP and MP restored.', sound: SFX.restoreAll };
              }),
            ]
      );

    case 'trap': {
      if (!room.content?.avoidable || spent(ctx, 'trap')) {
        return sheet(spent(ctx, 'trap') ? 'A sprung trap. Quiet now.' : 'Something nasty waits underfoot.');
      }
      return sheet('Something nasty waits underfoot.', [
        act('Jump across', () => jumpTrap(room, ctx)),
        act('Walk through', () => springTrap(room, ctx)),
      ]);
    }

    case 'puzzle': {
      if (spent(ctx, 'puzzle')) return sheet('The glyphs have faded.');
      return sheet('Glyphs cover the wall.', [
        act('Study the glyphs', () => ({ intent: 'riddle', riddle: publicRiddle(riddleFor(room)) })),
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
        ? sheet('An old chest, already opened.', [act('Inspect Empty Chest', () => ({ intent: 'emptyChest' }))])
        : sheet('A chest!', [act('Open Chest', () => ({ intent: 'openChest' }))]);

    case 'key':
    case 'map':
    case 'compass': {
      const taken = spent(ctx, 'pickup');
      const names: Record<string, string> = { key: 'A key glints in the dust.', map: 'A rolled-up map.', compass: 'A compass, still ticking.' };
      return sheet(
        taken ? 'Nothing left here.' : names[kind],
        taken ? [] : [act('Take it', () => pickUp(kind, room, ctx))]
      );
    }

    case 'monster':
    case 'miniboss':
    case 'boss': {
      if (system.isRoomCleared(ctx.templeId, ctx.level, ctx.position)) {
        return sheet(
          'Nothing left here but the smell.',
          spent(ctx, 'search')
            ? []
            : [act('Search the room', () => hunt(ctx, 'search', 1 / 2, 2, 8, (gp) => `You found ${gp} GP in the mess.`, () => 'Nothing but the smell.'))]
        );
      }
      return sheet(kind === 'boss' ? 'A Powerful Boss appears!' : 'A Monster approaches!', [
        act('Fight', () => ({ intent: 'fight' })),
      ]);
    }

    case 'stairs-up':
      return sheet('Stairs lead up.', [act('Climb', () => climb(room, ctx, 'up'))]);
    case 'stairs-down':
      return sheet('Stairs lead down.', [act('Climb', () => climb(room, ctx, 'down'))]);

    case 'pit':
      return sheet('A hole in the floor. Mind your step.');

    case 'door':
      return sheet('A heavy door. Mind the lock.');

    case 'void':
    case 'wall':
      return sheet('Nothing but dark.');

    case 'secret': {
      const opened = spent(ctx, 'secret');
      return sheet(
        opened ? 'The chamber is bare now.' : 'A hidden chamber!',
        opened
          ? []
          : [
              act('Open the chest', () => {
                rememberOnce(roomKey(ctx, 'secret'));
                const gp = earnGold(ctx.userId, Number(room.content?.gold) || 20);
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

// --- effects too long for the table ----------------------------------------------------------------

const GATE_REWARD = { xp: 150, gp: 50, ap: 3 };

/** Open the temple's gate: mark the temple cleared for this hero, pay the reward, send them home. */
const openGate = (room: Room, ctx: RoomContext): RoomOutcome => {
  const system = temples();
  if (system.isTempleCleared(ctx.templeId)) return { intent: 'leave', sound: SFX.yes };

  const authored = room.content?.reward ?? {};
  const reward = {
    xp: Number(authored.xp ?? room.content?.xp ?? GATE_REWARD.xp),
    gp: Number(authored.gp ?? room.content?.gp ?? GATE_REWARD.gp),
    ap: Number(authored.ap ?? room.content?.ap ?? GATE_REWARD.ap),
  };

  system.markTempleCleared(ctx.templeId);
  const store = useUserStore();
  let levelUp = false;
  if (reward.xp > 0) {
    levelUp = store.updateUserXP({ userId: ctx.userId, amount: reward.xp, commit: true }).didLevelUp;
    store.updateClassXp(ctx.userId, store.getUserById(ctx.userId)?.jobClass || 'default', reward.xp);
  }
  const paidGp = reward.gp > 0 ? earnGold(ctx.userId, reward.gp) : 0;
  if (reward.ap > 0) store.recordAPGain({ userId: ctx.userId, amount: reward.ap, source: `temple:${ctx.templeId}` });

  return {
    message: `The gate swings wide. Temple cleared! +${reward.xp} XP, +${paidGp} GP, +${reward.ap} AP${levelUp ? '. Level up!' : ''}`,
    sound: SFX.secret,
    intent: 'leave',
  };
};

/** A key, map or compass lying in a room of its own. */
const pickUp = (kind: string, room: Room, ctx: RoomContext): RoomOutcome => {
  const system = temples();
  if (!rememberOnce(roomKey(ctx, 'pickup'))) return { message: 'Nothing left here.' };

  if (kind === 'map') {
    const state = system.getTempleState(ctx.templeId);
    if (state) state.hasMap = true;
    system.saveProgress(ctx.templeId);
    return { message: 'You take the map.', sound: SFX.takeItem };
  }
  if (kind === 'compass') {
    const state = system.getTempleState(ctx.templeId);
    if (state) state.hasCompass = true;
    system.saveProgress(ctx.templeId);
    return { message: 'You take the compass.', sound: SFX.takeItem };
  }

  const name = String(room.content?.keyName ?? 'a small key');
  if (room.content?.keyId === 'master') {
    system.grantMasterKey(ctx.templeId);
    return { message: `${name}: the master key is yours.`, sound: SFX.takeItem };
  }
  system.addKey(ctx.templeId);
  return { message: `You take ${name}.`, sound: SFX.takeItem };
};

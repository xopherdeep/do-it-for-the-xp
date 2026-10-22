/**
 * Item use: what tapping an equipped item does inside a temple.
 *
 * The dungeon footer shows what the hero holds in each hand (by name) and hands a tap to `useItem`.
 * Like RoomInteractions it never touches the screen: it changes the Pinia user store and the
 * TempleSystem and answers with a RoomOutcome (toast, sound, shake) for TempleGrounds to show.
 *
 * Items live on the profile as plain copies (no functions), so an item is recognised by its icon, or its
 * name, against the live catalog from useEquipmentItems(), which is also where a navigation item's `click` is.
 * What a tool does here is its rule's `temple` use (ItemRules), by name; a tool without one is for fights.
 *
 * Rule zero: no tool completes a chore. A temple use opens the way (a door, a map, a seal, a riddle), nothing more.
 */
import { DungeonManager } from '@/lib/engine/core/dungeons/DungeonManager';
import { TempleSystem } from '@/lib/engine/core/dungeons/TempleSystem';
import { isBarrierKind } from '@/lib/engine/core/dungeons/templeSystem/doors';
import { canEnter } from '@/lib/engine/core/dungeons/templeSystem/floors';
import type { Room } from '@/lib/engine/core/dungeons/types';
import type { EquipmentItem } from '@/app/Console/MyPortal/UserHud/components/equipment/EquipmentItems';
import { useUserStore } from '@/lib/store/stores/user';
import { inventoryOf, type InventoryEntry } from '@/lib/services/inventory/Inventory';
import { canCarry } from '@/lib/services/inventory/Storage';
import { itemRule, type TempleUseId } from '@/lib/services/items/ItemRules';
import { heroMpBill } from '@/lib/services/stats/StatEffects';
import { isQuestRoom } from './questRooms';
import {
  DIRECTIONS,
  SFX,
  hasHappened,
  isPuzzleSolved,
  readPoints,
  rememberOnce,
  roomKey,
  roomKind,
  type Direction,
  type Exits,
  type RoomContext,
  type RoomOutcome,
} from './RoomInteractions';

export interface ItemUseContext extends RoomContext {
  /** The room the hero stands in */
  room: Room;
  /** What lies on each side of it (see readExits) */
  exits: Exits;
  /** The side the hero tapped, when the tap named one: a Bomb tries it first */
  side?: Direction;
  /** The live item definitions: the stored copy of an item has no `click` */
  catalog: EquipmentItem[];
}

export interface ItemOutcome extends RoomOutcome {
  /** A navigation item ran its click: the hero is leaving the temple screen */
  navigated?: boolean;
  /** A Bomb blew this side's cracked wall open: the cracked wall's sheet plays the crumble before it hands back */
  blownSide?: Direction;
}

/** The footer shows names this long at most. */
export const HAND_NAME_MAX = 12;

/** "Thor's Hammer" -> "Thor's Hamm…": names fit the little hand slots. */
export const shortItemName = (name: string, max: number = HAND_NAME_MAX): string =>
  name.length <= max ? name : `${name.slice(0, max - 1).trimEnd()}…`;

/** What a hand slot says: the item's name when something is equipped, otherwise "Left" or "Right". */
export const handLabel = (item: { name?: string } | null | undefined, side: 'Left' | 'Right'): string =>
  item?.name ? shortItemName(item.name) : side;

const PORTAL_HOME = 'Portal Home';
const NAVIGATION_ITEMS = ['My Quests', 'Book Of Spells', 'Goods', 'Wallet', PORTAL_HOME];
/** The Pegasus gifts: their click works on any screen (a menu style, the Pegasus modal) and the hero stays here */
const PEGASUS_ITEMS = ['Pegasus Boots', 'Wind Whistle'];

/** "25MP | A precise arrow..." -> 25 */
const leadingMpCost = (desc: unknown): number | undefined => {
  const match = typeof desc === 'string' ? desc.match(/^\s*(\d+)\s*MP\b/i) : null;
  return match ? Number(match[1]) : undefined;
};

/** The catalog entry for a stored item: by icon first, then by name. */
const definitionOf = (item: Partial<EquipmentItem>, catalog: EquipmentItem[]): EquipmentItem | undefined =>
  catalog.find((entry) => item.faIcon && entry.faIcon === item.faIcon) ??
  catalog.find((entry) => item.name && entry.name === item.name);

/**
 * What using the item costs in MP: the rules table by name, even when it says 0 (an old stored copy's description
 * is ignored), else the number a description starts with, else nothing.
 */
export const mpCostOf = (item: Partial<EquipmentItem>, definition?: EquipmentItem): number =>
  itemRule(definition?.name ?? item.name)?.mp ?? leadingMpCost(item.desc) ?? leadingMpCost(definition?.desc) ?? 0;

/** The Bombs with no Bomb in the pack, in a temple and in a fight alike. */
export const REASON_NO_BOMBS = 'Out of bombs.';

/** What the Bombs spend: the pack's Bomb stack (merged by inventoryOf), or null when the pack holds none. */
export const bombInPack = (userId: string): InventoryEntry | null =>
  inventoryOf(useUserStore().getUserById(userId)).find((entry) => entry.name === 'Bomb') ?? null;

/** Whether an item is the Bombs: the rules table gives it the blast (found as useItem finds it: by icon, then by name). */
export const isBombsItem = (item: Partial<EquipmentItem> | null | undefined, catalog: EquipmentItem[]): boolean =>
  Boolean(item) && itemRule(definitionOf(item as Partial<EquipmentItem>, catalog)?.name ?? item?.name)?.temple === 'blast-door';

const refuse = (message: string): ItemOutcome => ({ message, sound: SFX.error });

/** Not enough MP: the refusal, or null when the hero can pay. */
const shortOnMp = (ctx: ItemUseContext, cost: number): ItemOutcome | null =>
  cost > 0 && readPoints(ctx.userId, 'mp').now < cost ? refuse('Not enough MP') : null;

const spendMp = (ctx: ItemUseContext, cost: number): void => {
  const hasMpCost = cost > 0;
  if (hasMpCost) useUserStore().updateUserMP({ userId: ctx.userId, amount: -cost });
};

// --- the items -------------------------------------------------------------------------------------

/** A side the hero cannot go through now: a small lock, a wall or a cracked wall (the boss door has its own, and is not shut here) */
const isSideShut = (exit: Exits[Direction]): boolean => exit.locked || isBarrierKind(exit.kind);

const useLantern = (ctx: ItemUseContext, cost: number): ItemOutcome => {
  const system = TempleSystem.getInstance();
  const state = system.getTempleState(ctx.templeId);
  if (!state) return refuse('The lantern flickers. There is nothing to light here.');
  const knowsTheWay = state.hasMap && state.hasCompass;
  if (knowsTheWay) return { message: 'The lantern glows. You already know the way.' };

  const poor = shortOnMp(ctx, cost);
  if (poor) return poor;
  spendMp(ctx, cost);
  system.grantMapAndCompass(ctx.templeId);
  return { message: 'The lantern shows the way: map and compass revealed.', sound: SFX.secret };
};

/** What a spring bottles as: a 10 HP or 10 MP drink (BattlePotions), never the spring's full measure. */
const SPRING_WATERS: Record<string, string> = { health: 'Spring Water', mana: 'Silver Water' };

const useBottles = (ctx: ItemUseContext): ItemOutcome => {
  const water = SPRING_WATERS[roomKind(ctx.room)];
  const hasSpringToBottle = Boolean(water) && !hasHappened(roomKey(ctx, 'spring'));
  if (!hasSpringToBottle) return { message: 'No spring here to bottle.' };

  // The bag or nowhere (home storage is out of reach in a fight): a full bag leaves the spring as it was, for later
  const store = useUserStore();
  const bottle = { name: water, kind: 'consumable', qty: 1, source: ctx.templeId };
  const fitsInBag = canCarry(store.getUserById(ctx.userId), bottle) === 'bag';
  if (!fitsInBag) return refuse('Your bag is full.');
  store.addInventoryItem(ctx.userId, bottle);
  rememberOnce(roomKey(ctx, 'spring'));
  return { message: `You bottle the spring: ${water} is in your bag.`, sound: SFX.takeItem };
};

const useBombs = (ctx: ItemUseContext): ItemOutcome => {
  const bomb = bombInPack(ctx.userId);
  if (!bomb) return refuse(REASON_NO_BOMBS);

  const system = TempleSystem.getInstance();
  // A Bomb is for a cracked wall and nothing else: never a small lock, never the boss door (only the Boss Key). It opens a
  // side only when a room lies beyond it (a wall, a void or the edge of the floor is a Bomb wasted on a way that leads
  // nowhere), and only a side the temple's own doors call cracked, whatever the exits handed in say about it
  const isCrackedWithRoomBeyond = (direction: Direction): boolean =>
    canEnter(ctx.exits[direction].room) && system.doorKind(ctx.templeId, ctx.position, direction, ctx.level) === 'bombable';
  // The side the hero tapped first, then clockwise from north
  const side = [ctx.side, ...DIRECTIONS].find((direction) => direction && isCrackedWithRoomBeyond(direction));
  if (!side) return { message: 'Nothing to blow up here.' };

  // A fight's seal is not a door: no walking out of a battle through the wall
  const isSealedByFight = ctx.room.content?.lockOnEnter && !system.isRoomCleared(ctx.templeId, ctx.level, ctx.position);
  if (isSealedByFight) {
    return refuse('The seal holds. Bombs will not help until the fight is won.');
  }

  const isOpen = system.blowBombableSide(ctx.templeId, ctx.position, side, ctx.level);
  if (!isOpen) return { message: 'Nothing to blow up here.' };
  useUserStore().spendInventoryItem(ctx.userId, bomb.id);
  return { message: `Boom! The ${side} wall blows open.`, sound: SFX.damage, shake: true, blownSide: side };
};

/** Traps bite the moment the hero walks in, so the wand reaches into the rooms next door: every open side's live trap. */
const useIceWand = (ctx: ItemUseContext, cost: number): ItemOutcome => {
  const traps = DIRECTIONS.flatMap((direction) => {
    const near = ctx.exits[direction];
    const key = roomKey({ ...ctx, position: near.position }, 'trap');
    const isTrapNextDoor = !isSideShut(near) && roomKind(near.room) === 'trap';
    const isLiveTrapNextDoor = isTrapNextDoor && !hasHappened(key);
    return isLiveTrapNextDoor ? [key] : [];
  });
  const hasTrapNextDoor = traps.length > 0;
  if (!hasTrapNextDoor) return { message: 'No trap nearby to freeze.' };

  const poor = shortOnMp(ctx, cost);
  if (poor) return poor;
  spendMp(ctx, cost);
  // A frozen trap counts as sprung for the rest of the visit: no bite, no sheet (onEnterRoom)
  traps.forEach((key) => rememberOnce(key));
  return { message: 'Frost spreads into the next room: the trap is frozen.', sound: SFX.secret };
};

/**
 * Gaia's Quake: once a floor per visit, its secret rooms go on the map (TempleSystem.revealSecrets). Without the
 * map there is nothing to show them on, so it asks for the map first.
 */
const useQuake = (ctx: ItemUseContext, cost: number): ItemOutcome => {
  const system = TempleSystem.getInstance();
  const state = system.getTempleState(ctx.templeId);
  if (!state?.hasMap) return refuse("Find this temple's map first.");
  const isFloorShown = Boolean(state.revealedSecretFloors?.has(ctx.level));
  if (isFloorShown) return { message: 'Hidden rooms on this floor are already on your map.' };

  const poor = shortOnMp(ctx, cost);
  if (poor) return poor;
  const revealed = system.revealSecrets(ctx.templeId, ctx.level);
  if (!revealed) return { message: 'The ground shakes, but nothing is hidden on this floor.' };
  spendMp(ctx, cost);
  return { message: 'The ground shakes. Hidden rooms appear on your map.', sound: SFX.secret, shake: true };
};

/** Night's Light: the riddle of this room shows one wrong answer less every time it opens this visit (publicRiddle). */
const useNightsLight = (ctx: ItemUseContext, cost: number): ItemOutcome => {
  const isUnsolvedPuzzle = roomKind(ctx.room) === 'puzzle' && !isPuzzleSolved(ctx);
  if (!isUnsolvedPuzzle) return { message: 'No glyphs here to read.' };
  if (hasHappened(roomKey(ctx, 'moonlit'))) return { message: 'The moonlight already rests here.' };

  const poor = shortOnMp(ctx, cost);
  if (poor) return poor;
  spendMp(ctx, cost);
  rememberOnce(roomKey(ctx, 'moonlit'));
  return { message: 'Moonlight settles on the glyphs: one answer fades.' };
};

/** X's Invisibility: out of a free fight's sealed room without the fight. The beast stays unbeaten (TempleSystem.slipOut). */
const useInvisibility = (ctx: ItemUseContext, cost: number): ItemOutcome => {
  const system = TempleSystem.getInstance();
  const isUnbeatenFight = Boolean(ctx.room.content?.lockOnEnter) && !system.isRoomCleared(ctx.templeId, ctx.level, ctx.position);
  if (!isUnbeatenFight) return { message: 'Nothing here to slip past.' };
  // A quest's beast is the chore itself: no tool skips it
  if (isQuestRoom(ctx.room)) return refuse('This beast holds a quest. It sees you.');
  // Slipped already: the doors stand open until the hero walks back in, so there is nothing to pay for twice
  const isSealShut = DIRECTIONS.every((direction) => ctx.room.locked?.[direction]);
  if (!isSealShut) return { message: 'Nothing here to slip past.' };

  const poor = shortOnMp(ctx, cost);
  if (poor) return poor;
  spendMp(ctx, cost);
  system.slipOut(ctx.templeId, ctx.level, ctx.position);
  return { message: 'You slip away unseen. The doors open.' };
};

const HAZARDS = ['pit', 'void'];
const SOLID_GROUND_NOT = ['pit', 'void', 'wall', ''];

const useHookShot = (ctx: ItemUseContext, cost: number): ItemOutcome => {
  const manager = DungeonManager.getInstance();
  const system = TempleSystem.getInstance();
  const steps = { north: [-1, 0], east: [0, 1], south: [1, 0], west: [0, -1] } as const;

  for (const direction of DIRECTIONS) {
    const near = ctx.exits[direction];
    const hasNoHazardToCross = isSideShut(near) || !HAZARDS.includes(roomKind(near.room));
    if (hasNoHazardToCross) continue;

    const far: [number, number] = [near.position[0] + steps[direction][0], near.position[1] + steps[direction][1]];
    const beyond = manager.getRoom(ctx.templeId, far, ctx.level);
    const hasNoGroundBeyond = !beyond || SOLID_GROUND_NOT.includes(roomKind(beyond));
    if (hasNoGroundBeyond) continue;

    // The door on the far side of the hazard holds too: a small lock, or the boss door of the room beyond (only the Boss Key opens that)
    const isFarDoorShut = system.doorKind(ctx.templeId, near.position, direction, ctx.level) !== 'open';
    if (isFarDoorShut) continue;

    const poor = shortOnMp(ctx, cost);
    if (poor) return poor;
    // The hero lands beyond the hazard, and the landing is a step like any other: a guard room there seals. The room between is skipped
    const hasLanded = system.moveToPosition(ctx.templeId, far, direction);
    if (!hasLanded) continue;
    spendMp(ctx, cost);
    return { message: 'Thwip! You swing across to the other side.', sound: SFX.teleport, moved: true };
  }
  return { message: 'Nothing to latch onto.' };
};

/** Each temple use of the rules table (ItemRules `temple`), by id. */
const TEMPLE_USES: Record<TempleUseId, (ctx: ItemUseContext, cost: number) => ItemOutcome> = {
  'map-compass': useLantern,
  'bottle-spring': useBottles,
  'blast-door': useBombs,
  'reveal-secrets': useQuake,
  'cross-pit': useHookShot,
  'slip-out': useInvisibility,
  'freeze-trap': useIceWand,
  'moonlit-riddle': useNightsLight,
};

/**
 * Use an equipped item in a temple.
 * Navigation items and the Pegasus items run their click (Portal Home first sends the hero's run back to the entrance,
 * so the next visit starts there: TempleSystem.leaveByPortal); a tool does its rule's temple use (the Lantern, the Bottles,
 * the Bombs, Gaia's Quake, the Hook Shot, X's Invisibility, the Ice Wand, Night's Light) and anything else with a rule
 * is for fights. MP is charged only when the use works; the bill is the item's list price with the hero's class
 * discount (Mage 25%, Sage 50%) and trained intelligence taken.
 */
export const useItem = (item: Partial<EquipmentItem>, ctx: ItemUseContext): ItemOutcome => {
  const definition = definitionOf(item, ctx.catalog);
  const name = definition?.name ?? item.name ?? 'That';
  const cost = heroMpBill(mpCostOf(item, definition), useUserStore().getUserById(ctx.userId));

  const isNavigation = NAVIGATION_ITEMS.includes(name);
  const runsItsClick = isNavigation || PEGASUS_ITEMS.includes(name);
  if (runsItsClick) {
    const click = definition?.click;
    const isOutOfReach = typeof click !== 'function';
    if (isOutOfReach) return refuse(`${name} is out of reach right now.`);
    // The portal is the way out of a temple the hero is stuck in: they come back in through its entrance
    const isPortalHome = name === PORTAL_HOME;
    if (isPortalHome) void TempleSystem.getInstance().leaveByPortal(ctx.templeId);
    click.call(definition);
    return isNavigation ? { navigated: true } : {};
  }

  const rule = itemRule(name);
  if (!rule) return { message: `${name}: nothing happens here.` };

  const templeUse = rule.temple && TEMPLE_USES[rule.temple];
  return templeUse ? templeUse(ctx, cost) : { message: `${name} is for fights.` };
};

/**
 * Item use: what tapping an equipped item does inside a temple.
 *
 * The dungeon footer shows what the hero holds in each hand (by name) and hands a tap to `useItem`.
 * Like RoomInteractions it never touches the screen: it changes the Pinia user store and the
 * TempleSystem and answers with a RoomOutcome (toast, sound, shake) for TempleGrounds to show.
 *
 * Items live on the profile as plain copies (no functions), so an item is recognised by its icon, or its
 * name, against the live catalog from useEquipmentItems(), which is also where a navigation item's `click` is.
 */
import { DungeonManager } from '@/lib/engine/core/dungeons/DungeonManager';
import { TempleSystem } from '@/lib/engine/core/dungeons/TempleSystem';
import type { Room } from '@/lib/engine/core/dungeons/types';
import type { EquipmentItem } from '@/app/Console/MyPortal/UserHud/components/equipment/EquipmentItems';
import { useUserStore } from '@/lib/store/stores/user';
import { itemRule } from '@/lib/services/items/ItemRules';
import { heroMpBill } from '@/lib/services/stats/StatEffects';
import {
  DIRECTIONS,
  SFX,
  healHero,
  hasHappened,
  readPoints,
  rememberOnce,
  roomKind,
  templeKey,
  type Exits,
  type RoomContext,
  type RoomOutcome,
} from './RoomInteractions';

export interface ItemUseContext extends RoomContext {
  /** The room the hero stands in */
  room: Room;
  /** What lies on each side of it (see readExits) */
  exits: Exits;
  /** The live item definitions: the stored copy of an item has no `click` */
  catalog: EquipmentItem[];
}

export interface ItemOutcome extends RoomOutcome {
  /** A navigation item ran its click: the hero is leaving the temple screen */
  navigated?: boolean;
}

/** The footer shows names this long at most. */
export const HAND_NAME_MAX = 12;

/** "Thor's Hammer" -> "Thor's Hamm…": names fit the little hand slots. */
export const shortItemName = (name: string, max: number = HAND_NAME_MAX): string =>
  name.length <= max ? name : `${name.slice(0, max - 1).trimEnd()}…`;

/** What a hand slot says: the item's name when something is equipped, otherwise "Left" or "Right". */
export const handLabel = (item: { name?: string } | null | undefined, side: 'Left' | 'Right'): string =>
  item?.name ? shortItemName(item.name) : side;

const NAVIGATION_ITEMS = ['My Quests', 'Book Of Spells', 'Goods', 'Wallet', 'Portal Home'];
const BATTLE_ITEMS = ['Fire Wand', 'Ice Wand', "Sol's Flare", "Tesla's Bolt", "Gaia's Quake", "Thor's Hammer", 'Silver Arrow'];
const SOON_ITEMS = ['Pegasus Boots', 'Wind Whistle', "Chronos' Clock", "Night's Light", "Gale's Wind", "X's Invisibility"];

/** MP costs for items whose description does not name one. */
const DEFAULT_MP_COST: Record<string, number> = { Lantern: 10, Bombs: 15 };

/** "25MP | A precise arrow..." -> 25 */
const leadingMpCost = (desc: unknown): number | undefined => {
  const match = typeof desc === 'string' ? desc.match(/^\s*(\d+)\s*MP\b/i) : null;
  return match ? Number(match[1]) : undefined;
};

/** The item's description without its "25MP | " prefix. */
const plainDesc = (desc: unknown): string =>
  typeof desc === 'string' ? desc.replace(/^\s*\d+\s*(MP|HP)\s*\|\s*/i, '').trim() : '';

/** The catalog entry for a stored item: by icon first, then by name. */
const definitionOf = (item: Partial<EquipmentItem>, catalog: EquipmentItem[]): EquipmentItem | undefined =>
  catalog.find((entry) => item.faIcon && entry.faIcon === item.faIcon) ??
  catalog.find((entry) => item.name && entry.name === item.name);

/**
 * What using the item costs in MP: the rules table by name, even when it says 0 (an old stored copy's description
 * is ignored), else the number a description starts with, else the table above, else nothing.
 */
export const mpCostOf = (item: Partial<EquipmentItem>, definition?: EquipmentItem): number =>
  itemRule(definition?.name ?? item.name)?.mp ??
  leadingMpCost(item.desc) ??
  leadingMpCost(definition?.desc) ??
  DEFAULT_MP_COST[definition?.name ?? item.name ?? ''] ??
  0;

const refuse = (message: string): ItemOutcome => ({ message, sound: SFX.error });

/** Not enough MP: the refusal, or null when the hero can pay. */
const shortOnMp = (ctx: ItemUseContext, cost: number): ItemOutcome | null =>
  cost > 0 && readPoints(ctx.userId, 'mp').now < cost ? refuse('Not enough MP') : null;

const spendMp = (ctx: ItemUseContext, cost: number): void => {
  if (cost > 0) useUserStore().updateUserMP({ userId: ctx.userId, amount: -cost });
};

// --- the items -------------------------------------------------------------------------------------

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

const useBottles = (ctx: ItemUseContext): ItemOutcome => {
  const key = templeKey(ctx.userId, ctx.templeId, 'bottles');
  if (hasHappened(key)) return { message: 'Your bottles are empty.' };

  const { now, max } = readPoints(ctx.userId, 'hp');
  if (now >= max) return { message: 'No need for a swig. Your HP is full.' };

  rememberOnce(key);
  const gain = healHero(ctx.userId, Math.max(1, Math.round(max * 0.25)));
  return { message: `You drink from the bottles: +${gain} HP`, sound: SFX.restoreHP };
};

const useBombs = (ctx: ItemUseContext, cost: number): ItemOutcome => {
  const system = TempleSystem.getInstance();
  const side = DIRECTIONS.find((direction) => ctx.exits[direction].locked);
  if (!side) return { message: 'Nothing to blow up here.' };

  // A fight's seal is not a door: no walking out of a battle through the wall
  const isSealedByFight = ctx.room.content?.lockOnEnter && !system.isRoomCleared(ctx.templeId, ctx.level, ctx.position);
  if (isSealedByFight) {
    return refuse('The seal holds. Bombs will not help until the fight is won.');
  }

  const poor = shortOnMp(ctx, cost);
  if (poor) return poor;
  if (!system.openDoorSide(ctx.templeId, ctx.position, side, ctx.level)) return { message: 'Nothing to blow up here.' };
  spendMp(ctx, cost);
  return { message: `Boom! The ${side} door blows open.`, sound: SFX.damage, shake: true };
};

const HAZARDS = ['pit', 'void'];
const SOLID_GROUND_NOT = ['pit', 'void', 'wall', ''];

const useHookShot = (ctx: ItemUseContext, cost: number): ItemOutcome => {
  const manager = DungeonManager.getInstance();
  const system = TempleSystem.getInstance();
  const steps = { north: [-1, 0], east: [0, 1], south: [1, 0], west: [0, -1] } as const;

  for (const direction of DIRECTIONS) {
    const near = ctx.exits[direction];
    const hasNoHazardToCross = near.locked || !HAZARDS.includes(roomKind(near.room));
    if (hasNoHazardToCross) continue;

    const far: [number, number] = [near.position[0] + steps[direction][0], near.position[1] + steps[direction][1]];
    const beyond = manager.getRoom(ctx.templeId, far, ctx.level);
    const hasNoGroundBeyond = !beyond || SOLID_GROUND_NOT.includes(roomKind(beyond));
    if (hasNoGroundBeyond) continue;

    const poor = shortOnMp(ctx, cost);
    if (poor) return poor;
    // The hero lands beyond the hazard; the room between is skipped
    if (!system.moveToPosition(ctx.templeId, far, direction)) continue;
    spendMp(ctx, cost);
    return { message: 'Thwip! You swing across to the other side.', sound: SFX.teleport, moved: true };
  }
  return { message: 'Nothing to latch onto.' };
};

/**
 * Use an equipped item in a temple.
 * Navigation items run their click; the Lantern, Bottles, Bombs and Hook Shot work in the dungeon;
 * the battle items point at the battle screen; the rest are still on their way. The MP bill is the
 * item's list price with the hero's class discount (Mage 25%, Sage 50%) and trained intelligence taken.
 */
export const useItem = (item: Partial<EquipmentItem>, ctx: ItemUseContext): ItemOutcome => {
  const definition = definitionOf(item, ctx.catalog);
  const name = definition?.name ?? item.name ?? 'That';
  const cost = heroMpBill(mpCostOf(item, definition), useUserStore().getUserById(ctx.userId));

  if (NAVIGATION_ITEMS.includes(name)) {
    if (typeof definition?.click !== 'function') return refuse(`${name} is out of reach right now.`);
    definition.click();
    return { navigated: true };
  }

  switch (name) {
    case 'Lantern':
      return useLantern(ctx, cost);
    case 'Bottles':
      return useBottles(ctx);
    case 'Bombs':
      return useBombs(ctx, cost);
    case 'Hook Shot':
      return useHookShot(ctx, cost);
  }

  if (BATTLE_ITEMS.includes(name)) return { message: `${name} wants a fight: use it in battle.` };

  if (SOON_ITEMS.includes(name)) {
    const desc = plainDesc(item.desc || definition?.desc);
    return { message: `${desc ? `${desc} ` : ''}(coming soon)` };
  }

  return { message: `${name}: nothing happens here.` };
};

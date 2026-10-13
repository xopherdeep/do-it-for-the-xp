import type { HeroLook } from '@/lib/hero-look/types';
import { addGrudgeMark, clearGrudgeMarks, marksFor } from '@/lib/services/battle/questGrudge';
import {
  canCarry,
  moveToBag,
  moveToStorage,
  rowsAfterTaking,
  storagePurchase,
  type BagAndStorage,
  type StoragePurchase
} from '@/lib/services/inventory/Storage';
import { isVoice, type Voice } from '@/lib/services/copy/voices';
import { classLevelsOf, isClassUnlocked } from '@/lib/services/stats/ClassPassives';
import type { GpPayload } from './types';

/** The hero's bag with a copy of `item` added at the end (a profile with no bag starts one). */
export function inventoryWithItem(user: any, item: unknown): any[] {
  return [...(Array.isArray(user.inventory) ? user.inventory : []), JSON.parse(JSON.stringify(item))];
}

/**
 * The bag after taking `qty` of one pack entry (an `Inventory` id, e.g. what a fight potion was) out of it: the
 * first rows that match count down by their `qty` / `quantity` and a row is dropped when it reaches 0.
 * Returns null, spending nothing, when the pack holds fewer than `qty`.
 */
export function inventoryAfterSpend(inventory: any[], entryId: string, qty: number): any[] | null {
  return rowsAfterTaking(inventory, entryId, qty);
}

/** The hero's item cooldowns with one item's ready time set (ISO), or cleared when `readyAt` is null. */
export function cooldownsWith(user: any, itemName: string, readyAt: string | null): Record<string, string> {
  const cooldowns: Record<string, string> = { ...(user.itemCooldowns || {}) };
  if (readyAt) cooldowns[itemName] = readyAt;
  else delete cooldowns[itemName];
  return cooldowns;
}

/** The hero's equipment with both hands replaced by plain copies of the given items. */
export function equipmentWith(user: any, equipment: { leftHand: any[]; rightHand: any[] }) {
  const plain = (items: any[]) => items.map((item) => JSON.parse(JSON.stringify(item)));
  return { ...(user.equipment || {}), leftHand: plain(equipment.leftHand), rightHand: plain(equipment.rightHand) };
}

/** The hero's storage (`user.storage`, the same raw shape as the bag) with a copy of `item` added at the end. */
export function storageWithItem(user: any, item: unknown): any[] {
  return [...(Array.isArray(user.storage) ? user.storage : []), JSON.parse(JSON.stringify(item))];
}

/** What the profile setters need from the store: its state, its save and the GP move the Gold Bank charges through. */
export interface ProfileFieldsDeps {
  users: Record<string, any>;
  currentUser: { id: string | null };
  persistUser: (userId: string) => void;
  syncCurrentUser: (userData: any) => void;
  /** The store's updateUserGP: the wallet moves before its first await, the save is not waited for. */
  updateUserGP: (payload: GpPayload) => unknown;
}

/** What buying a storage tier did: the sale (tier, slots, price), or why not. `hero` means there is no such hero. */
export type StorageBuyResult = StoragePurchase | { ok: false; reason: 'hero' };

/**
 * The store's setters for the plain fields of a profile (bag, cooldowns, bench rest, quest effects, unlocked
 * items, hands, look, class, grudge marks). The state they edit stays in the store; they get it through `deps`.
 */
export function createProfileSetters(deps: ProfileFieldsDeps) {
  const { users, currentUser, persistUser, syncCurrentUser, updateUserGP } = deps;

  /**
   * Put an item with the hero: in the bag, or in storage when the bag has no room for a new stack and storage is bought
   * (Storage.ts canCarry). Kept on the profile (and so in ProfileDb). Returns false, adding nothing, when there is no such
   * hero or both are full: the caller checks first (canCarry) so it never takes GP or empties a chest for nothing.
   */
  function addInventoryItem(userId: string, item: { name: string, source?: string, [key: string]: any }): boolean {
    const user = users[userId];
    if (!user) return false;
    const place = canCarry(user, item);
    if (!place) return false;
    if (place === 'storage') user.storage = storageWithItem(user, item);
    else user.inventory = inventoryWithItem(user, item);
    if (currentUser.id === userId) syncCurrentUser(user);
    persistUser(userId);
    return true;
  }

  /**
   * Take `qty` of one pack entry (an `Inventory` id, e.g. what a fight potion was) out of the hero's bag: the first
   * rows that match count down by their `qty` / `quantity` and a row is dropped when it reaches 0. Spends nothing and
   * returns false when there is no such hero or the pack holds fewer than `qty`.
   */
  function spendInventoryItem(userId: string, entryId: string, qty = 1): boolean {
    const user = users[userId];
    const hasNothingToSpend = !user || !Array.isArray(user.inventory) || !(qty >= 1);
    if (hasNothingToSpend) return false;
    const next = inventoryAfterSpend(user.inventory, entryId, qty);
    if (!next) return false;
    user.inventory = next;
    if (currentUser.id === userId) syncCurrentUser(user);
    persistUser(userId);
    return true;
  }

  /** Save the bag and the storage a move handed back. */
  function saveMove(userId: string, user: any, moved: BagAndStorage) {
    user.inventory = moved.inventory;
    user.storage = moved.storage;
    if (currentUser.id === userId) syncCurrentUser(user);
    persistUser(userId);
  }

  /**
   * Move `qty` of a bag stack (all of it when `qty` is left out) into the hero's storage. Moves nothing and returns false
   * when there is no such hero or stack, `qty` is more than the stack holds, it is a key item, storage is locked, or it
   * is full (Storage.ts moveToStorage).
   */
  function storeItem(userId: string, entryId: string, qty?: number): boolean {
    const user = users[userId];
    if (!user) return false;
    const moved = moveToStorage(user, entryId, qty);
    if (!moved) return false;
    saveMove(userId, user, moved);
    return true;
  }

  /**
   * Move `qty` of a stored stack (all of it when `qty` is left out) back into the hero's bag. Moves nothing and returns
   * false when there is no such hero or stack, `qty` is more than the stack holds, or the bag has no room for it
   * (Storage.ts moveToBag).
   */
  function takeItem(userId: string, entryId: string, qty?: number): boolean {
    const user = users[userId];
    if (!user) return false;
    const moved = moveToBag(user, entryId, qty);
    if (!moved) return false;
    saveMove(userId, user, moved);
    return true;
  }

  /**
   * Buy the next storage tier at the Gold Bank, paid from the WALLET. With `useSavings` the rest of a price the wallet
   * cannot cover comes out of the savings (the bank offers that); without it savings are never touched. Charges nothing
   * and returns `{ ok: false, reason }` when the money is short (`gp`: `short` GP missing from the wallet, `canTopUp` when
   * savings would cover it, `shortAll` still missing with them), the hero holds the biggest storage (`max`) or there is no
   * such hero (`hero`); otherwise `{ ok: true, tier, slots, price, fromWallet, fromSavings }`.
   */
  function buyStorageTier(userId: string, useSavings = false): StorageBuyResult {
    const user = users[userId];
    if (!user) return { ok: false, reason: 'hero' };
    const purse = user.stats?.gp;
    const sale = storagePurchase(user, Number(purse?.wallet) || 0, Number(purse?.savings) || 0, useSavings);
    if (!sale.ok) return sale;
    // The purse moves before updateUserGP's first await; the save is not waited for
    void updateUserGP({ userId, wallet: -sale.fromWallet, ...(sale.fromSavings ? { savings: -sale.fromSavings } : {}) });
    user.storageTier = sale.tier;
    if (currentUser.id === userId) syncCurrentUser(user);
    persistUser(userId);
    return sale;
  }

  /**
   * When an item is ready again (ISO), or null to clear it. Kept on the profile as `itemCooldowns[name]`. Nothing
   * sets a cooldown now that items are in-game only (equipment rules, 2026-10-13); old saves may still hold some.
   */
  function setItemCooldown(userId: string, itemName: string, readyAt: string | null) {
    const user = users[userId];
    if (!user) return;
    user.itemCooldowns = cooldownsWith(user, itemName, readyAt);
    if (currentUser.id === userId) syncCurrentUser(user);
    persistUser(userId);
  }

  /** Stamp the hero's last free nap on the Hospital bench (ISO), so the bench is once a day. */
  function setBenchRestAt(userId: string, benchRestAt: string | null) {
    const user = users[userId];
    if (!user) return;
    user.benchRestAt = benchRestAt;
    if (currentUser.id === userId) syncCurrentUser(user);
    persistUser(userId);
  }

  /** Stamp the hero's last night in their own bed (ISO), so the home bed is once a day. */
  function setBedRestAt(userId: string, bedRestAt: string | null) {
    const user = users[userId];
    if (!user) return;
    user.bedRestAt = bedRestAt;
    if (currentUser.id === userId) syncCurrentUser(user);
    persistUser(userId);
  }

  /**
   * What the hero's real-life Powers did to their quest board: extra time, snoozes, a quiet day, a trusted hour
   * (HeroQuestEffects, written by services/abilities/PowerBoardEffects.ts). Old saves may still hold a pull-in, a
   * pause or a day off an item once wrote; they stay readable and run out. Replaces the whole record; the board
   * reads it back.
   */
  function setQuestEffects(userId: string, effects: object) {
    const user = users[userId];
    if (!user) return;
    user.questEffects = JSON.parse(JSON.stringify(effects));
    if (currentUser.id === userId) syncCurrentUser(user);
    persistUser(userId);
  }

  /**
   * Unlock an equipment item by name (a temple chest, a shop, a Pegasus). A profile with no `unlockedItems`
   * list predates the locks and already holds everything, so it is left alone rather than given a list of one.
   * Returns true when the item was newly unlocked.
   */
  function unlockItem(userId: string, itemName: string): boolean {
    const user = users[userId];
    const hasNoUnlockList = !user || !Array.isArray(user.unlockedItems);
    if (hasNoUnlockList) return false;
    if (user.unlockedItems.includes(itemName)) return false;
    user.unlockedItems = [...user.unlockedItems, itemName];
    if (currentUser.id === userId) syncCurrentUser(user);
    persistUser(userId);
    return true;
  }

  /**
   * What the hero holds in each hand. Stored on the profile (and so in ProfileDb) as plain item data,
   * so the temple footer, the quick-draw slots and the equipment screen all read the same thing.
   */
  function setEquipment(userId: string, equipment: { leftHand: any[]; rightHand: any[] }) {
    const user = users[userId];
    if (!user) return;
    user.equipment = equipmentWith(user, equipment);
    if (currentUser.id === userId) syncCurrentUser(user);
    persistUser(userId);
  }

  /**
   * The hero's voxel look. Stored on the profile (and so in ProfileDb); `avatarImage`, a PNG data URL
   * of the rendered look, replaces the avatar SVG everywhere a hero is shown. Leaving it out keeps the
   * snapshot already saved.
   */
  function setLook(userId: string, look: HeroLook, avatarImage?: string) {
    const user = users[userId];
    if (!user) return;
    user.look = JSON.parse(JSON.stringify(look));
    if (avatarImage) user.avatarImage = avatarImage;
    if (currentUser.id === userId) syncCurrentUser(user);
    persistUser(userId);
  }

  /**
   * Change the hero's class (the Class Codex). A sealed tier-2 class is refused, so the profile can only
   * ever hold a class the hero has earned. Returns whether the class changed hands.
   */
  function setJobClass(userId: string, jobClass: string): boolean {
    const user = users[userId];
    const hasNoClassToSet = !user || !jobClass;
    if (hasNoClassToSet) return false;
    if (!isClassUnlocked(jobClass, classLevelsOf(user.stats?.classes))) return false;
    user.jobClass = jobClass;
    if (currentUser.id === userId) syncCurrentUser(user);
    persistUser(userId);
    return true;
  }

  /**
   * The hero ran from a fight that carries this quest: one more grudge mark on its beast, three at the most
   * (docs/Quest-Rooms-Spec.md 5.7). Kept on the profile as `questGrudges[questId]` (and so in ProfileDb); each hero's
   * grudge is their own. Returns the marks the beast holds now, or 0 when there is no such hero or quest.
   */
  function addQuestGrudge(userId: string, questId: string, nowMs: number = Date.now()): number {
    const user = users[userId];
    const hasNobodyToMark = !user || !questId;
    if (hasNobodyToMark) return 0;
    user.questGrudges = addGrudgeMark(user.questGrudges, questId, nowMs);
    if (currentUser.id === userId) syncCurrentUser(user);
    persistUser(userId);
    return marksFor(user.questGrudges, questId);
  }

  /**
   * The quest was done: its grudge marks are gone (5.7). Writes nothing when the hero held none for it. Returns whether
   * any were cleared.
   */
  function clearQuestGrudge(userId: string, questId: string): boolean {
    const user = users[userId];
    const hadNoMarks = !user || marksFor(user.questGrudges, questId) === 0;
    if (hadNoMarks) return false;
    user.questGrudges = clearGrudgeMarks(user.questGrudges, questId);
    if (currentUser.id === userId) syncCurrentUser(user);
    persistUser(userId);
    return true;
  }

  /**
   * Replace the hero's whole grudge record (what the ambush rule hands back after it stamps a quest, spec 5.9). Marks come
   * and go through addQuestGrudge / clearQuestGrudge; this is for the rules that rebuild the record in one piece.
   */
  function setQuestGrudges(userId: string, questGrudges: object) {
    const user = users[userId];
    if (!user) return;
    user.questGrudges = JSON.parse(JSON.stringify(questGrudges));
    if (currentUser.id === userId) syncCurrentUser(user);
    persistUser(userId);
  }

  /**
   * The hero's "Text style" (the voice their screens read in, services/copy/voices.ts): one of the three voices, or null
   * for Auto, where the birthday decides. Returns false, changing nothing, when there is no such hero or the voice is
   * not one of the three.
   */
  function setVoice(userId: string, voice: Voice | null): boolean {
    const user = users[userId];
    const isUnknownChoice = !user || (voice !== null && !isVoice(voice));
    if (isUnknownChoice) return false;
    // Auto clears the field to undefined (not deleted) so syncCurrentUser's assign clears it on currentUser too
    user.voice = voice === null ? undefined : voice;
    const isCurrentHero = currentUser.id === userId;
    if (isCurrentHero) syncCurrentUser(user);
    persistUser(userId);
    return true;
  }

  /** Whether the simple voice reads lines aloud on its own for this hero (the speaker button always works). */
  function setAutoRead(userId: string, autoRead: boolean) {
    const user = users[userId];
    const hasNoHero = !user;
    if (hasNoHero) return;
    user.autoRead = autoRead === true;
    const isCurrentHero = currentUser.id === userId;
    if (isCurrentHero) syncCurrentUser(user);
    persistUser(userId);
  }

  return {
    addInventoryItem,
    spendInventoryItem,
    storeItem,
    takeItem,
    buyStorageTier,
    setItemCooldown,
    setBenchRestAt,
    setBedRestAt,
    setQuestEffects,
    unlockItem,
    setEquipment,
    setLook,
    setJobClass,
    addQuestGrudge,
    clearQuestGrudge,
    setQuestGrudges,
    setVoice,
    setAutoRead
  };
}

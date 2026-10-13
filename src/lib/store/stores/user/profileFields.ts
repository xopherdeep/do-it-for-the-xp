import type { HeroLook } from '@/lib/hero-look/types';
import { addGrudgeMark, clearGrudgeMarks, marksFor } from '@/lib/services/battle/questGrudge';
import { toEntry } from '@/lib/services/inventory/Inventory';
import { classLevelsOf, isClassUnlocked } from '@/lib/services/stats/ClassPassives';

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
  const entries = inventory.map((row: unknown) => toEntry(row));
  const held = entries.reduce((sum: number, entry: { id: string, qty: number } | null) => (entry?.id === entryId ? sum + entry.qty : sum), 0);
  if (held < qty) return null;

  let left = qty;
  const next: any[] = [];
  inventory.forEach((row: any, index: number) => {
    const entry = entries[index];
    const shouldKeepRow = left <= 0 || entry?.id !== entryId;
    if (shouldKeepRow) {
      next.push(row);
      return;
    }
    const taken = Math.min(left, entry.qty);
    left -= taken;
    if (entry.qty > taken) {
      const key = row.qty == null && row.quantity != null ? 'quantity' : 'qty';
      next.push({ ...row, [key]: entry.qty - taken });
    }
  });
  return next;
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

/** What the profile setters need from the store: its state and its save. */
export interface ProfileFieldsDeps {
  users: Record<string, any>;
  currentUser: { id: string | null };
  persistUser: (userId: string) => void;
  syncCurrentUser: (userData: any) => void;
}

/**
 * The store's setters for the plain fields of a profile (bag, cooldowns, bench rest, quest effects, unlocked
 * items, hands, look, class, grudge marks). The state they edit stays in the store; they get it through `deps`.
 */
export function createProfileSetters(deps: ProfileFieldsDeps) {
  const { users, currentUser, persistUser, syncCurrentUser } = deps;

  /**
   * Put an item in the hero's bag, e.g. what a temple shop sold. Kept on the profile (and so in ProfileDb).
   * Returns false when there is no such hero.
   */
  function addInventoryItem(userId: string, item: { name: string, source?: string, [key: string]: any }): boolean {
    const user = users[userId];
    if (!user) return false;
    user.inventory = inventoryWithItem(user, item);
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

  /**
   * When an equipped item is ready again on the board (ISO), or null to clear it. Kept on the profile as
   * `itemCooldowns[name]` (see services/quests/ItemEffects.ts).
   */
  function setItemCooldown(userId: string, itemName: string, readyAt: string | null) {
    const user = users[userId];
    if (!user) return;
    user.itemCooldowns = cooldownsWith(user, itemName, readyAt);
    if (currentUser.id === userId) syncCurrentUser(user);
    persistUser(userId);
  }

  /**
   * What the hero's items did to their quest board: extensions, snoozes, pull-ins, a pause, the cloak
   * (HeroQuestEffects). Replaces the whole record; the board reads it back.
   */
  /** Stamp the hero's last free nap on the Hospital bench (ISO), so the bench is once a day. */
  function setBenchRestAt(userId: string, benchRestAt: string | null) {
    const user = users[userId];
    if (!user) return;
    user.benchRestAt = benchRestAt;
    if (currentUser.id === userId) syncCurrentUser(user);
    persistUser(userId);
  }

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

  return {
    addInventoryItem,
    spendInventoryItem,
    setItemCooldown,
    setBenchRestAt,
    setQuestEffects,
    unlockItem,
    setEquipment,
    setLook,
    setJobClass,
    addQuestGrudge,
    clearQuestGrudge,
    setQuestGrudges
  };
}

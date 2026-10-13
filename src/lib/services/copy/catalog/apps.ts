/**
 * The in-game phone apps' empty states and toasts: Beast Log (quests), Goods, Powers, Workbench, Storage, Kitchen and
 * Calendar. App, tab and item names stay the same in every voice. A voice that reads the same as adventure is left
 * out: the adventure line is the fallback.
 */
import type { CopyCatalog } from "../voices";

export const apps = {
  // ---- Beast Log ------------------------------------------------------------------------------------------------
  "quests.empty.search": {
    simple: "No quest has that name.",
    adventure: "No quest answers to that name.",
    classic: "No quests match.",
  },
  "quests.empty.list": {
    simple: "No quests yet. Tap the dragon.",
    adventure: "Nothing on the list. Tap the dragon to add a quest.",
    classic: "List empty. Tap the dragon to add a quest.",
  },
  "quests.empty.board": {
    simple: "No quests today. All calm!",
    adventure: "No quests on the board. The realm is calm.",
    classic: "No quests on the board.",
  },
  "quests.done.approvalNote": {
    simple: "The Game Master must check it first.",
    adventure: "The Game Master must approve this one; the loot waits.",
    classic: "Requires Game Master approval. Rewards are held.",
  },
  "quests.done.sendButton": {
    simple: "Done, ask the Game Master",
    adventure: "Done, send for approval",
    classic: "Done, submit for approval",
  },
  "quests.done.button": {
    simple: "Done!",
    adventure: "Done!",
    classic: "Done",
  },
  "quests.done.notYet": {
    adventure: "Not yet",
  },
  "quests.toast.pending": {
    simple: "Waiting for the Game Master",
    adventure: "Pending the Game Master",
    classic: "Awaiting Game Master approval",
  },
  "quests.toast.pendingBody": {
    simple: "{nick} finished {quest}.",
    adventure: "{nick} sent {quest} for approval.",
    classic: "{nick} submitted {quest}.",
  },
  "quests.toast.taskPosted": {
    simple: "Task added!",
    adventure: "Task posted",
    classic: "Task posted.",
  },

  // ---- Goods ----------------------------------------------------------------------------------------------------
  "goods.empty.all": {
    simple: "Your pack is empty.",
    adventure: "Your pack is empty. Shops and chests fill it.",
    classic: "Pack empty. Shops and chests supply items.",
  },
  "goods.empty.consumable": {
    simple: "No potions yet.",
    adventure: "No potions in your pack. Temple shops brew them.",
    classic: "No potions. Temple shops sell them.",
  },
  "goods.empty.key": {
    simple: "No keys yet.",
    adventure: "No keys in your pack. Look under the chests.",
    classic: "No keys. Chests may hold them.",
  },
  "goods.empty.material": {
    simple: "No materials yet.",
    adventure: "No materials in your pack. Crafting starts with a find.",
    classic: "No materials. Crafting requires finds.",
  },
  "goods.empty.misc": {
    simple: "No tools yet.",
    adventure: "No special tools in your pack. The world is full of oddities.",
    classic: "No tools in the pack.",
  },
  "goods.toast.storageFull": {
    simple: "Storage is full. Make room at home.",
    adventure: "Your storage is full. Make room at home first.",
    classic: "Storage full. Make room at home first.",
  },

  // ---- Powers ---------------------------------------------------------------------------------------------------
  "powers.empty.none": {
    simple: "No Powers yet. Ask the Game Master.",
    adventure: "No Powers yet. Ask your Game Master to add some.",
    classic: "No Powers. The Game Master can add some.",
  },
  "powers.empty.filter": {
    simple: "No Powers here. Try another tab.",
    adventure: "No Powers match. Try another tab.",
    classic: "No matching Powers.",
  },
  "powers.toast.cast": {
    simple: "You cast {name}!",
    adventure: "Cast! {name}",
    classic: "{name} cast.",
  },

  // ---- Workbench ------------------------------------------------------------------------------------------------
  "workbench.empty.search": {
    simple: "Nothing matches your search.",
    adventure: "Nothing on the bench matches that search.",
    classic: "No matching items.",
  },
  "workbench.empty.bare": {
    simple: "The workbench is empty.",
    adventure: "The workbench is bare. Nothing to craft yet.",
    classic: "No craftable items.",
  },

  // ---- Storage --------------------------------------------------------------------------------------------------
  "storage.locked": {
    simple: "Storage is locked. Visit the bank.",
    adventure: "Storage is locked. Buy a storage box at the Gold Bank.",
    classic: "Storage locked. Purchase a box at the Gold Bank.",
  },
  "storage.keyNote": {
    simple: "Keys stay in your bag.",
    adventure: "Key items ride in your bag and never take a slot.",
    classic: "Key items stay in the bag and use no slot.",
  },
  "storage.bagFull": {
    simple: "Bag is full. Make room first.",
    adventure: "Your bag is full. Make room first.",
    classic: "Bag full. Make room first.",
  },
  "storage.empty.search": {
    simple: "Nothing matches your search.",
    adventure: "Nothing in storage matches that search.",
    classic: "No matching items.",
  },
  "storage.empty.shelf": {
    simple: "No {shelf} items here.",
    adventure: "No {shelf} items in storage.",
    classic: "No {shelf} items stored.",
  },
  "storage.empty.none": {
    simple: "Nothing stored yet.",
    adventure: "Nothing stored yet. Store items from My Goods.",
    classic: "Storage empty. Store items from My Goods.",
  },
  "storage.menu.header": {
    simple: "What do you want to do?",
    adventure: "What would you like to do...?",
    classic: "Select an action.",
  },

  // ---- Kitchen --------------------------------------------------------------------------------------------------
  "kitchen.empty.noFavorite": {
    simple: "Set your favorite food in your profile.",
    adventure: "You haven't set a favorite food in your profile!",
    classic: "No favorite food set in the profile.",
  },
  "kitchen.empty.none": {
    simple: "No food found.",
    adventure: "No food items found matching your criteria.",
    classic: "No matching food items.",
  },
  "kitchen.menu.sub": {
    simple: "Pick dinner or buy a treat.",
    adventure: "Pick the family's dinner with a Power, or spend your GP on a treat.",
    classic: "Choose dinner with a Power, or spend GP on a treat.",
  },

  // ---- Calendar -------------------------------------------------------------------------------------------------
  "calendar.empty.all": { adventure: "No chores today." },
  "calendar.empty.morning": { adventure: "No chores this morning." },
  "calendar.empty.noon": { adventure: "No chores this afternoon." },
  "calendar.empty.evening": { adventure: "No chores this evening." },
  "calendar.empty.night": { adventure: "No chores tonight." },
} satisfies CopyCatalog;

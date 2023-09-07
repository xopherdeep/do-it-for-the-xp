// Misc and Special Rooms
export const O__O = '0';  // Empty Room
export const SAVE = 'V';  // Save

// Navigation related
export const ____ = '_';  // Wall - can't pass through
export const _00_ = 'E';  // Entrance - start of labrynth
export const GATE = 'G';  // Gate - end of labrynth
export const TELE = 'Y';  // Teleport - to another teleport room

// Combat related
export const X__X = 'B';  // Boss Room - For achievements worth 13 
export const x__x = 'b';  // Mini Boss Room - For achievements worth 5-8 
export const Q__Q = 'S';  // Monster Room - For achievements worth 2-3 
export const q__q = 's';  // Monster Room - For achievements worth 1 

// Recovery and Resources
export const H__P = 'H';  // Healing Room - restores health
export const M__P = 'M';  // Mana Room - restores mana

// Dungeon Items
export const K___ = 'k';  // Key Room - key to unlock doors
export const MK__ = 'K';  // Master Key Room - unlocks Boss Room 

// Items and Collectibles
export const $__$ = 'O';  // Loot Room - for placing treasure chest
export const SHOP = 'P';  // Shop Room - for buying items

// Hazards and Challenges
export const _XX_ = 'T';  // Trap Room - For achievements worth 1
export const PUZL = 'Z';  // Puzzle Room - Solve puzzle for to unlock room type 

export const ROOM_ICONS = {
  boss: 'fa-dragon',               // Boss Room
  empty: 'fa-th',           // Empty Room
  entrance: 'fa-door-open',        // Entrance
  health: 'fa-heart',       // Healing Room
  key: 'fa-key',                   // Key Room
  lock: 'fa-lock',                 // Locked Door
  loot: 'fa-treasure-chest',           // Treasure Room
  mana: 'fa-flask-potion',           // Mana Room
  master: 'fa-crown',              // Master Room
  monster: 'fa-spider-black-widow',            // Monster Room
  puzzle: 'fa-puzzle-piece',       // Puzzle Room
  secret: 'fa-mask',               // Secret Room
  trap: 'fa-skull',                // Trap Room
  wall: 'fa-wind',              // Wall
  teleport: 'fa-transporter',
  shop: 'fa-store',

};

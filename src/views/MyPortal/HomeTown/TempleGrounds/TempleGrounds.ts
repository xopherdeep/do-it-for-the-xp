import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";

import { ROOM_ICONS, WALL, SHOP, ENTR, HLTH, MANA, MONS, LOOT, LOCK, EMPT, TELE, BOSS } from "@/dungeons/roomTypes";

export default defineComponent({
  props: ["userId"],
  name: "temple-grounds",
  mixins: [ionic],
  data() {
    const L001 = "LOO1";
    const L002 = "LOO2";
    const L003 = "LOO3";
    return {
      ROOM_ICONS,
      playerKeys: 0,
      maze: [
        [WALL, TELE, MONS, WALL, WALL, WALL],
        [WALL, WALL, MONS, WALL, BOSS, LOOT],
        [SHOP, MONS, L003, MONS, MONS, WALL],
        [WALL, MONS, MONS, L002, WALL, WALL],
        [WALL, WALL, MONS, WALL, WALL, WALL],
        [WALL, L001, ENTR, MONS, WALL, TELE],
      ],
      rooms: {
        [WALL]: { type: "wall" },
        [ENTR]: { type: "entrance", visited: true },
        [EMPT]: { type: "empty" },
        [HLTH]: { type: "health", content: { healthPoints: 10 } },
        [BOSS]: { type: "boss" },
        [MONS]: { type: "monster", content: { monsterType: "small" } },
        [TELE]: { type: "teleport" },
        [SHOP]: { type: "shop" },
        [LOCK]: { type: "lock" },
        [LOOT]: { type: "loot" },
        [L001]: { type: "loot", content: { item: "key" } },
        [L002]: { type: "loot", content: { item: "map" } },
        [L003]: { type: "loot", content: { item: "compass" } },
        // [LOOT]: {
        //   "5,1": { type: "loot", content: { item: "key" } },
        //   "2,2": { type: "loot", content: { item: "map" } },
        //   "3,3": { type: "loot", content: { item: "compass" } },
        // },
      },
      currentPosition: [5, 2] // [row, column]
    };
  },
  computed: {
    currentRoom() {
      const [row, col] = this.currentPosition;
      const roomKey = this.maze[row][col];
      return this.rooms[roomKey] || null;
    },
    canMoveUp() {
      const [row, col] = this.currentPosition;
      if (row <= 0) return false;
      return this.rooms[this.maze[row - 1][col]].type !== "wall";
    },
    canMoveDown() {
      const [row, col] = this.currentPosition;
      if (row >= this.maze.length - 1) return false;
      return this.rooms[this.maze[row + 1][col]].type !== "wall";
    },
    canMoveLeft() {
      const [row, col] = this.currentPosition;
      if (col <= 0) return false;
      return this.rooms[this.maze[row][col - 1]].type !== "wall";
    },
    canMoveRight() {
      const [row, col] = this.currentPosition;
      if (col >= this.maze[0].length - 1) return false;
      return this.rooms[this.maze[row][col + 1]].type !== "wall";
    }
  },

  methods: {
    getRoomClass(cell, visited) {
      if (!visited) {
        return 'fa-question'; // icon for unvisited rooms
      }
      return this.rooms[cell]?.type.toLowerCase() || 'empty';
    },
    move(direction: 'up' | 'down' | 'left' | 'right') {
      const [row, col] = this.currentPosition;
      let newRow = row, newCol = col;

      const currentRoom = this.rooms[this.maze[row][col]];

      switch (direction) {
        case 'up':
          if (row > 0 && !currentRoom.locked?.north) newRow = row - 1;
          break;
        case 'down':
          if (row < this.maze.length - 1 && !currentRoom.locked?.south) newRow = row + 1;
          break;
        case 'left':
          if (col > 0 && !currentRoom.locked?.west) newCol = col - 1;
          break;
        case 'right':
          if (col < this.maze[0].length - 1 && !currentRoom.locked?.east) newCol = col + 1;
          break;
      }

      const newRoomKey = this.maze[newRow][newCol];
      const newRoom = this.rooms[newRoomKey];

      if (newRoom.type !== 'wall') {
        this.currentPosition = [newRow, newCol];

        // Mark the room as visited
        newRoom.visited = true;

        // ... handle other room logic like picking up keys, etc.
      }
    },

    isDoorLocked(newRow, newCol) {
      const currentRoom = this.rooms[this.maze[this.currentPosition[0]][this.currentPosition[1]]];
      const direction = this.getDirection(newRow, newCol); // Assume you have a function to determine the direction ('north', 'south', etc.)

      // Check if the door in this direction is locked
      return currentRoom.locked && currentRoom.locked[direction];
    },
    unlockDoor(direction: 'north' | 'south' | 'east' | 'west') {
      const [row, col] = this.currentPosition;
      const currentRoom = this.rooms[this.maze[row][col]];

      if (currentRoom.locked && currentRoom.locked[direction]) {
        // Unlock the door if you have a key
        if (this.playerKeys > 0) {
          currentRoom.locked[direction] = false;
          this.playerKeys -= 1; // subtract a key
        }
      }
    },
    getDirection(newRow, newCol) {
      const [currentRow, currentCol] = this.currentPosition;

      if (newRow < currentRow) return 'north';
      if (newRow > currentRow) return 'south';
      if (newCol < currentCol) return 'west';
      if (newCol > currentCol) return 'east';
      return null; // shouldn't happen, or you could throw an error
    }



  }
})



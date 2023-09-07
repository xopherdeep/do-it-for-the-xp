import { defineComponent, ref } from "vue";
import ionic from "@/mixins/ionic";

import {
  ROOM_ICONS,
  _00_,
  O__O,
  K___,
  H__P,
  M__P,
  q__q,
  $__$,
  x__x,
  X__X,
  ____,
  SHOP,
  TELE,
} from "@/dungeons/roomTypes";
import { actionSheetController } from "@ionic/vue";

export default defineComponent({
  props: ["userId"],
  name: "temple-grounds",
  mixins: [ionic],
  data() {
    const LMAP = "LMAP";
    const LCOM = "LCOM";
    return {
      ROOM_ICONS,
      playerKeys: 0,
      maze: [
        [____, TELE, q__q, ____, ____, ____],
        [____, ____, q__q, ____, X__X, $__$],
        [SHOP, q__q, LCOM, q__q, q__q, ____],
        [____, q__q, q__q, LMAP, ____, $__$],
        [____, ____, q__q, ____, q__q, x__x],
        [____, K___, _00_, q__q, ____, TELE],
      ],
      rooms: {
        [____]: { type: "wall" },
        [_00_]: { type: "entrance", visited: true },
        [O__O]: { type: "empty" },
        [H__P]: { type: "health", content: { healthPoints: 10 } },
        [X__X]: { type: "boss" },
        [q__q]: { type: "monster", content: { monsterType: "small" } },
        [TELE]: { type: "teleport" },
        [SHOP]: { type: "shop" },
        [x__x]: { type: "miniboss" },
        [$__$]: { type: "loot", content: { item: 'random', quantity: 1, items: ["potion", "ether"] } },
        [K___]: { type: "loot", content: { item: "key" } },
        [LMAP]: { type: "loot", content: { item: "dungeon", dungeon: "map" } },
        [LCOM]: { type: "loot", content: { item: "dungeon", dungeon: "compass" } },
        // [LOOT]: {
        //   "5,1": { type: "loot", content: { item: "key" } },
        //   "2,2": { type: "loot", content: { item: "map" } },
        //   "3,3": { type: "loot", content: { item: "compass" } },
        // },
      },
      currentPosition: [5, 2] // [row, column] - default to entrance
    };
  },
  computed: {
    actionColor() {
      switch (this.currentRoom.type) {
        case "boss":
        case "monster":
          return "danger";
          break;
        case "loot":
          return "warning"
          break;
        case "entrance":
        case "shop":
        case "teleport":
          return "success"
          break;
        default:
          return "primary"

      }
    },
    roomActions() {
      const actions = {
        header: "What would you like to do?",
        buttons: [{
          text: "Leave Temple",
          // icon: heartHalfOutline,
          handler: () => {
            //
          }
        }]
      }
      switch (this.currentRoom.type) {

        case "loot":
          actions.buttons = [{
            text: "Open Chest",
            handler: () => {
              // handle loot
            }
          }]
          break;
        case "monster":
          actions.header = "A Monster approaches!"
          actions.buttons = [{
            text: "Fight",
            handler: () => {
              // ats
            }
          }]
          break;
        case "shop":
          actions.header = "Can I interest you in my wares?"
          actions.buttons = [{
            text: "View Wares",
            handler: () => {
              // handle shop
            }
          }]
          break;
        case "teleport":
          actions.header = "You found a teleport!"
          actions.buttons = [{
            text: "Teleport",
            handler: () => {
              // handle teleport
            }
          }]
          break;


      }
      return actions
    },
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
    },


  },

  methods: {
    clickFight() {
      alert()
    },
    async showRoomActions() {
      if (this.roomActions) {
        const actions = await actionSheetController.create(this.roomActions)
        actions.present();

      }
    },
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
      if (!this.currentPosition) return false;
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



  },

})



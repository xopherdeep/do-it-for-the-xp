import { defineComponent, ref } from "vue";
import ionic from "@/mixins/ionic";
import { alertController, toastController } from "@ionic/vue";

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
      hasMap: false,
      isMapOpen: false,
      hasCompass: false,
      maze: [
        [____, TELE, q__q, ____, ____, ____],
        [____, ____, q__q, ____, X__X, $__$],
        [SHOP, q__q, LCOM, q__q, x__x, ____],
        [____, q__q, q__q, LMAP, ____, $__$],
        [____, ____, q__q, ____, q__q, x__x],
        [____, K___, _00_, q__q, ____, TELE],
      ],
      rooms: {
        [____]: { type: "wall" },
        [_00_]: { type: "entrance", visited: true, locked: { north: true } },
        [O__O]: { type: "empty" },
        [H__P]: { type: "health", content: { healthPoints: 10 } },
        [X__X]: { type: "boss" },
        [q__q]: { type: "monster", content: { monsterType: "small" } },
        [TELE]: { type: "teleport" },
        [SHOP]: { type: "shop" },
        [x__x]: { type: "miniboss", locked: { north: true } },
        [$__$]: { type: "loot", content: { chest: 'random', quantity: 1, items: ["potion", "ether"] } },
        [K___]: { type: "loot", content: { chest: "dungeon", dungeon: "key" } },
        [LMAP]: { type: "loot", content: { chest: "dungeon", dungeon: "map" } },
        [LCOM]: { type: "loot", content: { chest: "dungeon", dungeon: "compass" } },
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
    chestContents() {
      const { content } = this.currentRoom
      if (content && typeof content.chest != undefined) {
        switch (content.chest) {
          case "loot":
            return content.items.map(item => ({
              name: item,
              type: 'checkbox',
              label: item,
              value: item,
              checked: false
            }))
            break;
          case "dungeon":
            return [{
              name: content.dungeon,
              type: 'checkbox',
              label: content.dungeon,
              value: content.dungeon,
              checked: false
            }]
            break;
          default:
            return [{
              name: "empty",
              type: 'checkbox',
              label: "empty",
              disabled: true,
              checked: false
            }]
        }
      }
      return {}
    },
    actionColor() {
      switch (this.currentRoom.type) {
        case "boss":
        case "monster":
          return "danger";
          break;
        case "loot":
          return this.currentRoom.content ? "warning" : "none";
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
      const {
        currentRoom,
        alertChestContents,
        alertEmptyChest
      } = this

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
      switch (currentRoom.type) {
        case "loot":
          actions.buttons = [{
            text: "Open Chest",
            handler: currentRoom.content
              ? alertChestContents
              : alertEmptyChest
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
    clickMap() {
      this.isMapOpen = true
    },
    dismissMap() {
      this.isMapOpen = false
    },
    // is row cell current room
    isCurrentRoom(row, col) {
      return this.currentPosition[0] === row && this.currentPosition[1] === col;
    },

    async alertChestContents() {
      const { chestContents: inputs } = this
      const alert = await alertController.create({
        header: 'Chest Contents',
        inputs,
        buttons: [
          {
            text: 'Leave',
            role: 'cancel'
          },
          {
            text: 'Loot',
            handler: (selectedItems) => {
              this.handleLoot(selectedItems);
            }
          }
        ]
      })
      alert.present();
    },

    async alertEmptyChest() {
      const alert = await alertController.create({
        header: "Chest is empty!",
        buttons: ["Ok"]
      })
      alert.present();
    },
    async handleLoot(selectedItems) {
      selectedItems.forEach(item => {
        if (item === 'key') {
          this.playerKeys += 1;
        } else if (this.currentRoom.content.dungeon === 'map') {
          this.hasMap = true;
        } else if (this.currentRoom.content.dungeon === 'compass') {
          this.hasCompass = true;
        }
        // remove the item from  the room's content itmes
        if (this.currentRoom.content.items) {
          this.currentRoom.content.items = this.currentRoom.content.items.filter(i => i !== item)
        } else if (this.currentRoom.content.dungeon) {
          delete this.currentRoom.content
        }

      });

      const toast = await toastController.create({
        message: `Nice, you picked up ${selectedItems}!`,
        duration: 2000
      })
      toast.present()
      // Remove the items from the room
    },
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
    async move(direction: 'north' | 'south' | 'west' | 'east') {
      const [row, col] = this.currentPosition;
      let newRow = row, newCol = col;

      const currentRoom = this.rooms[this.maze[row][col]];

      switch (direction) {
        case 'north':
          if (row > 0 && !currentRoom.locked?.north)
            newRow = row - 1;
          else if (currentRoom.locked?.north)
            await this.showUnlockDoorAlert(direction);
          break;
        case 'south':
          if (row < this.maze.length - 1 && !currentRoom.locked?.south) newRow = row + 1;
          break;
        case 'west':
          if (col > 0 && !currentRoom.locked?.west) newCol = col - 1;
          break;
        case 'east':
          if (col < this.maze[0].length - 1 && !currentRoom.locked?.east) newCol = col + 1;
          break;
      }

      const newRoomKey = this.maze[newRow][newCol];
      const newRoom = this.rooms[newRoomKey];

      if (newRoom.type !== 'wall') {
        if (this.isDoorLocked(newRow, newCol)) {
          await this.showUnlockDoorAlert(direction);
        } else {
          this.currentPosition = [newRow, newCol];

          // Mark the room as visited
          newRoom.visited = true;

          // ... handle other room logic like picking up keys, etc.
        }
      }
    },

    async showUnlockDoorAlert(direction: 'north' | 'south' | 'east' | 'west') {
      const buttons = this.playerKeys
        ? [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Unlock (-1 Key)',
            handler: () => {
              if (this.playerKeys > 0) {
                this.unlockDoor(direction);
              }
            },
            // disabled: this.playerKeys <= 0
          }
        ]
        : [{
          text: 'Ok',
          role: 'cancel'
        }]
      const alert = await alertController.create({
        header: 'Locked Door',
        message: this.playerKeys > 0 ? 'Would you like to use a key to unlock this door?' : 'You need a key to unlock this door!',
        buttons
      });

      await alert.present();
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
          this.showToast({
            message: 'Door Unlocked',
            duration: 2000
          })

        }
      }
    },
    async showToast(toastObj: any) {
      const toast = await toastController.create(toastObj)
      toast.present()
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



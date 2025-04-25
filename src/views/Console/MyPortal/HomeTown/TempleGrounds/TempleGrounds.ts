import { defineComponent, ref } from "vue";
import ionic from "@/mixins/ionic";
import { alertController, toastController } from "@ionic/vue";
import debug from "@/utils/debug";

import { ROOM_ICONS } from "@/dungeons/roomTypes";
import { actionSheetController } from "@ionic/vue";
import { mapGetters } from "vuex";

import temples from "./temples";
import { useRouter } from "vue-router";

export default defineComponent({
  props: ["userId", "temple", "x", "y"],
  name: "temple-grounds",
  mixins: [ionic],
  data() {
    return {
      playerKeys: 0,
      hasMap: false,
      hasCompass: false,
      isMapOpen: false,
      rooms: {},
      ROOM_ICONS,
    };
  },
  computed: {
    ...mapGetters(["getUserById"]),
    user() {
      return this.getUserById(this.userId);
    },
    templeBgImage() {
      const [row, col] = this.currentPosition;
      return (
        require(`@/assets/images/backgrounds/${this.temple}/[${row},${col}].jpg`) ||
        ""
      );
    },
    chestContents() {
      const { content } = this.currentRoom;
      if (content && typeof content.chest !== "undefined") {
        switch (content.chest) {
          case "loot":
            return content.items.map((item) => ({
              name: item,
              type: "checkbox",
              label: item,
              value: item,
              checked: false,
            }));
            break;
          case "dungeon":
            return [
              {
                name: content.dungeon,
                type: "checkbox",
                label: content.dungeon,
                value: content.dungeon,
                checked: false,
              },
            ];
            break;
          default:
            return [
              {
                name: "empty",
                type: "checkbox",
                label: "empty",
                disabled: true,
                checked: false,
              },
            ];
        }
      }
      return {};
    },
    actionColor() {
      switch (this.currentRoom.type) {
        case "boss":
        case "monster":
          return "danger";
        case "loot":
          return this.currentRoom.content ? "warning" : "none";
        case "entrance":
        case "shop":
        case "teleport":
          return "success";
        default:
          return "primary";
      }
    },
    roomActions() {
      const { currentRoom, alertChestContents, alertEmptyChest } = this;

      const actions = {
        header: "What would you like to do?",
        buttons: [
          {
            text: "Leave Temple",
            role: "cancel",
            handler: () => {
              //
            },
          },
        ],
      };
      switch (currentRoom.type) {
        case "loot":
          actions.buttons = [
            {
              text: "Open Chest",
              role: "open",
              handler: currentRoom.content
                ? alertChestContents
                : alertEmptyChest,
            },
          ];
          break;
        case "monster":
          actions.header = "A Monster approaches!";
          actions.buttons = [
            {
              text: "Fight",
              role: "fight",
              handler: () => {
                const { userId } = this;
                this.$router.push({
                  name: "battle-ground",
                  params: {
                    userId,
                  },
                });
              },
            },
          ];
          break;
        case "shop":
          actions.header = "Can I interest you in my wares?";
          actions.buttons = [
            {
              text: "View Wares",
              role: "view",
              handler: () => {
                // handle shop
              },
            },
          ];
          break;
        case "teleport":
          actions.header = "You found a teleport!";
          actions.buttons = [
            {
              text: "Teleport",
              role: "teleport",
              handler: () => {
                this.handleTeleport();
              },
            },
          ];
          break;
      }

      actions.buttons.push({
        text: "Cancel",
        role: "cancel",
        handler: () => {
          //do nothing
        },
      });

      return actions;
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
    validRoomCoords() {
      const validCoords = [] as string[];
      for (let row = 0; row < this.maze.length; row++) {
        for (let col = 0; col < this.maze[row].length; col++) {
          if (this.rooms[this.maze[row][col]].type !== "wall") {
            validCoords.push(`[${row},${col}]`);
          } else {
            validCoords.push(`[0,0]`);
          }
        }
      }
      return validCoords;
    },
  },

  methods: {
    getBgImage(xy) {
      return require(`@/assets/images/backgrounds/${this.temple}/${xy}.jpg`);
    },
    clickMap() {
      this.play$fx("map");
      this.isMapOpen = true;
    },
    dismissMap() {
      this.isMapOpen = false;
    },
    // is row cell current room
    isCurrentRoom(row, col) {
      return this.currentPosition[0] === row && this.currentPosition[1] === col;
    },

    async alertChestContents() {
      const { chestContents: inputs, play$fx } = this;
      play$fx("openChest");
      const alert = await alertController.create({
        header: "Chest Contents",
        inputs,
        buttons: [
          {
            text: "Leave",
            role: "cancel",
          },
          {
            text: "Loot",
            handler: (selectedItems) => {
              play$fx("yes");
              this.handleLoot(selectedItems);
            },
          },
        ],
      });
      alert.present();
    },

    async alertEmptyChest() {
      const { play$fx } = this;
      play$fx("openChest");
      const alert = await alertController.create({
        header: "Chest is empty!",
        buttons: [
          {
            text: "Ok",
            role: "cancel",
            handler: () => {
              play$fx("yes");
            },
          },
        ],
      });
      alert.present();
    },
    async handleLoot(selectedItems) {
      // Make sure we have a valid currentRoom with content
      if (!this.currentRoom || !this.currentRoom.content) {
        this.showToast({
          message: `Error: Chest appears to be empty`,
          duration: 2000,
        });
        return;
      }
      
      selectedItems.forEach((item) => {
        if (item === "key") {
          this.playerKeys += 1;
          this.play$fx("key");
        } else if (this.currentRoom.content && this.currentRoom.content.dungeon === "map") {
          this.hasMap = true;
          this.play$fx("newItem");
        } else if (this.currentRoom.content && this.currentRoom.content.dungeon === "compass") {
          this.hasCompass = true;
          this.play$fx("newItem");
        }
        
        // Make sure content still exists (it might have been deleted in a previous iteration)
        if (!this.currentRoom.content) return;
        
        // remove the item from the room's content items
        if (this.currentRoom.content.items) {
          this.currentRoom.content.items =
            this.currentRoom.content.items.filter((i) => i !== item);
          
          // If all items are taken, mark the chest as empty
          if (this.currentRoom.content.items.length === 0) {
            this.currentRoom.isEmpty = true;
          }
        } else if (this.currentRoom.content.dungeon) {
          delete this.currentRoom.content;
          this.currentRoom.isEmpty = true;
        }
      });

      // Force update of the room's state in the UI
      const [row, col] = this.currentPosition;
      const roomKey = this.maze[row][col];
      this.rooms = { ...this.rooms, [roomKey]: { ...this.currentRoom } };
      
      this.showToast({
        message: `Nice, you picked up ${selectedItems}!`,
        duration: 2000,
      });
    },
    clickFight() {
      //
    },
    async showRoomActions() {
      if (this.roomActions) {
        this.play$fx("yes");
        const actions = await actionSheetController.create(this.roomActions);
        actions.present();
      }
    },
    getRoomClass(cell, visited) {
      if (!visited) {
        return "fa-question"; // icon for unvisited rooms
      }

      const room = this.rooms[cell];
      if (!room) return "empty";
      
      // For chest/loot rooms, check if they're empty
      if (room.type.toLowerCase() === "loot" && room.isEmpty) {
        return "empty-chest"; // This will be used for the fal (light) icon version
      }
      
      return room.type.toLowerCase() || "empty";
    },
    async move(direction: "north" | "south" | "west" | "east") {
      const { userId, temple } = this;
      debug.log(`Player ${userId} moving ${direction} in ${temple} temple`);
      
      const [row, col] = this.currentPosition;
      let newRow = row,
        newCol = col;
      const currentRoom = this.rooms[this.maze[row][col]];

      switch (direction) {
        case "north":
          if (row > 0 && !currentRoom.locked?.north) newRow = row - 1;
          else if (currentRoom.locked?.north)
            await this.showUnlockDoorAlert(direction);
          break;
        case "south":
          if (row < this.maze.length - 1 && !currentRoom.locked?.south)
            newRow = row + 1;
          break;
        case "west":
          if (col > 0 && !currentRoom.locked?.west) newCol = col - 1;
          break;
        case "east":
          if (col < this.maze[0].length - 1 && !currentRoom.locked?.east)
            newCol = col + 1;
          break;
      }

      // Update background position
      this.updateBg(newCol, newRow);

      const newRoomKey = this.maze[newRow][newCol];
      const newRoom = this.rooms[newRoomKey];

      if (newRoom.type !== "wall") {
        if (this.isDoorLocked(newRow, newCol)) {
          await this.showUnlockDoorAlert(direction);
        } else {
          this.currentPosition = [newRow, newCol];

          // Mark the room as visited
          newRoom.visited = true;

          // ... handle other room logic like picking up keys, etc.
          // this.$router.replace({
          //   // name: 'temple',
          //   params: {
          //     // userId,
          //     x: newCol,
          //     y: newRow,
          //     // temple
          //   }
          // })
        }
      }
    },
    updateBg(x, y) {
      // Get dimensions of a single image tile
      const tileWidth = window.innerWidth; // Assuming full viewport width
      const tileHeight = window.innerHeight - 140; // Assuming full viewport height

      // Calculate translate values
      const translateX = -x * tileWidth;
      const translateY = -y * tileHeight;

      // Update background position
      const backgroundContainer = document.getElementById(
        "background-container"
      );
      if (backgroundContainer)
        backgroundContainer.style.transform = `translate(${translateX}px, ${translateY}px)`;
    },

    async showUnlockDoorAlert(direction: "north" | "south" | "east" | "west") {
      this.play$fx("error");
      const buttons = this.playerKeys
        ? [
            {
              text: "Cancel",
              role: "cancel",
            },
            {
              text: "Unlock (-1 Key)",
              handler: () => {
                if (this.playerKeys > 0) {
                  this.unlockDoor(direction);
                }
              },
              // disabled: this.playerKeys <= 0
            },
          ]
        : [
            {
              text: "Ok",
              role: "cancel",
            },
          ];
      const alert = await alertController.create({
        header: "Locked Door",
        message:
          this.playerKeys > 0
            ? "Would you like to use a key to unlock this door?"
            : "You need a key to unlock this door!",
        buttons,
      });

      await alert.present();
    },

    isDoorLocked(newRow, newCol) {
      if (!this.currentPosition) return false;
      const currentRoom =
        this.rooms[this.maze[this.currentPosition[0]][this.currentPosition[1]]];
      const direction = this.getDirection(newRow, newCol); // Assume you have a function to determine the direction ('north', 'south', etc.)

      // Check if the door in this direction is locked
      return currentRoom.locked && currentRoom.locked[direction];
    },
    unlockDoor(direction: "north" | "south" | "east" | "west") {
      const [row, col] = this.currentPosition;
      const roomKey = this.maze[row][col];
      const currentRoom = this.rooms[roomKey];

      if (currentRoom.locked && currentRoom.locked[direction]) {
        // Unlock the door if you have a key
        if (this.playerKeys > 0) {
          // Create a new copy of the locked object with the direction unlocked
          const newLocked = { ...currentRoom.locked, [direction]: false };
          
          // Update the room with the new locked state
          this.rooms = { 
            ...this.rooms, 
            [roomKey]: { 
              ...currentRoom, 
              locked: newLocked 
            } 
          };
          
          this.playerKeys -= 1; // subtract a key
          this.play$fx("useKey");
          this.play$fx("openDoor");
          this.showToast({
            message: "Door Unlocked",
            duration: 2000,
          });
        }
      }
    },
    async showToast(toastObj: any) {
      const toast = await toastController.create({
        ...toastObj,
        position: "middle",
      });
      toast.present();
    },
    getDirection(newRow, newCol) {
      const [currentRow, currentCol] = this.currentPosition;

      if (newRow < currentRow) return "north";
      if (newRow > currentRow) return "south";
      if (newCol < currentCol) return "west";
      if (newCol > currentCol) return "east";
      return null; // shouldn't happen, or you could throw an error
    },
    // Find the other teleport room coordinates in the temple
    findOtherTeleport() {
      const [currentRow, currentCol] = this.currentPosition;
      
      // Loop through all rooms to find other teleport rooms
      for (let row = 0; row < this.maze.length; row++) {
        for (let col = 0; col < this.maze[row].length; col++) {
          // Skip the current room
          if (row === currentRow && col === currentCol) continue;
          
          const roomKey = this.maze[row][col];
          const room = this.rooms[roomKey];
          
          // If we found another teleport room, return its coordinates
          if (room.type === "teleport") {
            return [row, col];
          }
        }
      }
      
      // If no other teleport found, return current position (fallback)
      return [currentRow, currentCol];
    },
    
    // Handle teleport action
    handleTeleport() {
      this.play$fx("teleport");
      
      // Get the destination coordinates
      const [destRow, destCol] = this.findOtherTeleport();
      
      // Update the background and position
      this.updateBg(destCol, destRow);
      this.currentPosition = [destRow, destCol];
      
      // Mark the destination room as visited
      const destRoomKey = this.maze[destRow][destCol];
      this.rooms[destRoomKey].visited = true;
      
      this.showToast({
        message: "Teleported!",
        duration: 2000,
      });
    },
    async resetTemple() {
      // Show confirmation dialog before resetting
      const alert = await alertController.create({
        header: 'Reset Temple',
        message: 'Are you sure you want to reset the temple? All progress will be lost.',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => {
              this.play$fx('no');
            },
          },
          {
            text: 'Reset',
            handler: () => {
              this.play$fx('teleport');
              
              // Reset player state
              this.playerKeys = 0;
              this.hasMap = false;
              this.hasCompass = false;
              
              // Reset all rooms to original state
              const temple = temples[this.temple];
              this.rooms = JSON.parse(JSON.stringify(temple.rooms));
              
              // Return to temple entrance
              this.currentPosition = temple.entrance;
              const [y, x] = this.currentPosition;
              this.updateBg(x, y);
              
              // Show confirmation toast
              this.showToast({
                message: 'Temple has been reset!',
                duration: 2000,
              });
            },
          },
        ],
      });
      
      await alert.present();
    },
  },

  mounted() {
    const [y, x] = this.currentPosition;
    this.updateBg(x, y);
  },
  setup(props) {
    const router = useRouter();
    const temple = temples[props.temple];

    if (!temple) router.go(-1);

    debug.log("temple", temple);

    const currentPosition = ref(temple.entrance);
    // [row, column] - default to entrance

    return {
      ...temple,
      currentPosition,
    };
  },
});

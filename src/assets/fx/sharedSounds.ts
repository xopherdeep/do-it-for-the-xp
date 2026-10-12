import loadingMP3 from "@/assets/audio/loading.mp3";
import earthbound from "./earthbound.fx";

import Coins from "@/assets/audio/nintendo/chrono trigger/cursor.mp3";

import rupee from "@/assets/audio/rupee.mp3";
import secret from "@/assets/audio/secret.mp3";
import menuOpen from "@/assets/audio/menu-open.mp3";
import menuClose from "@/assets/audio/menu-close.mp3";
import messageSound from "@/assets/audio/message.mp3";
import finishSound from "@/assets/audio/finish.mp3";
import fairySound from "@/assets/audio/fairy.mp3";
import item from "@/assets/audio/item.mp3";
import chestOpen from "@/assets/audio/chest-open.mp3";
import takeItemMP3 from "@/assets/audio/take_item.mp3";
import doorOpen from "@/assets/audio/door-open.mp3";

export const coins = new Audio(Coins);
const loading = new Audio(loadingMP3);

export const gp = new Audio(rupee);
export const shhh = new Audio(secret)
export const openMenu = new Audio(menuOpen);
export const closeMenu = new Audio(menuClose);
export const message = new Audio(messageSound);
export const finish = new Audio(finishSound);
export const fairy = new Audio(fairySound);
export const newItem = new Audio(item);
export const openChest = new Audio(chestOpen);
// The Zelda "item get" sting, for the moment the loot actually lands in the bag
export const takeItem = new Audio(takeItemMP3);
export const openDoor = new Audio(doorOpen);
export const step = new Audio(earthbound.step);
export const steps = new Audio(earthbound.steps);


coins.addEventListener(
  "ended",
  function () {
    this.currentTime = 0;
    this.play();
  },
  false
);

loading.addEventListener(
  "ended",
  function () {
    this.currentTime = 0;
    this.play();
  },
  false
);

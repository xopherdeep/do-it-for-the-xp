// Add declaration for the window._pendingAudioPlay property
declare global {
  interface Window {
    _pendingAudioPlay?: boolean;
  }
}

import loadingMP3 from "@/assets/audio/loading.mp3";

import nintendo from "./nintendo.fx";
import earthbound from "./earthbound.fx";
import sony from "./sony.fx";
import chronoTrigger from "./chronoTrigger.fx";

import purchaseWAV from "@/assets/audio/Purchase.wav";
import pointsMP3 from "@/assets/audio/points.mp3";
import Coins from "@/assets/audio/nintendo/chrono trigger/cursor.mp3";

import key from "@/assets/audio/key.mp3";
import useKey from "@/assets/audio/use-key.mp3";
import map from "@/assets/audio/map.mp3";
import rupee from "@/assets/audio/rupee.mp3";
import secret from "@/assets/audio/secret.mp3";
import menuOpen from "@/assets/audio/menu-open.mp3";
import menuClose from "@/assets/audio/menu-close.mp3";
import messageSound from "@/assets/audio/message.mp3";
import finishSound from "@/assets/audio/finish.mp3";
import fairySound from "@/assets/audio/fairy.mp3";
import item from "@/assets/audio/item.mp3";
import chestOpen from "@/assets/audio/chest-open.mp3";
import doorOpen from "@/assets/audio/door-open.mp3";

const coins = new Audio(Coins);
const loading = new Audio(loadingMP3);

const gp = new Audio(rupee);
const shhh = new Audio(secret)
const openMenu = new Audio(menuOpen);
const closeMenu = new Audio(menuClose);
const message = new Audio(messageSound);
const finish = new Audio(finishSound);
const fairy = new Audio(fairySound);
const newItem = new Audio(item);
const openChest = new Audio(chestOpen);
const openDoor = new Audio(doorOpen);


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

const $fx = {
  theme: {
    ui: "nintendo",
    rpg: "earthbound",
  },
  ui: {
    nintendo: {
      loading: new Audio(nintendo.EshopIntro),
      start: new Audio(nintendo.Popup),
      select: new Audio(nintendo.Select),
      noSelect: new Audio(nintendo.Border),
      yes: new Audio(nintendo.Tick),
      no: new Audio(nintendo.Standby),
      alert: new Audio(nintendo.Bing),
      // error: new Audio(nintendo.),
      options: new Audio(nintendo.Settings),
      openTask: new Audio(nintendo.News),
      closeTask: new Audio(nintendo.Home),
      openPage: new Audio(nintendo.Album),
      closePage: new Audio(nintendo.Tick),
      chooseUser: new Audio(nintendo.User),
      openShop: new Audio(nintendo.Eshop),
    },
    sony: {
      loading: new Audio(nintendo.EshopIntro),
      start: new Audio(sony.NavigationEnter),
      select: new Audio(sony.Navigation),
      yes: new Audio(sony.PromptEnter),
      no: new Audio(sony.PromptBack),
      alert: new Audio(sony.Prompt),
      // error: new Audio(nintendo.),
      options: new Audio(sony.ControlCenterOn),
      openTask: new Audio(sony.NavigationEnter),
      closeTask: new Audio(sony.NavigationBack),
      openPage: new Audio(sony.NavigationEnter),
      closePage: new Audio(sony.NavigationBack),
      chooseUser: new Audio(sony.ControlCenterOn),
      openShop: new Audio(sony.TrophyNotification),
    },
  },
  rpg: {
    earthbound: {
      BGM: {
        startScreen: [
          "http://starmen.net/mother2/music/004-%20Earthbound%20-%20Title%20Screen.mp3",
          "http://starmen.net/mother2/music/005-%20Earthbound%20-%20Opening%20Credits.mp3"
        ],
        chooseFile: [
          "http://starmen.net/mother2/music/006-%20Earthbound%20-%20Choose%20a%20File.mp3"
        ],
        home: [
          "http://starmen.net/mother2/music/151-%20Earthbound%20-%20Because%20I%20Love%20You.mp3",
        ],
        hometown: [
          "http://starmen.net/mother2/music/058-%20Earthbound%20-%20Apple%20Kid_s%20Theme.mp3",
          "http://starmen.net/mother2/music/064-%20Earthbound%20-%20Dead-End%20Chaos%20Theatre.mp3",
        ],
        battle: [
          "http://starmen.net/mother2/music/032-%20Earthbound%20-%20Battle%20Against%20a%20Weak%20Opponent.mp3",
          "http://starmen.net/mother2/music/019-%20Earthbound%20-%20Otherworldly%20Foe.mp3",
          "http://starmen.net/mother2/music/033-%20Earthbound%20-%20Battle%20Against%20a%20Weird%20Opponent.mp3",
          "http://starmen.net/mother2/music/034-%20Earthbound%20-%20Battle%20Against%20a%20Mobile%20Opponent.mp3",
          "http://starmen.net/mother2/music/119-%20Earthbound%20-%20Battle%20Against%20a%20Machine.mp3",
          "http://starmen.net/mother2/music/040-%20Earthbound%20-%20Battle%20Against%20an%20Unsettling%20Opponent.mp3",
          "http://starmen.net/mother2/music/039-%20Earthbound%20-%20Franky.mp3",
          "http://starmen.net/mother2/music/044-%20Earthbound%20-%20Sanctuary%20Guardian.mp3",
        ],
        win: [
          "http://starmen.net/mother2/music/035-%20Earthbound%20-%20You%20Win!.mp3"
        ],
        world: [
          "http://starmen.net/mother2/music/057-%20Earthbound%20-%20Boy%20Meets%20Girl%20(Twoson).mp3",
          "http://starmen.net/mother2/music/021-%20Earthbound%20-%20Sunrise%20&%20Onett%20Theme.mp3",
          "http://starmen.net/mother2/music/069-%20Earthbound%20-%20Threed,%20Zombie%20Central.mp3",
          "http://starmen.net/mother2/music/094-%20Earthbound%20-%20The%20Metropolis%20of%20Fourside.mp3",
        ],
        hotel: [
          "http://starmen.net/mother2/music/027-%20Earthbound%20-%20Enjoy%20Your%20Stay.mp3"
        ],
        hospital: [
          "http://starmen.net/mother2/music/029-%20Earthbound%20-%20Hospital.mp3"
        ],
        shop: [
          "http://starmen.net/mother2/music/026-%20Earthbound%20-%20Buy%20Somethin_%20Will%20Ya!.mp3"
        ],
        credits: [],
      },
      bgm: [
        "http://starmen.net/mother2/music/032-%20Earthbound%20-%20Battle%20Against%20a%20Weak%20Opponent.mp3",
        "http://starmen.net/mother2/music/033-%20Earthbound%20-%20Battle%20Against%20a%20Weird%20Opponent.mp3",
        "http://starmen.net/mother2/music/034-%20Earthbound%20-%20Battle%20Against%20a%20Mobile%20Opponent.mp3",
        "http://starmen.net/mother2/music/119-%20Earthbound%20-%20Battle%20Against%20a%20Machine.mp3",
        "http://starmen.net/mother2/music/040-%20Earthbound%20-%20Battle%20Against%20an%20Unsettling%20Opponent.mp3",
      ],
      gp,
      shhh,
      openMenu,
      closeMenu,
      newItem,
      openChest,
      fairy,
      finish,
      openDoor,
      message: message,
      error: new Audio(earthbound.error),
      enterBattle: new Audio(earthbound.enterbattle),
      attack: new Audio(earthbound.attack1),
      runAway: new Audio(),
      learn: new Audio(earthbound.psilearn),
      levelUp: new Audio(earthbound.eb_fanfare),
      gainXP: new Audio(earthbound.eb_win),
      gainGP: new Audio(purchaseWAV),
      fillPoints: new Audio(pointsMP3),
      countCoins: coins,
      restoreHP: new Audio(earthbound.heal),
      restoreMP: new Audio(earthbound.statsup),
      restoreAll: new Audio(earthbound.heal2),
      useMP: new Audio(earthbound.psi),
      openInventory: new Audio(),
      loot: new Audio(earthbound.dooropen1),
      present: new Audio(earthbound.present),
      lootItem: new Audio(earthbound.register),
      dropItem: new Audio(earthbound.burp),
      bonusItem: new Audio(earthbound.itemget2),
      equip: new Audio(earthbound.equip),
      useItem: new Audio(earthbound.eat),
      buyItem: new Audio(earthbound.buy1),
      sellItem: new Audio(earthbound.buy2),
      cursor: new Audio(earthbound.click),
      text: new Audio(earthbound.text),
      cursorHoriz: new Audio(earthbound.curshoriz),
      cursorVerti: new Audio(earthbound.cursverti),
      key: new Audio(key),
      useKey: new Audio(useKey),
      map: new Audio(map),
    },

    chronoTrigger: {
      bgm: [
        "http://starmen.net/mother2/music/032-%20Earthbound%20-%20Battle%20Against%20a%20Weak%20Opponent.mp3",
        "http://starmen.net/mother2/music/033-%20Earthbound%20-%20Battle%20Against%20a%20Weird%20Opponent.mp3",
        "http://starmen.net/mother2/music/034-%20Earthbound%20-%20Battle%20Against%20a%20Mobile%20Opponent.mp3",
        "http://starmen.net/mother2/music/119-%20Earthbound%20-%20Battle%20Against%20a%20Machine.mp3",
        "http://starmen.net/mother2/music/040-%20Earthbound%20-%20Battle%20Against%20an%20Unsettling%20Opponent.mp3",
      ],

      gp,
      shhh,
      openMenu,
      closeMenu,
      newItem,
      openChest,
      fairy,
      finish,
      openDoor,

      key: new Audio(key),
      useKey: new Audio(useKey),
      map: new Audio(map),
      error: new Audio(chronoTrigger.alert),
      attack: new Audio(chronoTrigger.attack),
      runAway: new Audio(),
      learn: new Audio(chronoTrigger.psilearn),
      levelUp: new Audio(chronoTrigger.eb_fanfare),
      gainXP: new Audio(chronoTrigger.bigWin),
      gainGP: new Audio(purchaseWAV),
      fillPoints: new Audio(pointsMP3),
      countCoins: coins,
      restoreHP: new Audio(chronoTrigger.gainHp),
      restoreMP: new Audio(chronoTrigger.gainMp),
      restoreAll: new Audio(chronoTrigger.cureMagic),
      useMP: new Audio(chronoTrigger.lightningMagic),
      openInventory: new Audio(),
      loot: new Audio(chronoTrigger.getItem),
      present: new Audio(chronoTrigger.getItem),
      lootItem: new Audio(chronoTrigger.cursor),
      dropItem: new Audio(chronoTrigger.cursor),
      bonusItem: new Audio(chronoTrigger.itemget2),
      equip: new Audio(chronoTrigger.equip),
      useItem: new Audio(chronoTrigger.useHealingItem),
      buyItem: new Audio(chronoTrigger.buy1),
      sellItem: new Audio(chronoTrigger.buy2),
      cursor: new Audio(chronoTrigger.cursor),
      text: new Audio(chronoTrigger.type),
      cursorHoriz: new Audio(chronoTrigger.curshoriz),
      cursorVerti: new Audio(chronoTrigger.cursverti),
    },

    finalFantasy: {
      bgm: [
        "http://starmen.net/mother2/music/032-%20Earthbound%20-%20Battle%20Against%20a%20Weak%20Opponent.mp3",
        "http://starmen.net/mother2/music/033-%20Earthbound%20-%20Battle%20Against%20a%20Weird%20Opponent.mp3",
        "http://starmen.net/mother2/music/034-%20Earthbound%20-%20Battle%20Against%20a%20Mobile%20Opponent.mp3",
        "http://starmen.net/mother2/music/119-%20Earthbound%20-%20Battle%20Against%20a%20Machine.mp3",
        "http://starmen.net/mother2/music/040-%20Earthbound%20-%20Battle%20Against%20an%20Unsettling%20Opponent.mp3",
      ],
      gp,
      shhh,
      openMenu,
      closeMenu,
      newItem,
      openChest,
      fairy,
      finish,
      openDoor,

      key: new Audio(key),
      useKey: new Audio(useKey),
      map: new Audio(map),
      error: new Audio(chronoTrigger.alert),
      attack: new Audio(chronoTrigger.attack),
      runAway: new Audio(),
      learn: new Audio(chronoTrigger.psilearn),
      levelUp: new Audio(chronoTrigger.eb_fanfare),
      gainXP: new Audio(chronoTrigger.bigWin),
      gainGP: new Audio(purchaseWAV),
      fillPoints: new Audio(pointsMP3),
      countCoins: coins,
      restoreHP: new Audio(chronoTrigger.gainHp),
      restoreMP: new Audio(chronoTrigger.gainMp),
      restoreAll: new Audio(chronoTrigger.cureMagic),
      useMP: new Audio(chronoTrigger.lightningMagic),
      openInventory: new Audio(),
      loot: new Audio(chronoTrigger.getItem),
      present: new Audio(chronoTrigger.getItem),
      lootItem: new Audio(chronoTrigger.cursor),
      dropItem: new Audio(chronoTrigger.cursor),
      bonusItem: new Audio(chronoTrigger.itemget2),
      equip: new Audio(chronoTrigger.equip),
      useItem: new Audio(chronoTrigger.useHealingItem),
      buyItem: new Audio(chronoTrigger.buy1),
      sellItem: new Audio(chronoTrigger.buy2),
      cursor: new Audio(chronoTrigger.cursor),
      text: new Audio(chronoTrigger.type),
      cursorHoriz: new Audio(chronoTrigger.curshoriz),
      cursorVerti: new Audio(chronoTrigger.cursverti),
    },
  },
}

export const play$fx = (fx = 'select') => {
  const { ui, rpg, theme: { ui: themeUi, rpg: themeRpg } } = $fx
  let soundFx = ui[themeUi][fx]
  
  // Only play sound if user has interacted with the page
  if (soundFx && document.documentElement.hasAttribute('data-user-interacted')) {
    try {
      soundFx.play().catch(err => {
        console.log('Sound playback was prevented:', err);
        // Store that we attempted to play a sound, for future reference
        window._pendingAudioPlay = true;
      });
    } catch (err) {
      console.log('Sound playback error:', err);
    }
  } else if (soundFx) {
    // Store that we attempted to play a sound, for future reference
    window._pendingAudioPlay = true;
  } else {
    soundFx = rpg[themeRpg][fx]
    if (soundFx && document.documentElement.hasAttribute('data-user-interacted')) {
      try {
        soundFx.play().catch(err => {
          console.log('Sound playback was prevented:', err);
          window._pendingAudioPlay = true;
        });
      } catch (err) {
        console.log('Sound playback error:', err);
      }
    } else if (soundFx) {
      window._pendingAudioPlay = true;
    }
  }
}

export default $fx;

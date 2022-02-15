import loadingMP3 from "@/assets/audio/loading.mp3"

import nintendo from "./nintendo"
import earthbound from "./earthbound"
import sony from "./sony"
import chronoTrigger from "./chronoTrigger"

import purchaseWAV from "@/assets/audio/Purchase.wav"
import pointsMP3 from "@/assets/audio/points.mp3"
import Coins from "@/assets/audio/nintendo/chrono trigger/cursor.mp3"
import Menu1B from "@/assets/audio/Menu1B.wav"

const coins = new Audio(Coins)
const loading = new Audio(loadingMP3) 

coins.addEventListener('ended', function() {
  this.currentTime = 0;
  this.play();
}, false);

loading.addEventListener('ended', function() {
  this.currentTime = 0;
  this.play();
}, false);

export default {
  theme: {
    ui: 'nintendo',
    rpg: 'earthbound'
  },
  ui: {
    nintendo: {
      loading: new Audio(nintendo.EshopIntro),
      select: new Audio(nintendo.Select),
      yes: new Audio(nintendo.Tick),
      no: new Audio(nintendo.Standby),
      alert: new Audio(nintendo.Bing),
      // error: new Audio(nintendo.),
      options: new Audio(nintendo.Settings),
      openTask: new Audio(nintendo.News),
      closeTask: new Audio(nintendo.Home),
      openPage: new Audio(nintendo.Album),
      chooseUser: new Audio(nintendo.User),
      openShop: new Audio(nintendo.Eshop)
    },
    sony:{
      loading: new Audio(nintendo.EshopIntro),
      select: new Audio(sony.Navigation),
      yes: new Audio(sony.PromptEnter),
      no: new Audio(sony.PromptBack),
      alert: new Audio(sony.Prompt),
      // error: new Audio(nintendo.),
      options: new Audio(sony.ControlCenterOn),
      openTask: new Audio(sony.NavigationEnter),
      closeTask: new Audio(sony.NavigationBack),
      openPage: new Audio(sony.NavigationEnter),
      chooseUser: new Audio(sony.ControlCenterOn),
      openShop: new Audio(sony.TrophyNotification)

    }
  },
  rpg: {
    earthbound: {
      error: new Audio(earthbound.error),
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
      loot: new Audio(earthbound.present),
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
    },

    chronoTrigger: {
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
    }
  }
}
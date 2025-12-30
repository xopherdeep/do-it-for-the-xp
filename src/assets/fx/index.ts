// Add declaration for the window._pendingAudioPlay property
declare global {
  interface Window {
    _pendingAudioPlay?: boolean;
  }
}

import loadingMP3 from "@/assets/audio/loading.mp3";
import debug from "@/lib/utils/debug";
import { AudioEngine } from "@/lib/engine/audio/AudioEngine";

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
      intro: new Audio(nintendo.EshopIntro),
      setup: new Audio(nintendo.Settings),
      start: new Audio(nintendo.EnterBack),
      select: new Audio(nintendo.Select),
      noSelect: new Audio(nintendo.Border),
      yes: new Audio(nintendo.Tick),
      no: new Audio(nintendo.Standby),
      alert: new Audio(nintendo.Bing),
      // error: new Audio(nintendo.),
      options: new Audio(earthbound.okdesuka),
      openTask: new Audio(nintendo.News),
      closeTask: new Audio(nintendo.Home),
      openPage: new Audio(nintendo.Album),
      closePage: new Audio(earthbound.okdesuka),
      chooseUser: new Audio(nintendo.User),
      openShop: new Audio(nintendo.Eshop),
      GameBoy: new Audio(nintendo.GameBoy),
    },
    sony: {
      loading: new Audio(nintendo.EshopIntro),
      intro: new Audio(nintendo.EshopIntro),
      setup: new Audio(sony.NavigationEnter),
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
        intro: [
          "https://starmen.net/mother2/music/018-%20Earthbound%20-%20Buzz%20Buzz_s%20Prophecy.mp3",
        ],
        demo: [
          "https://starmen.net/mother2/music/005- Earthbound - Opening Credits.mp3",
        ],
        startScreen: [
          "https://starmen.net/mother2/music/004- Earthbound - Title Screen.mp3",
          "https://starmen.net/mother2/music/005- Earthbound - Opening Credits.mp3",
        ],
        chooseFile: [
          "https://starmen.net/mother2/music/006- Earthbound - Choose a File.mp3",
          "https://starmen.net/mother2/music/007- Earthbound - Your Name, Please.mp3",
        ],
        home: [
          "https://starmen.net/mother2/music/023- Earthbound - Home Sweet Home.mp3",
          "https://starmen.net/mother2/music/151- Earthbound - Because I Love You.mp3",
          "https://starmen.net/mother2/music/131-%20Earthbound%20-%20Eight%20Melodies.mp3",
        ],
        hometown: [
          "https://starmen.net/mother2/music/021- Earthbound - Sunrise & Onett Theme.mp3",
          "https://starmen.net/mother2/music/058- Earthbound - Apple Kid_s Theme.mp3",
          "https://starmen.net/mother2/music/064- Earthbound - Dead-End Chaos Theatre.mp3",
        ],
        battle: [
          "https://starmen.net/mother2/music/030- Earthbound - Oncoming Foe.mp3",
          "https://starmen.net/mother2/music/031- Earthbound - Ambush!.mp3",
          "https://starmen.net/mother2/music/032- Earthbound - Battle Against a Weak Opponent.mp3",
          "https://starmen.net/mother2/music/019- Earthbound - Otherworldly Foe.mp3",
          "https://starmen.net/mother2/music/033- Earthbound - Battle Against a Weird Opponent.mp3",
          "https://starmen.net/mother2/music/034- Earthbound - Battle Against a Mobile Opponent.mp3",
          "https://starmen.net/mother2/music/119- Earthbound - Battle Against a Machine.mp3",
          "https://starmen.net/mother2/music/040- Earthbound - Battle Against an Unsettling Opponent.mp3",
          "https://starmen.net/mother2/music/039- Earthbound - Franky.mp3",
          "https://starmen.net/mother2/music/044- Earthbound - Sanctuary Guardian.mp3",
          "https://starmen.net/mother2/music/109- Earthbound - Kraken of the Sea.mp3",
          "https://starmen.net/mother2/music/089- Earthbound - Battle Against Belch.mp3",
        ],
        win: [
          "https://starmen.net/mother2/music/035- Earthbound - You Win!.mp3",
          "https://starmen.net/mother2/music/036- Earthbound - That Was Easy!.mp3",
          "https://starmen.net/mother2/music/037- Earthbound - You Gained a Level!.mp3",
        ],
        world: [
          "https://starmen.net/mother2/music/092-%20Earthbound%20-%20Get%20on%20the%20Bus.mp3",
          "https://starmen.net/mother2/music/065-%20Earthbound%20-%20Runaway%20Five%20~%20The%20Daily%20Show.mp3",
          "https://starmen.net/mother2/music/066-%20Earthbound%20-%20Runaway%20Five_s%20Final%20Performance.mp3",
          "https://starmen.net/mother2/music/067-%20Earthbound%20-%20Runaway%20Five%20Left%20the%20Building!.mp3",
          "https://starmen.net/mother2/music/068-%20Earthbound%20-%20Runaway%20Five%20On%20the%20Move!.mp3",
          "https://starmen.net/mother2/music/096-%20Earthbound%20-%20Venus%20Live!.mp3",
        ],
        worlds: {
          onett:
            "https://starmen.net/mother2/music/021- Earthbound - Sunrise & Onett Theme.mp3",
          twoson:
            "https://starmen.net/mother2/music/057- Earthbound - Boy Meets Girl (Twoson).mp3",
          threed:
            "https://starmen.net/mother2/music/069- Earthbound - Threed, Zombie Central.mp3",
          threedZombie:
            "https://starmen.net/mother2/music/069- Earthbound - Threed, Zombie Central.mp3",
          threedFree:
            "https://starmen.net/mother2/music/091- Earthbound - Threed, Free at Last.mp3",
          fourside:
            "https://starmen.net/mother2/music/094- Earthbound - The Metropolis of Fourside.mp3",
          moonside:
            "https://starmen.net/mother2/music/099- Earthbound - Moonside Swing.mp3",
          saturnValley:
            "https://starmen.net/mother2/music/087- Earthbound - Hi Hi Hi.mp3",
          winters:
            "https://starmen.net/mother2/music/075- Earthbound - Winters White.mp3",
          snowWood:
            "https://starmen.net/mother2/music/074- Earthbound - Snowman (Snow Wood Boarding House).mp3",
          summers:
            "https://starmen.net/mother2/music/102- Earthbound - Summers, Eternal Tourist Trap.mp3",
          dalaam:
            "https://starmen.net/mother2/music/104- Earthbound - The Floating Kingdom of Dalaam.mp3",
          scaraba:
            "https://starmen.net/mother2/music/110- Earthbound - Bazaar.mp3",
          desert:
            "https://starmen.net/mother2/music/112- Earthbound - The Unforgiving Desert.mp3",
          deepDarkness:
            "https://starmen.net/mother2/music/117- Earthbound - The Deep Darkness.mp3",
          lostUnderworld:
            "https://starmen.net/mother2/music/120- Earthbound - The Lost Underworld.mp3",
          magicant:
            "https://starmen.net/mother2/music/133- Earthbound - Welcome Home.mp3",
          // Add terrain-based categorization
          terrains: {
            plains: [
              "https://starmen.net/mother2/music/021- Earthbound - Sunrise & Onett Theme.mp3",
              "https://starmen.net/mother2/music/057- Earthbound - Boy Meets Girl (Twoson).mp3",
            ],
            snow: [
              "https://starmen.net/mother2/music/075- Earthbound - Winters White.mp3",
              "https://starmen.net/mother2/music/074- Earthbound - Snowman (Snow Wood Boarding House).mp3",
              "https://starmen.net/mother2/music/062-%20Earthbound%20-%20Happy-Happy%20is%20Blue.mp3",
            ],
            desert: [
              "https://starmen.net/mother2/music/110- Earthbound - Bazaar.mp3",
              "https://starmen.net/mother2/music/112- Earthbound - The Unforgiving Desert.mp3",
            ],
            sands: [
              "https://starmen.net/mother2/music/112- Earthbound - The Unforgiving Desert.mp3",
            ],
            swamp: [
              "https://starmen.net/mother2/music/069- Earthbound - Threed, Zombie Central.mp3",
              "https://starmen.net/mother2/music/062-%20Earthbound%20-%20Happy-Happy%20is%20Blue.mp3",
            ],
            mountains: [
              "https://starmen.net/mother2/music/120- Earthbound - The Lost Underworld.mp3",
              "https://starmen.net/mother2/music/121- Earthbound - Lava Springs.mp3",
            ],
            forest: [
              "https://starmen.net/mother2/music/087- Earthbound - Hi Hi Hi.mp3",
              "https://starmen.net/mother2/music/061- Earthbound - Peaceful Rest Valley.mp3",
            ],
            islands: [
              "https://starmen.net/mother2/music/102- Earthbound - Summers, Eternal Tourist Trap.mp3",
              "https://starmen.net/mother2/music/107- Earthbound - Sailing to Scaraba.mp3",
            ],
            urban: [
              "https://starmen.net/mother2/music/094- Earthbound - The Metropolis of Fourside.mp3",
              "https://starmen.net/mother2/music/091- Earthbound - Threed, Free at Last.mp3",
            ],
            moon: [
              "https://starmen.net/mother2/music/133- Earthbound - Welcome Home.mp3",
              "https://starmen.net/mother2/music/099- Earthbound - Moonside Swing.mp3",
            ],
            clouds: [
              // "https://starmen.net/mother2/music/059- Earthbound - Ness_ Bike.mp3",

              "https://starmen.net/mother2/music/106- Earthbound - Pink Cloud Shrine.mp3",
            ],
            cave: [
              "https://starmen.net/mother2/music/041- Earthbound - Dangerous Caves.mp3",
              "https://starmen.net/mother2/music/079- Earthbound - Caverns of Winters.mp3",
            ],
            dungeon: [
              "https://starmen.net/mother2/music/088- Earthbound - Belch_s Factory.mp3",
              "https://starmen.net/mother2/music/113- Earthbound - Pyramid.mp3",
              "https://starmen.net/mother2/music/114- Earthbound - Inside the Dungeon.mp3",
            ],
          },
        },
        hotel: [
          "https://starmen.net/mother2/music/027- Earthbound - Enjoy Your Stay.mp3",
        ],
        hospital: [
          "https://starmen.net/mother2/music/029- Earthbound - Hospital.mp3",
        ],
        shop: [
          "https://starmen.net/mother2/music/026- Earthbound - Buy Somethin_ Will Ya!.mp3",
        ],
        credits: [
          "https://starmen.net/mother2/music/150- Earthbound - The Heroes Return.mp3",
          "https://starmen.net/mother2/music/153- Earthbound - Smiles and Tears.mp3",
        ],
        bazaar: [
          "https://starmen.net/mother2/music/110- Earthbound - Bazaar.mp3",
        ],
        cave: [
          "https://starmen.net/mother2/music/041- Earthbound - Dangerous Caves.mp3",
          "https://starmen.net/mother2/music/079- Earthbound - Caverns of Winters.mp3",
          "https://starmen.net/mother2/music/086- Earthbound - Saturn Valley Caverns.mp3",
        ],
        sanctuary: [
          "https://starmen.net/mother2/music/047- Earthbound - Welcome to Your Sanctuary.mp3",
          "https://starmen.net/mother2/music/048- Earthbound - Your Sanctuary ~ Giant Step.mp3",
          "https://starmen.net/mother2/music/049- Earthbound - Your Sanctuary ~ Lilliput Steps.mp3",
          "https://starmen.net/mother2/music/050- Earthbound - Your Sanctuary ~ Milky Well.mp3",
          "https://starmen.net/mother2/music/051- Earthbound - Your Sanctuary ~ Rainy Circle.mp3",
          "https://starmen.net/mother2/music/052- Earthbound - Your Sanctuary ~ Magnet Hill.mp3",
          "https://starmen.net/mother2/music/053- Earthbound - Your Sanctuary ~ Pink Cloud.mp3",
          "https://starmen.net/mother2/music/054- Earthbound - Your Sanctuary ~ Lumine Hall.mp3",
          "https://starmen.net/mother2/music/055- Earthbound - Your Sanctuary ~ Fire Spring.mp3",
        ],
        soundstone: [
          "https://starmen.net/mother2/music/122- Earthbound - Sound Stone ~ Giant Step.mp3",
          "https://starmen.net/mother2/music/123- Earthbound - Sound Stone ~ Lilliput Steps.mp3",
          "https://starmen.net/mother2/music/124- Earthbound - Sound Stone ~ Milky Well.mp3",
          "https://starmen.net/mother2/music/125- Earthbound - Sound Stone ~ Rainy Circle.mp3",
          "https://starmen.net/mother2/music/126- Earthbound - Sound Stone ~ Magnet Hill.mp3",
          "https://starmen.net/mother2/music/127- Earthbound - Sound Stone ~ Pink Cloud.mp3",
          "https://starmen.net/mother2/music/128- Earthbound - Sound Stone ~ Lumine Hall.mp3",
          "https://starmen.net/mother2/music/129- Earthbound - Sound Stone ~ Fire Spring.mp3",
          "https://starmen.net/mother2/music/130- Earthbound - Sound Stone ~ No Sounds.mp3",
          "https://starmen.net/mother2/music/131- Earthbound - Eight Melodies.mp3",
        ],
        dungeon: [
          // "https://starmen.net/mother2/music/088- Earthbound - Belch_s Factory.mp3",
          "https://starmen.net/mother2/music/113- Earthbound - Pyramid.mp3",
          "https://starmen.net/mother2/music/114- Earthbound - Inside the Dungeon.mp3",
        ],
        boss: [
          "https://starmen.net/mother2/music/043- Earthbound - Oncoming Boss.mp3",
          "https://starmen.net/mother2/music/044- Earthbound - Sanctuary Guardian.mp3",
          "https://starmen.net/mother2/music/089- Earthbound - Battle Against Belch.mp3",
          "https://starmen.net/mother2/music/142- Earthbound - Pokey Means Business!.mp3",
          "https://starmen.net/mother2/music/143- Earthbound - Giygas_s Intro.mp3",
          "https://starmen.net/mother2/music/144- Earthbound - Giygas Stirs.mp3",
          "https://starmen.net/mother2/music/145- Earthbound - Giygas_ Intimidation.mp3",
        ],
        gameover: [
          "https://starmen.net/mother2/music/045- Earthbound - A Bad Dream.mp3",
        ],
        // New categories based on the complete soundtrack
        intro2: [
          "https://starmen.net/mother2/music/002- Earthbound - The Evil Giygas Attacks! (Part 1).mp3",
          "https://starmen.net/mother2/music/003- Earthbound - The Evil Giygas Attacks! (Part 2).mp3",
          "https://starmen.net/mother2/music/008- Earthbound - Now, Let_s Go!.mp3",
          "https://starmen.net/mother2/music/009- Earthbound - One Fateful Night___.mp3",
          "https://starmen.net/mother2/music/010- Earthbound - Unidentified Falling Object.mp3",
        ],
        beginningEvents: [
          "https://starmen.net/mother2/music/011- Earthbound - Rude Awakening.mp3",
          "https://starmen.net/mother2/music/012- Earthbound - Alien Invasion.mp3",
          "https://starmen.net/mother2/music/013- Earthbound - Someone_s Knocking at the Door.mp3",
          "https://starmen.net/mother2/music/014- Earthbound - Pokey_s at the Door.mp3",
          "https://starmen.net/mother2/music/016- Earthbound - Pokey.mp3",
          "https://starmen.net/mother2/music/017- Earthbound - A Good Buddy.mp3",
          "https://starmen.net/mother2/music/018- Earthbound - Buzz Buzz_s Prophecy.mp3",
        ],
        sleep: [
          "https://starmen.net/mother2/music/024- Earthbound - A Good Night_s Rest.mp3",
          "https://starmen.net/mother2/music/028- Earthbound - Bed and Breakfast.mp3",
        ],
        transportation: [
          "https://starmen.net/mother2/music/059- Earthbound - Ness_ Bike.mp3",
          "https://starmen.net/mother2/music/068- Earthbound - Runaway Five On the Move!.mp3",
          "https://starmen.net/mother2/music/081- Earthbound - The Sky Runner.mp3",
          "https://starmen.net/mother2/music/082- Earthbound - Going Down!.mp3",
          "https://starmen.net/mother2/music/092- Earthbound - Get on the Bus.mp3",
          "https://starmen.net/mother2/music/107- Earthbound - Sailing to Scaraba.mp3",
          "https://starmen.net/mother2/music/108- Earthbound - The Voyage Continues.mp3",
          "https://starmen.net/mother2/music/116- Earthbound - The Submarine.mp3",
        ],
        specialEvents: [
          "https://starmen.net/mother2/music/056- Earthbound - A Flash of Memory.mp3",
          "https://starmen.net/mother2/music/060- Earthbound - Paula_s Theme.mp3",
          "https://starmen.net/mother2/music/063- Earthbound - You_ve Got a New Friend!.mp3",
          "https://starmen.net/mother2/music/077- Earthbound - Tessie Has Been Sighted!.mp3",
          "https://starmen.net/mother2/music/078- Earthbound - Tessie!.mp3",
          "https://starmen.net/mother2/music/083- Earthbound - Rough Landing.mp3",
          "https://starmen.net/mother2/music/084- Earthbound - Escargo Express at Your Service!.mp3",
          "https://starmen.net/mother2/music/090- Earthbound - You_ve Come Far, Ness.mp3",
          "https://starmen.net/mother2/music/158- Earthbound - Key Item Fanfare.mp3",
        ],
        runawayFive: [
          "https://starmen.net/mother2/music/065- Earthbound - Runaway Five ~ The Daily Show.mp3",
          "https://starmen.net/mother2/music/066- Earthbound - Runaway Five_s Final Performance.mp3",
          "https://starmen.net/mother2/music/067- Earthbound - Runaway Five Left the Building!.mp3",
          "https://starmen.net/mother2/music/101- Earthbound - Runaway Five to the Rescue!.mp3",
        ],
        magicant: [
          "https://starmen.net/mother2/music/132- Earthbound - Entering Magicant___.mp3",
          "https://starmen.net/mother2/music/133- Earthbound - Welcome Home.mp3",
          "https://starmen.net/mother2/music/134- Earthbound - The Jolly Flying Man.mp3",
          "https://starmen.net/mother2/music/135- Earthbound - Deeper into Ness_ Subconscious.mp3",
          "https://starmen.net/mother2/music/136- Earthbound - Sea of Eden.mp3",
          "https://starmen.net/mother2/music/137- Earthbound - The Power.mp3",
          "https://starmen.net/mother2/music/138- Earthbound - Ness Awakens from the Nightmare.mp3",
        ],
        endgame: [
          "https://starmen.net/mother2/music/139- Earthbound - The Cliff that Time Forgot.mp3",
          "https://starmen.net/mother2/music/140- Earthbound - The Place.mp3",
          "https://starmen.net/mother2/music/141- Earthbound - Giygas_ Lair.mp3",
          "https://starmen.net/mother2/music/146- Earthbound - Prayer for Safety.mp3",
          "https://starmen.net/mother2/music/147- Earthbound - Giygas is Wounded!.mp3",
          "https://starmen.net/mother2/music/148- Earthbound - Giygas is Fatally Wounded!.mp3",
          "https://starmen.net/mother2/music/149- Earthbound - Giygas Disintegrates.mp3",
        ],
      },
      bgm: [
        "https://starmen.net/mother2/music/032- Earthbound - Battle Against a Weak Opponent.mp3",
        "https://starmen.net/mother2/music/033- Earthbound - Battle Against a Weird Opponent.mp3",
        "https://starmen.net/mother2/music/034- Earthbound - Battle Against a Mobile Opponent.mp3",
        "https://starmen.net/mother2/music/119- Earthbound - Battle Against a Machine.mp3",
        "https://starmen.net/mother2/music/040- Earthbound - Battle Against an Unsettling Opponent.mp3",
        "https://starmen.net/mother2/music/021- Earthbound - Sunrise & Onett Theme.mp3",
        "https://starmen.net/mother2/music/057- Earthbound - Boy Meets Girl (Twoson).mp3",
        "https://starmen.net/mother2/music/069- Earthbound - Threed, Zombie Central.mp3",
        "https://starmen.net/mother2/music/094- Earthbound - The Metropolis of Fourside.mp3",
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
};

export const play$fx = (fx = 'select', options?: { loop?: boolean, stop?: boolean }) => {
  const { ui, rpg, theme: { ui: themeUi, rpg: themeRpg } } = $fx

  // Logic to determine if we should use 'setup' instead of 'loading'
  // When in the "backend" (GameMaster/Compendium Setup), we use the setup sound
  let targetFx = fx;
  if (fx === 'loading' && typeof window !== 'undefined' && window.location.pathname.includes('/game-master/compendium/setup')) {
    targetFx = 'setup';
  }

  let soundFx = ui[themeUi][targetFx]

  // Only play sound if user has interacted with the page
  // Check with AudioEngine first
  const audioEngine = AudioEngine.getInstance();
  const shouldTryPlay = audioEngine.state.audioPermissionGranted || (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-user-interacted'));

  if (soundFx) {
    if (shouldTryPlay) {
      soundFx.volume = audioEngine.state.muted ? 0 : audioEngine.state.uiVolume * audioEngine.state.masterVolume;
      soundFx.currentTime = 0; // Reset to start
      soundFx.play().catch((err: any) => {
        debug.warn('UI Sound playback was prevented:', err);
        // Only trigger modal if it's a permission/interaction issue
        if (err.name === 'NotAllowedError' || err.message?.includes('interact') || err.message?.includes('user activation')) {
          audioEngine.state.audioPermissionGranted = false;
        }
      });
    } else {
      // We know it will fail, so don't try, but do trigger modal if we haven't already
      // But only if we actually wanted to play something
      debug.log('Skipping UI sound playback due to lack of permission');
    }
  } else {
    soundFx = rpg[themeRpg][targetFx]
    if (soundFx) {
      if (shouldTryPlay) {
        soundFx.volume = audioEngine.state.muted ? 0 : audioEngine.state.sfxVolume * audioEngine.state.masterVolume;

        // Handle stop action
        if (options?.stop) {
          soundFx.pause();
          soundFx.currentTime = 0;
          soundFx.loop = false;
          return;
        }

        // Handle loop action
        if (options?.loop) {
          soundFx.loop = true;
          // Only play if not already playing to avoid stutter
          if (soundFx.paused) {
            soundFx.play().catch((err: any) => {
              debug.warn('RPG Sound loop playback was prevented:', err);
            });
          }
          return;
        }

        soundFx.currentTime = 0;
        soundFx.loop = false;

        // Monophonic playback for others
        soundFx.play().catch((err: any) => {
          debug.warn('RPG Sound playback was prevented:', err);
          if (err.name === 'NotAllowedError' || err.message?.includes('interact') || err.message?.includes('user activation')) {
            audioEngine.state.audioPermissionGranted = false;
          }
        });
      }
    }
  }
}

if (typeof window !== 'undefined') {
  (window as any).play$fx = play$fx;
}

export default $fx;

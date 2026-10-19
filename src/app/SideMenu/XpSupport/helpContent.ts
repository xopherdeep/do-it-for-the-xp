/**
 * The Help Desk's words: the User Manual's chapters and the FAQ. Every line describes what the app does today,
 * with the names the screens use (buttons, tabs, menus). When a feature changes, change its line here too.
 */

export interface ManualChapter {
  id: string;
  title: string;
  /** Font Awesome duotone icon name, without the "fa-" */
  icon: string;
  /** Who the chapter is for */
  audience: "Everyone" | "Game Masters" | "Heroes";
  intro: string;
  steps: string[];
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface FaqGroup {
  title: string;
  entries: FaqEntry[];
}

export const MANUAL_CHAPTERS: ManualChapter[] = [
  {
    id: "start",
    title: "Getting started",
    icon: "flag-checkered",
    audience: "Everyone",
    intro: "Do It For The XP turns chores into an RPG. Parents are Game Masters who set quests; kids are heroes who beat them for XP, gold and powers.",
    steps: [
      "Tap Press Start, then Start New Game on Choose A Profile. In a hurry? Quick Start on the same screen names your kids and has them playing tonight.",
      "The first profile on a device is a Game Master. Game Masters need a 4-digit passcode.",
      "Forgot your PIN? Tap Forgot PIN on the PIN pad and type your recovery code. The code shows at every unlock until you tap I wrote it down, and Settings, Family can make a new one. Too many wrong PINs make the pad wait a while.",
      "Add your heroes in Settings, Family. A hero's passcode is optional.",
      "Load a pack in Settings, Packs, or make your own quests in the Compendium. A new game has no quests until you do one of the two.",
      "On a new phone or after clearing the browser, Choose A Profile also offers Restore a backup, which loads your family's saved file.",
      "The first time a hero opens their portal, a guide walks them through the XP bar and the bottom buttons. Replay it from Settings, General, Show the portal tour again.",
      "Settings, General also picks the screen each profile lands on after signing in, and Helper dialogs keeps the Guide and the tour quiet until you open the Journal.",
    ],
  },
  {
    id: "quests",
    title: "Making quests",
    icon: "scroll",
    audience: "Game Masters",
    intro: "A quest is a chore with a reward. Make one from the Compendium's Quests, or the + button on the Dashboard.",
    steps: [
      "What's the chore: a name, a category and a kind (Normal, Beast or Chain).",
      "Who does it: Open for anyone, or Solo, Team, Rotate or Race for the heroes you pick.",
      "When: the start and end dates, a due time and how often it comes back.",
      "How hard: the difficulty sets the reward (100 XP, 10 GP and 1 AP per step) and the minutes set the battle clock. This step also holds the approval choice, Photo proof and the quest's Late rule.",
      "Pick GM Review if you want to check the work before the reward is paid, or Honor System to pay at once. Photo proof asks the hero for a picture when they claim, and always means GM Review.",
      "Tap Ready on the last step. Until then the quest is a Draft that heroes can't see, and New Quest offers to Resume or Discard an unfinished draft.",
    ],
  },
  {
    id: "beast-log",
    title: "Doing quests",
    icon: "dragon",
    audience: "Heroes",
    intro: "Your quests live in the Beast Log, in the menu under your avatar.",
    steps: [
      "Board sorts quests into Overdue, Today, This week and Later. List shows them all, and Tamed holds the beasts you've beaten.",
      "Tap a quest to see its beast and its checklist.",
      "Claim when the chore is done, or Hunt to fight the beast for 25% more XP.",
      "A quest marked GM approves waits as Pending until a Game Master says yes. A Photo proof quest asks you to take a picture when you claim it.",
      "Finish a quest every day to grow your streak (the flame under your avatar). Days 3, 7, 14 and 30 open a chest, and every 7th day earns a shield that saves one missed day.",
      "Hero Records (Stats in the avatar menu, or Records in the streak box) shows your week to share, XP by week, the beasts you tame most and the ones you run from.",
    ],
  },
  {
    id: "battles",
    title: "Battles",
    icon: "swords",
    audience: "Heroes",
    intro: "In a battle the chores are the attack. Each one you finish hits the beast.",
    steps: [
      "Tackle opens the chore list: tap Done! for each chore you finish.",
      "A clock runs for every chore left. When it empties, the beast strikes and you lose HP.",
      "Defend takes half a hit and refills the clock. Powers and Goods use what you've earned.",
      "Run Away always works, but the beast gets one last hit and comes back stronger next time.",
      "Overdue quests send their beast after you as an ambush. A random fight with no quest behind it pays AP only.",
    ],
  },
  {
    id: "points",
    title: "XP, GP and AP",
    icon: "coins",
    audience: "Everyone",
    intro: "Every quest pays three kinds of points.",
    steps: [
      "XP never goes down. It raises your level, and each level adds max HP and MP.",
      "GP is gold for the shops. Your wallet holds a set amount; the rest goes to savings at the Gold Bank. Bigger wallets are sold in the shops.",
      "AP is never spent. Earning enough of it in a set time unlocks a Power, and if you stop earning, the Power locks again.",
    ],
  },
  {
    id: "vitals",
    title: "HP, MP and the Hospital",
    icon: "heartbeat",
    audience: "Heroes",
    intro: "Beasts take HP. Powers and tools cost MP.",
    steps: [
      "Heal at the Hospital, rest at the Hotel, or sleep in your Cozy Bed at home once a day for free.",
      "At 0 HP you're carried to the Hospital. The bill comes out of your gold, and anything left over is owed.",
      "While you owe the Hospital you're grounded: no Powers until you pay at the Gold Bank. A Game Master can forgive the bill.",
    ],
  },
  {
    id: "powers",
    title: "Powers",
    icon: "magic",
    audience: "Everyone",
    intro: "Powers are the privileges and spells AP unlocks, like screen time, picking the music or staying up late.",
    steps: [
      "Open Powers from the menu under your avatar to see what's unlocked and how much AP the rest need.",
      "Cast a Power with MP. Some come back daily or weekly.",
      "Game Masters make and edit Powers in the Compendium.",
    ],
  },
  {
    id: "shops",
    title: "Shops and real rewards",
    icon: "store",
    audience: "Everyone",
    intro: "Heroes spend gold at the Market in Home Town and at a shop in every region.",
    steps: [
      "Game items go straight into your bag.",
      "A Real Life reward, like a treat or an outing, waits for a Game Master to hand it over.",
      "Game Masters stock the shops in the Compendium's Economy.",
    ],
  },
  {
    id: "approvals",
    title: "Approvals",
    icon: "clipboard-check",
    audience: "Game Masters",
    intro: "Open the Dashboard and tap Approvals to see what's waiting.",
    steps: [
      "Achievements: tap Approve to pay a quest's reward, or Send back to put it back on the board. A Photo proof quest shows its picture here. You can also swipe a quest left.",
      "Accessories: tap Fulfil once you've handed a Real Life reward over, or Refund to give the gold back. Cash outs wait here too. With Approve every purchase on (Settings, Rewards), potions and other game items wait here as well and go into the hero's bag when you fulfil them.",
      "Town Hall: heroes' posts wait here before they go up.",
      "The Dashboard's Add Bonus and Take away Points handle anything a quest doesn't cover.",
    ],
  },
  {
    id: "world",
    title: "World Map and temples",
    icon: "map-marked-alt",
    audience: "Heroes",
    intro: "Beyond Home Town are nine regions, each with a shop, a hotel and a temple.",
    steps: [
      "On foot you can only reach Home Town and the Plains. Free your first Pegasus in the Wind Temple to fly.",
      "Temples are mazes of beasts, locked doors and chests. Beat the boss to free its Pegasus.",
      "Tools from temple chests help in battle, but no tool ever does a chore for you.",
      "Lost? Ask around town: the shopkeeper, the hotel and the bank pass on news about your next step. Journal in your avatar menu repeats your goal.",
      "Free all nine Pegasi to become a Sky Champion (500 XP, 300 GP and 9 AP, once). After that the Guide keeps you on today's beasts and your streak.",
    ],
  },
  {
    id: "town-hall",
    title: "Town Hall",
    icon: "landmark",
    audience: "Everyone",
    intro: "The Town Hall in Home Town connects your family to the Do It For The XP community. It needs the internet.",
    steps: [
      "News and Updates show what's new in the game.",
      "Board holds feature requests, ideas and feedback. Read them, or post your own.",
      "Packs is the Pack Exchange: quest sets other families made. Tap Get pack to load one, or share your own.",
      "Events lists your own quests for the week.",
    ],
  },
  {
    id: "phones",
    title: "Hero phones",
    icon: "mobile-alt",
    audience: "Game Masters",
    intro: "A hero's own phone can show their hero card. It needs the internet and a family connected to the Town Hall.",
    steps: [
      "In Settings, Family, tap Phones next to a hero, then Link a phone.",
      "On the hero's phone, choose I'm a hero with a family code and type the code or scan the QR.",
      "Quests are still done on the family device for now.",
      "The family server that links the phones is still being built. Until it is ready the app says the family's road to the city isn't open yet, and nothing is lost: try again later.",
    ],
  },
  {
    id: "data",
    title: "Your data and backups",
    icon: "save",
    audience: "Game Masters",
    intro: "Everything is kept on this device, and the game needs no sign-in. The Town Hall and hero phones use a free family account on the Town Hall site.",
    steps: [
      "Settings, General, Back up everything saves one file with everything. Passcodes are scrambled in it, but keep it safe.",
      "Restore from backup, in Settings, General, replaces what's on the device with the file. A Game Master can do it, and so can anyone on an empty device through Restore a backup on Choose A Profile.",
      "Settings, Packs loads ready-made worlds. Removing a pack takes back only what it added. Save as a file there keeps your own quests as a pack, and Import a pack file loads one a friend sent.",
      "Settings, Account links the family's For the XP account (the Town Hall's) from the menu, shows your plan, and opens the site to change your email or password.",
    ],
  },
  {
    id: "pro",
    title: "XP Pro",
    icon: "crown",
    audience: "Game Masters",
    intro: "Heroes, quests and beasts are free forever. XP Pro adds more for the Game Master.",
    steps: [
      "The Temple Creator, to build your own dungeons.",
      "Advanced schedules: custom repeats and several times a day.",
      "AI helpers for beast names, checklists and schedules, and six more game styles.",
      "On a new device, restore Pro with your key in Settings, XP Pro.",
    ],
  },
];

export const FAQ_GROUPS: FaqGroup[] = [
  {
    title: "For Game Masters",
    entries: [
      {
        question: "Do I need an account?",
        answer: "No. Profiles live on this device. Tap Start New Game on Choose A Profile to begin. The Town Hall and hero phones use a free account on the Town Hall site, but the game itself doesn't.",
      },
      {
        question: "What is Quick Start?",
        answer: "On an empty device, Choose A Profile offers Quick Start beside Start New Game. Type your name and a 4-digit PIN, name your kids and tap Start: each hero gets three evening quests and three small rewards in the Market. The three quests wait in Approvals for your OK, so the first night shows how the game works.",
      },
      {
        question: "How do I approve a chore?",
        answer: "Open the Dashboard and tap Approvals. On the Achievements tab, tap Approve to pay a quest's reward, or Send back to put it back on the board. Swiping a quest left shows the same two buttons.",
      },
      {
        question: "How do I choose which chores need my OK?",
        answer: "Each quest has its own setting. Pick GM Review when you make or edit the quest to check the work first, or Honor System to pay as soon as the hero claims it.",
      },
      {
        question: "What happens when a chore is late?",
        answer: "Out of the box nothing is taken away: the quest moves to Overdue in the Beast Log and its beast starts ambushing the hero until the chore is done. Settings, Chores, Late chores can lock a late chore (heroes see Too late), pay only a share of the loot for a late finish, or take a one-time penalty. All three are off until you switch them on, and each quest has its own Late rule to bend them.",
      },
      {
        question: "How do streaks work?",
        answer: "A hero who finishes at least one quest a day builds a streak. Days 3, 7, 14 and 30 (then every 30) open a chest of XP and GP, paid once the quests are approved. Every 7th day earns a Streak Shield (two at most) that covers one missed day. A missed day with no shield starts the streak over. Switch streaks off in Settings, Chores.",
      },
      {
        question: "Can the portal close at bedtime?",
        answer: "Yes. In Settings, Family, turn on Lights out and pick when it starts and ends. Between those times a hero's portal goes to sleep until morning. Game Masters are never locked out, a fight already running is finished first, and Choose a profile on the sleeping screen lets a Game Master sign in.",
      },
      {
        question: "Can some of the gold go straight to savings?",
        answer: "Yes. Settings, Chores, Auto-save GP sends 10%, 25% or 50% of every reward (quests, won fights, streak chests and temple treasure) to the hero's savings at the Gold Bank. Gifts and your own bonuses still go to the wallet.",
      },
      {
        question: "Can I check potion purchases too?",
        answer: "Yes. Turn on Approve every purchase in Settings, Rewards. Game items bought in a shop then wait in Approvals with the Real Life rewards, and go into the hero's bag when you fulfil them. A full bag keeps the item waiting until the hero makes room.",
      },
      {
        question: "Can a chore ask for a photo?",
        answer: "Yes. Turn on Photo proof in the quest's How hard step. The hero takes a picture when they claim it, you see it in Approvals beside Approve, and the quest always waits for your OK. The picture stays on this device and is deleted a week after you settle the claim.",
      },
      {
        question: "Can heroes cash out their GP?",
        answer: "Cash out is off until you turn it on in Settings, Rewards. There you set the rate (how much GP makes $1) and can tick the heroes who may use it. A hero then taps Cash Out in My Funds, the GP leaves their wallet, and the request waits in Approvals until you hand over the money.",
      },
      {
        question: "Can savings earn interest?",
        answer: "Yes, once you switch on Pay interest on savings in Settings, Rewards. Each week the Gold Bank adds a share of what every hero has saved, rounded down, and you pick the weekly rate. It is off until you turn it on.",
      },
      {
        question: "Will the phone remind us?",
        answer: "Yes, on this device. Settings, Alerts has Chore reminders, a nudge half an hour before a chore is due, even when the game is closed. They are booked for every hero from the app, so a kid doesn't have to open their portal first. Game Masters also get Approval reminders when a claim has waited too long, and you choose how long (1 to 8 hours, or Off).",
      },
      {
        question: "Can the week start on Sunday?",
        answer: "Yes. Settings, General, Week starts on moves the first day of the week for date pickers, a quest's day row and the weekly recap, for the whole family.",
      },
      {
        question: "Can I give or take points by hand?",
        answer: "Yes. On the Dashboard, the police box button opens Add Bonus to award XP, GP or AP, and Take away Points to remove GP.",
      },
      {
        question: "Where do I start if I don't want to build everything?",
        answer: "Load a pack in Settings, Packs. There are packs for families, classrooms, homeschool, study, fitness, roommates, solo adults and workplaces. Your own quests are never touched.",
      },
      {
        question: "How do I share my own pack?",
        answer: "In Settings, Packs, tap Save as a file under Share your own. On Android the file lands in Documents, on an iPhone the share sheet opens so you can pick Save to Files, and in a browser it downloads. Another family loads it with Import a pack file, or you can share it in the Town Hall's Pack Exchange. No heroes, logs or passcodes are in it.",
      },
      {
        question: "What is the recovery code?",
        answer: "It rescues a forgotten PIN: tap Forgot PIN on the pad and type the code to choose a new one. Until you tap I wrote it down, every unlock shows a fresh code and the old one stops working, so write it down and keep it from the kids. If you lose it, the Recovery code card in Settings, Family has a New code button that makes a fresh one.",
      },
      {
        question: "How do I play as one of my heroes?",
        answer: "Tap the hero on the Dashboard to masquerade as them. End Masquerade is in the menu under the hero's avatar.",
      },
    ],
  },
  {
    title: "For heroes",
    entries: [
      {
        question: "How do I earn XP?",
        answer: "Finish quests. Claim pays the quest's reward, and beating its beast in a Hunt pays 25% more XP.",
      },
      {
        question: "Why is my portal asleep?",
        answer: "It's bedtime. Your Game Master set lights out in Settings, Family, and the sleeping screen says when the portal opens again. Your quests will wait for you.",
      },
      {
        question: "Can I buy real things with my gold?",
        answer: "Yes, if your Game Master stocks them. A Real Life reward bought at a shop waits until a Game Master hands it over.",
      },
      {
        question: "Why can't I use my Powers?",
        answer: "Either you haven't earned enough AP lately, you're out of MP, or you're grounded because you owe the Hospital. Pay the bill at the Gold Bank to use Powers again.",
      },
      {
        question: "How do I get to other regions?",
        answer: "Walk to the Plains, then free the Pegasus in the Wind Temple. After that you can fly anywhere on the World Map.",
      },
      {
        question: "Can the words type out faster?",
        answer: "Yes. Pick Slow, Normal, Fast or Instant in Settings, Theme, Text speed. Tapping a text box still finishes a line early.",
      },
      {
        question: "How do I change my class?",
        answer: "Open the Equipment menu from the bottom bar and tap your class under your hero to open the Class Codex. New classes unlock when you reach level 10 in the class before them.",
      },
      {
        question: "How do I put an item in my hand?",
        answer: "Open the Equipment menu from the bottom bar and tap an item to see what it does and where it works. Then tap Left hand or Right hand, or tap the item again to put it in a free hand. Your hero holds it, and the button on that side of the bottom bar uses it.",
      },
    ],
  },
  {
    title: "Data and devices",
    entries: [
      {
        question: "Does it need the internet?",
        answer: "No. The game runs offline. The Town Hall, hero phones, buying XP Pro, AI helpers and Discover Quests need a connection, and the music falls back to built-in tunes offline.",
      },
      {
        question: "How do I back up the game?",
        answer: "Open Settings, General and tap Back up everything. It saves one file: on Android it lands in Documents, on an iPhone the share sheet opens so you can pick Save to Files, and in a browser it downloads. Passcodes are scrambled in it, but keep the file somewhere safe.",
      },
      {
        question: "Where is my data stored?",
        answer: "On this device only. Back it up in Settings, General before clearing the browser or moving to a new device.",
      },
      {
        question: "What is Settings, Account?",
        answer: "The family's account is the Game Master's Town Hall account on doit.forthexp.com; heroes have none. The page links or unlinks this device, shows your plan, and opens the site when you want to change your email or password. Google and Apple sign-in are coming.",
      },
      {
        question: "How do I move to a new device?",
        answer: "Back up on the old device and open the app on the new one. On the empty Choose A Profile screen tap Restore a backup and pick the file; Restore from backup in Settings, General does the same. Restore XP Pro with your key in Settings, XP Pro.",
      },
      {
        question: "How do I start over?",
        answer: "Delete profiles in Settings, Family, remove packs in Settings, Packs, or restore an older backup. The last Game Master can't be deleted.",
      },
    ],
  },
];

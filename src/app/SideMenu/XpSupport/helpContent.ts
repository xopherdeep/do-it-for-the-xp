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
      "Tap Press Start, then Start New Game on Choose A Profile.",
      "The first profile on a device is a Game Master. Game Masters need a 4-digit passcode.",
      "Add your heroes in Settings, Family. A hero's passcode is optional.",
      "Load a pack in Settings, Packs, or make your own quests in the Compendium. A new game has no quests until you do one of the two.",
      "The first time a hero opens their portal, a guide walks them through the XP bar and the bottom buttons. Replay it from Settings, General, Show the portal tour again.",
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
      "How hard: the difficulty sets the reward (100 XP, 10 GP and 1 AP per step) and the minutes set the battle clock.",
      "Pick GM Review if you want to check the work before the reward is paid, or Honor System to pay at once.",
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
      "A quest marked GM approves waits as Pending until a Game Master says yes.",
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
      "Achievements: swipe a quest to Approve and pay its reward, or Reject to put it back on the board.",
      "Accessories: Fulfil a Real Life reward once you've handed it over, or Refund the gold.",
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
    ],
  },
  {
    id: "data",
    title: "Your data and backups",
    icon: "save",
    audience: "Game Masters",
    intro: "Everything is kept on this device. There's no account to sign in to.",
    steps: [
      "Settings, Backup downloads one file with everything, passcodes included. Keep it safe.",
      "Restore from backup replaces what's on the device with the file. Only a Game Master can do it.",
      "Settings, Packs loads ready-made worlds. Removing a pack takes back only what it added.",
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
        question: "How do I approve a chore?",
        answer: "Open the Dashboard and tap Approvals. On the Achievements tab, swipe a quest and tap Approve to pay its reward, or Reject to put it back on the board.",
      },
      {
        question: "How do I choose which chores need my OK?",
        answer: "Each quest has its own setting. Pick GM Review when you make or edit the quest to check the work first, or Honor System to pay as soon as the hero claims it.",
      },
      {
        question: "What happens when a chore is late?",
        answer: "Nothing is taken away. The quest moves to Overdue in the Beast Log and its beast starts ambushing the hero until the chore is done.",
      },
      {
        question: "How do streaks work?",
        answer: "A hero who finishes at least one quest a day builds a streak. Days 3, 7, 14 and 30 (then every 30) open a chest of XP and GP, paid once the quests are approved. Every 7th day earns a Streak Shield (two at most) that covers one missed day. A missed day with no shield starts the streak over. Switch streaks off in Settings, Chores.",
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
        answer: "Open the Equipment menu from the bottom bar and use the Class Codex. New classes unlock when you reach level 10 in the class before them.",
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
        question: "Where is my data stored?",
        answer: "On this device only. Back it up in Settings, Backup before clearing the browser or moving to a new device.",
      },
      {
        question: "What is Settings, Account?",
        answer: "The family's account is the Game Master's Town Hall account on doit.forthexp.com; heroes have none. The page links or unlinks this device, shows your plan, and opens the site when you want to change your email or password. Google and Apple sign-in are coming.",
      },
      {
        question: "How do I move to a new device?",
        answer: "Back up on the old device, open the app on the new one, then use Restore from backup in Settings, Backup. Restore XP Pro with your key in Settings, XP Pro.",
      },
      {
        question: "How do I start over?",
        answer: "Delete profiles in Settings, Family, remove packs in Settings, Packs, or restore an older backup. The last Game Master can't be deleted.",
      },
    ],
  },
];

/**
 * The Beast Maker's words (XpBeastMakerModal, beastMaker.ts): the guide line on each screen, the two look tiles, the
 * name and chore fields, the note before Send it, the fanfare and the two buttons after it, and the toasts. The
 * maker's own words (the beast's name, the chores) stay as typed in every voice.
 */
import type { CopyCatalog } from "../voices";

export const beastMaker = {
  "beastMaker.title": {
    adventure: "Beast Maker",
  },

  // The guide asks one question per screen; the simple voice reads it aloud
  "beastMaker.guide.look": {
    simple: "Show me your beast!",
    adventure: "Show the village your beast.",
    classic: "Choose the beast's look.",
  },
  "beastMaker.guide.name": {
    adventure: "What is it called?",
    classic: "Name the beast.",
  },
  "beastMaker.guide.chores": {
    simple: "What chores beat it?",
    adventure: "Which chores bring it down?",
    classic: "List the chores that defeat it.",
  },
  "beastMaker.guide.ready": {
    simple: "Send it to a grown-up.",
    adventure: "Here it stands. Send it to the Game Master.",
    classic: "Review it, then send it for approval.",
  },

  // 1. Look
  "beastMaker.look.photo": {
    adventure: "Take a picture of your drawing",
    classic: "Photograph a drawing",
  },
  "beastMaker.look.library": {
    adventure: "Pick one from the library",
    classic: "Choose from the library",
  },
  "beastMaker.look.search": {
    simple: "Find a beast",
    adventure: "Search the library",
  },
  "beastMaker.look.noMatch": {
    simple: "No beast for that. Try another word.",
    adventure: "No beast by that name. Try another word.",
    classic: "No match. Try another word.",
  },
  "beastMaker.look.background": {
    simple: "Change the background",
    adventure: "Change the battlefield",
    classic: "Background",
  },

  // 2. Name
  "beastMaker.name.placeholder": {
    simple: "Type its name",
    adventure: "Its name",
    classic: "Beast name",
  },
  "beastMaker.name.suggest": {
    adventure: "Suggest a name",
  },

  // 3. Chores
  "beastMaker.chores.placeholder": {
    simple: "Add a chore",
    adventure: "Add a chore it loses to",
    classic: "Add a chore",
  },
  "beastMaker.chores.none": {
    simple: "No chores yet. Add one below.",
    adventure: "No chores yet. Add the first one below.",
    classic: "No chores yet.",
  },
  "beastMaker.chores.full": {
    simple: "Five is the most.",
    adventure: "Five chores is plenty. Send it!",
    classic: "Five chores at most.",
  },

  // 4. Ready
  "beastMaker.ready.note": {
    simple: "A grown-up looks at it first.",
    adventure: "A Game Master looks at it first.",
    classic: "Awaits Game Master review.",
  },
  "beastMaker.ready.send": {
    adventure: "Send it",
    classic: "Send",
  },

  // Sent: the fanfare, then Make a quest with it or Done
  "beastMaker.done.title": {
    simple: "Sent!",
    adventure: "Sent to the Game Master!",
    classic: "Sent for review.",
  },
  "beastMaker.done.next": {
    simple: "OK!",
    adventure: "OK",
    classic: "Continue",
  },
  "beastMaker.done.quest": {
    adventure: "Make a quest with it",
    classic: "Create a quest with it",
  },
  "beastMaker.done.close": {
    adventure: "Done",
  },

  // My creations, the Maker's opening screen when the hero has made things (myCreations.ts, XpMyCreations.vue)
  "beastMaker.state.waiting": {
    adventure: "Waiting",
    classic: "Pending",
  },
  "beastMaker.state.back": {
    adventure: "Came back",
    classic: "Returned",
  },
  "beastMaker.state.inGame": {
    adventure: "In the game",
    classic: "Approved",
  },
  "beastMaker.list.title": {
    simple: "Your beasts",
    adventure: "Your creations",
  },
  "beastMaker.list.new": {
    adventure: "Draw a new beast",
  },
  "beastMaker.list.fix": {
    adventure: "Fix it",
  },
  "beastMaker.list.resend": {
    adventure: "Send again",
  },
  "beastMaker.list.delete": {
    adventure: "Delete",
  },
  // Under a beast that is in the game, on its card: the card there only shows it
  "beastMaker.list.cardNote": {
    simple: "Hunt it in the Beast Log.",
    adventure: "Hunt this beast from the Beast Log.",
    classic: "Hunt it from the Beast Log.",
  },

  // Toasts
  "beastMaker.cap": {
    simple: "Ask a grown-up to look at your creations first.",
    adventure: "Ask a Game Master to look at your creations first.",
    classic: "Creation limit reached. Await Game Master review.",
  },
  "beastMaker.error.notSaved": {
    simple: "It did not save. Try again.",
    adventure: "Your beast could not be saved. Try again.",
  },
  "beastMaker.error.list": {
    adventure: "That did not work. Try again.",
  },
  "beastMaker.error.photo": {
    simple: "That picture didn't work. Try again.",
    adventure: "That picture didn't work. Try again or pick one from the library.",
    classic: "The picture could not be used. Try again or choose from the library.",
  },
} satisfies CopyCatalog;

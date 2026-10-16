/**
 * The hero's own wallet app (My Funds): cash out, send and request GP, and its empty states. The bank's money moves
 * (deposit, withdraw, pay down, borrow) speak in the teller's words, in npc.ts. A voice that reads the same as
 * adventure is left out: the adventure line is the fallback.
 */
import type { CopyCatalog } from "../voices";

export const wallet = {
  "wallet.cashOut.ask": {
    simple: "{rate} GP is $1. How much?",
    adventure: "Trade GP for real money: {rate} GP makes $1. A Game Master hands it over. How much?",
    classic: "Rate: {rate} GP per $1. Paid out by a Game Master. Cash out how much?",
  },
  "wallet.cashOut.off": {
    simple: "Cash out is off. Ask a grown-up.",
    adventure: "Cash out is switched off. A Game Master can turn it on in Settings, under Rewards.",
    classic: "Cash out disabled. A Game Master can enable it under Settings > Rewards.",
  },
  "wallet.cashOut.notAllowed": {
    simple: "Cash out is not on for you.",
    adventure: "Cash out isn't open to you yet. Ask a Game Master.",
    classic: "Cash out is not enabled for this hero.",
  },
  "wallet.cashOut.short": {
    simple: "You need {rate} GP for $1.",
    adventure: "You need at least {rate} GP in your wallet to make $1.",
    classic: "Minimum cash out: {rate} GP.",
  },
  "wallet.cashOut.sent": {
    simple: "Sent! A grown-up will give you {cash}.",
    adventure: "{gp} GP traded in! A Game Master will hand you {cash}.",
    classic: "Cash out of {cash} ({gp} GP) is awaiting a Game Master.",
  },
  "wallet.send.menu": {
    simple: "Send GP, or ask for some?",
    adventure: "Share your gold, or ask someone for some?",
    classic: "Send or request GP?",
  },
  "wallet.send.pickHero": {
    simple: "Who gets it?",
    adventure: "Who should get your GP?",
    classic: "Select a recipient.",
  },
  "wallet.ask.pickHero": {
    simple: "Who do you ask?",
    adventure: "Who will you ask for GP?",
    classic: "Select a hero to ask.",
  },
  "wallet.send.amount": {
    simple: "How much for {name}?",
    adventure: "How much will you send {name}? Your wallet holds {wallet}.",
    classic: "Send {name} how much? Wallet: {wallet}.",
  },
  "wallet.ask.amount": {
    simple: "How much do you want?",
    adventure: "How much will you ask {name} for?",
    classic: "Request how much from {name}?",
  },
  "wallet.send.done": {
    simple: "{name} got {amount}!",
    adventure: "Whoosh! {amount} is in {name}'s wallet.",
    classic: "Sent {amount} to {name}.",
  },
  "wallet.ask.done": {
    simple: "Asked! {name} will see it.",
    adventure: "Request sent! {name} will find it in their wallet.",
    classic: "Request for {amount} sent to {name}.",
  },
  "wallet.send.empty": {
    simple: "Your wallet is empty.",
    adventure: "Your wallet is empty. Nothing to send!",
    classic: "Wallet empty.",
  },
  "wallet.send.alone": {
    simple: "Nobody else is here yet.",
    adventure: "There's nobody else in the family to trade with yet.",
    classic: "No other profiles found.",
  },
  "wallet.request.short": {
    simple: "Not enough GP for that.",
    adventure: "Your wallet can't cover that request yet.",
    classic: "Insufficient GP for this request.",
  },
  "wallet.request.paid": {
    simple: "You sent {name} {amount}!",
    adventure: "Paid! {name} got {amount}.",
    classic: "Paid {name} {amount}.",
  },
  "wallet.empty.recent": {
    simple: "No GP yet. Do a quest!",
    adventure: "No gold has moved yet. Finish a quest to fill your wallet!",
    classic: "No transactions yet.",
  },
  "wallet.empty.range": {
    simple: "Nothing then.",
    adventure: "No gold moved in this stretch of time.",
    classic: "No transactions in this range.",
  },
} satisfies CopyCatalog;

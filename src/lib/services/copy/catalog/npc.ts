/**
 * What the town's NPCs say: the Gold Bank and its ATM, the shops, Nurse Joy, the concierge and the Town Clerk. Menu
 * and button labels (Withdraw, Pay & Heal, Browse the shelves) and the names of people, places and items stay the
 * same in every voice. A voice that reads the same as adventure is left out: the adventure line is the fallback.
 * Amounts arrive already printed ({amount} is "₲40").
 */
import type { CopyCatalog } from "../voices";

export const npc = {
  "npc.more": {
    simple: "Anything else?",
    adventure: "Anything else I can do for you?",
    classic: "Anything else?",
  },

  // ---- Gold Bank: the banker's welcome --------------------------------------------------------------------------
  "bank.greet.welcome": {
    simple: "Hello! This is the Gold Bank.",
    adventure: "Welcome to the Gold Bank! I'm the bank manager. How can I assist you with your finances today?",
    classic: "Gold Bank. How may I help you?",
  },
  "bank.greet.bill": {
    simple: "You owe the Hospital {bill}. Pay it to be free!",
    adventure: "The Hospital says you owe {bill}. Pay it down here and you're no longer grounded.",
    classic: "Hospital bill: {bill}. Paying it ends your grounding.",
  },
  "bank.greet.services": {
    simple: "You can save gold or take it out.",
    adventure: "We offer several banking services including deposits, withdrawals, and debt management.",
    classic: "Services: deposits, withdrawals and debt payments.",
  },
  "bank.greet.wallet": {
    simple: "Your wallet holds {limit}.",
    adventure: "Your wallet holds {limit}. {hint}",
    classic: "Wallet capacity: {limit}. {hint}",
  },
  "bank.greet.storage": {
    simple: "Need more room? {offer}.",
    adventure: "Running out of room in your bag? We sell storage for home. {offer}.",
    classic: "Home storage is on sale. {offer}.",
  },
  "bank.greet.atm": {
    simple: "You can also use the ATM.",
    adventure: "Our secure ATM is also available if you need to access your accounts or perform transactions.",
    classic: "The ATM is also available.",
  },

  // ---- Gold Bank: refusals and receipts -------------------------------------------------------------------------
  "bank.refusal.noSavings": {
    simple: "You have no savings yet.",
    adventure: "You have nothing saved. Your savings are empty!",
    classic: "Savings are empty.",
  },
  "bank.refusal.walletFull": {
    simple: "Your wallet is full.",
    adventure: "Your wallet is full! It holds {limit} at most.",
    classic: "Wallet full. Limit: {limit}.",
  },
  "bank.refusal.nameWithdraw": {
    simple: "Pick an amount first.",
    adventure: "Name an amount to withdraw first.",
    classic: "Specify an amount to withdraw.",
  },
  "bank.refusal.walletEmpty": {
    simple: "Your wallet is empty.",
    adventure: "Your wallet is empty! Nothing to deposit.",
    classic: "Wallet empty. Nothing to deposit.",
  },
  "bank.refusal.nameDeposit": {
    simple: "Pick an amount first.",
    adventure: "Name an amount to deposit first.",
    classic: "Specify an amount to deposit.",
  },
  "bank.refusal.noDebt": {
    simple: "You owe nothing!",
    adventure: "You owe nothing. Debt-free!",
    classic: "No debt outstanding.",
  },
  "bank.refusal.walletEmptyDebt": {
    simple: "Your wallet is empty.",
    adventure: "Your wallet is empty! Come back with some GP.",
    classic: "Wallet empty. Return with GP.",
  },
  "bank.refusal.namePay": {
    simple: "Pick an amount first.",
    adventure: "Name an amount to pay first.",
    classic: "Specify an amount to pay.",
  },
  "bank.refusal.loanBill": {
    simple: "Pay the Hospital first. Then ask again.",
    adventure: "The bank won't lend while the Hospital is owed. Pay that bill first.",
    classic: "Loans unavailable while a hospital bill is outstanding.",
  },
  "bank.refusal.loanWalletFull": {
    simple: "Your wallet is full. No room for a loan.",
    adventure: "Your wallet is already full. There's no room for a loan.",
    classic: "Wallet full. Loan declined.",
  },
  "bank.refusal.loanLine": {
    simple: "You owe too much to borrow more.",
    adventure: "You've borrowed all the bank will lend ({line}). Pay some back first.",
    classic: "Credit line of {line} in use. Repay to borrow again.",
  },
  "bank.receipt.withdraw": {
    simple: "You took out {amount}. Wallet: {wallet}",
    adventure: "{amount} withdrawn. Wallet: {wallet} | Savings: {savings}.",
    classic: "Withdrew {amount}. Wallet: {wallet} | Savings: {savings}.",
  },
  "bank.receipt.deposit": {
    simple: "You saved {amount}. Savings: {savings}",
    adventure: "{amount} deposited. Wallet: {wallet} | Savings: {savings}.",
    classic: "Deposited {amount}. Wallet: {wallet} | Savings: {savings}.",
  },
  "bank.receipt.payDebt": {
    simple: "You paid {amount}. Debt: {debt}",
    adventure: "{amount} paid. Wallet: {wallet} | Debt: {debt}.",
    classic: "Paid {amount}. Wallet: {wallet} | Debt: {debt}.",
  },
  "bank.receipt.payBill": {
    simple: "You paid {amount}. Bill: {bill}",
    adventure: "{amount} paid. Wallet: {wallet} | Bill: {bill} | Debt: {debt}.",
    classic: "Paid {amount}. Wallet: {wallet} | Bill: {bill} | Debt: {debt}.",
  },
  "bank.receipt.borrow": {
    simple: "You got {amount}. You owe {debt}.",
    adventure: "{amount} lent. Wallet: {wallet} | You owe: {debt}.",
    classic: "Loan of {amount}. Wallet: {wallet} | Debt: {debt}.",
  },
  "bank.receipt.billFree": {
    simple: "Bill paid. You are free!",
    adventure: "Bill paid. You're free!",
    classic: "Bill settled.",
  },
  "bank.cap.walletFull": {
    simple: "Your wallet holds {room} more.",
    adventure: "Your wallet only holds {room} more.",
    classic: "Wallet capacity: {room} more.",
  },
  "bank.cap.savings": {
    simple: "That was all your savings.",
    adventure: "That was everything you had saved.",
    classic: "Savings depleted.",
  },
  "bank.cap.wallet": {
    simple: "That was all your wallet had.",
    adventure: "That was everything in your wallet.",
    classic: "Wallet emptied.",
  },
  "bank.cap.debt": {
    simple: "Your debt is gone!",
    adventure: "That clears your debt entirely!",
    classic: "Debt cleared.",
  },
  "bank.cap.credit": {
    simple: "That is all the bank will lend.",
    adventure: "That's all the bank will lend you for now.",
    classic: "Credit line reached.",
  },

  // ---- Gold Bank: storage for home ------------------------------------------------------------------------------
  "bank.storage.maxed": {
    simple: "Your storage is the biggest.",
    adventure: "Your storage is as big as it gets.",
    classic: "Storage is at its maximum size.",
  },
  "bank.storage.question": {
    simple: "{name} holds {slots} things. Buy for {price} GP?",
    adventure: "{name} holds {slots} things. {price} GP?",
    classic: "{name}: {slots} slots for {price} GP. Purchase?",
  },
  "bank.storage.topUp": {
    simple: "You are {short} GP short. Use savings?",
    adventure: "Your wallet is {short} GP short. Take the rest from your savings?",
    classic: "Wallet short by {short} GP. Use savings?",
  },
  "bank.storage.shortAll": {
    simple: "You need {short} more GP. Come back later.",
    adventure: "You are {short} GP short, savings and all. Come back when you have more!",
    classic: "Short by {short} GP, savings included.",
  },
  "bank.storage.shortWallet": {
    simple: "Your wallet needs {short} more GP.",
    adventure: "Your wallet is {short} GP short.",
    classic: "Wallet short by {short} GP.",
  },
  "bank.storage.noAccount": {
    simple: "I can't find your account.",
    adventure: "I can't find your account.",
    classic: "Account not found.",
  },
  "bank.storage.gotBox": {
    simple: "You got a Storage Box! {slots} slots.",
    adventure: "You got a Storage Box! {slots} slots",
    classic: "Storage Box purchased. {slots} slots.",
  },
  "bank.storage.grew": {
    simple: "Your storage now has {slots} slots!",
    adventure: "Your storage grew to {slots} slots!",
    classic: "Storage expanded to {slots} slots.",
  },
  "bank.storage.fromSavings": {
    simple: "({n} GP came from savings.)",
    adventure: "({n} GP came out of your savings.)",
    classic: "({n} GP taken from savings.)",
  },

  // ---- Gold Bank, ATM and My Gold: the questions ----------------------------------------------------------------
  "bank.ask.atmWelcome": {
    simple: "Hi! What do you want to do?",
    adventure: "Welcome. What would you like to do?",
    classic: "Select a transaction.",
  },
  "bank.ask.savingsMenu": {
    simple: "Savings: {savings}. Wallet: {wallet}.",
    adventure: "Savings: {savings}. Wallet: {wallet}. What would you like to do?",
    classic: "Savings: {savings} | Wallet: {wallet}",
  },
  "bank.ask.withdraw": {
    simple: "How much to take out? You have {saved}.",
    adventure: "How much would you like to withdraw? You have {saved} saved.",
    classic: "Withdraw how much? Savings: {saved}.",
  },
  "bank.ask.deposit": {
    simple: "How much to save? Wallet: {wallet}.",
    adventure: "How much would you like to deposit? Your wallet holds {wallet}.",
    classic: "Deposit how much? Wallet: {wallet}.",
  },
  "bank.ask.payBill": {
    simple: "You owe the Hospital {bill}. How much?",
    adventure: "The Hospital is owed {bill}. How much will you pay?",
    classic: "Hospital bill: {bill}. Pay how much?",
  },
  "bank.ask.payDebt": {
    simple: "You owe {debt}. How much will you pay?",
    adventure: "You owe {debt}. How much will you pay down?",
    classic: "Debt: {debt}. Pay how much?",
  },
  "bank.ask.borrow": {
    simple: "Borrow up to {max}. Pay back 10% more.",
    adventure: "The bank can lend you up to {max}. You'll pay back 10% more. How much?",
    classic: "Loan up to {max}, 10% fee. Borrow how much?",
  },
  "bank.ask.debtMenu": {
    simple: "You owe {debt}. Pay or borrow?",
    adventure: "You owe {debt}. Pay it down, or borrow from the bank?",
    classic: "Debt: {debt}. Select a transaction.",
  },

  // ---- Shops ----------------------------------------------------------------------------------------------------
  "shop.closed": {
    simple: "We are closed now. {opensAt}.",
    adventure: "Sorry, we're closed right now. {opensAt}.",
    classic: "Closed. {opensAt}.",
  },
  "shop.charm": {
    simple: "Nice! Everything is {discount} for you.",
    adventure: "My, what charm! Everything's {discount} for you, and the tags already show it.",
    classic: "Charisma discount: {discount}. The tags show the new prices.",
  },
  "shop.walletUp": {
    simple: "That wallet holds more GP than yours.",
    adventure: "That wallet up front holds more GP than yours. Have a look if your purse is bursting.",
    classic: "A larger wallet is on display.",
  },
  "shop.traveling": {
    simple: "I am in {where} today only.",
    adventure: "I'm only in {where} today. Tomorrow? Wherever the wind takes my balloon!",
    classic: "I am in {where} today only.",
  },
  "shop.swipe": {
    simple: "Swipe the shelf. Tap to look closer.",
    adventure: "Swipe along the shelf, and tap anything for a closer look.",
    classic: "Swipe the shelf. Tap an item for details.",
  },
  "shop.wallet.level": {
    simple: "Come back at level {level}.",
    adventure: "Come back at level {level}, kid.",
    classic: "Level {level} required.",
  },
  "shop.wallet.pitch": {
    simple: "It holds {limit}. It costs {price}.",
    adventure: "Holds {limit}. That'll be {price}, out of your savings first.",
    classic: "Capacity: {limit}. Price: {price}. Savings are used first.",
  },
  "shop.wallet.poor": {
    simple: "You need {short} more. Come back later.",
    adventure: "You are {short} short, savings and all. Come back when your purse is fuller!",
    classic: "Short by {short}, savings included.",
  },
  "shop.wallet.biggest": {
    simple: "You have the biggest wallet!",
    adventure: "You already carry the biggest wallet there is.",
    classic: "You already own the largest wallet.",
  },
  "shop.wallet.receipt": {
    adventure: "Your wallet now holds {limit}!",
    classic: "Wallet capacity: {limit}.",
  },
  "shop.buy.receipt": {
    simple: "Here is your {item}! The Game Master brings it.",
    adventure: "Here you go: {item}! The Game Master will bring it to you.",
    classic: "{item} purchased. The Game Master will deliver it.",
  },
  "shop.buy.consumableReceipt": {
    simple: "{item} is in your backpack!",
    adventure: "Here you go: {item}! It's packed safely in your bag.",
    classic: "{item} purchased and placed in inventory.",
  },
  "shop.buy.short": {
    simple: "You need {short} more for {item}.",
    adventure: "You need {short} more to buy {item}. Come back when your purse is fuller!",
    classic: "{item}: short by {short}.",
  },
  "shop.buy.bagFull": {
    simple: "Your bag is full! Store something at home first.",
    adventure: "Your bag is completely full! Store something at home before buying more.",
    classic: "Bag full. Cannot carry item.",
  },
  "shop.buy.snag": {
    simple: "The till is stuck. Nothing was bought.",
    adventure: "Oh dear, the till jammed, so nothing was bought. Please try again!",
    classic: "Transaction failed. Nothing was charged.",
  },

  // ---- Hospital: Nurse Joy --------------------------------------------------------------------------------------
  "nurse.greet.welcome": {
    simple: "Hi! I'm Nurse Joy. How do you feel?",
    adventure: "Welcome to the Hospital Hub! *adjusts stethoscope* I'm Nurse Joy. How are you feeling today?",
    classic: "Hospital. I'm Nurse Joy. How are you feeling?",
  },
  "nurse.greet.adventure": {
    simple: "You look tired. I can help you heal.",
    adventure: "You look like you've had quite an adventure out there! We're here to help you recover and get back on your feet.",
    classic: "You look worn out. We can help you recover.",
  },
  "nurse.greet.services": {
    simple: "What do you need today?",
    adventure: "Our hospital offers several services to help adventurers like yourself. What can I assist you with today?",
    classic: "What do you need?",
  },
  "nurse.care.heal": {
    simple: "Healing costs {cost} GP. Heal now?",
    adventure: "The cost to heal is {cost} GP. Shall I get started?",
    classic: "Healing: {cost} GP. Proceed?",
  },
  "nurse.care.revive": {
    simple: "Reviving costs {cost} GP. Revive now?",
    adventure: "The cost to revive is {cost} GP. Shall I get started?",
    classic: "Revival: {cost} GP. Proceed?",
  },
  "nurse.refuse.healthy": {
    simple: "You are already healthy!",
    adventure: "*checks your chart* You're already in perfect health! Come back if that changes.",
    classic: "You are already at full health.",
  },
  "nurse.refuse.poor": {
    simple: "It costs {cost}. You need more GP.",
    adventure: "*frowns at the ledger* I'm sorry, dear, this costs {cost} and your wallet is short. Come back when you can.",
    classic: "Cost: {cost}. Insufficient funds.",
  },
  "nurse.receipt.care": {
    simple: "{verb}! You paid {cost}. {stats}",
    adventure: "{verb}! {cost} paid. {stats}",
    classic: "{verb}. {cost} paid. {stats}",
  },
  "nurse.bench.healthy": {
    simple: "You are healthy. The bench is for hurt heroes.",
    adventure: "*checks your chart* You're in perfect health! The bench is for the wounded, dear.",
    classic: "You are healthy. The bench is for the wounded.",
  },
  "nurse.bench.napped": {
    simple: "You napped today. Come back tomorrow.",
    adventure: "*taps the clock* You've had your nap for today. Come back tomorrow, or see me for a proper heal.",
    classic: "Rest already taken today. Return tomorrow, or buy a heal.",
  },
  "nurse.bench.receipt": {
    simple: "You nap on the bench. +{gain} HP.{hp}",
    adventure: "You doze off on the waiting-room bench... +{gain} HP.{hp} Same time tomorrow?",
    classic: "Rested on the bench. +{gain} HP.{hp}",
  },

  // ---- Hotel: the concierge -------------------------------------------------------------------------------------
  "hotel.greet.welcome": {
    simple: "Welcome to {hotel}!",
    adventure: "Welcome to {hotel}! I'm your concierge, at your service.",
    classic: "{hotel}. How may I help?",
  },
  "hotel.greet.amenities": {
    simple: "You can rest in a room here.",
    adventure: "Our hotel offers comfortable rooms and several amenities for weary travelers like yourself.",
    classic: "We offer rooms and community events.",
  },
  "hotel.greet.ask": {
    simple: "Do you want to rest?",
    adventure: "Would you like to rest for the night or perhaps check out our community events?",
    classic: "Rest for the night, or view the community events?",
  },
  "hotel.room.confirm": {
    simple: "A room costs {cost} GP. You heal fully. Stay?",
    adventure: "A night's rest is {cost} GP and restores you fully. Check in?",
    classic: "Room: {cost} GP. Full restoration. Check in?",
  },
  "hotel.refuse.healthy": {
    simple: "You look rested! Come back when you are tired.",
    adventure: "*smiles* You look perfectly rested already! The room will be here when you need it.",
    classic: "You do not need rest.",
  },
  "hotel.refuse.poor": {
    simple: "A room costs {cost}. You need more GP.",
    adventure: "*checks the register* A room is {cost} a night, and your wallet is short. Do come back.",
    classic: "Room: {cost}. Insufficient funds.",
  },
  "hotel.receipt": {
    adventure: "Good morning! {cost} paid. {stats}",
    classic: "Morning. {cost} paid. {stats}",
  },
  "hotel.board.empty": {
    adventure: "Nothing on the board tonight.",
    classic: "The board is empty.",
  },

  // ---- Town Hall: the clerk -------------------------------------------------------------------------------------
  "clerk.welcome": {
    simple: "Hi! What goes on the board?",
    adventure: "Welcome to the Town Hall! What would you like to put on the board?",
    classic: "Town Hall. What would you like to post?",
  },
  "clerk.soon": {
    simple: "{what}: coming soon!",
    adventure: "*shuffles papers* {what}: coming soon, friend.",
    classic: "{what}: not yet available.",
  },
} satisfies CopyCatalog;

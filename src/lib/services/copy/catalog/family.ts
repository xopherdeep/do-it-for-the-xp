/**
 * What the Town Clerk says about the family on the server (multiplayer, part 1): the home device, the family's account,
 * kid phones and their codes. Written in the adventure voice; the simple and classic voices fall back to it until they
 * get wording of their own.
 */
import type { CopyCatalog } from "../voices";

export const family = {
  "family.homeElsewhere": {
    adventure: "This family's home is another device. Make this one home?",
  },
  "family.otherFamily": {
    adventure:
      "This account already runs another family. Bring it here with a backup file, or link this phone as a hero's phone with a code from the family's device.",
  },
  "family.taken": {
    adventure: "This family is registered to another account.",
  },
  "family.notMember": {
    adventure: "The site doesn't know your family yet. Register the family with me first.",
  },
  "family.offline": {
    adventure: "The courier hasn't arrived. I'll keep trying.",
  },
  "family.needsNickname": {
    adventure: "{name} needs a nickname first. Friends will see it, so not their full name.",
  },
  "family.codeInvalid": {
    adventure: "That code didn't work. Ask your Game Master for a new one.",
  },
  "family.unlinked": {
    adventure: "This phone was unlinked. Ask your Game Master to link it again.",
  },
  "family.questsElsewhere": {
    adventure: "Your quests are on the family device.",
  },
  "family.phoneQuests": {
    adventure: "Quests",
  },
  "family.phoneNoQuests": {
    adventure: "No quests to claim right now. Well done, hero!",
  },
  "family.phoneClaims": {
    adventure: "My claims",
  },
  "family.phoneClaimDone": {
    adventure: "Done!",
  },
  "family.phoneClaimed": {
    adventure: "Claimed! Your Game Master will check {quest}.",
  },
  "family.phoneClaimedPaid": {
    adventure: "Claimed! {quest} pays as soon as the family device hears.",
  },
  "family.phoneClaimOffline": {
    adventure: "No signal. {quest} is saved here and goes when you're back online.",
  },
  "family.phonePhoto": {
    adventure: "Show your Game Master in person: a phone claim can't carry the photo.",
  },
  "family.claim.unsent": {
    adventure: "Not sent yet",
  },
  "family.claim.waiting": {
    adventure: "Sent",
  },
  "family.claim.pending": {
    adventure: "Waiting for your Game Master",
  },
  "family.claim.approved": {
    adventure: "Approved",
  },
  "family.claim.rejected": {
    adventure: "Not this time",
  },
  "family.claim.refused": {
    adventure: "Couldn't send",
  },
  "family.linked": {
    adventure: "Welcome, {nickname}! This phone is yours now.",
  },
  "family.removePhone": {
    adventure: "Unlink {label}? It stops working right away.",
  },
} satisfies CopyCatalog;

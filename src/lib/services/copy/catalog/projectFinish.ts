/**
 * What a project says when it is over: the reward reveal each hero is shown once, the credits roll's headings, the
 * trophy sheet in Hometown and the Game Master's "Family reward earned" row in Approvals (finishPrompts.ts,
 * CreditsRoll.vue, ProjectTrophySheet.vue, ApprovalFamilyRewardRow.vue). Tower, phase and floor names, the makers'
 * names and roles (credits.ts), and the family's own words for the reward are the same in every voice. {days} and
 * {chores} arrive as digits and {multiplier} with one decimal; {date} is a short day ("Sat Apr 3").
 */
import type { CopyCatalog } from "../voices";

export const projectFinish = {
  // The reward reveal (the in-world prompt), shown to each hero once
  "projectFinish.reward.title": {
    simple: "You won a prize!",
    adventure: "Family reward unlocked!",
    classic: "Family reward unlocked.",
  },
  "projectFinish.reward.won": {
    simple: "{tower} is done! You earned:",
    adventure: "{tower} is conquered! Your family earned:",
    classic: "{tower} is cleared. Your family earned:",
  },
  "projectFinish.reward.ask": {
    simple: "Ask a grown-up to give it.",
    adventure: "Ask a Game Master to hand it over.",
    classic: "A Game Master will hand it over.",
  },

  // The credits roll
  "projectFinish.credits.heroes": { adventure: "The Heroes of {tower}" },
  "projectFinish.credits.hero": { adventure: "{name} the {class}", simple: "{name}, {class}", classic: "{name}, {class}" },
  "projectFinish.credits.stats": { adventure: "Chores: {chores}   Bosses: {bosses}" },
  "projectFinish.credits.floors": { adventure: "Floors: {floors}" },
  "projectFinish.credits.nobody": {
    simple: "The whole family played.",
    adventure: "The whole family played their part.",
    classic: "The whole family took part.",
  },
  "projectFinish.credits.started": { adventure: "Started {date}" },
  "projectFinish.credits.finished": { adventure: "Finished {date}" },
  "projectFinish.credits.early": { adventure: "{days} days early!" },
  "projectFinish.credits.earlyOne": { adventure: "1 day early!" },
  "projectFinish.credits.onTime": { adventure: "Right on time!" },
  "projectFinish.credits.makers": { adventure: "Do It For The XP" },
  "projectFinish.credits.thanks": { adventure: "Thank you for playing!" },
  "projectFinish.credits.skip": { adventure: "Skip" },
  "projectFinish.credits.failed": {
    simple: "The credits did not start.",
    adventure: "The credits would not start. Try again.",
    classic: "The credits could not be started.",
  },

  // The trophy sheet in Hometown
  "projectFinish.spot.trophy": { simple: "Trophy", adventure: "Cleared! See the trophy", classic: "Cleared" },
  "projectFinish.trophy.title": { adventure: "Trophy room" },
  "projectFinish.trophy.empty": {
    simple: "No trophies yet.",
    adventure: "No tower has been cleared yet.",
    classic: "No project has been cleared yet.",
  },
  "projectFinish.trophy.dates": { adventure: "{start} to {finish}" },
  "projectFinish.trophy.early": { simple: "{days} days early", adventure: "Done {days} days early!", classic: "Finished {days} days early" },
  "projectFinish.trophy.earlyOne": { simple: "1 day early", adventure: "Done 1 day early!", classic: "Finished 1 day early" },
  "projectFinish.trophy.onTime": { simple: "On time", adventure: "Done right on time!", classic: "Finished on time" },
  "projectFinish.trophy.reward": { adventure: "Reward: {reward}" },
  "projectFinish.trophy.given": { simple: "Given", adventure: "Handed over", classic: "Handed over" },
  "projectFinish.trophy.waiting": { simple: "Not given yet", adventure: "Waiting for the Game Master", classic: "Not handed over yet" },
  "projectFinish.trophy.bonus": { adventure: "Floor bonuses" },
  "projectFinish.trophy.multiplier": { adventure: "×{multiplier}" },
  "projectFinish.trophy.watch": { adventure: "Watch the credits" },
  "projectFinish.trophy.again": { adventure: "Start again" },

  // The Game Master's row at the top of Approvals
  "projectFinish.approval.earned": { adventure: "Family reward earned: {reward}" },
  "projectFinish.approval.give": { adventure: "Mark as given" },
  "projectFinish.approval.failed": {
    simple: "That did not save. Try again.",
    adventure: "That did not save. Try again.",
    classic: "The reward could not be marked as given.",
  },
} satisfies CopyCatalog;

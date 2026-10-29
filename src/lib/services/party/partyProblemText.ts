import type { PartyProblem } from "./partyClient";

/** What each refusal says to a Game Master, in plain words with a way forward where there is one */
const TEXT: Record<string, string> = {
  "pro-required": "Parties with other families need XP Pro. Add it in Settings to play together.",
  unlinked: "Link your Town Hall account first (Settings > Town Hall), then try again.",
  offline: "No connection right now. Check the internet and try again.",
  server: "The Town Hall could not do that just now. Try again in a moment.",
  invalid: "That did not look right. Check what you typed and try again.",
  "rate-limited": "Too many tries. Wait a minute and try again.",
  "not-member": "That hero is not in this party.",
  "code-unknown": "No party has that code. Check it with your friend.",
  blocked: "This family blocked that party, so its heroes cannot join.",
  "already-member": "That hero is already in the party.",
  "request-pending": "That hero already asked to join. Wait for the leader.",
  forbidden: "That hero stays home, or you may not do that. Change it in Settings > Party.",
  "raid-running": "The party is already fighting a beast.",
  "too-small": "A raid needs at least two heroes in the party.",
  stale: "That strike is too old to count.",
  gone: "That party, raid or request is not there any more.",
  busy: "The party is busy. Try again in a moment.",
};

/** The words for a problem; an unknown one gets the kind "try again" */
export const problemText = (problem: PartyProblem): string => TEXT[problem] ?? TEXT.server;

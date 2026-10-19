/**
 * Who a quest can be given to, in the Game Master's quest wizard (step "Who does it?"). Pure: no storage, no Vue.
 *
 * The heroes are the kids: a Game Master (`isAdult`) runs the game and is not listed next to them. A Game Master the
 * quest was already given to (made before this rule) stays in the picker so the tick can be taken off.
 */

/** As much of a profile as the picker reads */
export interface PickableProfile {
  id: string;
  isAdult?: boolean;
}

/** The profiles to show in the hero picker, in order: every hero, and any Game Master the quest already names. */
export const pickableHeroes = <P extends PickableProfile>(profiles: readonly P[], assignee: readonly string[] = []): P[] =>
  profiles.filter((profile) => {
    const isGameMaster = profile.isAdult === true;
    const isAlreadyGiven = assignee.includes(profile.id);
    return !isGameMaster || isAlreadyGiven;
  });

const WHO_LINES: Record<string, string> = {
  individual: "Pick the hero who takes it.",
  asNeeded: "An Open Bounty is open to everyone, so no hero needs picking.",
  collaborate: "Pick the heroes who work as a team.",
  rotate: "Pick the heroes who take turns.",
  compete: "Pick the heroes who race.",
};

/** One line for the way the quest is shared (its `type`), in the Game Master's voice: what to do on the Who step. */
export const whoLine = (type: string | undefined): string => WHO_LINES[type ?? ""] ?? "Choose how it is shared.";

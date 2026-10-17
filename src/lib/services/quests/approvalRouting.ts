/**
 * Who may settle a held claim, the pure rules (docs: the GM approval loop). A Game Master (`isAdult`) plays too, and a
 * Game Master's own chore that needs approval goes to ANOTHER Game Master when one exists. A Game Master who is the only
 * one on the device has nobody to ask, so the claim is approved at once with a note saying so. A hero's claim goes to
 * every Game Master on the device.
 */
export interface RoutingProfile {
  id?: string | number | null;
  isAdult?: boolean;
}

export type Roster = Record<string, RoutingProfile | null | undefined>;

export const AUTO_APPROVED_NOTE = "Auto-approved: no other Game Master could check it.";

const isGameMaster = (profile: RoutingProfile | null | undefined): profile is RoutingProfile => profile?.isAdult === true;

/** Every Game Master profile on the device */
export const gameMasterIds = (users: Roster): string[] =>
  Object.entries(users)
    .filter(([, profile]) => isGameMaster(profile))
    .map(([id, profile]) => String(profile?.id ?? id));

/** The Game Masters who may settle `heroId`'s claim: all of them, except the hero themself */
export const approversFor = (heroId: string, users: Roster): string[] =>
  gameMasterIds(users).filter((id) => id !== String(heroId));

/** True for a Game Master with no other Game Master to ask */
export const isSoleGameMaster = (heroId: string, users: Roster): boolean => {
  const isHeroGm = isGameMaster(users[String(heroId)]);
  return isHeroGm && approversFor(heroId, users).length === 0;
};

/** A reviewer may settle a claim unless it is their own and somebody else could */
export const canReviewClaim = (reviewerId: string | null | undefined, claimOwnerId: string, users: Roster): boolean => {
  const isOwnClaim = String(reviewerId ?? "") === String(claimOwnerId);
  if (!isOwnClaim) return true;
  return approversFor(claimOwnerId, users).length === 0;
};

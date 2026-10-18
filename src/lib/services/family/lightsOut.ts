import { clockLabel, isBedtimeNow, type FamilySettings } from "./familySettings";

/**
 * Lights out (Settings > Family > Bedtime): between the bedtime's two clocks a hero's screens go to sleep. Game Masters
 * are never put to bed, a fight already running is finished first, and the screens anyone may open signed out (the
 * profile chooser, sign in, the intro) stay open so a Game Master can always sign in.
 */
export interface LightsOutInput {
  bedtime: FamilySettings["bedtime"];
  now: Date;
  /** Someone is signed in */
  signedIn: boolean;
  /** The signed-in profile may run the family (a Game Master, or one playing as a hero) */
  canManage: boolean;
  /** The screen open now needs nobody signed in (`meta.requiresAuth === false`, or sign in) */
  isPublicScreen: boolean;
  inBattle: boolean;
}

export const isLightsOut = (input: LightsOutInput): boolean => {
  const isExempt = !input.signedIn || input.canManage || input.isPublicScreen || input.inBattle;
  if (isExempt) return false;
  return isBedtimeNow({ bedtime: input.bedtime } as FamilySettings, input.now);
};

/** What the sleeping screen says: when the portal opens again */
export const wakeUpLine = (bedtime: FamilySettings["bedtime"]): string => `The portal opens again at ${clockLabel(bedtime.to)}.`;

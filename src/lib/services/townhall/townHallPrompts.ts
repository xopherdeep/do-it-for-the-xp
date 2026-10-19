/**
 * What the Town Clerk says when the family's road to the city is not open yet: the family server (`xp-family/v1`) is
 * still being built on the site, so Link a phone and the Town Hall boards cannot reach it and nothing will reach a
 * second phone. One line, one place, so every screen tells the same story and the wording is tested without a screen.
 */
import type { RevealPromptOptions } from "@/components/organisms/RevealPrompt/revealPrompt";
import { courierLatePrompt } from "@/lib/services/hometown/hometownPrompts";
import { familyProblem, type FamilyProblem } from "@/lib/services/multiplayer/familyServer";
import { TownHallError } from "./townHallClient";

/** The meaning behind the late courier: the family's road to the city is not open YET, and a second phone hears nothing */
export const FAMILY_ROAD_CLOSED_LINE = "The family's road to the city isn't open yet, so nothing will reach a second phone.";

/** The same road, told to a hero whose phone could not link: no "wrong code" wording, the code was never judged */
export const HERO_PHONE_ROAD_CLOSED_LINE = "The family's road to the city isn't open yet. Try again later.";

/** A stored family problem that means the family server did not answer: no signal, or the routes are not there */
export const isFamilyRoadClosedProblem = (problem: FamilyProblem | null | undefined): boolean => problem === "offline" || problem === "server";

/** A failed call to the family server that means the road is closed, not that the site refused for a reason of its own */
export const isFamilyRoadClosed = (error: unknown): boolean => {
  const isSiteError = error instanceof TownHallError;
  return isSiteError && isFamilyRoadClosedProblem(familyProblem(error));
};

/** The late courier as the Town Hall tabs already say it, with what it means for the family added after it */
export const courierLateOnTheRoadPrompt = (): RevealPromptOptions => {
  const late = courierLatePrompt();
  return { ...late, lines: [...late.lines, FAMILY_ROAD_CLOSED_LINE] };
};

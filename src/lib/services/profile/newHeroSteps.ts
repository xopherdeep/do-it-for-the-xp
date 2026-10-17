import { passcodeProblem } from "@/router/_Guards/gm.guard";

export type NewHeroStepId = "name" | "look" | "style" | "class" | "food" | "secret" | "ready";

export interface NewHeroStep {
  id: NewHeroStepId;
  /** Short label for the progress trail */
  title: string;
  /** The question the hero is asked */
  prompt: string;
  /** Font Awesome duotone icon class */
  icon: string;
}

/** The order a new hero is made in: who, face, look and feel, class, food, secret code, then the reveal. */
export const NEW_HERO_STEPS: NewHeroStep[] = [
  { id: "name", title: "Name", prompt: "What do they call you, hero?", icon: "fa-signature" },
  { id: "look", title: "Look", prompt: "Make your hero's face", icon: "fa-user-ninja" },
  { id: "style", title: "Style", prompt: "How should your game look?", icon: "fa-palette" },
  { id: "class", title: "Class", prompt: "Choose your calling", icon: "fa-swords" },
  { id: "food", title: "Food", prompt: "What fuels your adventures?", icon: "fa-utensils" },
  { id: "secret", title: "Secret", prompt: "Lock your save file", icon: "fa-lock-alt" },
  { id: "ready", title: "Ready", prompt: "Your hero is ready!", icon: "fa-flag-checkered" },
];

/** What the steps need to know about the hero being made. */
export interface NewHeroDraft {
  fullName: string;
  jobClass: string;
  favoriteFood: string;
  passcode: string;
  isGameMaster: boolean;
}

type StepCheck = (draft: NewHeroDraft) => string | null;

/** What each step asks before the hero may leave it; a step with no entry can always be left. */
const STEP_CHECKS: Partial<Record<NewHeroStepId, StepCheck>> = {
  name: (draft) => {
    const hasName = draft.fullName.trim().length > 0;
    return hasName ? null : "Every hero needs a name";
  },
  class: (draft) => {
    const hasClass = Boolean(draft.jobClass);
    return hasClass ? null : "Pick a class to continue";
  },
  food: (draft) => {
    const hasFood = Boolean(draft.favoriteFood);
    return hasFood ? null : "Pick a favorite food to continue";
  },
  secret: (draft) => passcodeProblem(draft.passcode, draft.isGameMaster),
};

/** Why a step cannot be left yet, or null when it can. Words are for the hero, so keep them friendly. */
export function stepProblem(id: NewHeroStepId, draft: NewHeroDraft): string | null {
  return STEP_CHECKS[id]?.(draft) ?? null;
}

/** The first step (in order) that still has a problem, or null when the hero is ready to save. */
export function firstBlockedStep(draft: NewHeroDraft): NewHeroStepId | null {
  const blocked = NEW_HERO_STEPS.find((step) => stepProblem(step.id, draft) !== null);
  return blocked ? blocked.id : null;
}

/** Index of a step in the flow (0 for an unknown id). */
export function stepIndex(id: NewHeroStepId): number {
  return Math.max(
    0,
    NEW_HERO_STEPS.findIndex((step) => step.id === id)
  );
}

/** How far along the hero is, 0 to 1, for the progress bar. */
export function stepProgress(id: NewHeroStepId): number {
  return stepIndex(id) / (NEW_HERO_STEPS.length - 1);
}

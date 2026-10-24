/**
 * Moving Out: the Moving House pack's own pre-move phases, reshaped as a project type. Its Moving Day, Unpack and
 * camp dailies stay out of the tower; the van-loading boss becomes the roof's finale, Hand Over the Keys. The chores
 * come straight from `MOVING_TEMPLATES`, so the two never drift apart.
 */
import { MOVING_PHASES, MOVING_TEMPLATES, movingBeastId } from "../movingPack";
import type { ProjectChoreSuggestion, ProjectPhase, ProjectType } from "./projectTypes";

type MovingTemplate = (typeof MOVING_TEMPLATES)[number];
type MovingPhaseId = (typeof MOVING_PHASES)[number]["id"];

/** The Fibonacci slider's steps, ascending. */
const SLIDER_STEPS: readonly number[] = [1, 2, 3, 5, 8, 13];

/** The slider step nearest to a difficulty; a tie rounds up. */
export const nearestDifficulty = (difficulty: number): number =>
  SLIDER_STEPS.reduce((best, step) => (Math.abs(step - difficulty) <= Math.abs(best - difficulty) ? step : best));

/** The phases the tower keeps, with their share of the days. */
const KEPT_PHASES: readonly { id: MovingPhaseId; share: number }[] = [
  { id: "declutter", share: 0.3 },
  { id: "quiet", share: 0.3 },
  { id: "living", share: 0.3 },
  { id: "last", share: 0.1 },
];

/** A phase's name without the pack's numbering ("1 Declutter and Donate" is "Declutter and Donate"). */
const plainPhaseName = (name: string): string => name.replace(/^\d+\s+/, "");

const suggestionOf = (template: MovingTemplate): ProjectChoreSuggestion => ({
  slug: template.slug,
  name: template.quest,
  rooms: template.rooms ? [...template.rooms] : "house",
  difficulty: nearestDifficulty(template.difficulty),
  who: template.who,
  ...(template.hero ? { perHero: true } : {}),
  beastId: movingBeastId(template.slug),
  minutes: template.minutes,
});

const phaseOf = (kept: { id: MovingPhaseId; share: number }): ProjectPhase => {
  const phase = MOVING_PHASES.find((candidate) => candidate.id === kept.id);
  if (!phase) throw new Error(`Moving Out: the Moving House pack has no phase "${kept.id}"`);
  const templates = MOVING_TEMPLATES.filter((template) => template.phase === kept.id);
  return { id: kept.id, name: plainPhaseName(phase.name), share: kept.share, chores: templates.map(suggestionOf) };
};

const finaleOf = (): ProjectChoreSuggestion => {
  const van = MOVING_TEMPLATES.find((template) => template.slug === "load-van");
  if (!van) throw new Error('Moving Out: the Moving House pack has no "load-van" template');
  return {
    slug: "hand-over-the-keys",
    name: "Hand Over the Keys",
    rooms: "house",
    difficulty: Math.max(8, nearestDifficulty(van.difficulty)),
    who: "team",
    beastId: movingBeastId(van.slug),
    minutes: van.minutes,
  };
};

export const MOVING_OUT: ProjectType = {
  id: "moving-out",
  name: "Moving Out",
  towerName: "The Moving Keep",
  element: "earth",
  defaultDays: 28,
  phases: KEPT_PHASES.map(phaseOf),
  finale: finaleOf(),
};

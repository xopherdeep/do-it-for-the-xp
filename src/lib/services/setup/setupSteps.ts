/**
 * The setup wizard's five steps (family, house, review, extras, summary) and the draft they fill. Pure: the screen
 * holds a SetupDraft, XpWizardShell asks these steps whether it may go on, and the draft is what `setupPlan` turns
 * into a backup. Each invalid verdict is the one line a parent would say, shown under the disabled Next.
 */
import { gameMasterProblem, heroNames, QUICK_START_MAX_HEROES } from "@/lib/services/core/packs/quickStart";
import { bandOf, suggestedChores } from "@/lib/services/setup/setupPlan";
import type { SetupAnswers, SetupHero } from "@/lib/services/setup/setupPlan";
import type { WizardStep } from "@/lib/services/wizard/wizardSteps";

export type SetupDraft = SetupAnswers;

/** A hero who is not the grown-up needs an age so the chores fit them */
const isMissingAge = (hero: SetupHero): boolean => !hero.isParent && hero.age === null;

const familyProblem = (draft: SetupDraft): string | null => {
  const { heroes } = draft;
  if (!heroes.length) return "Name at least one hero";
  if (heroes.length > QUICK_START_MAX_HEROES) return `At most ${QUICK_START_MAX_HEROES} heroes at a time`;
  const isNameLost = heroNames(heroes.map((hero) => hero.name)).length < heroes.length;
  if (isNameLost) return "Every hero needs their own name";
  if (heroes.some(isMissingAge)) return "Every hero needs an age";
  const hasNewParent = heroes.some((hero) => hero.isParent && !hero.existing);
  return hasNewParent ? gameMasterProblem(draft.gameMaster) : null;
};

const hasNoChores = (draft: SetupDraft) => (hero: SetupHero): boolean => !(draft.chores[hero.id] ?? []).length;

export const SETUP_STEPS: readonly WizardStep<SetupDraft>[] = [
  {
    id: "family",
    title: "Family",
    guide: "Who answers the call to adventure?",
    icon: "users",
    isValid: (draft) => familyProblem(draft) ?? true,
  },
  {
    id: "house",
    title: "House",
    guide: "Which rooms do monsters haunt?",
    icon: "house",
    isValid: (draft) => (draft.rooms.length ? true : "Pick at least one room"),
  },
  {
    id: "review",
    title: "Quests",
    guide: "Here are the beasts for each hero. Untick any you do not want.",
    icon: "paw-claws",
    isValid: (draft) => (draft.heroes.some(hasNoChores(draft)) ? "Every hero needs a chore" : true),
  },
  {
    id: "extras",
    title: "Extras",
    guide: "Shall we stock the shops and teach the heroes a few tricks?",
    icon: "sparkles",
    isValid: () => true,
  },
  {
    id: "summary",
    title: "Ready",
    guide: "All set. Ready to begin the adventure?",
    icon: "flag",
    isValid: () => true,
  },
];

/** Ticks the suggested chores for each hero that has no list yet; a hero already in `chores` keeps their edits */
export const preTick = (draft: SetupDraft): SetupDraft => {
  const chores = { ...draft.chores };
  for (const hero of draft.heroes) {
    if (chores[hero.id]) continue;
    chores[hero.id] = suggestedChores(bandOf(hero), draft.rooms).map((beast) => beast.id);
  }
  return { ...draft, chores };
};

/** A fresh draft: the heroes already on this device come along, nothing else is chosen yet */
export const emptyDraft = (existing: SetupHero[]): SetupDraft => ({
  heroes: existing.map((hero) => ({ ...hero, existing: true })),
  rooms: [],
  chores: {},
  extras: true,
});

/**
 * The setup wizard's five steps (family, house, review, extras, summary) and the draft they fill. Pure: the screen
 * holds a SetupDraft, XpWizardShell asks these steps whether it may go on, and the draft is what `setupPlan` turns
 * into a backup. Each invalid verdict is the one line a parent would say, shown under the disabled Next.
 */
import { gameMasterProblem, heroNames, QUICK_START_MAX_HEROES } from "@/lib/services/core/packs/quickStart";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import { bandOf, suggestedChores } from "@/lib/services/setup/setupPlan";
import type { SetupAnswers, SetupHero } from "@/lib/services/setup/setupPlan";
import type { WizardStep } from "@/lib/services/wizard/wizardSteps";

export type SetupDraft = SetupAnswers;

/** A hero who is not the grown-up needs an age so the chores fit them */
const isMissingAge = (hero: SetupHero): boolean => !hero.isParent && hero.age === null;

const nameKey = (name: string): string => (heroNames([name])[0] ?? "").toLowerCase();

/**
 * A new hero with no name, or one an earlier hero already has. Existing heroes are read-only rows, so their own names
 * are never the problem; they only count as taken for the new ones.
 */
const hasLostName = (heroes: readonly SetupHero[]): boolean => {
  const taken = new Set(heroes.filter((hero) => hero.existing).map((hero) => nameKey(hero.name)));
  for (const hero of heroes.filter((entry) => !entry.existing)) {
    const key = nameKey(hero.name);
    if (!key || taken.has(key)) return true;
    taken.add(key);
  }
  return false;
};

const familyProblem = (draft: SetupDraft): string | null => {
  const { heroes } = draft;
  if (!heroes.length) return "Name at least one hero";
  if (heroes.length > QUICK_START_MAX_HEROES) return `At most ${QUICK_START_MAX_HEROES} heroes at a time`;
  if (hasLostName(heroes)) return "Every hero needs their own name";
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

/** The parts of a draft that decide the suggested chores: the rooms and each hero's age band */
export interface ChoreShape {
  rooms: readonly string[];
  heroes: readonly Pick<SetupHero, "id" | "age" | "isParent">[];
}

export const choreShape = (draft: SetupDraft): ChoreShape => ({
  rooms: [...draft.rooms],
  heroes: draft.heroes.map(({ id, age, isParent }) => ({ id, age, isParent })),
});

const roomOfBeast = (id: string): string | undefined => BEAST_LIBRARY.find((beast) => beast.id === id)?.room;

/**
 * The chore lists after the family or the house changed (a parent went back from the summary), keeping what was edited:
 * a new room adds its suggested chores, a removed room drops only its own, a hero whose age band changed starts that
 * list afresh, and nobody else's list is touched. A hero with no list yet is left for preTick.
 */
export const reconcileChores = (before: ChoreShape, draft: SetupDraft): Record<string, string[]> => {
  const added = draft.rooms.filter((room) => !before.rooms.includes(room));
  const removed = before.rooms.filter((room) => !draft.rooms.includes(room));
  const chores: Record<string, string[]> = {};
  for (const hero of draft.heroes) {
    const ticked = draft.chores[hero.id];
    if (!ticked) continue;
    const old = before.heroes.find((entry) => entry.id === hero.id);
    const isNewBand = old && bandOf(old as SetupHero) !== bandOf(hero);
    if (isNewBand) {
      chores[hero.id] = suggestedChores(bandOf(hero), draft.rooms).map((beast) => beast.id);
      continue;
    }
    const kept = ticked.filter((id) => !removed.includes(roomOfBeast(id) ?? ""));
    const fresh = suggestedChores(bandOf(hero), added).map((beast) => beast.id);
    chores[hero.id] = [...kept, ...fresh.filter((id) => !kept.includes(id))];
  }
  return chores;
};

/** A fresh draft: the heroes already on this device come along, nothing else is chosen yet */
export const emptyDraft = (existing: SetupHero[]): SetupDraft => ({
  heroes: existing.map((hero) => ({ ...hero, existing: true })),
  rooms: [],
  chores: {},
  extras: true,
});

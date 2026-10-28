/**
 * The Start a Project wizard's rules (XpProjectWizardModal): the five steps and when each is valid, what choosing a type
 * fills in, how a change of rooms rebuilds the list, how the Game Master's edits change the draft, and the tower input
 * the draft ends as. Pure: no storage, no Vue; every change returns a new draft and never touches the type's data.
 *
 * The chores are filled when a type is chosen and again when the rooms change, so rooms come before chores: the list
 * the Game Master edits on the chores step is never replaced under them unless they go back and change the rooms. A
 * re-run (the last run of the type, `lastChores`) starts from that run's list, each chore whose room is gone moved to
 * the Whole House (none is dropped); a run that no longer fits the type's floors is not used.
 */
import { addDays, format } from "date-fns";
import { copyFor } from "@/lib/services/copy/copy";
import type { Voice } from "@/lib/services/copy/voices";
import { DEFAULT_MOVING_ROOMS } from "@/lib/services/core/packs/movingPack";
import { dateKey, heroBandFor, nearestDifficulty, parseLocalDate } from "@/lib/services/core/packs/packCommon";
import type { PackHero } from "@/lib/services/core/packs/packCommon";
import { projectTypeOf } from "@/lib/services/core/packs/projects";
import type { ProjectType, ProjectTypeId } from "@/lib/services/core/packs/projects";
import type { WizardStep } from "@/lib/services/wizard/wizardSteps";
import { WHOLE_HOUSE_ID, choresFromLastRun, houseRoomsOf, rehomeChores, suggestChores } from "./projectChores";
import type { ProjectChore, ProjectHouse } from "./projectChores";
import type { ProjectTowerInput } from "./projectQuests";
import { ROOF_PHASE_ID, minimumEndOn, phaseWindows } from "./projectSchedule";
import type { PhaseWindow } from "./projectSchedule";

export type ProjectStepId = "type" | "house" | "chores" | "dates" | "build";

/** What the Game Master has answered so far; `startOn` is not asked, a project always starts today */
export interface ProjectDraft {
  typeId?: ProjectTypeId;
  house: ProjectHouse;
  /** Grouped by floor when shown; the roof's finale is in the list too */
  chores: ProjectChore[];
  /** The last day, "YYYY-MM-DD" */
  endOn: string;
  /** The family reward, in the Game Master's words */
  rewardText: string;
}

/** What filling the list needs besides the draft */
export interface DraftContext {
  /** Local "YYYY-MM-DD" */
  today: string;
  heroes: readonly PackHero[];
  /** The last run of the chosen type, if there is one */
  lastChores: readonly ProjectChore[] | null;
}

/** What the tower input needs besides the draft */
export interface BuildContext {
  today: string;
  /** The build time: the 1F quests are woken at it */
  now: Date;
  heroes: readonly PackHero[];
}

/** The id the project's record, its quests and its temple's seed are made from */
export const projectIdOf = (typeId: ProjectTypeId, startOn: string): string => `${typeId}-${startOn}`;

/** A new chore starts mid-slider; the Game Master sizes it */
const NEW_CHORE_SIZE = 3;

const copyHouse = (house: ProjectHouse): ProjectHouse => ({ ...house, rooms: { ...house.rooms } });

const copyChore = (chore: ProjectChore): ProjectChore => ({ ...chore, assignee: [...chore.assignee] });

export const newProjectDraft = (today: string): ProjectDraft => ({
  house: { rooms: { ...DEFAULT_MOVING_ROOMS } },
  chores: [],
  endOn: today,
  rewardText: "",
});

/** The type the draft has chosen; undefined before one is chosen (or for an id this version does not know) */
export const draftType = (draft: Pick<ProjectDraft, "typeId">): ProjectType | undefined =>
  draft.typeId === undefined ? undefined : projectTypeOf(draft.typeId);

/** The picture on a type's card; a type added later without one gets the dungeon */
const TYPE_ICON: Readonly<Record<string, string>> = { "spring-cleaning": "broom", "moving-out": "truck-moving" };

export const projectTypeIcon = (typeId: string): string => TYPE_ICON[typeId] ?? "dungeon";

/** A real "YYYY-MM-DD" day: "2026-02-31" is not one, though a date parser would read it as March 3rd */
export const isRealDay = (text: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(text) && dateKey(parseLocalDate(text)) === text;

/** How many rooms the house has (the Whole House every house has is not counted) */
export const roomCount = (house: ProjectHouse): number => houseRoomsOf(house).filter((room) => room.id !== WHOLE_HOUSE_ID).length;

/** The type's suggested length from today */
const endOnFor = (type: ProjectType, today: string): string => dateKey(addDays(parseLocalDate(today), type.defaultDays));

// ---------------------------------------------------------------------------------------------------------------
// Filling the list

/** A last run is used when it has chores and every one stands on a floor the type still has, with one finale */
const fitsType = (type: ProjectType, last: readonly ProjectChore[]): boolean => {
  const floors = new Set([...type.phases.map((phase) => phase.id), ROOF_PHASE_ID]);
  const isOnFloors = last.every((chore) => floors.has(chore.phaseId));
  const finales = last.filter((chore) => chore.phaseId === ROOF_PHASE_ID).length;
  return isOnFloors && finales === 1;
};

/** Whether this list is a last run the type can start from (the chores step and the type card say so) */
export const isRerun = (type: ProjectType | undefined, lastChores: readonly ProjectChore[] | null): boolean =>
  type !== undefined && lastChores !== null && fitsType(type, lastChores);

/** The chores for a type and a house: last run's list when there is one, else the type's suggestions; always new copies */
const filledChores = (type: ProjectType, house: ProjectHouse, ctx: Pick<DraftContext, "heroes" | "lastChores">): ProjectChore[] => {
  const list = isRerun(type, ctx.lastChores)
    ? rehomeChores(choresFromLastRun(ctx.lastChores ?? [], ctx.heroes), house)
    : suggestChores(type, house, ctx.heroes);
  return list.map(copyChore);
};

/** The draft with a type chosen: its suggested end, and the chores it fills for the house the draft has */
export const withType = (draft: ProjectDraft, typeId: ProjectTypeId, ctx: DraftContext): ProjectDraft => {
  const type = projectTypeOf(typeId);
  if (!type) return draft;
  return { ...draft, typeId, house: copyHouse(draft.house), endOn: endOnFor(type, ctx.today), chores: filledChores(type, draft.house, ctx) };
};

const roomsKey = (house: ProjectHouse): string => houseRoomsOf(house).map((room) => room.id).join("|");

/**
 * The draft with other rooms. When the rooms themselves changed (not just the basement) and a type is chosen, the list
 * is filled again for them, so a room that comes back gets its chores back; edits made to the list are replaced.
 */
export const withHouse = (draft: ProjectDraft, house: ProjectHouse, ctx: Pick<DraftContext, "heroes" | "lastChores">): ProjectDraft => {
  const own = copyHouse(house);
  const type = draftType(draft);
  if (!type) return { ...draft, house: own };
  const hasSameRooms = roomsKey(draft.house) === roomsKey(own);
  if (hasSameRooms) return { ...draft, house: own };
  return { ...draft, house: own, chores: filledChores(type, own, ctx) };
};

// ---------------------------------------------------------------------------------------------------------------
// The heroes and the words on the screen

/** As much of a profile as the heroes list reads */
export interface HeroProfile {
  id: unknown;
  name?: { nick?: string; first?: string; full?: string };
  isAdult?: unknown;
  birthday?: unknown;
}

/** Everyone in the family plays: a hero's band is what the profile says (an adult is a grown-up, a child's age decides) */
export const heroesFrom = (profiles: readonly HeroProfile[]): PackHero[] =>
  profiles.map((profile) => ({
    id: String(profile.id),
    name: profile.name?.nick || profile.name?.first || profile.name?.full || "Hero",
    band: heroBandFor(profile),
  }));

/** Who has a chore: the hero's name, "everyone" when all who play have it, the names together, or "nobody" */
export const whoLabel = (chore: ProjectChore, heroes: readonly PackHero[], words: { nobody: string; everyone: string }): string => {
  const names = chore.assignee.map((id) => heroes.find((hero) => hero.id === id)?.name ?? "Hero");
  const hasNobody = names.length === 0;
  if (hasNobody) return words.nobody;
  const playing = heroes.filter((hero) => hero.band !== "out").length;
  const isEveryone = names.length > 1 && names.length === playing;
  return isEveryone ? words.everyone : names.join(", ");
};

/** "Tue Nov 10" */
export const dayText = (day: string): string => format(parseLocalDate(day), "EEE MMM d");

// ---------------------------------------------------------------------------------------------------------------
// Editing the list

const changeChore = (draft: ProjectDraft, choreId: string, change: (chore: ProjectChore) => ProjectChore): ProjectDraft => {
  const isThere = draft.chores.some((chore) => chore.id === choreId);
  if (!isThere) return draft;
  return { ...draft, chores: draft.chores.map((chore) => (chore.id === choreId ? change(chore) : chore)) };
};

export const renameChore = (draft: ProjectDraft, choreId: string, name: string): ProjectDraft =>
  changeChore(draft, choreId, (chore) => ({ ...chore, name }));

/** Any size lands on the slider's nearest step (a tie goes to the bigger); the hero is not asked, the Game Master's choice wins */
export const resizeChore = (draft: ProjectDraft, choreId: string, difficulty: number): ProjectDraft =>
  changeChore(draft, choreId, (chore) => ({ ...chore, difficulty: nearestDifficulty(difficulty) }));

/** Who a chore can go to in turn: each hero playing by themselves, then all of them together (when there are two or more) */
export const assigneeOptions = (heroes: readonly PackHero[]): string[][] => {
  const playing = heroes.filter((hero) => hero.band !== "out").map((hero) => hero.id);
  const each = playing.map((id) => [id]);
  const canWorkTogether = playing.length > 1;
  return canWorkTogether ? [...each, playing] : each;
};

const sameHeroes = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((id) => b.includes(id));

/** The hands after these: the next option in turn, the first when the chore is nobody's or someone else's */
export const nextAssignee = (current: readonly string[], heroes: readonly PackHero[]): string[] => {
  const options = assigneeOptions(heroes);
  const hasNobody = options.length === 0;
  if (hasNobody) return [];
  const at = options.findIndex((option) => sameHeroes(option, current));
  return [...options[(at + 1) % options.length]];
};

/** Hands the chore to the next hero in turn; the size stays as it was */
export const reassignChore = (draft: ProjectDraft, choreId: string, heroes: readonly PackHero[]): ProjectDraft =>
  changeChore(draft, choreId, (chore) => ({ ...chore, assignee: nextAssignee(chore.assignee, heroes) }));

/** `${phaseId}:custom-1`, `-2`... the lowest the list does not use yet, so an id is never reused by two chores */
const customIdFor = (chores: readonly ProjectChore[], phaseId: string): string => {
  const used = new Set(chores.map((chore) => chore.id));
  let serial = 1;
  while (used.has(`${phaseId}:custom-${serial}`)) serial += 1;
  return `${phaseId}:custom-${serial}`;
};

const floorRank = (type: ProjectType, phaseId: string): number => {
  const rank = type.phases.findIndex((phase) => phase.id === phaseId);
  return rank === -1 ? type.phases.length : rank;
};

/**
 * The Game Master's own chore on a floor: in the whole house, mid-sized, the first hero playing, last of its floor.
 * Not on the roof (it holds the one finale) and not on a floor the type does not have: the draft comes back as it was.
 */
export const addChore = (draft: ProjectDraft, phaseId: string, name: string, heroes: readonly PackHero[]): ProjectDraft => {
  const type = draftType(draft);
  if (!type) return draft;
  const isFloor = type.phases.some((phase) => phase.id === phaseId);
  if (!isFloor) return draft;
  const first = heroes.find((hero) => hero.band !== "out");
  const chore: ProjectChore = {
    id: customIdFor(draft.chores, phaseId),
    phaseId,
    roomId: WHOLE_HOUSE_ID,
    name,
    difficulty: NEW_CHORE_SIZE,
    assignee: first ? [first.id] : [],
    custom: true,
  };
  const byFloor = [...draft.chores, chore].sort((a, b) => floorRank(type, a.phaseId) - floorRank(type, b.phaseId));
  return { ...draft, chores: byFloor };
};

/** Takes a chore off the list; the finale stays, since a tower's roof always holds one */
export const dropChore = (draft: ProjectDraft, choreId: string): ProjectDraft => {
  const chore = draft.chores.find((each) => each.id === choreId);
  const canDrop = chore !== undefined && chore.phaseId !== ROOF_PHASE_ID;
  if (!canDrop) return draft;
  return { ...draft, chores: draft.chores.filter((each) => each.id !== choreId) };
};

export const choresOfPhase = (draft: ProjectDraft, phaseId: string): ProjectChore[] => draft.chores.filter((chore) => chore.phaseId === phaseId);

// ---------------------------------------------------------------------------------------------------------------
// The steps

const problem = (key: string, voice: Voice, vars?: Record<string, string>): string => copyFor(`projectWizard.problem.${key}`, voice, vars);

const choresVerdict = (draft: ProjectDraft, voice: Voice): boolean | string => {
  const type = draftType(draft);
  if (!type) return false;
  const bare = type.phases.find((phase) => !draft.chores.some((chore) => chore.phaseId === phase.id));
  if (bare) return problem("floor", voice, { phase: bare.name });
  const hasNameless = draft.chores.some((chore) => chore.name.trim() === "");
  return hasNameless ? problem("name", voice) : true;
};

/** The end date's trouble in words, or empty when it is a real day and no earlier than a day for each floor */
const endProblem = (draft: ProjectDraft, type: ProjectType, voice: Voice, today: string): string => {
  if (!isRealDay(draft.endOn)) return problem("date", voice);
  const earliest = minimumEndOn(type.phases.length, today);
  const isTooSoon = draft.endOn < earliest;
  return isTooSoon ? problem("tooSoon", voice, { date: earliest }) : "";
};

const datesVerdict = (draft: ProjectDraft, voice: Voice, today: string): boolean | string => {
  const type = draftType(draft);
  if (!type) return false;
  const trouble = endProblem(draft, type, voice, today);
  if (trouble) return trouble;
  const hasReward = draft.rewardText.trim() !== "";
  return hasReward || problem("reward", voice);
};

const STEP_IDS: readonly ProjectStepId[] = ["type", "house", "chores", "dates", "build"];

/** The picture that stands for each step in the header (Font Awesome duotone, no prefix) */
const STEP_ICON: Record<ProjectStepId, string> = { type: "dungeon", house: "home", chores: "tasks", dates: "calendar-alt", build: "hammer" };

/** Whether the draft is good for each step: true, a reason in words, or false for no words */
const VERDICTS: Record<ProjectStepId, (draft: ProjectDraft, voice: Voice, today: string) => boolean | string> = {
  type: (draft) => draftType(draft) !== undefined,
  house: (draft, voice) => (roomCount(draft.house) > 0 ? true : problem("house", voice)),
  chores: (draft, voice) => choresVerdict(draft, voice),
  dates: (draft, voice, today) => datesVerdict(draft, voice, today),
  build: (draft) => draftType(draft) !== undefined,
};

/**
 * The five steps in a voice: type, house, chores, dates (the end day and the family reward) and build (the summary,
 * whose verb is Build). The dates step reads today from `todayOf`, the wizard's own clock or the real one. Nothing is
 * skipped. Ready (every step valid) is what lets Build through, so the reward is asked on the dates step and a project
 * can't start without one.
 */
export const projectWizardSteps = (voice: Voice = "adventure", todayOf: () => string = () => dateKey(new Date())): readonly WizardStep<ProjectDraft>[] =>
  STEP_IDS.map((id) => ({
    id,
    title: copyFor(`projectWizard.step.${id}`, voice),
    guide: copyFor(`projectWizard.guide.${id}`, voice),
    icon: STEP_ICON[id],
    isValid: (draft: ProjectDraft) => VERDICTS[id](draft, voice, todayOf()),
  }));

/** The steps in the adventure voice on the real clock */
export const PROJECT_WIZARD_STEPS: readonly WizardStep<ProjectDraft>[] = projectWizardSteps();

// ---------------------------------------------------------------------------------------------------------------
// The build

/** The floors' days for the draft's dates; empty while the end is not a real day or leaves a floor no day */
export const previewWindows = (draft: ProjectDraft, today: string): PhaseWindow[] => {
  const type = draftType(draft);
  if (!type) return [];
  const hasTrouble = endProblem(draft, type, "adventure", today) !== "";
  return hasTrouble ? [] : phaseWindows(type.phases, today, draft.endOn);
};

/** The floors' days as lines to read: "Declutter: Tue Oct 27 to Fri Oct 30" (one day reads without the "to") */
export const windowLines = (draft: ProjectDraft, today: string, voice: Voice): { id: string; text: string }[] => {
  const phases = draftType(draft)?.phases ?? [];
  return previewWindows(draft, today).map((window) => {
    const phase = phases.find((each) => each.id === window.phaseId)?.name ?? window.phaseId;
    const isOneDay = window.opensOn === window.dueOn;
    const key = isOneDay ? "projectWizard.dates.windowDay" : "projectWizard.dates.window";
    return { id: window.phaseId, text: copyFor(key, voice, { phase, day: dayText(window.opensOn), from: dayText(window.opensOn), to: dayText(window.dueOn) }) };
  });
};

/**
 * What the tower is built from: the draft's own copies (the record outlives the wizard), the names trimmed, the floors'
 * windows from today to the end, and the heroes, who decide whose big chores wait for approval. Throws for a draft with
 * no type, an end that is not a real day, or one too near for the floors (RangeError).
 */
export const towerInputOf = (draft: ProjectDraft, ctx: BuildContext): ProjectTowerInput => {
  const type = draftType(draft);
  if (!type) throw new Error("Pick a project before building");
  if (!isRealDay(draft.endOn)) throw new RangeError(`"${draft.endOn}" is not a day`);
  return {
    projectId: projectIdOf(type.id, ctx.today),
    type,
    house: copyHouse(draft.house),
    chores: draft.chores.map((chore) => ({ ...copyChore(chore), name: chore.name.trim() })),
    windows: phaseWindows(type.phases, ctx.today, draft.endOn),
    now: ctx.now,
    heroes: ctx.heroes,
  };
};

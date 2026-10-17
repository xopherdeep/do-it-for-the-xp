import { differenceInMinutes } from "date-fns";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import type { BattleContext } from "@/app/Console/BattleField/battle/battleContext";
import { clampMarks, MAX_GRUDGE_MARKS } from "@/lib/services/battle/questGrudge";
import { copyFor } from "@/lib/services/copy/copy";
import type { Voice } from "@/lib/services/copy/voices";
import type { QuestListStatus } from "@/lib/services/quests/QuestList";
import { sentBackLine, type SentBack } from "@/lib/services/quests/sentBack";
import { questBeastId, questTier } from "@/lib/services/temples/questRooms";
import type { QuestTier } from "@/lib/services/temples/questRooms";
import { standInMonster } from "@/lib/services/temples/RoomBeast";
import { libraryEntryOf } from "@/lib/services/temples/templeQuestRows";
import { templeThemeLabel } from "@/lib/services/temples/templeThemes";

/**
 * The beast card (XpBeastCardModal): what the bestiary entry of a quest shows and does. Pure: no storage, no Vue.
 *
 * Tapping a quest in the Beast Log or the Calendar opens its beast the way an RPG shows a monster: the portrait on its
 * battle backdrop, the tier from the difficulty, how often the hero has tamed it, the grudge it holds, and the
 * quest's checklist as tappable steps. The steps are the battle's own: the same ids (`task-N` for a beast's checklist,
 * `<questId>-task` for the chore itself) and the same progress record (battleProgress, one key per hero, quest and day),
 * so a step checked here is already done when the hunt starts, and a step done in the fight reads checked here.
 */

/** How the card is opened: the quest's place on today's board. Same words as the Beast Log's rows. */
export type BeastCardStatus = QuestListStatus;

// The hunt bonus lives in the quest services (the fight's rewards and the Game Master's approval read it too); the card
// prints it on the Hunt button, so the card's module hands it on.
export { HUNT_BONUS_XP, huntBonusLabel, huntBonusXpOn } from "@/lib/services/quests/huntBonus";

export interface TierBadge {
  tier: QuestTier;
  label: string;
  /** Font Awesome duotone icon name, no prefix */
  icon: string;
}

const TIER_BADGES: Record<QuestTier, TierBadge> = {
  monster: { tier: "monster", label: "Monster", icon: "paw" },
  miniboss: { tier: "miniboss", label: "Miniboss", icon: "skull" },
  boss: { tier: "boss", label: "Boss", icon: "crown" },
};

/** The badge a difficulty earns: 1-2 a monster, 3-5 a miniboss, 8 and up a boss (questTier's rule). */
export function tierBadge(difficulty?: number): TierBadge {
  return TIER_BADGES[questTier(difficulty)];
}

// ---------------------------------------------------------------------------------------------------------------------
// The beast
// ---------------------------------------------------------------------------------------------------------------------

/**
 * The beast the quest fights: its own (or the library's suggestion, questBeastId), the family's copy first, else the
 * library's entry. The order the battle's encounter loader uses, so the card and the fight see the same checklist.
 */
export function beastOf(quest: Achievement, familyBeasts: readonly Beast[]): Beast | undefined {
  const beastId = questBeastId(quest);
  if (!beastId) return undefined;
  return familyBeasts.find((beast) => String(beast.id) === beastId) ?? libraryEntryOf(beastId);
}

export interface CardFace {
  /** The beast's name, or its tier's stand-in when the quest has no beast (what the fight shows) */
  name: string;
  /** The portrait number (NNN.webp) */
  avatar?: number;
  /** A picture the family uploaded for their own beast */
  picture?: string;
  /** The battle backdrop layers (earthbound-battle-backgrounds); undefined draws the default */
  bg1?: number;
  bg2?: number;
  /** True when the quest has no beast and the tier's stand-in is shown */
  isStandIn: boolean;
}

/** The beast as the card draws it. A quest with no beast fights its tier's stand-in, so the card shows the same one. */
export function cardFace(beast: Beast | undefined, tier: QuestTier): CardFace {
  if (!beast) {
    const standIn = standInMonster({ type: tier }, "");
    return { name: standIn.name, avatar: standIn.avatarId, isStandIn: true };
  }
  return {
    name: beast.name,
    avatar: beast.avatar || undefined,
    picture: beast.localImage || beast.imageUrl || undefined,
    bg1: beast.bg1,
    bg2: beast.bg2,
    isStandIn: false,
  };
}

/** The theme line under the name: the beast's temple ("Kitchen · Shadow"), or the quest's category name, or nothing. */
export function themeLine(beast: Pick<Beast, "theme"> | undefined, categoryName?: string): string {
  const parts = [categoryName?.trim() || "", templeThemeLabel(beast?.theme)].filter(Boolean);
  return parts.join(" · ");
}

// ---------------------------------------------------------------------------------------------------------------------
// The checklist, shared with the battle
// ---------------------------------------------------------------------------------------------------------------------

export interface CardStep {
  /** The battle's task id: `task-N` for a beast's checklist, `<questId>-task` for the chore itself */
  id: string;
  name: string;
  checked: boolean;
}

/** The text of one checklist entry; a beast saved by an older build may hold objects (BestiaryService reads both). */
const stepName = (entry: unknown): string => {
  const isPlainName = typeof entry === "string";
  if (isPlainName) return entry;
  const item = (entry ?? {}) as { label?: string; name?: string };
  return item.label || item.name || "Unknown Task";
};

/**
 * The steps of a hunt, exactly as the battle makes its attacks (encounterLoader.questFight): the beast's checklist, else
 * the quest itself as the one move. Nothing is checked yet.
 */
export function huntSteps(quest: Pick<Achievement, "id" | "achievementName">, beast?: Pick<Beast, "checklist">): CardStep[] {
  const checklist: unknown[] = Array.isArray(beast?.checklist) ? beast.checklist : [];
  const hasChecklist = checklist.length > 0;
  if (!hasChecklist) {
    return [{ id: `${quest.id}-task`, name: quest.achievementName || "Finish the chore", checked: false }];
  }
  return checklist.map((entry, index) => {
    const ownId = typeof entry === "object" && entry ? (entry as { id?: string }).id : undefined;
    return { id: ownId ? String(ownId) : `task-${index}`, name: stepName(entry), checked: false };
  });
}

/** The steps with the remembered ones checked. An id the checklist no longer holds is ignored, as the battle ignores it. */
export function mergeProgress(steps: readonly CardStep[], rememberedIds: readonly string[]): CardStep[] {
  const done = new Set(rememberedIds);
  return steps.map((step) => ({ ...step, checked: done.has(step.id) }));
}

/** The ids to remember: the checked steps, in checklist order (what the battle saves). */
export function checkedIds(steps: readonly CardStep[]): string[] {
  return steps.filter((step) => step.checked).map((step) => step.id);
}

/** The steps after a tap on one: it flips; an unknown id changes nothing. */
export function toggleStep(steps: readonly CardStep[], stepId: string): CardStep[] {
  return steps.map((step) => (step.id === stepId ? { ...step, checked: !step.checked } : step));
}

export interface StepTap {
  /** The steps after the tap */
  steps: CardStep[];
  /** The tapped step is now checked (false: it was unchecked, or the id is not on the list) */
  checked: boolean;
  /** This tap checked the last open step: the quest is ready to claim */
  completesList: boolean;
  /** The id is on the list */
  known: boolean;
}

/** A tap on a step and what the card should make of it: how it flipped, and whether it finished the list. */
export function tapStep(steps: readonly CardStep[], stepId: string): StepTap {
  const known = steps.some((step) => step.id === stepId);
  const next = toggleStep(steps, stepId);
  const checked = known && next.find((step) => step.id === stepId)?.checked === true;
  const completesList = checked && next.every((step) => step.checked);
  return { steps: next, checked, completesList, known };
}

/** "2 of 4 steps" / "All 4 steps" / "1 step": the checklist header. */
export function progressLine(steps: readonly CardStep[]): string {
  const total = steps.length;
  const done = steps.filter((step) => step.checked).length;
  const isSingleStep = total === 1;
  if (isSingleStep) return done ? "1 step, done" : "1 step";
  return done === total && total > 0 ? `All ${total} steps` : `${done} of ${total} steps`;
}

/**
 * The BattleContext whose progress key the card reads and writes: the one the fight builds for this quest and hero
 * (BattleField: `{ ...ctx, kind: "quest", questId }`).
 */
export function progressContext(heroId: string, questId: string | number): BattleContext {
  return { kind: "quest", userId: String(heroId), questId: String(questId), beastIds: [] };
}

// ---------------------------------------------------------------------------------------------------------------------
// What the card lets the hero do
// ---------------------------------------------------------------------------------------------------------------------

/** True while the quest can still be worked: open, or overdue. A tamed, pending or not-yet-due quest only shows. */
export function isWorkable(status: BeastCardStatus): boolean {
  return status === "open" || status === "overdue";
}

/** The Claim button: every step is checked and the quest can still be claimed. */
export function isClaimable(status: BeastCardStatus, steps: readonly CardStep[]): boolean {
  return isWorkable(status) && steps.length > 0 && steps.every((step) => step.checked);
}

export interface CardActions {
  /** The steps answer a tap */
  canCheck: boolean;
  /** The Hunt button starts the fight */
  canHunt: boolean;
  /** The Claim button is lit */
  canClaim: boolean;
  /** Both buttons are drawn (a tamed or pending quest shows its state instead) */
  showButtons: boolean;
  /** The line under the steps for a quest that cannot be worked: "Tamed", "Waits for the Game Master", "Not due yet" */
  note: string;
}

const STATE_NOTE_KEYS: Partial<Record<BeastCardStatus, string>> = {
  done: "beastCard.note.done",
  pending: "beastCard.note.pending",
  later: "beastCard.note.later",
};

/** The line under the steps for a quest that cannot be worked, in the hero's voice; empty for one that can. */
export function stateNote(status: BeastCardStatus, voice: Voice = "adventure"): string {
  const key = STATE_NOTE_KEYS[status];
  return key ? copyFor(key, voice) : "";
}

/** The chip on the beast's portrait for a tamed or pending quest ("Tamed", "Pending"); empty for the rest. */
export function stateWord(status: BeastCardStatus, voice: Voice = "adventure"): string {
  const isTamed = status === "done";
  if (isTamed) return copyFor("beastCard.state.done", voice);
  return status === "pending" ? copyFor("beastCard.state.pending", voice) : "";
}

/** The hint beside Hunt and Claim, the card's guide line: the simple voice reads it aloud. */
export function hintLine(canClaim: boolean, voice: Voice = "adventure"): string {
  return copyFor(canClaim ? "beastCard.hint.claim" : "beastCard.hint.hunt", voice);
}

/**
 * What the card lets the hero do. Hunt is lit while a step is left: with every step checked the beast is already down,
 * and a fight started then would arm the chores afresh and wipe the checked steps, so Claim takes over.
 */
export function cardActions(
  status: BeastCardStatus,
  steps: readonly CardStep[],
  voice: Voice = "adventure",
  /** The family locked this chore when it ran late: the card only shows why ("Too late: this one closed at 6:00pm") */
  lockedNotice = "",
  /** The Game Master sent the hero's latest claim back: a workable card says so, with the note */
  sentBack: SentBack | null = null
): CardActions {
  const isLocked = lockedNotice !== "";
  if (isLocked) return { canCheck: false, canHunt: false, canClaim: false, showButtons: false, note: lockedNotice };
  const workable = isWorkable(status);
  const everyStepDone = steps.length > 0 && steps.every((step) => step.checked);
  return {
    canCheck: workable,
    canHunt: workable && !everyStepDone,
    canClaim: isClaimable(status, steps),
    showButtons: workable,
    note: sentBack && workable ? sentBackLine(sentBack) : stateNote(status, voice),
  };
}

/** A tamed or pending quest shows every step done: its chores were finished, whatever the progress record says. */
export function stepsForState(status: BeastCardStatus, steps: readonly CardStep[]): CardStep[] {
  return status === "done" || status === "pending" ? steps.map((step) => ({ ...step, checked: true })) : [...steps];
}

/**
 * The card's status from the Calendar's board item: the board knows open / done / not due, and whether a done quest
 * still waits for the Game Master. A day other than today can only be viewed (a claim stamps the quest done now).
 */
export function calendarCardStatus(
  status: "open" | "done" | "notDue",
  pending: boolean,
  isToday: boolean
): BeastCardStatus {
  const isDone = status === "done";
  if (isDone) return pending ? "pending" : "done";
  const isLater = status === "notDue" || !isToday;
  if (isLater) return "later";
  return "open";
}

// ---------------------------------------------------------------------------------------------------------------------
// The bestiary entry
// ---------------------------------------------------------------------------------------------------------------------

/** How often the hero has tamed this quest: the approved entries of their own in the quest log. A held claim is not yet. */
export function tamedCount(entries: readonly QuestLogEntry[], questId: string | number, heroId: string | number): number {
  const quest = String(questId);
  const hero = String(heroId);
  return entries.filter((entry) => String(entry.questId) === quest && String(entry.userId) === hero && entry.status === "approved")
    .length;
}

/** "Never tamed" / "Tamed 1 time" / "Tamed 7 times": the bestiary's kill-count line. */
export function tamedLine(count: number, voice: Voice = "adventure"): string {
  const isNeverTamed = !(count > 0);
  if (isNeverTamed) return copyFor("beastCard.tamed.never", voice);
  return copyFor(count === 1 ? "beastCard.tamed.one" : "beastCard.tamed.many", voice, { n: count });
}

/** The grudge as three slots, lit for each mark the beast holds against the hero (empty when it holds none). */
export function grudgeSlots(marks: unknown): boolean[] {
  const held = clampMarks(marks);
  return held ? Array.from({ length: MAX_GRUDGE_MARKS }, (_, index) => index < held) : [];
}

/** "2h 10m", "35m", "1d 3h": a span in whole minutes, the way the clock reads it. */
export function spanText(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const isUnderAMinute = minutes < 1;
  if (isUnderAMinute) return "under a minute";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  if (days) return hours ? `${days}d ${hours}h` : `${days}d`;
  if (hours) return rest ? `${hours}h ${rest}m` : `${hours}h`;
  return `${rest}m`;
}

/**
 * The due clock: "Due 6:00pm · 2h 10m left", "Overdue · was due 6:00pm", "Anytime today". Empty for a quest that is
 * already tamed or waiting on the Game Master. `label` is the board's own wording of the time ("6:00pm", "Tomorrow 6:00pm").
 */
export function dueClock(
  status: BeastCardStatus,
  due: Date | null | undefined,
  label: string,
  now: Date,
  voice: Voice = "adventure"
): string {
  const isSettled = status === "done" || status === "pending";
  if (isSettled) return "";
  const isLater = status === "later";
  if (isLater) return label ? copyFor("beastCard.due.later", voice, { label }) : copyFor("beastCard.due.notYet", voice);
  if (!due) {
    return status === "overdue" && label ? copyFor("beastCard.due.overdue", voice, { label }) : copyFor("beastCard.due.anytime", voice);
  }
  const minutes = differenceInMinutes(due, now);
  const isOverdue = status === "overdue" || minutes < 0;
  if (isOverdue) return copyFor("beastCard.due.overdue", voice, { label });

  return copyFor("beastCard.due.left", voice, { label, left: spanText(minutes) });
}

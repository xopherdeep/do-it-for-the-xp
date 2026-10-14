/**
 * The Power wizard (docs: compendium-wizards-design, sections 1, 3 and 5.3): the Game Master's Power form as steps in
 * the shared wizard shell. What is it? (name, description, icon, Real Life or In-Game) > What does it do? (the board
 * effect for a Real Life Power; the class and level, the effect text, the battle effect and the scaling for an In-Game
 * one) > What does it cost? (MP, AP, how often) > a summary that carries the verb Save. Pure: no Vue, no storage. The
 * draft is the Ability itself, so an edit opens on the summary with the same record it saves; each step's change to
 * it is a function that gives back a new Ability and never touches the old one.
 */
import { AbilityType, ABILITY_CLASSES, TimePeriod } from "@/hooks/abilities/abilityConstants";
import type { Ability, ApRequirement } from "@/hooks/abilities/abilityConstants";
import { BATTLE_EFFECTS } from "@/lib/services/battle/BattleEffects";
import { battleEffectOf } from "@/lib/services/battle/BattlePowers";
import { POWER_BOARD_EFFECTS, boardEffectOfPower } from "@/lib/services/abilities/PowerBoardEffects";
import { DEFAULT_TIMER_MINUTES, durationLabel, timerMinutesOf } from "@/lib/services/abilities/PowerTimers";
import type { WizardStep } from "@/lib/services/wizard/wizardSteps";

/** The draft is the record: nothing is copied back and forth between form fields and the Ability on save. */
export type PowerDraft = Ability;

export type PowerStepId = "what" | "does" | "cost" | "ready";

// ---------------------------------------------------------------------------------------------------------------------
// The choices a step offers (one list for the tiles and for the summary's words)
// ---------------------------------------------------------------------------------------------------------------------

export interface PowerChoice<Id extends string = string> {
  id: Id;
  label: string;
}

export const KIND_CHOICES: (PowerChoice<Ability["type"]> & { hint: string; icon: string })[] = [
  { id: AbilityType.RealLife, label: "Real Life", hint: "A privilege in the real world, like more time or a quiet day", icon: "key" },
  { id: AbilityType.InGame, label: "In-Game", hint: "A spell the hero casts in fights and temples", icon: "wand-magic" },
];

/** How often a Power can be used (the old form's Frequency list, every period). */
export const FREQUENCY_CHOICES: PowerChoice<Ability["frequency"]>[] = [
  { id: TimePeriod.Hourly, label: "Hourly" },
  { id: TimePeriod.Daily, label: "Daily" },
  { id: TimePeriod.Weekly, label: "Weekly" },
  { id: TimePeriod.Monthly, label: "Monthly" },
  { id: TimePeriod.Quarterly, label: "Quarterly" },
  { id: TimePeriod.BiAnnual, label: "Bi-Annual" },
  { id: TimePeriod.Yearly, label: "Yearly" },
  { id: TimePeriod.Flat, label: "One-Time" },
];

/** The span the AP threshold is measured over (the old form's AP Period list). */
export const AP_PERIOD_CHOICES: PowerChoice<ApRequirement["period"]>[] = [
  { id: TimePeriod.Daily, label: "Daily" },
  { id: TimePeriod.Weekly, label: "Weekly" },
  { id: TimePeriod.Monthly, label: "Monthly" },
  { id: TimePeriod.Yearly, label: "Yearly" },
  { id: TimePeriod.Flat, label: "Total (one-time)" },
];

/** "time-mage" reads "Time Mage". */
export const classLabel = (className: string): string => className.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export const CLASS_CHOICES: PowerChoice[] = Object.values(ABILITY_CLASSES).map((id) => ({ id, label: classLabel(id) }));

export const ATTRIBUTE_CHOICES: PowerChoice[] = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"].map((id) => ({
  id,
  label: id.replace(/^\w/, (letter) => letter.toUpperCase()),
}));

const labelIn = (choices: readonly PowerChoice[], id: string): string => choices.find((choice) => choice.id === id)?.label ?? id;

// ---------------------------------------------------------------------------------------------------------------------
// The steps
// ---------------------------------------------------------------------------------------------------------------------

const isInGame = (draft: PowerDraft): boolean => draft.type === AbilityType.InGame;

const NEEDS_A_NUMBER = (what: string) => `${what} needs a number`;
const CANT_BE_NEGATIVE = (what: string) => `${what} can't be negative`;

/** One line for a cost that is not a whole non-negative number, or true. */
const costProblem = (what: "MP" | "AP", amount: number): true | string => {
  if (!Number.isFinite(amount)) return NEEDS_A_NUMBER(what);
  return amount < 0 ? CANT_BE_NEGATIVE(what) : true;
};

/** Only the fields of the Power's own kind are asked; the other kind's fields may still sit on the record and are not checked. */
const doesProblem = (draft: PowerDraft): true | string => {
  if (!isInGame(draft)) return true;
  const level = draft.characterRequirement?.level;
  if (level !== undefined && !(level >= 0)) return "Character level can't be negative";
  const needsClass = classRequirementOf(draft);
  if (needsClass && !(needsClass.level >= 1)) return "Class level starts at 1";
  const rate = draft.scaling?.rate;
  if (rate !== undefined && !(rate >= 0 && rate <= 1)) return "Scaling goes from 0 to 100%";
  return true;
};

/**
 * The steps in the Game Master's voice: the guide asks the question a parent would ask themself, and a step that is not
 * valid says why in one line. Nothing is skipped: the type changes the fields inside "What does it do?", not the steps.
 */
export const powerWizardSteps = (): WizardStep<PowerDraft>[] => [
  {
    id: "what",
    title: "What is it?",
    guide: "What is this Power, and what do you call it?",
    icon: "hand-holding-magic",
    isValid: (draft) => draft.name.trim() !== "" || "Give it a name",
  },
  {
    id: "does",
    title: "What does it do?",
    guide: "What happens when a hero uses it?",
    icon: "wand-magic",
    isValid: doesProblem,
  },
  {
    id: "cost",
    title: "What does it cost?",
    guide: "What does it cost, and how often can it be used?",
    icon: "coins",
    isValid: (draft) => {
      const mp = costProblem("MP", draft.mpCost);
      return mp === true ? costProblem("AP", draft.apRequirement.amount) : mp;
    },
  },
  {
    id: "ready",
    title: "Ready?",
    guide: "Look it over. Tap anything to change it, then save.",
    icon: "check-circle",
    isValid: () => true,
  },
];

// ---------------------------------------------------------------------------------------------------------------------
// The draft
// ---------------------------------------------------------------------------------------------------------------------

/** A new Power: Real Life, Daily, free, the wand icon, somewhere on the Power tree (`roll` is Math.random, handed in for a spec). */
export const blankPower = (roll: () => number = Math.random): PowerDraft => ({
  id: "",
  name: "",
  description: "",
  type: AbilityType.RealLife,
  frequency: TimePeriod.Daily,
  mpCost: 0,
  apRequirement: { amount: 0, period: TimePeriod.Daily },
  prerequisites: [],
  icon: "hand-holding-magic",
  iconPrefix: "fad",
  isPreset: false,
  // A new privilege runs on a 30 minute clock once cast; 0 is a privilege with no timer
  timerMinutes: DEFAULT_TIMER_MINUTES,
  position: { x: Math.floor(roll() * 800), y: Math.floor(roll() * 600) },
});

/** A whole number from what a field holds; null for an empty field or a word, so the field can be cleared to retype. */
export const countOf = (text: string): number | null => {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? Math.trunc(number) : null;
};

/** The class a Power asks for and its level, or null. A Power asks for one class; if the record has more, the first. */
export const classRequirementOf = (draft: PowerDraft): { name: string; level: number } | null => {
  const [name] = Object.keys(draft.characterRequirement?.class ?? {});
  return name ? { name, level: draft.characterRequirement?.class?.[name] ?? 0 } : null;
};

/** The requirement without anything in it is no requirement. */
const trimmedRequirement = (requirement: Ability["characterRequirement"]): Ability["characterRequirement"] => {
  const level = requirement?.level;
  const hasClass = Boolean(requirement?.class && Object.keys(requirement.class).length);
  if (!hasClass && level === undefined) return undefined;
  return { ...(hasClass ? { class: requirement?.class } : {}), ...(level !== undefined ? { level } : {}) };
};

const withRequirement = (draft: PowerDraft, requirement: Ability["characterRequirement"]): PowerDraft => {
  const next: PowerDraft = { ...draft };
  delete next.characterRequirement;
  const trimmed = trimmedRequirement(requirement);
  return trimmed ? { ...next, characterRequirement: trimmed } : next;
};

/** "none" clears the class; any other name replaces it. The character level is left as it was. */
export const withClassRequirement = (draft: PowerDraft, className: string, level: number): PowerDraft => {
  const kept = draft.characterRequirement?.level;
  return withRequirement(draft, {
    ...(className !== "none" ? { class: { [className]: level } } : {}),
    ...(kept !== undefined ? { level: kept } : {}),
  });
};

/** 0 when the Power asks for no hero level. */
export const characterLevelOf = (draft: PowerDraft): number => draft.characterRequirement?.level ?? 0;

/** 0 clears the hero level; the class is left as it was. */
export const withCharacterLevel = (draft: PowerDraft, level: number): PowerDraft =>
  withRequirement(draft, {
    ...(draft.characterRequirement?.class ? { class: draft.characterRequirement.class } : {}),
    ...(level !== 0 ? { level } : {}),
  });

const DEFAULT_RATE = 0.1;

/** The attribute a Power scales with ("none" when it does not) and the rate a point adds (10% until the Game Master tunes it). */
export const scalingOf = (draft: PowerDraft): { attribute: string; rate: number } => ({
  attribute: draft.scaling?.attribute ?? "none",
  rate: draft.scaling?.rate ?? DEFAULT_RATE,
});

/** Whole percents, 0 to 100, so 10% and 5% make 15% and not 0.15000000000000002. */
const tidyRate = (rate: number): number => Math.round(Math.min(Math.max(rate, 0), 1) * 100) / 100;

/** "none" clears the scaling; an attribute keeps the rate it had unless a new one comes with it. */
export const withScaling = (draft: PowerDraft, attribute: string, rate?: number): PowerDraft => {
  const next: PowerDraft = { ...draft };
  delete next.scaling;
  if (attribute === "none") return next;
  return { ...next, scaling: { attribute, rate: tidyRate(rate ?? scalingOf(draft).rate) } };
};

export const withApRequirement = (draft: PowerDraft, patch: Partial<ApRequirement>): PowerDraft => ({
  ...draft,
  apRequirement: { ...draft.apRequirement, ...patch },
});

/** What the icon picker brings back when the Game Master confirms (XpIconPicker emits `select` with this). */
export interface PickedIcon {
  iconName?: string;
  iconPrefix?: string;
}

/** The icon the picker confirmed; the same draft when it brought nothing back. The family is duotone unless the picker said otherwise. */
export const withPickedIcon = (draft: PowerDraft, picked: PickedIcon | undefined): PowerDraft => {
  const name = picked?.iconName?.trim();
  if (!name) return draft;
  return { ...draft, icon: name, iconPrefix: picked?.iconPrefix || "fad" };
};

/** `fad fa-bolt`: the Power's own prefix, duotone when it has none, the wand when it has no icon. */
export const iconClassOf = (draft: Pick<PowerDraft, "icon" | "iconPrefix">): string =>
  `${draft.iconPrefix || "fad"} fa-${draft.icon || "hand-holding-magic"}`;

/**
 * A stored Power as the draft of an edit: a copy whose costs are numbers (a field that was typed once may have been stored
 * as text, and "5" + 1 is "51") and whose words and AP requirement are never missing, so no step meets an undefined.
 * A cost that is not a number stays one: the cost step says so rather than the form saving a 0 nobody chose.
 */
export const loadedPower = (stored: Ability): PowerDraft => ({
  ...stored,
  name: stored.name ?? "",
  description: stored.description ?? "",
  mpCost: stored.mpCost === undefined || stored.mpCost === null ? 0 : Number(stored.mpCost),
  apRequirement: {
    amount: stored.apRequirement?.amount === undefined || stored.apRequirement?.amount === null ? 0 : Number(stored.apRequirement.amount),
    period: stored.apRequirement?.period ?? TimePeriod.Daily,
  },
});

/** What AbilitiesDb.setAbility gets: a copy with the words trimmed and the costs as numbers, the effects as picked. */
export const finishedPower = (draft: PowerDraft): PowerDraft => ({
  ...draft,
  name: draft.name.trim(),
  description: draft.description.trim(),
  mpCost: Number(draft.mpCost),
  timerMinutes: Math.max(0, Math.trunc(Number(draft.timerMinutes) || 0)),
  apRequirement: { ...draft.apRequirement, amount: Number(draft.apRequirement.amount) },
});

// ---------------------------------------------------------------------------------------------------------------------
// The summary (the last step lists what the Game Master chose; a tap on a row goes back to the step that owns it)
// ---------------------------------------------------------------------------------------------------------------------

export interface PowerSummaryRow {
  id: string;
  /** The step a tap goes to */
  step: Exclude<PowerStepId, "ready">;
  /** Font Awesome duotone icon, no prefix */
  icon: string;
  label: string;
  value: string;
  /** A second line under the value */
  detail?: string;
}

const whoLine = (draft: PowerDraft): string => {
  const needsClass = classRequirementOf(draft);
  const level = characterLevelOf(draft);
  const parts = [
    ...(needsClass ? [`${classLabel(needsClass.name)} level ${needsClass.level}`] : []),
    ...(level > 0 ? [`${needsClass ? "hero" : "Hero"} level ${level}`] : []),
  ];
  return parts.length ? parts.join(", ") : "Any hero";
};

const scalingLine = (draft: PowerDraft): string => {
  const { attribute, rate } = scalingOf(draft);
  if (attribute === "none") return "Does not scale";
  return `${labelIn(ATTRIBUTE_CHOICES, attribute)}, ${Math.round(rate * 100)}% a point`;
};

const apLine = (draft: PowerDraft): string => {
  const { amount, period } = draft.apRequirement;
  if (!(amount > 0)) return "No AP needed";
  return period === TimePeriod.Flat ? `${amount} AP in total` : `${amount} AP, counted ${period}`;
};

export const powerSummary = (draft: PowerDraft): PowerSummaryRow[] => {
  const name = draft.name.trim();
  const boardEffect = boardEffectOfPower(draft);
  const battleEffect = battleEffectOf(draft);
  const effectText = (draft.effect ?? "").trim();

  const open: PowerSummaryRow[] = [
    { id: "name", step: "what", icon: "signature", label: "Name", value: name || "No name yet", detail: draft.description.trim() || undefined },
    { id: "kind", step: "what", icon: "tag", label: "Kind", value: labelIn(KIND_CHOICES, draft.type) },
  ];

  const does: PowerSummaryRow[] = isInGame(draft)
    ? [
        { id: "who", step: "does", icon: "user-shield", label: "Who can cast it", value: whoLine(draft) },
        { id: "effect", step: "does", icon: "sparkles", label: "Effect", value: effectText || "No description of the effect" },
        {
          id: "battle",
          step: "does",
          icon: "swords",
          label: "In battle",
          value: battleEffect ? BATTLE_EFFECTS[battleEffect].label : "Nothing in battle",
        },
        { id: "scaling", step: "does", icon: "dumbbell", label: "Grows with", value: scalingLine(draft) },
      ]
    : [
        {
          id: "board",
          step: "does",
          icon: "calendar-alt",
          label: "On the quest board",
          value: boardEffect ? POWER_BOARD_EFFECTS[boardEffect].label : "Nothing on the quest board",
        },
        {
          id: "timer",
          step: "does",
          icon: "stopwatch",
          label: "Timer",
          value: timerMinutesOf(draft) > 0 ? `${durationLabel(timerMinutesOf(draft))} once cast` : "No timer",
        },
      ];

  const cost: PowerSummaryRow[] = [
    { id: "mp", step: "cost", icon: "magic", label: "Costs", value: draft.mpCost > 0 ? `${draft.mpCost} MP` : "Free to cast" },
    { id: "ap", step: "cost", icon: "star", label: "Needs", value: apLine(draft) },
    { id: "frequency", step: "cost", icon: "hourglass-half", label: "Can be used", value: labelIn(FREQUENCY_CHOICES, draft.frequency) },
  ];

  return [...open, ...does, ...cost];
};

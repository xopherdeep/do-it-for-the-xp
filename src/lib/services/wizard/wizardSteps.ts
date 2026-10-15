/**
 * The wizard engine the Compendium forms and the Quest Wizard share (docs: compendium-wizards-design, section 1).
 * A form hands over its steps and its draft; these answer where to go next (jumping over skipped steps), "n of N"
 * over the steps that are really asked, Ready, the one line that says why Next is disabled, and which dots may be
 * tapped. Pure: no Vue, no storage, and no index of its own. The caller keeps the index (XpWizardShell keeps it in a
 * ref) and passes it in, so every answer is a plain function of steps, draft and index.
 */

export interface WizardStep<Draft> {
  /** Names the step's slot in XpWizardShell, and the data-test of its dot */
  id: string;
  /** The step's name: the header's title and the dot's label */
  title: string;
  /** The guide's one line on this step, already in the family's voice (the speak button reads it) */
  guide: string;
  /** Font Awesome duotone icon beside the guide line, no prefix (`paw-claws`) */
  icon?: string;
  // Method syntax on purpose: a form's WizardStep<ItsDraft>[] stays assignable to the shell's WizardStep<object>[]
  /**
   * True when the draft is good for this step. A string says it is not and why, in one line a parent would say
   * ("Give it a name"); `false` says it is not, with no words.
   */
  isValid(draft: Draft): boolean | string;
  /** True when the draft makes this step pointless (gear stats on an item that is not virtual): it is never shown */
  isSkipped?(draft: Draft): boolean;
}

export interface StepVerdict {
  valid: boolean;
  /** One line for the parent, empty when valid or when the validator gave no words */
  reason: string;
}

export interface WizardProgress {
  /** 1-based place among the steps that are asked */
  n: number;
  /** How many steps are asked */
  total: number;
}

export const stepVerdict = <Draft>(step: WizardStep<Draft>, draft: Draft): StepVerdict => {
  const result = step.isValid(draft);
  const isValid = result === true;
  if (isValid) return { valid: true, reason: "" };
  return { valid: false, reason: typeof result === "string" ? result : "" };
};

/** False for an index outside the steps and for a step with no skip rule. */
export const skippedAt = <Draft>(steps: readonly WizardStep<Draft>[], draft: Draft, index: number): boolean =>
  steps[index]?.isSkipped?.(draft) ?? false;

/** Indexes of the steps that are asked, in order. */
const askedIndexes = <Draft>(steps: readonly WizardStep<Draft>[], draft: Draft): number[] =>
  steps.map((_, index) => index).filter((index) => !skippedAt(steps, draft, index));

/** The next step that is asked, or `from` when there is none (Next on the last step does not move). */
export const nextIndex = <Draft>(steps: readonly WizardStep<Draft>[], draft: Draft, from: number): number =>
  askedIndexes(steps, draft).find((index) => index > from) ?? from;

/** The previous step that is asked, or `from` when there is none (the shell closes instead of moving back). */
export const previousIndex = <Draft>(steps: readonly WizardStep<Draft>[], draft: Draft, from: number): number =>
  [...askedIndexes(steps, draft)].reverse().find((index) => index < from) ?? from;

/** Where a new form opens: the first step that is asked (0 when none is). */
export const firstIndex = <Draft>(steps: readonly WizardStep<Draft>[], draft: Draft): number => askedIndexes(steps, draft)[0] ?? 0;

/** Where an edit opens: the summary, the last step that is asked (0 when none is). */
export const lastIndex = <Draft>(steps: readonly WizardStep<Draft>[], draft: Draft): number => askedIndexes(steps, draft).pop() ?? 0;

/** The last step that is asked carries the form's verb instead of Next. */
export const isLast = <Draft>(steps: readonly WizardStep<Draft>[], draft: Draft, index: number): boolean =>
  nextIndex(steps, draft, index) === index;

/** "n of N" counting only the steps that are asked; never 0 of N while a step is open. */
export const progressOf = <Draft>(steps: readonly WizardStep<Draft>[], draft: Draft, index: number): WizardProgress => {
  const asked = askedIndexes(steps, draft);
  const behind = asked.filter((at) => at <= index).length;
  return { n: Math.min(Math.max(behind, 1), asked.length), total: asked.length };
};

/** Every step that is asked is valid: the form may be saved. */
export const isReady = <Draft>(steps: readonly WizardStep<Draft>[], draft: Draft): boolean =>
  askedIndexes(steps, draft).every((index) => stepVerdict(steps[index], draft).valid);

/** Next is open when this step is valid; the last step's verb needs the whole form. */
export const canNext = <Draft>(steps: readonly WizardStep<Draft>[], draft: Draft, index: number): boolean =>
  isLast(steps, draft, index) ? isReady(steps, draft) : (steps[index] ? stepVerdict(steps[index], draft).valid : false);

/**
 * The one line that says why Next is disabled, empty when it is open or the validator gave no words. On the last step
 * it is the first step that is asked and not valid, whichever it is, because the verb needs them all.
 */
export const blockedBy = <Draft>(steps: readonly WizardStep<Draft>[], draft: Draft, index: number): string => {
  if (canNext(steps, draft, index)) return "";
  if (!isLast(steps, draft, index)) return stepVerdict(steps[index], draft).reason;
  const first = askedIndexes(steps, draft).find((at) => !stepVerdict(steps[at], draft).valid);
  return first === undefined ? "" : stepVerdict(steps[first], draft).reason;
};

/**
 * A dot may be tapped only for a step that is asked and already valid, and only when every step before it is valid
 * too: a tap never leaps over a step that still wants an answer.
 */
export const canJumpTo = <Draft>(steps: readonly WizardStep<Draft>[], draft: Draft, target: number): boolean => {
  const isOutOfRange = !Number.isInteger(target) || target < 0 || target >= steps.length;
  if (isOutOfRange) return false;
  const isSkipped = skippedAt(steps, draft, target);
  if (isSkipped) return false;
  return askedIndexes(steps, draft)
    .filter((index) => index <= target)
    .every((index) => stepVerdict(steps[index], draft).valid);
};

/** Where a tap on a dot lands: the step when allowed, otherwise `from`. */
export const jumpIndex = <Draft>(steps: readonly WizardStep<Draft>[], draft: Draft, from: number, target: number): number =>
  canJumpTo(steps, draft, target) ? target : from;

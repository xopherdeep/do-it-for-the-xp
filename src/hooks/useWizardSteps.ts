import { computed, toValue, type MaybeRefOrGetter, type Ref } from "vue";
import {
  blockedBy,
  canJumpTo,
  canNext,
  isLast,
  jumpIndex,
  nextIndex,
  previousIndex,
  progressOf,
  isReady,
  skippedAt,
} from "@/lib/services/wizard/wizardSteps";
import type { WizardStep } from "@/lib/services/wizard/wizardSteps";

/** One dot of the progress row: a step that is asked, and whether a tap may land on it. */
export interface WizardDot {
  id: string;
  title: string;
  index: number;
  isDone: boolean;
  isHere: boolean;
  canJump: boolean;
}

/**
 * The thin Vue side of wizardSteps.ts: the rules stay there, this only reads them against the live steps, draft and
 * index. `index` is a writable ref the caller owns (XpWizardShell keeps it behind a v-model), and `next` / `back` /
 * `jumpTo` move it and say whether they did.
 */
export function useWizardSteps<Draft>(
  steps: MaybeRefOrGetter<readonly WizardStep<Draft>[]>,
  draft: MaybeRefOrGetter<Draft>,
  index: Ref<number>
) {
  const all = () => toValue(steps);
  const current = () => toValue(draft);

  const step = computed(() => all()[index.value]);
  const progress = computed(() => progressOf(all(), current(), index.value));
  const ready = computed(() => isReady(all(), current()));
  const isFirst = computed(() => previousIndex(all(), current(), index.value) === index.value);
  const isFinal = computed(() => isLast(all(), current(), index.value));
  const canGoNext = computed(() => canNext(all(), current(), index.value));
  const reason = computed(() => blockedBy(all(), current(), index.value));

  const dots = computed<WizardDot[]>(() =>
    all()
      .map((each, at): WizardDot => ({
        id: each.id,
        title: each.title,
        index: at,
        isDone: at < index.value,
        isHere: at === index.value,
        canJump: at !== index.value && canJumpTo(all(), current(), at),
      }))
      .filter((dot) => !skippedAt(all(), current(), dot.index))
  );

  /** One step forward over skipped steps; false on the last step or when this step is not valid yet. */
  const next = (): boolean => {
    if (isFinal.value || !canGoNext.value) return false;
    index.value = nextIndex(all(), current(), index.value);
    return true;
  };

  /** One step back over skipped steps; false on the first step (the shell closes instead). */
  const back = (): boolean => {
    if (isFirst.value) return false;
    index.value = previousIndex(all(), current(), index.value);
    return true;
  };

  /** To a step that is already valid (and so are all before it); false when the dot may not be tapped. */
  const jumpTo = (target: number): boolean => {
    const landed = jumpIndex(all(), current(), index.value, target);
    if (landed === index.value) return false;
    index.value = landed;
    return true;
  };

  return { step, progress, ready, isFirst, isLast: isFinal, canNext: canGoNext, blockedBy: reason, dots, next, back, jumpTo };
}

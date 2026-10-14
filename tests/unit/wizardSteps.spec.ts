import {
  blockedBy,
  canJumpTo,
  canNext,
  firstIndex,
  isLast,
  isReady,
  jumpIndex,
  lastIndex,
  nextIndex,
  previousIndex,
  progressOf,
  skippedAt,
  stepVerdict,
} from "@/lib/services/wizard/wizardSteps";
import type { WizardStep } from "@/lib/services/wizard/wizardSteps";

/**
 * The wizard engine the Compendium forms share: steps with a validator and an optional skip, moving over skipped
 * steps, "n of N" over the steps that are really asked, Ready, the one-line reason Next is disabled, and which dots
 * may be tapped. Pure: the index lives with the caller (the shell keeps it in a ref).
 */

interface Draft {
  name: string;
  virtual: boolean;
  price: number;
}

const draft = (patch: Partial<Draft> = {}): Draft => ({ name: "Sock", virtual: false, price: 10, ...patch });

// The shop item's shape in miniature: a name that must be given, a price, gear stats only for virtual items
const steps: WizardStep<Draft>[] = [
  { id: "what", title: "What is it?", guide: "What is it?", isValid: (d) => d.name.trim() !== "" || "Give it a name" },
  { id: "cost", title: "Cost", guide: "What does it cost?", isValid: (d) => d.price > 0 || "Price it above zero" },
  { id: "gear", title: "Gear stats", guide: "What does it do?", isValid: () => true, isSkipped: (d) => !d.virtual },
  { id: "ready", title: "Ready", guide: "All set?", isValid: () => true },
];

describe("stepVerdict and skippedAt", () => {
  it("reads true as valid, a string as the reason, and false as invalid with no words", () => {
    expect(stepVerdict(steps[0], draft())).toEqual({ valid: true, reason: "" });
    expect(stepVerdict(steps[0], draft({ name: "  " }))).toEqual({ valid: false, reason: "Give it a name" });
    const silent: WizardStep<Draft> = { id: "s", title: "S", guide: "", isValid: () => false };
    expect(stepVerdict(silent, draft())).toEqual({ valid: false, reason: "" });
    const emptyReason: WizardStep<Draft> = { id: "e", title: "E", guide: "", isValid: () => "" };
    expect(stepVerdict(emptyReason, draft())).toEqual({ valid: false, reason: "" });
  });

  it("asks the draft whether a step is skipped, and never skips a step that has no rule", () => {
    expect(skippedAt(steps, draft(), 2)).toBe(true);
    expect(skippedAt(steps, draft({ virtual: true }), 2)).toBe(false);
    expect(skippedAt(steps, draft(), 0)).toBe(false);
    expect(skippedAt(steps, draft(), 9)).toBe(false);
  });
});

describe("nextIndex, previousIndex, firstIndex and lastIndex jump over skipped steps", () => {
  it("goes straight to the next step when none is skipped", () => {
    const virtual = draft({ virtual: true });
    expect(nextIndex(steps, virtual, 0)).toBe(1);
    expect(nextIndex(steps, virtual, 1)).toBe(2);
    expect(previousIndex(steps, virtual, 3)).toBe(2);
  });

  it("jumps over the skipped step both ways", () => {
    expect(nextIndex(steps, draft(), 1)).toBe(3);
    expect(previousIndex(steps, draft(), 3)).toBe(1);
  });

  it("stays put at the ends", () => {
    expect(nextIndex(steps, draft(), 3)).toBe(3);
    expect(previousIndex(steps, draft(), 0)).toBe(0);
  });

  it("stays put when every step after (or before) is skipped", () => {
    const tail: WizardStep<Draft>[] = [steps[0], { ...steps[1], isSkipped: () => true }, { ...steps[3], isSkipped: () => true }];
    expect(nextIndex(tail, draft(), 0)).toBe(0);
    expect(previousIndex(tail, draft(), 2)).toBe(0);
  });

  it("finds the first and the last step that is really asked, for a form opened on its summary", () => {
    expect(firstIndex(steps, draft())).toBe(0);
    expect(lastIndex(steps, draft())).toBe(3);
    const gearLast: WizardStep<Draft>[] = [{ ...steps[0], isSkipped: () => true }, steps[1], { ...steps[2], isSkipped: () => true }];
    expect(firstIndex(gearLast, draft())).toBe(1);
    expect(lastIndex(gearLast, draft())).toBe(1);
  });

  it("falls back to 0 when every step is skipped", () => {
    const none = steps.map((step) => ({ ...step, isSkipped: () => true }));
    expect(firstIndex(none, draft())).toBe(0);
    expect(lastIndex(none, draft())).toBe(0);
  });
});

describe("isLast", () => {
  it("is the last step that is asked: a trailing skipped step does not hide it", () => {
    expect(isLast(steps, draft(), 3)).toBe(true);
    expect(isLast(steps, draft(), 1)).toBe(false);
    const tail: WizardStep<Draft>[] = [steps[0], steps[1], { ...steps[2], isSkipped: () => true }];
    expect(isLast(tail, draft(), 1)).toBe(true);
    expect(isLast(tail, draft(), 0)).toBe(false);
  });
});

describe("progressOf counts only the steps that are asked", () => {
  it("reads n of N over four steps when none is skipped", () => {
    const virtual = draft({ virtual: true });
    expect(progressOf(steps, virtual, 0)).toEqual({ n: 1, total: 4 });
    expect(progressOf(steps, virtual, 2)).toEqual({ n: 3, total: 4 });
    expect(progressOf(steps, virtual, 3)).toEqual({ n: 4, total: 4 });
  });

  it("drops the skipped step from both numbers", () => {
    expect(progressOf(steps, draft(), 1)).toEqual({ n: 2, total: 3 });
    expect(progressOf(steps, draft(), 3)).toEqual({ n: 3, total: 3 });
  });

  it("changes as the draft changes which steps are skipped", () => {
    expect(progressOf(steps, draft({ virtual: true }), 3)).toEqual({ n: 4, total: 4 });
    expect(progressOf(steps, draft({ virtual: false }), 3)).toEqual({ n: 3, total: 3 });
  });

  it("never reads 0 of N while a step is open, and 0 of 0 when nothing is asked", () => {
    const skippedFirst: WizardStep<Draft>[] = [{ ...steps[0], isSkipped: () => true }, steps[1]];
    expect(progressOf(skippedFirst, draft(), 0)).toEqual({ n: 1, total: 1 });
    expect(progressOf([], draft(), 0)).toEqual({ n: 0, total: 0 });
  });
});

describe("isReady", () => {
  it("is true when every step that is asked is valid", () => {
    expect(isReady(steps, draft())).toBe(true);
  });

  it("is false while one step is invalid", () => {
    expect(isReady(steps, draft({ name: "" }))).toBe(false);
    expect(isReady(steps, draft({ price: 0 }))).toBe(false);
  });

  it("ignores an invalid step that is skipped", () => {
    const broken: WizardStep<Draft>[] = [steps[0], { ...steps[1], isValid: () => false, isSkipped: () => true }];
    expect(isReady(broken, draft())).toBe(true);
  });
});

describe("canNext and blockedBy", () => {
  it("lets Next through a valid step, with no reason", () => {
    expect(canNext(steps, draft(), 0)).toBe(true);
    expect(blockedBy(steps, draft(), 0)).toBe("");
  });

  it("blocks Next on an invalid step and gives its one-line reason", () => {
    const nameless = draft({ name: "" });
    expect(canNext(steps, nameless, 0)).toBe(false);
    expect(blockedBy(steps, nameless, 0)).toBe("Give it a name");
  });

  it("blocks with no words when the validator gave none", () => {
    const silent: WizardStep<Draft>[] = [{ id: "a", title: "A", guide: "", isValid: () => false }, steps[3]];
    expect(canNext(silent, draft(), 0)).toBe(false);
    expect(blockedBy(silent, draft(), 0)).toBe("");
  });

  it("looks only at the step it is on", () => {
    // step 1 (cost) is invalid, but the hero is still on step 0
    expect(canNext(steps, draft({ price: 0 }), 0)).toBe(true);
    expect(blockedBy(steps, draft({ price: 0 }), 0)).toBe("");
    expect(blockedBy(steps, draft({ price: 0 }), 1)).toBe("Price it above zero");
  });

  it("on the last step the verb needs the whole form: Ready, with the first problem as the reason", () => {
    expect(canNext(steps, draft(), 3)).toBe(true);
    expect(canNext(steps, draft({ name: "" }), 3)).toBe(false);
    expect(blockedBy(steps, draft({ name: "", price: 0 }), 3)).toBe("Give it a name");
    expect(blockedBy(steps, draft({ price: 0 }), 3)).toBe("Price it above zero");
  });
});

describe("canJumpTo and jumpIndex allow only steps that are already valid", () => {
  it("allows a valid step whose earlier steps are all valid", () => {
    const virtual = draft({ virtual: true });
    expect(canJumpTo(steps, virtual, 0)).toBe(true);
    expect(canJumpTo(steps, virtual, 2)).toBe(true);
    expect(canJumpTo(steps, virtual, 3)).toBe(true);
  });

  it("refuses a step that is invalid itself", () => {
    expect(canJumpTo(steps, draft({ name: "" }), 0)).toBe(false);
    expect(canJumpTo(steps, draft({ price: 0 }), 1)).toBe(false);
  });

  it("refuses to leap over an invalid step, even to a step that is valid", () => {
    // the summary is valid on its own, but the name was never given
    expect(canJumpTo(steps, draft({ name: "" }), 3)).toBe(false);
    expect(canJumpTo(steps, draft({ name: "" }), 1)).toBe(false);
  });

  it("refuses a skipped step and an index outside the steps", () => {
    expect(canJumpTo(steps, draft(), 2)).toBe(false);
    expect(canJumpTo(steps, draft(), -1)).toBe(false);
    expect(canJumpTo(steps, draft(), 4)).toBe(false);
    expect(canJumpTo(steps, draft(), 1.5)).toBe(false);
  });

  it("an invalid step that is skipped does not stop the way past it", () => {
    const hole: WizardStep<Draft>[] = [{ ...steps[0], isValid: () => false, isSkipped: () => true }, steps[1], steps[3]];
    expect(canJumpTo(hole, draft(), 2)).toBe(true);
  });

  it("jumpIndex lands on the step when allowed and stays where it is when not", () => {
    expect(jumpIndex(steps, draft(), 3, 1)).toBe(1);
    expect(jumpIndex(steps, draft(), 3, 2)).toBe(3);
    expect(jumpIndex(steps, draft({ name: "" }), 0, 3)).toBe(0);
  });
});

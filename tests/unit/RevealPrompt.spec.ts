import { defineComponent, effectScope } from "vue";
import { mount } from "@vue/test-utils";
import {
  BUILDING_ACCENTS,
  accentOf,
  noticeOf,
  yesNoOf,
  amountMax,
  amountMin,
  amountPresets,
  cancelAnswer,
  cancelIdOf,
  clampAmount,
  glowOf,
  initialAmount,
  linesOf,
  stepAmount,
  type RevealPromptOptions,
} from "@/components/organisms/RevealPrompt/revealPrompt";
import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";

const yesNo: RevealPromptOptions = {
  lines: ["Buy it?"],
  choices: [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
  ],
};

describe("the amount stepper", () => {
  it("holds a number to its range, as a whole number", () => {
    const amount = { min: 1, max: 40 };
    expect(clampAmount(0, amount)).toBe(1);
    expect(clampAmount(25.9, amount)).toBe(25);
    expect(clampAmount(900, amount)).toBe(40);
    expect(clampAmount(Number.NaN, amount)).toBe(1);
  });

  it("reads a missing min as 1 and never lets max sit below min", () => {
    expect(amountMin({ max: 9 })).toBe(1);
    expect(amountMax({ min: 5, max: 2 })).toBe(5);
    expect(amountMin({ min: 0, max: 9 })).toBe(0);
  });

  it("starts at min unless told otherwise, held to the range", () => {
    expect(initialAmount({ max: 40 })).toBe(1);
    expect(initialAmount({ max: 40, initial: 25 })).toBe(25);
    expect(initialAmount({ max: 40, initial: 99 })).toBe(40);
  });

  it("steps by one by default, by `step` when set, and stops at either end", () => {
    const amount = { min: 1, max: 5 };
    expect(stepAmount(3, 1, amount)).toBe(4);
    expect(stepAmount(3, -1, amount)).toBe(2);
    expect(stepAmount(5, 1, amount)).toBe(5);
    expect(stepAmount(1, -1, amount)).toBe(1);
    expect(stepAmount(10, 1, { min: 0, max: 100, step: 10 })).toBe(20);
    expect(stepAmount(10, 1, { min: 1, max: 100 }, 10)).toBe(20);
  });
});

describe("amountPresets", () => {
  it("has none when there is nothing to pick", () => {
    expect(amountPresets(0)).toEqual([]);
    expect(amountPresets(-4)).toEqual([]);
  });

  it("offers the round numbers below the top, then All", () => {
    expect(amountPresets(40)).toEqual([
      { label: "10", value: 10 },
      { label: "All", value: 40 },
    ]);
    expect(amountPresets(300)).toEqual([
      { label: "10", value: 10 },
      { label: "50", value: 50 },
      { label: "100", value: 100 },
      { label: "All", value: 300 },
    ]);
  });

  it("is only All when even 10 is too much", () => {
    expect(amountPresets(7)).toEqual([{ label: "All", value: 7 }]);
    expect(amountPresets(10)).toEqual([{ label: "All", value: 10 }]);
  });

  it("keeps the chips to four: the small, a middle and the large mark, then All", () => {
    expect(amountPresets(1000).map((preset) => preset.label)).toEqual(["10", "100", "500", "All"]);
  });
});

describe("what a prompt falls back to", () => {
  it("cancels with the named choice, else the last one", () => {
    expect(cancelIdOf(yesNo)).toBe("no");
    expect(cancelIdOf({ ...yesNo, cancelId: "stay" })).toBe("stay");
    expect(cancelAnswer(yesNo)).toEqual({ id: "no", amount: null });
  });

  it("says something even when given no lines, and drops blank ones", () => {
    expect(linesOf({ ...yesNo, lines: [] })).toEqual(["..."]);
    expect(linesOf({ ...yesNo, lines: ["  ", "Hello", ""] })).toEqual(["Hello"]);
  });

  it("lights chests and coins gold and the rest sky blue, unless told", () => {
    expect(glowOf({ ...yesNo, sprite: "chest" })).toBe("gold");
    expect(glowOf({ ...yesNo, sprite: "coins" })).toBe("gold");
    expect(glowOf({ ...yesNo, sprite: "tablet" })).toBe("sky");
    expect(glowOf({ ...yesNo, sprite: "heart" })).toBe("rose");
    expect(glowOf({ ...yesNo, sprite: "bed" })).toBe("amber");
    expect(glowOf(yesNo)).toBe("sky");
    expect(glowOf({ ...yesNo, sprite: "coins", glow: "mint" })).toBe("mint");
  });
});

describe("the building accents", () => {
  it("has the owner's colours for the buildings and every region shop", () => {
    expect(BUILDING_ACCENTS).toMatchObject({
      bank: "#d4a017",
      atm: "#d4a017",
      hospital: "#e05a7a",
      hotel: "#e2783c",
      townHall: "#b8864b",
      accessoryShop: "#3f6fd8",
      plains: "#6cbf4a",
      forest: "#2f8f4e",
      islands: "#2fb8c8",
      swamps: "#7f8f3a",
      mountains: "#8a94a8",
      sands: "#d9b25f",
      tundra: "#8fd3f0",
      clouds: "#a8c8f0",
      moon: "#b39ddb",
    });
  });

  it("turns a name into its colour and passes any other colour through", () => {
    expect(accentOf("hospital")).toBe("#e05a7a");
    expect(accentOf("moon")).toBe("#b39ddb");
    expect(accentOf("#123456")).toBe("#123456");
    expect(accentOf("  rebeccapurple ")).toBe("rebeccapurple");
    expect(accentOf("rgb(1, 2, 3)")).toBe("rgb(1, 2, 3)");
  });

  it("is no accent for nothing or blank, so the box keeps its minty ring", () => {
    expect(accentOf(undefined)).toBeUndefined();
    expect(accentOf("")).toBeUndefined();
    expect(accentOf("   ")).toBeUndefined();
  });

  it("does not mistake an object property for a building", () => {
    expect(accentOf("constructor")).toBe("constructor");
  });
});

describe("the ready-made prompts", () => {
  it("noticeOf is lines from the speaker and one OK, which Escape also is", () => {
    expect(noticeOf("Nurse", "Rest well.")).toEqual({
      speaker: "Nurse",
      lines: ["Rest well."],
      choices: [{ id: "ok", label: "OK", icon: "check", tone: "primary" }],
      cancelId: "ok",
    });
    expect(noticeOf("Nurse", ["One.", "Two."], { sprite: "coins", accent: "hospital" })).toMatchObject({
      lines: ["One.", "Two."],
      sprite: "coins",
      accent: "hospital",
    });
  });

  it("yesNoOf asks with a gold yes and a dim no, and Escape is no", () => {
    const prompt = yesNoOf("Clerk", "Sure?", { yes: "Do it", no: "Not now", yesIcon: "bed" }, { accent: "hotel" });
    expect(prompt.choices).toEqual([
      { id: "yes", label: "Do it", icon: "bed", tone: "primary" },
      { id: "no", label: "Not now", icon: "times", tone: "ghost" },
    ]);
    expect(prompt).toMatchObject({ speaker: "Clerk", lines: ["Sure?"], cancelId: "no", accent: "hotel" });
  });
});

describe("useRevealPrompt", () => {
  const inScope = <T>(run: () => T): T => effectScope().run(run) as T;

  it("shows the prompt and settles with the id the hero picked", async () => {
    const { prompt, showPrompt: ask, submitAnswer: respond } = inScope(useRevealPrompt);
    const picked = ask(yesNo);
    expect(prompt.value?.options).toEqual(yesNo);

    respond({ id: "yes", amount: null });

    expect(await picked).toBe("yes");
    expect(prompt.value).toBeNull();
  });

  it("hands back the amount for a number pick", async () => {
    const { showAmountPrompt: askAmount, submitAnswer: respond } = inScope(useRevealPrompt);
    const picked = askAmount({ ...yesNo, amount: { max: 40 } });
    respond({ id: "yes", amount: 25 });
    expect(await picked).toEqual({ id: "yes", amount: 25 });
  });

  it("gives each prompt its own key, so a new one replays the reveal", async () => {
    const { prompt, showPrompt: ask, submitAnswer: respond } = inScope(useRevealPrompt);
    void ask(yesNo);
    const first = prompt.value?.key;
    respond({ id: "no", amount: null });
    void ask(yesNo);
    expect(prompt.value?.key).toBe((first as number) + 1);
  });

  it("cancels a prompt still showing when another is asked, so nothing is left waiting", async () => {
    const { prompt, showPrompt: ask } = inScope(useRevealPrompt);
    const first = ask({ ...yesNo, cancelId: "stay" });
    const second = ask({ ...yesNo, lines: ["Again?"] });

    expect(await first).toBe("stay");
    expect(prompt.value?.options.lines).toEqual(["Again?"]);
    void second;
  });

  it("dismisses with the cancel choice, and does nothing when nothing is showing", async () => {
    const { showPrompt: ask, dismiss } = inScope(useRevealPrompt);
    expect(() => dismiss()).not.toThrow();
    const picked = ask(yesNo);
    dismiss();
    expect(await picked).toBe("no");
  });

  it("cancels what is showing when the screen that asked goes away", async () => {
    let ask!: ReturnType<typeof useRevealPrompt>["showPrompt"];
    const wrapper = mount(
      defineComponent({
        setup() {
          ({ showPrompt: ask } = useRevealPrompt());
          return {};
        },
        render: () => null,
      })
    );
    const picked = ask(yesNo);

    wrapper.unmount();

    expect(await picked).toBe("no");
  });
});

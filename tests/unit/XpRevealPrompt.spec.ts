import { readFileSync } from "fs";
import { join } from "path";
import { defineComponent, h, nextTick, onMounted, watch } from "vue";
import { mount } from "@vue/test-utils";
import XpRevealPrompt from "@/components/organisms/RevealPrompt/XpRevealPrompt.vue";
import type { ActiveRevealPrompt, RevealPromptOptions } from "@/components/organisms/RevealPrompt/revealPrompt";
import { play$fx } from "@/assets/fx";

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn(), default: {} }));

/** A typing atom that finishes at once (or waits for the tap, when `auto` is false), so no clock is needed. */
const typingStub = (auto = true) =>
  defineComponent({
    props: ["text"],
    emits: ["typing-complete"],
    setup(props, { emit, expose }) {
      onMounted(() => auto && emit("typing-complete"));
      watch(
        () => props.text,
        () => auto && emit("typing-complete"),
      );
      expose({ completeTyping: () => emit("typing-complete") });
      return () => h("span", { class: "typing-stub" }, props.text);
    },
  });

const shown = (options: Partial<RevealPromptOptions> = {}, key = 1): ActiveRevealPrompt => ({
  key,
  options: {
    speaker: "Bank Manager",
    lines: ["A Storage Box holds 10 things. 100 GP?"],
    choices: [
      { id: "yes", label: "Buy it", tone: "primary" },
      { id: "no", label: "No thanks", tone: "ghost" },
    ],
    cancelId: "no",
    ...options,
  },
});

const open = async (prompt: ActiveRevealPrompt | null, auto = true) => {
  const wrapper = mount(XpRevealPrompt, {
    props: { prompt, inline: true },
    global: { stubs: { XpTypingText: typingStub(auto), transition: true } },
  });
  await nextTick();
  return wrapper;
};
type Opened = Awaited<ReturnType<typeof open>>;

const responses = (wrapper: Opened) => (wrapper.emitted("respond") ?? []).map((call) => call[0]);
const cy = (wrapper: Opened, name: string) => wrapper.find(`[data-cy="${name}"]`);
const rootOf = (wrapper: Opened) => cy(wrapper, "reveal-prompt");

describe("XpRevealPrompt", () => {
  beforeEach(() => (play$fx as jest.Mock).mockClear());

  it("draws nothing without a prompt", async () => {
    expect((await open(null)).find('[data-cy="reveal-prompt"]').exists()).toBe(false);
  });

  it("names the speaker, says the line and shows the menu once the line is typed", async () => {
    const wrapper = await open(shown());
    expect(cy(wrapper, "reveal-speaker").text()).toBe("Bank Manager");
    expect(cy(wrapper, "reveal-text").text()).toContain("A Storage Box holds 10 things. 100 GP?");
    expect(wrapper.findAll(".rp__label").map((label) => label.text())).toEqual(["Buy it", "No thanks"]);
    expect(rootOf(wrapper).classes()).toContain("is-ready");
    expect(cy(wrapper, "reveal-choice-yes").attributes("disabled")).toBeUndefined();
  });

  it("draws an icon on every row that has one, whether or not the cursor is on it", async () => {
    const wrapper = await open(
      shown({
        choices: [
          { id: "dep", label: "Deposit", icon: "piggy-bank" },
          { id: "wd", label: "Withdraw", icon: "fa-wallet" },
          { id: "plain", label: "Plain" },
        ],
      }),
    );
    expect(cy(wrapper, "reveal-choice-dep").classes()).toContain("has-cursor");
    expect(cy(wrapper, "reveal-choice-dep").find("i.fad.fa-piggy-bank").exists()).toBe(true);
    // the row without the cursor keeps its icon, and a "fa-" prefix is not doubled
    expect(cy(wrapper, "reveal-choice-wd").classes()).not.toContain("has-cursor");
    expect(cy(wrapper, "reveal-choice-wd").find("i.fad.fa-wallet").exists()).toBe(true);
    expect(cy(wrapper, "reveal-choice-wd").find(".fa-fa-wallet").exists()).toBe(false);
    // no icon, none drawn
    expect(cy(wrapper, "reveal-choice-plain").find("i").exists()).toBe(false);
  });

  it("keeps the menu out of reach while the line is still being typed, and finishes the line on a tap", async () => {
    const wrapper = await open(shown(), false);
    expect(rootOf(wrapper).classes()).not.toContain("is-ready");
    expect(cy(wrapper, "reveal-choice-yes").attributes("disabled")).toBeDefined();

    await cy(wrapper, "reveal-choice-yes").trigger("click");
    expect(responses(wrapper)).toEqual([]);

    await cy(wrapper, "reveal-text").trigger("click");
    expect(rootOf(wrapper).classes()).toContain("is-ready");
  });

  it("types one line at a time: a tap turns to the next, the menu waits for the last", async () => {
    const wrapper = await open(shown({ lines: ["Welcome.", "How can I help?"] }));
    expect(cy(wrapper, "reveal-text").text()).toContain("Welcome.");
    expect(rootOf(wrapper).classes()).not.toContain("is-ready");

    await cy(wrapper, "reveal-text").trigger("click");

    expect(cy(wrapper, "reveal-text").text()).toContain("How can I help?");
    expect(rootOf(wrapper).classes()).toContain("is-ready");
    expect(cy(wrapper, "reveal-skip").exists()).toBe(false);
  });

  it("skips ahead to the last line", async () => {
    const wrapper = await open(shown({ lines: ["One.", "Two.", "Three."] }));
    await cy(wrapper, "reveal-skip").trigger("click");
    expect(cy(wrapper, "reveal-text").text()).toContain("Three.");
    expect(rootOf(wrapper).classes()).toContain("is-ready");
  });

  it("answers with the choice tapped, once", async () => {
    const wrapper = await open(shown());
    await cy(wrapper, "reveal-choice-yes").trigger("click");
    await cy(wrapper, "reveal-choice-no").trigger("click");
    expect(responses(wrapper)).toEqual([{ id: "yes", amount: null }]);
    expect(play$fx).toHaveBeenCalledWith("select");
  });

  it("answers the cancel choice on Escape, with the close sound", async () => {
    const wrapper = await open(shown());
    await wrapper.find('[data-cy="reveal-prompt"]').trigger("keydown", { key: "Escape" });
    expect(responses(wrapper)).toEqual([{ id: "no", amount: null }]);
    expect(play$fx).toHaveBeenCalledWith("closeMenu");
  });

  it("moves the cursor with the arrows and picks its row with Enter", async () => {
    const wrapper = await open(shown());
    const root = wrapper.find('[data-cy="reveal-prompt"]');
    expect(cy(wrapper, "reveal-choice-yes").classes()).toContain("has-cursor");

    await root.trigger("keydown", { key: "ArrowDown" });
    expect(cy(wrapper, "reveal-choice-no").classes()).toContain("has-cursor");
    await root.trigger("keydown", { key: "ArrowDown" });
    expect(cy(wrapper, "reveal-choice-yes").classes()).toContain("has-cursor");
    await root.trigger("keydown", { key: "ArrowUp" });
    await root.trigger("keydown", { key: "Enter" });

    expect(responses(wrapper)).toEqual([{ id: "no", amount: null }]);
  });

  it("starts the cursor on the first choice that can be picked", async () => {
    const wrapper = await open(
      shown({
        choices: [
          { id: "sold", label: "Sold out", disabled: true },
          { id: "ok", label: "OK" },
        ],
      }),
    );
    expect(cy(wrapper, "reveal-choice-ok").classes()).toContain("has-cursor");
    expect(cy(wrapper, "reveal-choice-sold").attributes("disabled")).toBeDefined();
  });

  it("draws the sprite in its light when the prompt names one, and none when it does not", async () => {
    expect((await open(shown({ sprite: "chest" }))).find(".rp__sprite").exists()).toBe(true);
    expect(rootOf(await open(shown({ sprite: "coins" }))).classes()).toContain("glow-gold");
    expect((await open(shown())).find(".rp__sprite").exists()).toBe(false);
  });

  it("replays from the first line when a new prompt replaces the old one", async () => {
    const wrapper = await open(shown({ lines: ["One.", "Two."] }));
    await cy(wrapper, "reveal-text").trigger("click");
    expect(cy(wrapper, "reveal-text").text()).toContain("Two.");

    await wrapper.setProps({ prompt: shown({ lines: ["Fresh start."], speaker: "ATM" }, 2) });

    expect(cy(wrapper, "reveal-text").text()).toContain("Fresh start.");
    expect(cy(wrapper, "reveal-speaker").text()).toBe("ATM");
    // ... and it can answer again
    await cy(wrapper, "reveal-choice-yes").trigger("click");
    expect(responses(wrapper)).toEqual([{ id: "yes", amount: null }]);
  });

  describe("one prompt after another", () => {
    afterEach(() => jest.useRealTimers());
    const roots = (wrapper: Opened) => wrapper.findAll('[data-cy="reveal-prompt"]');

    it("lets an answered prompt sink away (is-leaving) before it is gone, and ignores taps meanwhile", async () => {
      jest.useFakeTimers();
      const wrapper = await open(shown({ lines: ["First."] }, 1));

      await wrapper.setProps({ prompt: null });
      expect(roots(wrapper)).toHaveLength(1);
      expect(roots(wrapper)[0].classes()).toContain("is-leaving");

      jest.advanceTimersByTime(600);
      await nextTick();
      expect(roots(wrapper)).toHaveLength(0);
    });

    it("shows the next prompt only once the last has sunk away, so the two never overlap", async () => {
      jest.useFakeTimers();
      const wrapper = await open(shown({ lines: ["First."] }, 1));

      // the screen answers, then asks the next question in the same breath
      await wrapper.setProps({ prompt: null });
      await wrapper.setProps({ prompt: shown({ lines: ["Second."], speaker: "ATM" }, 2) });
      expect(roots(wrapper)).toHaveLength(1);
      expect(cy(wrapper, "reveal-text").text()).toContain("First.");
      expect(roots(wrapper)[0].classes()).toContain("is-leaving");

      jest.advanceTimersByTime(600);
      await nextTick();

      expect(roots(wrapper)).toHaveLength(1);
      expect(roots(wrapper)[0].classes()).not.toContain("is-leaving");
      expect(cy(wrapper, "reveal-speaker").text()).toBe("ATM");
      expect(cy(wrapper, "reveal-text").text()).toContain("Second.");
    });

    it("shows a prompt at once when nothing is sinking away", async () => {
      const wrapper = await open(null);
      await wrapper.setProps({ prompt: shown({ lines: ["Hello."] }, 1) });
      expect(roots(wrapper)).toHaveLength(1);
    });

    it("forgets the prompt that was waiting when the screen cancels it", async () => {
      jest.useFakeTimers();
      const wrapper = await open(shown({}, 1));
      await wrapper.setProps({ prompt: null });
      await wrapper.setProps({ prompt: shown({ lines: ["Second."] }, 2) });
      await wrapper.setProps({ prompt: null });

      jest.advanceTimersByTime(600);
      await nextTick();

      expect(roots(wrapper)).toHaveLength(0);
    });
  });

  describe("the building's accent", () => {
    it("sets the accent as an inline --xp-app-accent on the root, from a name or a colour", async () => {
      const byName = await open(shown({ accent: "hospital" }));
      expect(rootOf(byName).attributes("style")).toContain("--xp-app-accent: #e05a7a");
      const byColour = await open(shown({ accent: "#123456" }));
      expect(rootOf(byColour).attributes("style")).toContain("--xp-app-accent: #123456");
    });

    it("sets nothing without an accent, so the box keeps its minty ring", async () => {
      expect(rootOf(await open(shown())).attributes("style")).toBeUndefined();
      expect(rootOf(await open(shown({ accent: "  " }))).attributes("style")).toBeUndefined();
    });

    it("takes the ring colour from the accent with the minty fallback, and nothing else of the box changes", () => {
      const source = readFileSync(join(__dirname, "../../src/components/organisms/RevealPrompt/XpRevealPrompt.vue"), "utf8");
      // the 10 px ring is the accent, with the fallback so a missing accent never kills the box
      expect(source).toContain("0 0 0 10px var(--xp-app-accent, #68d0b8)");
      // the Earthbound rings around it are as eb-box has them
      expect(source).toMatch(/0 0 0 5px \$eb-color-medium-purple,\s*0 0 0 10px var\(--xp-app-accent, #68d0b8\),\s*0 0 0 12px \$eb-color-pale-yellow,\s*0 0 0 16px \$eb-color-slate/);
      // minty is never written without the accent in front of it
      const bareMinty = source.split("\n").filter((line) => line.includes("#68d0b8") && !line.includes("var(--xp-app-accent, #68d0b8)") && !line.trim().startsWith("//"));
      expect(bareMinty.filter((line) => !line.includes("*"))).toEqual([]);
    });
  });

  describe("with an amount", () => {
    const withAmount = (amount = {}) => open(shown({ amount: { min: 1, max: 40, presets: [{ label: "10", value: 10 }, { label: "All", value: 40 }], ...amount } }));

    it("starts at the least, steps with + and -, and stops at both ends", async () => {
      const wrapper = await withAmount();
      expect(cy(wrapper, "reveal-value").text()).toContain("1");
      expect(cy(wrapper, "reveal-minus").attributes("disabled")).toBeDefined();

      await cy(wrapper, "reveal-plus").trigger("click");
      await cy(wrapper, "reveal-plus").trigger("click");
      expect(cy(wrapper, "reveal-value").text()).toContain("3");
      await cy(wrapper, "reveal-minus").trigger("click");
      expect(cy(wrapper, "reveal-value").text()).toContain("2");
    });

    it("jumps to a preset chip, All reaching the top, and then cannot step past it", async () => {
      const wrapper = await withAmount();
      await cy(wrapper, "reveal-preset-10").trigger("click");
      expect(cy(wrapper, "reveal-value").text()).toContain("10");
      await cy(wrapper, "reveal-preset-All").trigger("click");
      expect(cy(wrapper, "reveal-value").text()).toContain("40");
      expect(cy(wrapper, "reveal-plus").attributes("disabled")).toBeDefined();
      expect(cy(wrapper, "reveal-preset-All").classes()).toContain("is-on");
    });

    it("answers with the amount on the stepper", async () => {
      const wrapper = await withAmount({ initial: 25 });
      await cy(wrapper, "reveal-plus").trigger("click");
      await cy(wrapper, "reveal-choice-yes").trigger("click");
      expect(responses(wrapper)).toEqual([{ id: "yes", amount: 26 }]);
    });

    it("answers a cancel with no amount", async () => {
      const wrapper = await withAmount({ initial: 25 });
      await wrapper.find('[data-cy="reveal-prompt"]').trigger("keydown", { key: "Escape" });
      expect(responses(wrapper)).toEqual([{ id: "no", amount: null }]);
    });

    it("steps with the left and right arrows", async () => {
      const wrapper = await withAmount({ initial: 5 });
      const root = wrapper.find('[data-cy="reveal-prompt"]');
      await root.trigger("keydown", { key: "ArrowRight" });
      await root.trigger("keydown", { key: "ArrowRight" });
      await root.trigger("keydown", { key: "ArrowLeft" });
      expect(cy(wrapper, "reveal-value").text()).toContain("6");
    });

    it("shows the unit the prompt names", async () => {
      expect((await withAmount({ unit: "slots" })).find(".rp__value-unit").text()).toBe("slots");
      expect((await withAmount()).find(".rp__value-unit").text()).toBe("GP");
    });

    it("draws no stepper for a prompt that asks no number", async () => {
      expect((await open(shown())).find('[data-cy="reveal-amount"]').exists()).toBe(false);
    });
  });
});

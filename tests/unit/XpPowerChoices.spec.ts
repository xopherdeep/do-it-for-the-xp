import { mount } from "@vue/test-utils";
import XpPowerChoices from "@/app/Admin/XpCompendium/views/XpAbilities/components/XpPowerChoices.vue";
import { play$fx } from "@/assets/fx";

/**
 * The pick-one control of the Power wizard: tiles for a short list (class, attribute, AP period, frequency), rows for a
 * long one (the board and battle effects). One is picked at a time; a tap on the picked one does nothing.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn(), default: {} }));

const choices = [
  { id: "none", label: "None" },
  { id: "snooze", label: "Move one quest to tomorrow" },
  { id: "quiet-day", label: "No ambushes for 24 hours" },
];

const mountChoices = (props: Record<string, unknown> = {}) =>
  mount(XpPowerChoices, { props: { choices, modelValue: "none", label: "On the quest board", ...props } });

beforeEach(() => (play$fx as jest.Mock).mockClear());

describe("XpPowerChoices", () => {
  it("is one radio group with a button for each choice, labelled in words", () => {
    const wrapper = mountChoices();
    expect(wrapper.get("[role=radiogroup]").attributes("aria-label")).toBe("On the quest board");
    const buttons = wrapper.findAll("[role=radio]");
    expect(buttons.map((button) => button.text())).toEqual(["None", "Move one quest to tomorrow", "No ambushes for 24 hours"]);
    expect(buttons.map((button) => button.attributes("data-value"))).toEqual(["none", "snooze", "quiet-day"]);
  });

  it("marks the picked one and no other", () => {
    const wrapper = mountChoices({ modelValue: "snooze" });
    expect(wrapper.findAll("[role=radio]").map((button) => button.attributes("aria-checked"))).toEqual(["false", "true", "false"]);
    expect(wrapper.findAll(".is-picked")).toHaveLength(1);
  });

  it("marks none of them when the value is not one of the choices", () => {
    const wrapper = mountChoices({ modelValue: "something-old" });
    expect(wrapper.findAll(".is-picked")).toHaveLength(0);
  });

  it("emits the id of the tapped choice with the cursor sound", async () => {
    const wrapper = mountChoices();
    await wrapper.get("[data-value=quiet-day]").trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["quiet-day"]]);
    expect(play$fx).toHaveBeenCalledWith("cursor");
  });

  it("stays quiet on a tap on the one that is already picked", async () => {
    const wrapper = mountChoices({ modelValue: "snooze" });
    await wrapper.get("[data-value=snooze]").trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(play$fx).not.toHaveBeenCalled();
  });

  it("draws tiles by default and a radio dot on each row in the rows layout", () => {
    const tiles = mountChoices();
    expect(tiles.classes()).toContain("pc--tiles");
    expect(tiles.find(".pc__dot").exists()).toBe(false);

    const rows = mountChoices({ layout: "rows", modelValue: "snooze" });
    expect(rows.classes()).toContain("pc--rows");
    expect(rows.findAll(".pc__dot")).toHaveLength(3);
    expect(rows.findAll(".pc__dot")[1].classes()).toContain("fa-dot-circle");
    expect(rows.findAll(".pc__dot")[0].classes()).toContain("fa-circle");
  });

  it("takes the number of columns for the tiles", () => {
    expect(mountChoices({ columns: 2 }).classes()).toContain("pc--cols-2");
    expect(mountChoices().classes()).toContain("pc--cols-3");
  });
});

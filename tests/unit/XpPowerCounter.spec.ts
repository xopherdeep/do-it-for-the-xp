import { mount } from "@vue/test-utils";
import XpPowerCounter from "@/app/Admin/XpCompendium/views/XpAbilities/components/XpPowerCounter.vue";
import { play$fx } from "@/assets/fx";

/**
 * The number control of the Power wizard (MP, AP, levels, the scaling rate): big minus and plus for the thumb, and a
 * field to type in. It never goes below its minimum or above its maximum, and clearing the field to retype is allowed.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn(), default: {} }));

const mountCounter = (props: Record<string, unknown> = {}) =>
  mount(XpPowerCounter, { props: { modelValue: 5, label: "MP to cast", unit: "MP", ...props } });

const less = (wrapper: ReturnType<typeof mountCounter>) => wrapper.get('[data-test="less"]');
const more = (wrapper: ReturnType<typeof mountCounter>) => wrapper.get('[data-test="more"]');
const field = (wrapper: ReturnType<typeof mountCounter>) => wrapper.get("input");

beforeEach(() => (play$fx as jest.Mock).mockClear());

describe("XpPowerCounter", () => {
  it("shows the label, the hint, the value and the unit", () => {
    const wrapper = mountCounter({ hint: "Magic Points spent each time" });
    expect(wrapper.text()).toContain("MP to cast");
    expect(wrapper.text()).toContain("Magic Points spent each time");
    expect(wrapper.text()).toContain("MP");
    expect((field(wrapper).element as HTMLInputElement).value).toBe("5");
  });

  it("goes up and down by one, with the cursor sound", async () => {
    const wrapper = mountCounter();
    await more(wrapper).trigger("click");
    await less(wrapper).trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([[6], [4]]);
    expect(play$fx).toHaveBeenCalledWith("cursor");
  });

  it("goes by its own step", async () => {
    const wrapper = mountCounter({ modelValue: 10, step: 5 });
    await more(wrapper).trigger("click");
    await less(wrapper).trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([[15], [5]]);
  });

  it("shuts minus at the minimum and plus at the maximum", async () => {
    const atMin = mountCounter({ modelValue: 0 });
    expect(less(atMin).attributes("disabled")).toBeDefined();
    expect(more(atMin).attributes("disabled")).toBeUndefined();
    await less(atMin).trigger("click");
    expect(atMin.emitted("update:modelValue")).toBeUndefined();

    const atMax = mountCounter({ modelValue: 100, max: 100 });
    expect(more(atMax).attributes("disabled")).toBeDefined();
    expect(less(atMax).attributes("disabled")).toBeUndefined();
  });

  it("keeps a minimum of its own (a class level starts at 1)", async () => {
    const wrapper = mountCounter({ modelValue: 1, min: 1 });
    expect(less(wrapper).attributes("disabled")).toBeDefined();
  });

  it("takes a number typed in the field", async () => {
    const wrapper = mountCounter();
    await field(wrapper).setValue("12");
    expect(wrapper.emitted("update:modelValue")).toEqual([[12]]);
  });

  it("keeps a typed number inside its limits", async () => {
    const wrapper = mountCounter({ max: 50 });
    await field(wrapper).setValue("999");
    await field(wrapper).setValue("-3");
    expect(wrapper.emitted("update:modelValue")).toEqual([[50], [0]]);
  });

  it("lets the field be cleared to retype without changing the value", async () => {
    const wrapper = mountCounter();
    await field(wrapper).setValue("");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("puts the real value back in the field when it is left", async () => {
    const wrapper = mountCounter();
    await field(wrapper).setValue("");
    await field(wrapper).trigger("blur");
    expect((field(wrapper).element as HTMLInputElement).value).toBe("5");
  });

  it("shows an empty field for a value that is not a number, and plus starts from the minimum", async () => {
    const wrapper = mountCounter({ modelValue: NaN });
    expect((field(wrapper).element as HTMLInputElement).value).toBe("");
    await more(wrapper).trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([[1]]);
  });
});

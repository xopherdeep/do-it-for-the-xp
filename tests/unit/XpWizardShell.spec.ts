import { mount } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import XpWizardShell from "@/components/organisms/WizardShell/XpWizardShell.vue";
import type { WizardStep } from "@/lib/services/wizard/wizardSteps";
import { play$fx } from "@/assets/fx";

/**
 * The shared wizard shell: header with the step and "n / N", one dot per asked step (tappable only when valid), the
 * guide line with the speak button, the current step's slot, and Back / Next in the footer with the reason Next is
 * shut and the form's verb on the last step. The shell never knows the fields: the steps and the draft say it all.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn(), default: {} }));

const scrollToTop = jest.fn();
const slot = { template: "<div><slot /></div>" };
const content = {
  template: "<div class='content-stub'><slot /></div>",
  mounted() {
    (this as unknown as { $el: { scrollToTop: jest.Mock } }).$el.scrollToTop = scrollToTop;
  },
};
const speak = { props: ["text"], template: "<button class='speak-stub' :data-text='text'></button>" };
const stubs = {
  IonHeader: slot,
  IonToolbar: slot,
  IonFooter: slot,
  IonContent: content,
  XpSpeakButton: speak,
  XpCloseButton: { template: "<button class='close-stub' data-test='wizard-close'></button>" },
};

interface Draft {
  name: string;
  virtual: boolean;
}

const steps: WizardStep<Draft>[] = [
  { id: "what", title: "What is it?", guide: "What is it?", icon: "paw-claws", isValid: (d) => d.name.trim() !== "" || "Give it a name" },
  { id: "cost", title: "Cost", guide: "What does it cost?", isValid: () => true },
  { id: "gear", title: "Gear stats", guide: "What does it do?", isValid: () => true, isSkipped: (d) => !d.virtual },
  { id: "ready", title: "Ready", guide: "All set?", icon: "magic", isValid: () => true },
];

type Props = Record<string, unknown>;

// A form that binds `index` (v-model:index) follows what the shell emits; one that does not leaves the shell its own
const mountShell = (props: Props = {}, slots: Record<string, string> = {}, attachTo?: HTMLElement) => {
  setActivePinia(createPinia());
  let mounted: VueWrapper<any> | undefined;
  const bound = props.index !== undefined ? { "onUpdate:index": (value: number) => void mounted?.setProps({ index: value }) } : {};
  mounted = mount(XpWizardShell, {
    props: { steps, draft: { name: "Sock", virtual: false }, icon: "scroll", verb: "Summon", ...bound, ...props },
    slots: {
      what: "<p class='body-what'>what body</p>",
      cost: "<p class='body-cost'>cost body</p>",
      ready: "<p class='body-ready'>ready body</p>",
      ...slots,
    },
    attachTo,
    global: { stubs },
  });
  return mounted;
};

const click = async (wrapper: ReturnType<typeof mountShell>, test: string) => {
  await wrapper.get(`[data-test="${test}"]`).trigger("click");
  await nextTick();
};

beforeEach(() => {
  localStorage.clear();
  (play$fx as jest.Mock).mockClear();
  scrollToTop.mockClear();
});

describe("XpWizardShell header, dots and guide", () => {
  it("shows the step's title and n / N over the steps that are asked", () => {
    const wrapper = mountShell();
    expect(wrapper.get(".xp-app-header__title").text()).toBe("What is it?");
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("1 / 3");
  });

  it("lets the form name the header (the Quest Wizard says New Quest on every step)", () => {
    const wrapper = mountShell({ title: "New Quest" });
    expect(wrapper.get(".xp-app-header__title").text()).toBe("New Quest");
  });

  it("draws one dot per asked step, here and done marked, and none for a skipped step", async () => {
    const wrapper = mountShell({ index: 1 });
    const dots = wrapper.findAll(".xp-wiz-dot");
    expect(dots.map((dot) => dot.attributes("data-test"))).toEqual(["dot-what", "dot-cost", "dot-ready"]);
    expect(dots[0].classes()).toContain("is-done");
    expect(dots[1].classes()).toContain("is-here");
    expect(dots[2].classes()).not.toContain("is-done");
    expect(wrapper.get(".xp-wiz-dots").attributes("aria-label")).toBe("Step 2 of 3");
  });

  it("puts a skipped step's dot back when the draft needs it", () => {
    const wrapper = mountShell({ draft: { name: "Sock", virtual: true } });
    expect(wrapper.findAll(".xp-wiz-dot")).toHaveLength(4);
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("1 / 4");
  });

  it("shows the guide's line with the speak button reading that same line, and the step's icon", () => {
    const wrapper = mountShell();
    expect(wrapper.get('[data-test="guide"] span').text()).toBe("What is it?");
    expect(wrapper.get(".speak-stub").attributes("data-text")).toBe("What is it?");
    expect(wrapper.get('[data-test="guide"] i').classes()).toContain("fa-paw-claws");
  });

  it("falls back to the header icon when a step has none", () => {
    const wrapper = mountShell({ index: 1, icon: "scroll" });
    expect(wrapper.get('[data-test="guide"] i').classes()).toContain("fa-scroll");
  });
});

describe("XpWizardShell body slots", () => {
  it("renders only the slot of the current step", async () => {
    const wrapper = mountShell();
    expect(wrapper.find(".body-what").exists()).toBe(true);
    expect(wrapper.find(".body-cost").exists()).toBe(false);
    await click(wrapper, "next");
    expect(wrapper.find(".body-what").exists()).toBe(false);
    expect(wrapper.find(".body-cost").exists()).toBe(true);
  });

  it("falls back to the default slot, which is handed the current step", () => {
    setActivePinia(createPinia());
    const wrapper = mount(XpWizardShell, {
      props: { steps, draft: { name: "Sock", virtual: false }, icon: "scroll" },
      slots: { default: `<template #default="{ step }"><p class="body-any">{{ step.id }}</p></template>` },
      global: { stubs },
    });
    expect(wrapper.get(".body-any").text()).toBe("what");
  });

  it("hands the step to the slot above Back and Next (the Quest Wizard keeps its search there)", async () => {
    const wrapper = mountShell({}, { "above-nav": `<template #above-nav="{ step, index }"><input class="field" :data-step="step.id" :data-index="index" /></template>` });
    expect(wrapper.get(".field").attributes("data-step")).toBe("what");
    expect(wrapper.get(".field").attributes("data-index")).toBe("0");
    await click(wrapper, "next");
    expect(wrapper.get(".field").attributes("data-step")).toBe("cost");
    expect(wrapper.get(".field").attributes("data-index")).toBe("1");
  });
});

describe("XpWizardShell footer: Back, Next and the reason", () => {
  it("reads Close on the first step and emits close", async () => {
    const wrapper = mountShell();
    expect(wrapper.get('[data-test="back"]').text()).toBe("Close");
    await click(wrapper, "back");
    expect(wrapper.emitted("close")).toHaveLength(1);
    expect(play$fx).toHaveBeenCalledWith("cursor");
  });

  it("reads Back after the first step and goes back over a skipped step", async () => {
    const wrapper = mountShell({ index: 3 });
    expect(wrapper.get('[data-test="back"]').text()).toBe("Back");
    await click(wrapper, "back");
    expect(wrapper.get(".xp-app-header__title").text()).toBe("Cost");
    expect(wrapper.emitted("close")).toBeUndefined();
    expect(wrapper.emitted("update:index")).toEqual([[1]]);
  });

  it("goes forward over a skipped step with the select sound and scrolls the body back to the top", async () => {
    const wrapper = mountShell({ index: 1 });
    await click(wrapper, "next");
    expect(wrapper.get(".xp-app-header__title").text()).toBe("Ready");
    expect(wrapper.get(".xp-app-header__meta").text()).toBe("3 / 3");
    expect(play$fx).toHaveBeenCalledWith("select");
    expect(scrollToTop).toHaveBeenCalledWith(0);
  });

  it("lets the form bring the top of the body into view after a pick", () => {
    const wrapper = mountShell();
    (wrapper.vm as unknown as { scrollToTop: (ms?: number) => void }).scrollToTop(200);
    expect(scrollToTop).toHaveBeenCalledWith(200);
  });

  it("disables Next on an invalid step and says why in one small line above it", () => {
    const wrapper = mountShell({ draft: { name: "", virtual: false } });
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[data-test="why"]').text()).toBe("Give it a name");
  });

  it("shows no line when Next is open, and none when the validator gave no words", () => {
    expect(mountShell().find('[data-test="why"]').exists()).toBe(false);
    const silent: WizardStep<Draft>[] = [{ id: "a", title: "A", guide: "A?", isValid: () => false }, steps[3]];
    const wrapper = mountShell({ steps: silent });
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeDefined();
    expect(wrapper.find('[data-test="why"]').exists()).toBe(false);
  });

  it("opens Next the moment the draft is good", async () => {
    const wrapper = mountShell({ draft: { name: "", virtual: false } });
    await wrapper.setProps({ draft: { name: "Sock", virtual: false } });
    expect(wrapper.get('[data-test="next"]').attributes("disabled")).toBeUndefined();
    expect(wrapper.find('[data-test="why"]').exists()).toBe(false);
  });

  it("drops the keyboard when Next is pressed", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const wrapper = mountShell({}, { "above-nav": "<input class='field' />" }, host);
    (wrapper.get(".field").element as HTMLInputElement).focus();
    expect(document.activeElement).toBe(wrapper.get(".field").element);
    await click(wrapper, "next");
    expect(document.activeElement).not.toBe(wrapper.get(".field").element);
    wrapper.unmount();
    host.remove();
  });

  it("emits close from the header's close button", async () => {
    const wrapper = mountShell();
    await click(wrapper, "wizard-close");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });
});

describe("XpWizardShell last step", () => {
  it("shows the form's verb instead of Next and emits submit", async () => {
    const wrapper = mountShell({ index: 3 });
    expect(wrapper.find('[data-test="next"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="submit"]').text()).toBe("Summon");
    expect(wrapper.get('[data-test="submit"] i').classes()).toContain("fa-check");
    await click(wrapper, "submit");
    expect(wrapper.emitted("submit")).toHaveLength(1);
  });

  it("takes the verb's icon from the form", () => {
    const wrapper = mountShell({ index: 3, verb: "Save", verbIcon: "save" });
    expect(wrapper.get('[data-test="submit"]').text()).toBe("Save");
    expect(wrapper.get('[data-test="submit"] i').classes()).toContain("fa-save");
  });

  it("is shut while the form is saving", () => {
    const wrapper = mountShell({ index: 3, busy: true });
    expect(wrapper.get('[data-test="submit"]').attributes("disabled")).toBeDefined();
  });

  it("is shut while any step is invalid, with that step's reason shown", () => {
    const wrapper = mountShell({ index: 3, draft: { name: "", virtual: false } });
    expect(wrapper.get('[data-test="submit"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[data-test="why"]').text()).toBe("Give it a name");
  });
});

describe("XpWizardShell dots as a way back", () => {
  it("lets a tap land on a step that is valid and emits the new index", async () => {
    const wrapper = mountShell({ index: 3 });
    expect(wrapper.get('[data-test="dot-what"]').attributes("disabled")).toBeUndefined();
    await click(wrapper, "dot-what");
    expect(wrapper.emitted("update:index")).toEqual([[0]]);
    expect(wrapper.get(".xp-app-header__title").text()).toBe("What is it?");
  });

  it("keeps a dot shut when its step, or one before it, is not valid", () => {
    const wrapper = mountShell({ draft: { name: "", virtual: false } });
    for (const id of ["what", "cost", "ready"]) expect(wrapper.get(`[data-test="dot-${id}"]`).attributes("disabled")).toBeDefined();
  });

  it("keeps the current dot shut: a tap on where you are does nothing", () => {
    expect(mountShell({ index: 1 }).get('[data-test="dot-cost"]').attributes("disabled")).toBeDefined();
  });

  it("shuts every dot when the form does not want taps (the Quest Wizard asks one question at a time)", () => {
    const wrapper = mountShell({ index: 3, jumpable: false });
    for (const id of ["what", "cost"]) expect(wrapper.get(`[data-test="dot-${id}"]`).attributes("disabled")).toBeDefined();
  });
});

describe("XpWizardShell index and accent", () => {
  it("keeps its own place when the form does not bind the index", async () => {
    const wrapper = mountShell();
    await click(wrapper, "next");
    await click(wrapper, "next");
    expect(wrapper.get(".xp-app-header__title").text()).toBe("Ready");
  });

  it("follows the form's index when it is bound (an edit opens on the summary)", async () => {
    const wrapper = mountShell({ index: 3 });
    expect(wrapper.get(".xp-app-header__title").text()).toBe("Ready");
    await wrapper.setProps({ index: 0 });
    expect(wrapper.get(".xp-app-header__title").text()).toBe("What is it?");
  });

  it("wears the app's skin and accent when it is given one, and inherits the page's when not", () => {
    const skinned = mountShell({ accent: "goods" });
    expect(skinned.get(".xp-wizard").classes()).toEqual(expect.arrayContaining(["xp-app", "xp-app--retro"]));
    expect(skinned.get(".xp-wizard").attributes("style")).toContain("--xp-app-accent: #d9483b");
    const inherited = mountShell();
    expect(inherited.get(".xp-wizard").classes()).not.toContain("xp-app");
    expect(inherited.get(".xp-wizard").attributes("style")).toBeUndefined();
  });
});

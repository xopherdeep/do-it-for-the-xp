import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import SetupWizard from "@/app/SideMenu/SetupWizard/SetupWizard.vue";
import { libraryRooms } from "@/lib/services/bestiary/librarySuggest";
import { runSetup, existingHeroes } from "@/lib/services/setup/runSetup";

/** The setup wizard through the shared shell: steps in order, Next shut with its reason, Begin runs the setup and closes. */
const mockDismiss = jest.fn();
jest.mock("@ionic/vue", () => ({
  ...jest.requireActual("@ionic/vue"),
  modalController: { dismiss: (...args: unknown[]) => mockDismiss(...args) },
  toastController: { create: () => Promise.resolve({ present: jest.fn() }) },
}));
jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn(), default: {} }));
jest.mock("@/lib/engine/audio/speech", () => ({
  __esModule: true,
  speak: jest.fn(() => true),
  stop: jest.fn(),
  hasReadingVoice: () => false,
  onReadingVoiceChange: () => () => undefined,
}));
jest.mock("@/lib/services/setup/runSetup", () => ({
  __esModule: true,
  existingHeroes: jest.fn(() => Promise.resolve([])),
  runSetup: jest.fn(() => Promise.resolve({})),
}));

const slot = { template: "<div><slot /></div>" };
const stubs = {
  IonHeader: slot,
  IonToolbar: slot,
  IonFooter: slot,
  IonContent: slot,
  IonInput: { props: ["modelValue"], template: "<input :value='modelValue' @input=\"$emit('update:modelValue', $event.target.value)\" />" },
  IonToggle: { template: "<input type='checkbox' />" },
  XpCloseButton: { template: "<button data-test='wizard-close'></button>" },
  XpSpeakButton: { template: "<button></button>" },
};

const mountWizard = async () => {
  const wrapper = mount(SetupWizard, { global: { stubs } });
  await flushPromises();
  return wrapper;
};
type Wrapper = Awaited<ReturnType<typeof mountWizard>>;

const nextButton = (wrapper: Wrapper) => wrapper.find("[data-test=next]");
const next = async (wrapper: Wrapper) => {
  await nextButton(wrapper).trigger("click");
  await flushPromises();
};

const fillFamily = async (wrapper: Wrapper) => {
  await wrapper.find("[data-test=gm-name]").setValue("Dad");
  await wrapper.find("[data-test=gm-pin]").setValue("1234");
  await wrapper.find("[data-test=add-hero]").trigger("click");
  await wrapper.find("[data-test=hero-name]").setValue("Mia");
  await flushPromises();
};

// Every room, so each age has beasts to suggest
const pickRooms = async (wrapper: Wrapper) => {
  for (const chip of wrapper.findAll("[data-test=room-chip]")) await chip.trigger("click");
};

beforeEach(() => {
  setActivePinia(createPinia());
  mockDismiss.mockClear();
  (runSetup as jest.Mock).mockClear();
  (existingHeroes as jest.Mock).mockResolvedValue([]);
});

describe("SetupWizard", () => {
  it("opens on the family step with a parent row, and Next says why it is shut", async () => {
    const wrapper = await mountWizard();
    expect(wrapper.find("[data-test=step-family]").exists()).toBe(true);
    expect(wrapper.find("[data-test=gm-name]").exists()).toBe(true);
    expect(nextButton(wrapper).attributes("disabled")).toBeDefined();
    expect(wrapper.find("[data-test=why]").text()).toBeTruthy();
  });

  it("walks family, house, quests, extras and the summary in order", async () => {
    const wrapper = await mountWizard();
    await fillFamily(wrapper);
    expect(nextButton(wrapper).attributes("disabled")).toBeUndefined();
    await next(wrapper);
    expect(wrapper.find("[data-test=step-house]").exists()).toBe(true);
    expect(nextButton(wrapper).attributes("disabled")).toBeDefined();
    await pickRooms(wrapper);
    await next(wrapper);
    expect(wrapper.find("[data-test=step-review]").exists()).toBe(true);
    expect(wrapper.findAll("[data-test=review-hero]").length).toBe(2);
    await next(wrapper);
    expect(wrapper.find("[data-test=step-extras]").exists()).toBe(true);
    await next(wrapper);
    expect(wrapper.find("[data-test=step-summary]").exists()).toBe(true);
  });

  it("Begin runs the setup and dismisses done", async () => {
    const wrapper = await mountWizard();
    await fillFamily(wrapper);
    await next(wrapper);
    await pickRooms(wrapper);
    await next(wrapper);
    await next(wrapper);
    await next(wrapper);
    await wrapper.find("[data-test=submit]").trigger("click");
    await flushPromises();
    expect(runSetup).toHaveBeenCalledTimes(1);
    const answers = (runSetup as jest.Mock).mock.calls[0][0];
    expect(answers.rooms).toEqual(libraryRooms());
    expect(mockDismiss).toHaveBeenCalledWith(expect.objectContaining({ done: true }), "done");
  });

  it("shows the error in the summary and keeps Begin ready when the setup fails", async () => {
    (runSetup as jest.Mock).mockRejectedValueOnce(new Error("Disk is full"));
    const wrapper = await mountWizard();
    await fillFamily(wrapper);
    await next(wrapper);
    await pickRooms(wrapper);
    await next(wrapper);
    await next(wrapper);
    await next(wrapper);
    await wrapper.find("[data-test=submit]").trigger("click");
    await flushPromises();
    expect(wrapper.find("[data-test=setup-error]").text()).toBe("Disk is full");
    expect(wrapper.find("[data-test=submit]").attributes("disabled")).toBeUndefined();
    expect(mockDismiss).not.toHaveBeenCalled();
  });
});

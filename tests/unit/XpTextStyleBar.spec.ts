import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import XpTextStyleBar from "@/app/Console/MyPortal/UserHud/components/XpTextStyleBar.vue";
import { useUserStore } from "@/lib/store/stores/user";

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));
jest.mock("@/lib/api", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("@/lib/databases/ProfileDb", () => ({
  __esModule: true,
  ProfileDb: class {
    setProfile() {
      return Promise.resolve();
    }
  },
  default: class {},
}));
jest.mock("@/lib/databases/profileStorage", () => ({ __esModule: true, profileStorage: {}, default: {} }));
jest.mock("@/lib/services/gp/GPService", () => ({ getGPService: () => ({ syncGP: jest.fn() }) }));
jest.mock("@/lib/services/notifications/notify", () => ({ notify: jest.fn() }));

let mockHasVoice = true;
jest.mock("@/lib/engine/audio/speech", () => ({
  __esModule: true,
  speak: jest.fn(() => true),
  stop: jest.fn(),
  hasReadingVoice: () => mockHasVoice,
  onReadingVoiceChange: () => () => undefined,
}));

const bornAged = (age: number) => `${new Date().getFullYear() - age}-01-01`;

const mockCreate = jest.fn();
jest.mock("@ionic/vue", () => {
  const actual = jest.requireActual("@ionic/vue");
  return { ...actual, actionSheetController: { create: (options: unknown) => mockCreate(options) } };
});

// Ionic's web components are not the subject here: slots and events are
const stubs = {
  IonToolbar: { template: "<div class='toolbar'><slot /></div>" },
  IonLabel: { template: "<span><slot /></span>" },
  IonToggle: { name: "IonToggle", props: ["checked"], template: "<input type='checkbox' class='toggle' :checked='checked' />" },
};

const mountBar = (profile: Record<string, unknown>) => {
  setActivePinia(createPinia());
  const store = useUserStore();
  store.addUser({ id: "hero", ...profile });
  const wrapper = mount(XpTextStyleBar, { props: { user: store.users.hero }, global: { stubs } });
  return { store, wrapper };
};

/** Open the action sheet and hand back its buttons, as the sheet would show them */
const openSheet = async (wrapper: ReturnType<typeof mountBar>["wrapper"]) => {
  const present = jest.fn();
  mockCreate.mockResolvedValueOnce({ present });
  await wrapper.find('[data-test="text-style-pick"]').trigger("click");
  await Promise.resolve();
  const options = mockCreate.mock.calls[mockCreate.mock.calls.length - 1][0];
  return { options, present, buttons: options.buttons as { text: string; icon?: string; role?: string; handler?: () => void }[] };
};

describe("XpTextStyleBar (Text style on the profile)", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockHasVoice = true;
  });

  it("shows Auto and the voice the birthday gives for a hero with no pick", () => {
    const { wrapper } = mountBar({ birthday: bornAged(6) });
    expect(wrapper.find('[data-test="text-style-pick"]').text()).toBe("Auto: Simple");
  });

  it("opens the four choices as an action sheet, with a Cancel, and ticks the one in use", async () => {
    const { wrapper } = mountBar({ birthday: bornAged(6) });
    const { options, present, buttons } = await openSheet(wrapper);
    expect(options.header).toBe("Text style");
    expect(present).toHaveBeenCalled();
    expect(buttons.map((button) => button.text)).toEqual(["Auto (Simple for this hero)", "Simple", "Adventure", "Classic", "Cancel"]);
    expect(buttons[0].icon).toBeDefined();
    expect(buttons[1].icon).toBeUndefined();
    expect(buttons[4].role).toBe("cancel");
  });

  it("saves the pick on the profile and Auto clears it", async () => {
    const { store, wrapper } = mountBar({ birthday: bornAged(6) });
    let sheet = await openSheet(wrapper);
    sheet.buttons[3].handler?.();
    await wrapper.vm.$nextTick();
    expect(store.users.hero.voice).toBe("classic");
    expect(wrapper.find('[data-test="text-style-pick"]').text()).toBe("Classic");

    sheet = await openSheet(wrapper);
    expect(sheet.buttons[3].icon).toBeDefined();
    sheet.buttons[0].handler?.();
    await wrapper.vm.$nextTick();
    expect(store.users.hero.voice).toBeUndefined();
    expect(wrapper.find('[data-test="text-style-pick"]').text()).toBe("Auto: Simple");
  });

  it("shows the read-aloud switch only for the simple voice and saves it", async () => {
    const { store, wrapper } = mountBar({ birthday: bornAged(6) });
    const toggle = wrapper.findComponent({ name: "IonToggle" });
    expect(toggle.exists()).toBe(true);
    expect(toggle.props("checked")).toBe(true);
    toggle.vm.$emit("ionChange", { detail: { checked: false } });
    await wrapper.vm.$nextTick();
    expect(store.users.hero.autoRead).toBe(false);
    expect(wrapper.findComponent({ name: "IonToggle" }).props("checked")).toBe(false);

    store.setVoice("hero", "classic");
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: "IonToggle" }).exists()).toBe(false);
  });

  it("dims and locks the read-aloud switch, with a note, on a device with no reading voice", async () => {
    mockHasVoice = false;
    const { store, wrapper } = mountBar({ birthday: bornAged(6) });
    const toggle = wrapper.find('[data-test="autoread-toggle"]');
    expect(toggle.attributes("disabled")).toBeDefined();
    expect(wrapper.find(".text-style-autoread").classes()).toContain("is-dimmed");
    expect(wrapper.find('[data-test="no-voice-note"]').text()).toBe("No reading voice on this device.");

    // a stray change event from the locked switch does not rewrite the hero's setting
    wrapper.findComponent({ name: "IonToggle" }).vm.$emit("ionChange", { detail: { checked: false } });
    await wrapper.vm.$nextTick();
    expect(store.users.hero.autoRead).toBeUndefined();

    // the note speaks in the hero's voice
    store.setVoice("hero", "adventure");
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-test="no-voice-note"]').exists()).toBe(false); // no switch outside the simple voice, so no note
  });

  it("shows no note and a live switch where there is a voice", () => {
    const { wrapper } = mountBar({ birthday: bornAged(6) });
    expect(wrapper.find('[data-test="no-voice-note"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="autoread-toggle"]').attributes("disabled")).toBeUndefined();
    expect(wrapper.find(".text-style-autoread").classes()).not.toContain("is-dimmed");
  });
});

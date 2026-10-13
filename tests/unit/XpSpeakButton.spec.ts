import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import XpSpeakButton from "@/components/atoms/SpeakButton/XpSpeakButton.vue";
import { play$fx } from "@/assets/fx";
import { useUserStore } from "@/lib/store/stores/user";

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn(), default: {} }));
const mockSpeak = jest.fn((_text: string) => true);
let mockHasVoice = true;
const mockVoiceListeners = new Set<() => void>();
jest.mock("@/lib/engine/audio/speech", () => ({
  __esModule: true,
  speak: (text: string) => mockSpeak(text),
  stop: jest.fn(),
  hasReadingVoice: () => mockHasVoice,
  onReadingVoiceChange: (listener: () => void) => {
    mockVoiceListeners.add(listener);
    return () => mockVoiceListeners.delete(listener);
  },
}));
const mockShowToast = jest.fn();
jest.mock("@/hooks/useToast", () => ({ __esModule: true, useToast: () => ({ showToast: mockShowToast }) }));
jest.mock("@/lib/api", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("@/lib/databases/ProfileDb", () => ({ __esModule: true, ProfileDb: class { setProfile() { return Promise.resolve(); } }, default: class {} }));
jest.mock("@/lib/databases/profileStorage", () => ({ __esModule: true, profileStorage: {}, default: {} }));
jest.mock("@/lib/services/gp/GPService", () => ({ getGPService: () => ({ syncGP: jest.fn() }) }));
jest.mock("@/lib/services/notifications/notify", () => ({ notify: jest.fn() }));

const mountButton = (birthYearsAgo = 6) => {
  setActivePinia(createPinia());
  const store = useUserStore();
  store.addUser({ id: "hero", birthday: `${new Date().getFullYear() - birthYearsAgo}-01-01` });
  store.loginUser(store.users.hero);
  return mount(XpSpeakButton, { props: { text: "Hello! This is the Gold Bank." } });
};

describe("XpSpeakButton (the speaker beside a line)", () => {
  beforeEach(() => {
    mockHasVoice = true;
    mockSpeak.mockClear();
    mockShowToast.mockClear();
    (play$fx as jest.Mock).mockClear();
    mockVoiceListeners.clear();
  });

  it("reads the line on tap where the device has a voice", async () => {
    const button = mountButton();
    expect(button.classes()).not.toContain("is-dimmed");
    expect(button.attributes("aria-label")).toBe("Read aloud");
    await button.trigger("click");
    expect(mockSpeak).toHaveBeenCalledWith("Hello! This is the Gold Bank.");
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it("is dimmed with the no-voice note where there is none, and a tap says it instead of speaking", async () => {
    mockHasVoice = false;
    const button = mountButton();
    expect(button.classes()).toContain("is-dimmed");
    expect(button.attributes("aria-disabled")).toBe("true");
    expect(button.attributes("aria-label")).toBe("No reading voice on this device.");
    expect(button.attributes("title")).toBe("No reading voice on this device.");
    await button.trigger("click");
    expect(mockSpeak).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith("No reading voice on this device.", 2500);
    expect(play$fx).toHaveBeenCalledWith("no");
  });

  it("speaks the note in the adventure voice for an older hero", () => {
    mockHasVoice = false;
    const button = mountButton(12);
    expect(button.attributes("title")).toBe("No reading voice answers on this device.");
  });

  it("lights up when a voice arrives while the screen is up", async () => {
    mockHasVoice = false;
    const button = mountButton();
    expect(button.classes()).toContain("is-dimmed");
    mockHasVoice = true;
    mockVoiceListeners.forEach((listener) => listener());
    await nextTick();
    expect(button.classes()).not.toContain("is-dimmed");
    expect(button.attributes("aria-label")).toBe("Read aloud");
  });
});

import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import DialPad from "@/app/SideMenu/SwitchProfile/DialPad.vue";
import { sealRecoveryCode } from "@/lib/services/profile/pinRecovery";
import { sealSecret } from "@/lib/services/profile/pinSeal";
import { issueAndShowRecoveryCode } from "@/app/SideMenu/SwitchProfile/pinRecoveryPrompts";

jest.mock("@/assets/fx", () => {
  const original = jest.requireActual("@/assets/fx");
  return { __esModule: true, default: original.default, play$fx: jest.fn() };
});

jest.mock("@ionic/vue", () => {
  const alertController = { create: jest.fn().mockResolvedValue({ present: jest.fn() }) };
  const modalController = { dismiss: jest.fn().mockResolvedValue(true) };
  const toastController = { create: jest.fn().mockResolvedValue({ present: jest.fn() }) };
  return {
    __esModule: true,
    alertController,
    modalController,
    toastController,
    IonBackButton: { name: "IonBackButton", template: "<button class='back-button'><slot /></button>" },
  };
});

jest.mock("@/components/atoms/Icon/XpIcon.vue", () => ({ name: "XpIcon", template: "<i />" }));

jest.mock("@/app/SideMenu/SwitchProfile/pinRecoveryPrompts", () => ({
  askNewPin: jest.fn(),
  askRecoveryCode: jest.fn(),
  issueAndShowRecoveryCode: jest.fn().mockResolvedValue(undefined),
  saveProfileSecrets: jest.fn(),
  showAndConfirmRecoveryCode: jest.fn(),
}));

describe("unlocking a profile hands over the recovery code until it is confirmed", () => {
  const issue = issueAndShowRecoveryCode as jest.Mock;
  const base = { id: "dad", name: { full: "Dad" }, passcode: sealSecret("4321"), avatar: "001-gamer" };

  const unlock = async (profile: Record<string, unknown>) => {
    const wrapper = mount(DialPad, { props: { profile }, global: { stubs: { "ion-content": true } } });
    const vm = wrapper.vm as any;
    for (const digit of [4, 3, 2, 1]) vm.appendToCode(digit);
    await vm.clickUnlock();
    wrapper.unmount();
  };

  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    issue.mockClear();
    setActivePinia(createPinia());
  });

  afterEach(() => jest.useRealTimers());

  it("hands a Game Master with no code their first one", async () => {
    const dad = { ...base, isAdult: true };
    await unlock(dad);
    expect(issue).toHaveBeenCalledWith(dad, "first");
  });

  it("hands a Game Master whose last code was never confirmed a fresh one, every time", async () => {
    const dad = { ...base, isAdult: true, pinRecovery: sealRecoveryCode("7KQ3-M9TW"), pinRecoveryPending: true };
    await unlock(dad);
    await unlock(dad);
    expect(issue).toHaveBeenCalledTimes(2);
    expect(issue).toHaveBeenLastCalledWith(dad, "again");
  });

  it("leaves a Game Master with a confirmed code alone", async () => {
    await unlock({ ...base, isAdult: true, pinRecovery: sealRecoveryCode("7KQ3-M9TW"), pinRecoveryPending: false });
    await unlock({ ...base, isAdult: true, pinRecovery: sealRecoveryCode("7KQ3-M9TW") });
    expect(issue).not.toHaveBeenCalled();
  });

  it("never hands a hero a code", async () => {
    await unlock({ ...base, id: "mia", isAdult: false });
    expect(issue).not.toHaveBeenCalled();
  });
});

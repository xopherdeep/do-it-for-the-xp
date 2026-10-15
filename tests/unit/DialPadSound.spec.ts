import { mount } from "@vue/test-utils";
import DialPad from "@/app/SideMenu/SwitchProfile/DialPad.vue";
import { play$fx } from "@/assets/fx";
import { soundEffects } from "@/lib/engine/audio/soundRegistry";
import $fx from "@/assets/fx";

jest.mock("@/assets/fx", () => {
  const original = jest.requireActual("@/assets/fx");
  return {
    __esModule: true,
    default: original.default,
    play$fx: jest.fn(),
  };
});

jest.mock("@ionic/vue", () => {
  const alertController = {
    create: jest.fn().mockResolvedValue({
      present: jest.fn(),
    }),
  };
  const modalController = {
    dismiss: jest.fn().mockResolvedValue(true),
  };
  const toastController = {
    create: jest.fn().mockResolvedValue({
      present: jest.fn(),
    }),
  };
  return {
    __esModule: true,
    default: {
      alertController,
      modalController,
      toastController,
    },
    alertController,
    modalController,
    toastController,
    IonBackButton: {
      name: "IonBackButton",
      template: "<button class='back-button'><slot /></button>",
    },
  };
});

jest.mock("@/components/atoms/Icon/XpIcon.vue", () => ({
  name: "XpIcon",
  template: "<i />",
}));

describe("Passcode Screen & UI FX Sound Mapping", () => {
  const playFxMock = play$fx as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("soundEffects registry and $fx mapping", () => {
    it("maps click sound in soundEffects for nintendo and sony", () => {
      expect(soundEffects.ui.nintendo.click).toBeDefined();
      expect(soundEffects.ui.nintendo.click.id).toBe("nintendo_click");
      expect(soundEffects.ui.sony.click).toBeDefined();
      expect(soundEffects.ui.sony.click.id).toBe("sony_click");
    });

    it("maps click in $fx.ui for nintendo and sony themes", () => {
      expect($fx.ui.nintendo.click).toBeDefined();
      expect($fx.ui.sony.click).toBeDefined();
    });
  });

  describe("DialPad sound effects", () => {
    const mockProfile = {
      username: "bountyhunter",
      name: { full: "Samus Aran", nick: "Samus" },
      passcode: "1234",
      avatar: "001-gamer",
      jobClass: "Warrior",
      favoriteFood: "Pizza",
    };

    const mountDialPad = () => {
      return mount(DialPad, {
        props: {
          profile: mockProfile,
        },
        global: {
          stubs: {
            "ion-header": true,
            "ion-toolbar": true,
            "ion-buttons": true,
            "ion-icon": true,
            "ion-title": true,
            "ion-content": true,
            "ion-avatar": true,
            "ion-img": true,
            "ion-grid": true,
            "ion-row": true,
            "ion-col": true,
            "ion-button": true,
          },
        },
      });
    };

    it("plays click sound when digits are entered", async () => {
      const wrapper = mountDialPad();
      const vm = wrapper.vm as any;

      vm.appendToCode(1);
      expect(playFxMock).toHaveBeenCalledWith("click");
      expect(vm.inputCode).toBe("1");

      vm.appendToCode(2);
      expect(playFxMock).toHaveBeenCalledWith("click");
      expect(vm.inputCode).toBe("12");
    });

    it("plays click sound when removing a digit", async () => {
      const wrapper = mountDialPad();
      const vm = wrapper.vm as any;

      vm.appendToCode(5);
      playFxMock.mockClear();

      vm.removeLastDigit();
      expect(playFxMock).toHaveBeenCalledWith("click");
      expect(vm.inputCode).toBe("");
    });

    it("plays click sound when clearing passcode", async () => {
      const wrapper = mountDialPad();
      const vm = wrapper.vm as any;

      vm.appendToCode(9);
      playFxMock.mockClear();

      vm.clearCode();
      expect(playFxMock).toHaveBeenCalledWith("click");
      expect(vm.inputCode).toBe("");
    });

    it("plays click sound when toggling passcode visibility", async () => {
      const wrapper = mountDialPad();
      const vm = wrapper.vm as any;

      vm.toggleShowPass();
      expect(playFxMock).toHaveBeenCalledWith("click");
      expect(vm.showPass).toBe(true);
    });

    it("plays yes sound when unlock is successful", async () => {
      const wrapper = mountDialPad();
      const vm = wrapper.vm as any;

      vm.appendToCode(1);
      vm.appendToCode(2);
      vm.appendToCode(3);
      vm.appendToCode(4);
      playFxMock.mockClear();

      await vm.clickUnlock();
      expect(playFxMock).toHaveBeenCalledWith("yes");
    });

    it("plays no sound when unlock passcode is incorrect", async () => {
      const wrapper = mountDialPad();
      const vm = wrapper.vm as any;

      vm.appendToCode(9);
      vm.appendToCode(9);
      vm.appendToCode(9);
      vm.appendToCode(9);
      playFxMock.mockClear();

      await vm.clickUnlock();
      expect(playFxMock).toHaveBeenCalledWith("no");
    });

    it("plays select sound on dismiss", async () => {
      const wrapper = mountDialPad();
      const vm = wrapper.vm as any;

      await vm.dismiss();
      expect(playFxMock).toHaveBeenCalledWith("select");
    });
  });
});

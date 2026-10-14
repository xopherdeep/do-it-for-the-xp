import { flushPromises, mount } from "@vue/test-utils";
import LinkPhone from "@/app/SideMenu/HeroPhone/LinkPhone.vue";
import { BarcodeFormat, BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";
import { Capacitor } from "@capacitor/core";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockRoute = {
  query: {} as Record<string, string>,
};

jest.mock("vue-router", () => ({
  ...jest.requireActual("vue-router"),
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useRoute: () => mockRoute,
}));

const mockFamily = {
  enabled: true,
  device: null as any,
  problem: null as string | null,
  claim: jest.fn(),
};
jest.mock("@/lib/store/stores/family", () => ({
  __esModule: true,
  useFamilyStore: () => mockFamily,
}));

jest.mock("@capacitor-mlkit/barcode-scanning", () => ({
  BarcodeFormat: { QrCode: "QR_CODE" },
  BarcodeScanner: {
    scan: jest.fn(),
  },
}));

let mockCurrentPlatform = "web";
let mockIsNative = false;
jest.mock("@capacitor/core", () => {
  const actual = jest.requireActual("@capacitor/core");
  return {
    ...actual,
    Capacitor: {
      ...actual.Capacitor,
      getPlatform: () => mockCurrentPlatform,
      isNativePlatform: () => mockIsNative,
    },
  };
});

const open = async () => {
  const wrapper = mount(LinkPhone, {
    global: {
      stubs: {
        "ion-page": { template: "<div><slot /></div>" },
        "ion-header": { template: "<div><slot /></div>" },
        "ion-toolbar": { template: "<div><slot /></div>" },
        "ion-buttons": { template: "<div><slot /></div>" },
        "ion-back-button": { template: "<button><slot /></button>" },
        "ion-title": { template: "<div><slot /></div>" },
        "ion-content": { template: "<div><slot /></div>" },
        "ion-grid": { template: "<div><slot /></div>" },
        "ion-row": { template: "<div><slot /></div>" },
        "ion-col": { template: "<div><slot /></div>" },
        "ion-card": { template: "<div><slot /></div>" },
        "ion-card-header": { template: "<div><slot /></div>" },
        "ion-card-title": { template: "<div><slot /></div>" },
        "ion-card-content": { template: "<div><slot /></div>" },
        "ion-item": { template: "<div><slot /></div>" },
        "ion-label": { template: "<label><slot /></label>" },
        "ion-input": {
          props: ["modelValue"],
          emits: ["update:modelValue"],
          template:
            '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        "ion-button": {
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
        "ion-spinner": { template: "<span>loading...</span>" },
        "ion-text": { template: "<span><slot /></span>" },
      },
    },
  });
  await flushPromises();
  return wrapper;
};

type Opened = Awaited<ReturnType<typeof open>>;
const cy = (wrapper: Opened, name: string) => wrapper.find(`[data-cy="${name}"]`);

describe("LinkPhone", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    localStorage.clear();
    mockCurrentPlatform = "web";
    mockIsNative = false;
    mockRoute.query = {};
    mockFamily.enabled = true;
    mockFamily.device = {
      card: { nickname: "Mia", level: 5 },
      label: "Mia's iPhone",
    };
    mockFamily.problem = null;
    mockFamily.claim.mockResolvedValue("linked");
  });

  describe("claiming on mount with query code", () => {
    it("?code=abcd-efgh claims ABCDEFGH on mount and goes to hero-phone", async () => {
      mockRoute.query = { code: "abcd-efgh" };
      await open();

      expect(mockFamily.claim).toHaveBeenCalledWith("ABCDEFGH");
      expect(mockReplace).toHaveBeenCalledWith({ name: "hero-phone" });
    });

    it("saves site override to localStorage outside production when query has site", async () => {
      mockRoute.query = { code: "abcd-efgh", site: "http://localhost:8090/doit" };
      await open();

      const saved = localStorage.getItem("xp:townHallSite");
      expect(saved).toBe("http://localhost:8090/doit");
    });
  });

  describe("manual code entry", () => {
    it("no code shows the input field and Link claims when typed", async () => {
      const wrapper = await open();

      expect(mockFamily.claim).not.toHaveBeenCalled();
      const input = cy(wrapper, "link-code-input");
      expect(input.exists()).toBe(true);

      const linkButton = cy(wrapper, "link-button");
      expect(linkButton.exists()).toBe(true);

      await input.setValue("ABCD EFGH");
      await linkButton.trigger("click");
      await flushPromises();

      expect(mockFamily.claim).toHaveBeenCalledWith("ABCDEFGH");
      expect(mockReplace).toHaveBeenCalledWith({ name: "hero-phone" });
    });

    it("code-invalid shows family.codeInvalid and stays", async () => {
      mockFamily.claim.mockResolvedValue("code-invalid");
      const wrapper = await open();

      const input = cy(wrapper, "link-code-input");
      await input.setValue("ABCD EFGH");
      await cy(wrapper, "link-button").trigger("click");
      await flushPromises();

      expect(mockFamily.claim).toHaveBeenCalledWith("ABCDEFGH");
      expect(mockReplace).not.toHaveBeenCalled();

      const banner = cy(wrapper, "family-banner");
      expect(banner.exists()).toBe(true);
      expect(banner.text()).toContain(
        "That code didn't work. Ask your Game Master for a new one."
      );
    });
  });

  describe("scanner visibility and behavior", () => {
    it("Scan is hidden on the web", async () => {
      mockCurrentPlatform = "web";
      mockIsNative = false;
      const wrapper = await open();

      const scanBtn = cy(wrapper, "scan-button");
      expect(scanBtn.exists()).toBe(false);
    });

    it("Scan is visible on phone apps and scanning a QR code claims", async () => {
      mockCurrentPlatform = "ios";
      mockIsNative = true;
      (BarcodeScanner.scan as jest.Mock).mockResolvedValue({
        barcodes: [
          {
            displayValue: "https://doit.forthexp.com/link?code=JKMN2345",
          },
        ],
      });

      const wrapper = await open();
      const scanBtn = cy(wrapper, "scan-button");
      expect(scanBtn.exists()).toBe(true);

      await scanBtn.trigger("click");
      await flushPromises();

      expect(BarcodeScanner.scan).toHaveBeenCalledWith({
        formats: [BarcodeFormat.QrCode],
      });
      expect(mockFamily.claim).toHaveBeenCalledWith("JKMN2345");
      expect(mockReplace).toHaveBeenCalledWith({ name: "hero-phone" });
    });
  });
});

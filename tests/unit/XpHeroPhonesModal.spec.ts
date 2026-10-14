import { defineComponent, h, reactive } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import QRCode from "qrcode";
import { modalController } from "@ionic/vue";
import XpHeroPhonesModal from "@/app/SideMenu/XpSettings/components/XpHeroPhonesModal.vue";

jest.mock("@ionic/vue", () => ({
  ...jest.requireActual("@ionic/vue"),
  modalController: { dismiss: jest.fn() },
}));

jest.mock("qrcode", () => ({
  toDataURL: jest.fn(),
}));

jest.mock("@/router/historyMode", () => ({
  __esModule: true,
  usesHashHistory: () => true,
}));

const mockFamily = reactive({
  phones: [] as any[],
  parentAuth: { kind: "basic" } as any,
  linkCode: jest.fn(),
  loadPhones: jest.fn(),
  removePhone: jest.fn(),
});

jest.mock("@/lib/store/stores/family", () => ({
  __esModule: true,
  useFamilyStore: () => mockFamily,
}));

/** The clerk's dialog stub */
const PromptStub = defineComponent({
  props: ["prompt"],
  emits: ["respond"],
  setup(props, { emit }) {
    return () =>
      props.prompt
        ? h(
            "div",
            {
              "data-cy": "prompt",
              "data-speaker": props.prompt.options.speaker,
              "data-accent": props.prompt.options.accent,
              "data-sprite": props.prompt.options.sprite,
            },
            [
              h("p", { "data-cy": "prompt-lines" }, props.prompt.options.lines.join(" ")),
              ...props.prompt.options.choices.map((choice: { id: string; label: string }) =>
                h("button", { "data-cy": `prompt-${choice.id}`, onClick: () => emit("respond", { id: choice.id, amount: null }) }, choice.label)
              ),
            ]
          )
        : null;
  },
});

const open = async (props = { heroId: "h-1", nickname: "Mia" }) => {
  const wrapper = mount(XpHeroPhonesModal, {
    props,
    global: { stubs: { XpRevealPrompt: PromptStub } },
  });
  await flushPromises();
  return wrapper;
};

type Opened = Awaited<ReturnType<typeof open>>;
const cy = (wrapper: Opened, name: string) => wrapper.find(`[data-cy="${name}"]`);

describe("XpHeroPhonesModal", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    mockFamily.phones = [];
    mockFamily.linkCode.mockReset();
    mockFamily.loadPhones.mockReset();
    mockFamily.removePhone.mockReset();
    mockFamily.parentAuth = { kind: "basic" };
    mockFamily.loadPhones.mockResolvedValue(undefined);
    mockFamily.removePhone.mockResolvedValue(undefined);
    (QRCode.toDataURL as jest.Mock).mockResolvedValue("data:image/png;base64,mockqr");
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("linking a phone", () => {
    it("shows town hall required when parentAuth is null", async () => {
      mockFamily.parentAuth = null;
      const wrapper = await open();
      expect(cy(wrapper, "town-hall-required").exists()).toBe(true);
      expect(cy(wrapper, "link-phone").exists()).toBe(false);
    });

    it("displays error message if linkCode fails", async () => {
      mockFamily.linkCode.mockRejectedValue(new Error("Network failure"));
      const wrapper = await open();
      await cy(wrapper, "link-phone").trigger("click");
      await flushPromises();
      expect(cy(wrapper, "link-code-error").text()).toContain("Network failure");
    });

    it("Link a phone shows the formatted code and an <img> from toDataURL with the hash-mode link", async () => {
      const expiresAt = new Date(Date.now() + 600 * 1000).toISOString();
      mockFamily.linkCode.mockResolvedValue({ code: "ABCDEFGH", expiresAt });

      const wrapper = await open();
      expect(mockFamily.loadPhones).toHaveBeenCalled();

      await cy(wrapper, "link-phone").trigger("click");
      await flushPromises();

      expect(mockFamily.linkCode).toHaveBeenCalledWith("h-1");
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        "http://localhost/#/link?code=ABCDEFGH",
        { margin: 1, width: 240 }
      );

      expect(cy(wrapper, "link-code").text()).toBe("ABCD-EFGH");
      const img = cy(wrapper, "qr-image");
      expect(img.exists()).toBe(true);
      expect(img.attributes("src")).toBe("data:image/png;base64,mockqr");
    });

    it("the countdown reads 10:00, then 9:59", async () => {
      const expiresAt = new Date(Date.now() + 600 * 1000).toISOString();
      mockFamily.linkCode.mockResolvedValue({ code: "ABCDEFGH", expiresAt });

      const wrapper = await open();
      await cy(wrapper, "link-phone").trigger("click");
      await flushPromises();

      expect(cy(wrapper, "countdown").text()).toBe("10:00");

      jest.advanceTimersByTime(1000);
      await flushPromises();

      expect(cy(wrapper, "countdown").text()).toBe("9:59");
    });

    it("at expiry the image is gone and New code shows", async () => {
      const expiresAt = new Date(Date.now() + 600 * 1000).toISOString();
      mockFamily.linkCode.mockResolvedValue({ code: "ABCDEFGH", expiresAt });

      const wrapper = await open();
      await cy(wrapper, "link-phone").trigger("click");
      await flushPromises();

      expect(cy(wrapper, "qr-image").exists()).toBe(true);
      expect(cy(wrapper, "new-code").exists()).toBe(false);

      jest.advanceTimersByTime(600 * 1000);
      await flushPromises();

      expect(cy(wrapper, "qr-image").exists()).toBe(false);
      expect(cy(wrapper, "new-code").exists()).toBe(true);

      const nextExpiresAt = new Date(Date.now() + 600 * 1000).toISOString();
      mockFamily.linkCode.mockResolvedValue({ code: "JKMNPQRS", expiresAt: nextExpiresAt });
      await cy(wrapper, "new-code").trigger("click");
      await flushPromises();

      expect(mockFamily.linkCode).toHaveBeenCalledTimes(2);
    });
  });

  describe("phone list and removal", () => {
    beforeEach(() => {
      mockFamily.phones = [
        {
          id: 3,
          heroId: "h-1",
          label: "Mia's iPhone",
          createdAt: "2026-10-13T10:00:00Z",
          lastSeenAt: "2026-10-13T12:00:00Z",
        },
        {
          id: 4,
          heroId: "h-2",
          label: "Bo's Tablet",
          createdAt: "2026-10-13T10:00:00Z",
          lastSeenAt: null,
        },
      ];
    });

    it("shows only phones for this hero", async () => {
      const wrapper = await open({ heroId: "h-1", nickname: "Mia" });
      expect(cy(wrapper, "phone-item-3").exists()).toBe(true);
      expect(cy(wrapper, "phone-item-4").exists()).toBe(false);
      expect(cy(wrapper, "phone-item-3").text()).toContain("Mia's iPhone");
    });

    it("Remove with Yes calls removePhone(3), with No does not", async () => {
      const wrapper = await open({ heroId: "h-1", nickname: "Mia" });

      await cy(wrapper, "phone-remove-3").trigger("click");
      await flushPromises();

      const promptEl = cy(wrapper, "prompt");
      expect(promptEl.exists()).toBe(true);
      expect(promptEl.attributes("data-speaker")).toBe("Town Clerk");
      expect(cy(wrapper, "prompt-lines").text()).toBe("Unlink Mia's iPhone? It stops working right away.");

      await cy(wrapper, "prompt-no").trigger("click");
      await flushPromises();
      expect(mockFamily.removePhone).not.toHaveBeenCalled();

      await cy(wrapper, "phone-remove-3").trigger("click");
      await flushPromises();

      await cy(wrapper, "prompt-yes").trigger("click");
      await flushPromises();
      expect(mockFamily.removePhone).toHaveBeenCalledWith(3);
    });
  });

  describe("modal controls", () => {
    it("dismisses on close button click", async () => {
      const wrapper = await open();
      await cy(wrapper, "close-modal").trigger("click");
      expect(modalController.dismiss).toHaveBeenCalled();
    });
  });
});

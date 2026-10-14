import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import HeroPhone from "@/app/SideMenu/HeroPhone/HeroPhone.vue";

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock("vue-router", () => ({
  ...jest.requireActual("vue-router"),
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useRoute: () => ({}),
}));

const mockHeroCard = {
  heroId: "hero-1",
  nickname: "Mia",
  look: {
    gender: "female",
    skinColor: "fair",
    hairStyle: "ponytail",
    hairColor: "blonde",
    outfit: "apprentice",
  },
  jobClass: "Warrior",
  level: 7,
  updatedAt: "2026-10-13T00:00:00Z",
};

const mockFamily = {
  enabled: true,
  isKidMode: true,
  device: {
    siteUrl: "https://doit.forthexp.com",
    familyId: "fam-1",
    heroId: "hero-1",
    deviceId: "dev-1",
    key: "key-123",
    label: "Mia's phone",
    linkedAt: 1700000000000,
    card: mockHeroCard,
    unlinked: false,
  } as any,
  refreshCard: jest.fn().mockResolvedValue(undefined),
  forgetDevice: jest.fn().mockResolvedValue(undefined),
};

jest.mock("@/lib/store/stores/family", () => ({
  __esModule: true,
  useFamilyStore: () => mockFamily,
}));

const open = async () => {
  const pinia = createPinia();
  setActivePinia(pinia);
  const wrapper = mount(HeroPhone, {
    global: {
      plugins: [pinia],
      stubs: {
        "ion-page": { template: "<div><slot /></div>" },
        "ion-header": { template: "<div><slot /></div>" },
        "ion-toolbar": { template: "<div><slot /></div>" },
        "ion-title": { template: "<div><slot /></div>" },
        "ion-content": { template: "<div><slot /></div>" },
        "ion-grid": { template: "<div><slot /></div>" },
        "ion-row": { template: "<div><slot /></div>" },
        "ion-col": { template: "<div><slot /></div>" },
        "ion-card": { template: "<div><slot /></div>" },
        "ion-card-header": { template: "<div><slot /></div>" },
        "ion-card-title": { template: "<div><slot /></div>" },
        "ion-card-subtitle": { template: "<div><slot /></div>" },
        "ion-card-content": { template: "<div><slot /></div>" },
        "ion-text": { template: "<span><slot /></span>" },
        "ion-button": {
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
        "xp-hero-model": {
          name: "xp-hero-model",
          props: ["look", "animation"],
          template: '<div class="stub-hero-model" :data-animation="animation"></div>',
        },
      },
    },
  });
  await flushPromises();
  return wrapper;
};

describe("HeroPhone", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFamily.device = {
      siteUrl: "https://doit.forthexp.com",
      familyId: "fam-1",
      heroId: "hero-1",
      deviceId: "dev-1",
      key: "key-123",
      label: "Mia's phone",
      linkedAt: 1700000000000,
      card: { ...mockHeroCard },
      unlinked: false,
    };
  });

  it("shows the hero card with nickname, level, job class, and questsElsewhere notice", async () => {
    const wrapper = await open();
    expect(wrapper.text()).toContain("Mia");
    expect(wrapper.text()).toContain("7");
    expect(wrapper.text()).toContain("Warrior");
    expect(wrapper.text()).toContain("Your quests are on the family device.");
    const model = wrapper.findComponent({ name: "xp-hero-model" });
    expect(model.exists()).toBe(true);
    expect(model.props("look")).toEqual(mockHeroCard.look);
    expect(model.props("animation")).toBe("idle");
  });

  it("calls refreshCard on mount", async () => {
    await open();
    expect(mockFamily.refreshCard).toHaveBeenCalled();
  });

  it("calls refreshCard when document becomes visible", async () => {
    await open();
    mockFamily.refreshCard.mockClear();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await flushPromises();

    expect(mockFamily.refreshCard).toHaveBeenCalled();
  });

  it("does not call refreshCard when document becomes hidden", async () => {
    await open();
    mockFamily.refreshCard.mockClear();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await flushPromises();

    expect(mockFamily.refreshCard).not.toHaveBeenCalled();
  });

  describe("when unlinked", () => {
    beforeEach(() => {
      mockFamily.device = {
        siteUrl: "https://doit.forthexp.com",
        familyId: "fam-1",
        heroId: "hero-1",
        deviceId: "dev-1",
        key: "key-123",
        label: "Mia's phone",
        linkedAt: 1700000000000,
        card: { ...mockHeroCard },
        unlinked: true,
      };
    });

    it("shows family.unlinked line and Start fresh button", async () => {
      const wrapper = await open();
      expect(wrapper.text()).toContain("This phone was unlinked. Ask your Game Master to link it again.");
      expect(wrapper.text()).toContain("Start fresh");
    });

    it("clicking Start fresh clears device and navigates to /xp-profile", async () => {
      const wrapper = await open();
      const startFreshBtn = wrapper.findAll("button").find((btn) => btn.text().includes("Start fresh"));
      expect(startFreshBtn).toBeDefined();

      await startFreshBtn!.trigger("click");
      await flushPromises();

      expect(mockFamily.forgetDevice).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/xp-profile");
    });
  });
});

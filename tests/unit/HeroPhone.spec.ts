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

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn(), default: {} }));

const mockToastCreate = jest.fn(async () => ({ present: jest.fn() }));
jest.mock("@ionic/vue", () => ({
  ...jest.requireActual("@ionic/vue"),
  toastController: { create: (...args: unknown[]) => (mockToastCreate as any)(...args) },
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
  syncPhone: jest.fn().mockResolvedValue(undefined),
  claimOnPhone: jest.fn().mockResolvedValue(undefined),
  phoneState: { outbox: [], lastSeq: 0, sheet: null, claims: [] } as any,
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
        IonButton: {
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

  describe("with a sheet from the family device", () => {
    const sheetQuest = { questId: "q1", name: "Feed the cat", difficulty: 2, xp: 20, gp: 10, ap: 1, needsApproval: true, photo: false, overdue: false };
    beforeEach(() => {
      mockFamily.phoneState = {
        outbox: [{ id: "c2" }],
        lastSeq: 9,
        sheet: { heroId: "hero-1", at: "2026-10-18T09:00:00Z", seq: 5, stats: { level: 7, xp: 40, nextLevelXp: 300, gp: 55, ap: 3, hp: 18, maxHp: 30, mp: 4, maxMp: 9 }, quests: [sheetQuest] },
        claims: [
          { id: "c1", questId: "q9", questName: "Make the bed", at: "t", status: "approved", note: "", paid: { xp: 10, gp: 5, ap: 1 }, settledSeq: 4 },
          { id: "c2", questId: "q8", questName: "Brush teeth", at: "t", status: "waiting", note: "", paid: { xp: 0, gp: 0, ap: 0 }, settledSeq: 0 },
          { id: "c3", questId: "q7", questName: "Dishes", at: "t", status: "rejected", note: "Still a pan in the sink", paid: { xp: 0, gp: 0, ap: 0 }, settledSeq: 6 },
        ],
      };
    });
    afterEach(() => {
      mockFamily.phoneState = { outbox: [], lastSeq: 0, sheet: null, claims: [] };
    });

    it("shows the hero's numbers and the quests to claim instead of the notice", async () => {
      const wrapper = await open();
      expect(wrapper.find("[data-cy=hero-stats]").text()).toContain("55");
      expect(wrapper.find("[data-cy=hero-stats]").text()).toContain("18/30");
      expect(wrapper.findAll("[data-cy=phone-quest]")).toHaveLength(1);
      expect(wrapper.text()).toContain("Feed the cat");
      expect(wrapper.find("[data-cy=quests-elsewhere]").exists()).toBe(false);
    });

    it("claims a quest with Done and says the Game Master will check it", async () => {
      const wrapper = await open();
      await wrapper.find("[data-cy=phone-claim]").trigger("click");
      await flushPromises();
      expect(mockFamily.claimOnPhone).toHaveBeenCalledWith(sheetQuest);
      expect(mockToastCreate).toHaveBeenCalledWith(expect.objectContaining({ message: "Claimed! Your Game Master will check Feed the cat.", cssClass: "rpg-toast" }));
    });

    it("lists the claims with what became of them", async () => {
      const wrapper = await open();
      const rows = wrapper.findAll("[data-cy=phone-claim-row]").map((row) => row.text());
      expect(rows[0]).toContain("Approved");
      expect(rows[0]).toContain("+10 XP");
      expect(rows[1]).toContain("Not sent yet");
      expect(rows[2]).toContain("Not this time");
      expect(rows[2]).toContain("Still a pan in the sink");
    });

    it("syncs when the screen opens", async () => {
      await open();
      expect(mockFamily.syncPhone).toHaveBeenCalled();
    });
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

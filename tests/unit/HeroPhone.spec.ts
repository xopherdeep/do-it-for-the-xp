import { reactive } from "vue";
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

// The sync store as the screen reads it: the first pull's progress and the answers to the hero's turn
const mockSync = reactive({
  isOn: false,
  isFullPortal: false,
  problem: null as string | null,
  firstPullProgress: 0,
  isFamilyDevice: false,
  turns: {} as Record<string, unknown>,
  tookOverNotice: null as string | null,
  signIn: jest.fn(),
  takeOver: jest.fn(),
  rest: jest.fn(),
});
jest.mock("@/lib/store/stores/sync", () => ({ __esModule: true, useSyncStore: () => mockSync }));

const mockHero = { id: "hero-1", name: { nick: "Mia" }, isAdult: false };
const mockUser = reactive({
  users: {} as Record<string, unknown>,
  currentUser: { id: null as string | null },
  loginUser: jest.fn(),
  logoutUser: jest.fn(),
});
jest.mock("@/lib/store/stores/user", () => ({ __esModule: true, useUserStore: () => mockUser }));

const BUSY_ON_IPAD = { label: "Mia's iPad", lastSeenAt: null };

/** Every screen opened by a test, taken down after it so a watcher on the shared sync mock never answers a later test */
const opened: { unmount: () => void }[] = [];

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
        // The in-world prompt: its lines, and a button per choice that answers like the real one
        "xp-reveal-prompt": {
          name: "xp-reveal-prompt",
          props: ["prompt"],
          emits: ["respond"],
          template:
            '<div v-if="prompt" data-cy="reveal-prompt"><p v-for="line in prompt.options.lines" :key="line" data-cy="reveal-line">{{ line }}</p>' +
            '<button v-for="choice in prompt.options.choices" :key="choice.id" :data-cy="`choice-${choice.id}`" @click="$emit(\'respond\', { id: choice.id, amount: null })">{{ choice.label }}</button></div>',
        },
        "xp-hero-model": {
          name: "xp-hero-model",
          props: ["look", "animation"],
          template: '<div class="stub-hero-model" :data-animation="animation"></div>',
        },
      },
    },
  });
  opened.push(wrapper);
  await flushPromises();
  return wrapper;
};

describe("HeroPhone", () => {
  afterEach(() => {
    opened.splice(0).forEach((wrapper) => wrapper.unmount());
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFamily.isKidMode = true;
    mockSync.isOn = false;
    mockSync.isFullPortal = false;
    mockSync.problem = null;
    mockSync.firstPullProgress = 0;
    mockSync.turns = {};
    mockSync.signIn.mockResolvedValue("granted");
    mockSync.takeOver.mockResolvedValue(undefined);
    mockSync.rest.mockResolvedValue(undefined);
    mockUser.users = { "hero-1": mockHero };
    mockUser.currentUser = { id: null };
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

  describe("a Pro kid phone's first pull", () => {
    const waitingSheet = {
      outbox: [],
      lastSeq: 3,
      sheet: { heroId: "hero-1", at: "2026-10-18T09:00:00Z", seq: 2, stats: { level: 7, xp: 40, nextLevelXp: 300, gp: 55, ap: 3, hp: 18, maxHp: 30, mp: 4, maxMp: 9 }, quests: [] },
      claims: [],
    } as any;
    const lines = (wrapper: Awaited<ReturnType<typeof open>>) => wrapper.findAll("[data-cy=reveal-line]").map((line) => line.text());

    beforeEach(() => {
      mockSync.isOn = true;
    });
    afterEach(() => {
      mockFamily.phoneState = { outbox: [], lastSeq: 0, sheet: null, claims: [] };
    });

    it("shows the first pull line while pulling, then signs the hero in and opens the portal", async () => {
      const wrapper = await open();
      expect(lines(wrapper)).toEqual(["Fetching your family's world…"]);
      expect(wrapper.find("[data-cy=choice-ok]").exists()).toBe(false);

      mockSync.firstPullProgress = 42;
      await flushPromises();
      expect(lines(wrapper)).toEqual(["Fetching your family's world… (42)"]);
      expect(mockReplace).not.toHaveBeenCalled();

      mockSync.isFullPortal = true;
      await flushPromises();

      expect(mockSync.signIn).toHaveBeenCalledWith("hero-1");
      expect(mockUser.loginUser).toHaveBeenCalledWith(mockHero);
      expect(mockReplace).toHaveBeenCalledWith("/my-portal/hero-1/my-home");
      // The turn is asked for before the hero signs in, and the portal opens after
      const [signedFor] = mockSync.signIn.mock.invocationCallOrder;
      const [loggedIn] = mockUser.loginUser.mock.invocationCallOrder;
      const [opened] = mockReplace.mock.invocationCallOrder;
      expect(signedFor).toBeLessThan(loggedIn);
      expect(loggedIn).toBeLessThan(opened);
      expect(lines(wrapper)).toEqual([]);
    });

    it("asks to play here when another device holds the hero, and Play here takes the turn and opens the portal", async () => {
      mockSync.signIn.mockImplementation(async (heroId: string) => {
        mockSync.turns = { [heroId]: { state: "busy", busy: BUSY_ON_IPAD, provisional: false } };
        return "busy";
      });
      const wrapper = await open();
      mockSync.isFullPortal = true;
      await flushPromises();

      expect(lines(wrapper)).toEqual(["Mia is still playing on Mia's iPad (last seen a while ago). Play here anyway?"]);
      expect(mockReplace).not.toHaveBeenCalled();

      await wrapper.find("[data-cy=choice-play]").trigger("click");
      await flushPromises();

      expect(mockSync.takeOver).toHaveBeenCalledWith("hero-1");
      expect(mockUser.loginUser).toHaveBeenCalledWith(mockHero);
      expect(mockReplace).toHaveBeenCalledWith("/my-portal/hero-1/my-home");
    });

    it("Not now rests the hero and leaves the phone on its read-only board", async () => {
      mockSync.signIn.mockImplementation(async (heroId: string) => {
        mockSync.turns = { [heroId]: { state: "busy", busy: BUSY_ON_IPAD, provisional: false } };
        return "busy";
      });
      mockFamily.phoneState = waitingSheet;
      const wrapper = await open();
      mockSync.isFullPortal = true;
      await flushPromises();

      await wrapper.find("[data-cy=choice-later]").trigger("click");
      await flushPromises();

      expect(mockSync.rest).toHaveBeenCalledWith("hero-1");
      expect(mockSync.takeOver).not.toHaveBeenCalled();
      expect(mockUser.loginUser).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
      expect(wrapper.find("[data-cy=hero-phone-board]").exists()).toBe(true);
      expect(lines(wrapper)).toEqual([]);
    });

    it("plays on when the turn could not be asked for because there is no signal", async () => {
      mockSync.signIn.mockResolvedValue("offline");
      await open();
      mockSync.isFullPortal = true;
      await flushPromises();
      expect(mockUser.loginUser).toHaveBeenCalledWith(mockHero);
      expect(mockReplace).toHaveBeenCalledWith("/my-portal/hero-1/my-home");
    });

    it("stays on the board when the pull did not bring the hero", async () => {
      mockUser.users = {};
      await open();
      mockSync.isFullPortal = true;
      await flushPromises();
      expect(mockSync.signIn).not.toHaveBeenCalled();
      expect(mockUser.loginUser).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("offline on the first pull shows the board with the offline line", async () => {
      mockSync.problem = "offline";
      mockFamily.phoneState = waitingSheet;
      const wrapper = await open();

      expect(lines(wrapper)).toEqual([]);
      expect(wrapper.find("[data-cy=hero-phone-board]").exists()).toBe(true);
      expect(wrapper.find("[data-cy=sync-footer]").text()).toBe("No signal. Play on; this device tells the others when it's back.");
      expect(mockReplace).not.toHaveBeenCalled();

      // The store retries when the signal is back: the pull line returns and the footer goes
      mockSync.problem = null;
      await flushPromises();
      expect(lines(wrapper)).toEqual(["Fetching your family's world…"]);
      expect(wrapper.find("[data-cy=sync-footer]").exists()).toBe(false);
    });

    it("does not pull on a phone without the family's Pro: today's card and no line", async () => {
      mockSync.isOn = false;
      const wrapper = await open();
      expect(lines(wrapper)).toEqual([]);
      expect(wrapper.find("[data-cy=sync-footer]").exists()).toBe(false);
      expect(wrapper.find("[data-cy=quests-elsewhere]").exists()).toBe(true);
    });

    it("does not pull on a device that is not a kid phone", async () => {
      mockFamily.isKidMode = false;
      const wrapper = await open();
      expect(lines(wrapper)).toEqual([]);
    });

    it("does not open the portal again when the screen is reached from a finished pull (Save & Quit)", async () => {
      mockSync.isFullPortal = true;
      const wrapper = await open();
      expect(lines(wrapper)).toEqual([]);
      expect(mockSync.signIn).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
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

import { nextTick, reactive } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import HeroPhone from "@/app/SideMenu/HeroPhone/HeroPhone.vue";
import { handleHeroPhoneGuard } from "@/router/_Guards/heroPhone.guard";

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
  problem: null as string | null,
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
  firstPullStalled: false,
  isFamilyDevice: false,
  turns: {} as Record<string, unknown>,
  tookOverNotice: null as string | null,
  signIn: jest.fn(),
  takeOver: jest.fn(),
  rest: jest.fn(),
  // What the phone knows of its hero's turn: a busy answer the player said Not now to reads "busy"
  stateOf: (heroId: string) => (mockSync.turns[heroId] as { state?: string } | undefined)?.state ?? null,
});
jest.mock("@/lib/store/stores/sync", () => ({ __esModule: true, useSyncStore: () => mockSync }));

// The licence as the board reads it: the family's Pro, or not
const mockPro = reactive({ isPro: false });
jest.mock("@/lib/store/stores/pro", () => ({ __esModule: true, useProStore: () => mockPro }));

const mockHero = { id: "hero-1", name: { nick: "Mia" }, isAdult: false };
const mockUser = reactive({
  users: {} as Record<string, unknown>,
  currentUser: { id: null as string | null },
  loginUser: jest.fn(),
  logoutUser: jest.fn(),
});
jest.mock("@/lib/store/stores/user", () => ({ __esModule: true, useUserStore: () => mockUser }));

const mockDebugWarn = jest.fn();
jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { warn: (...args: unknown[]) => mockDebugWarn(...args), error: jest.fn(), log: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

const BUSY_ON_IPAD = { label: "Mia's iPad", lastSeenAt: null };

/** What the family device sent the phone: the hero's numbers and no quests to claim */
const SHEET_STATE = {
  outbox: [],
  lastSeq: 3,
  sheet: { heroId: "hero-1", at: "2026-10-18T09:00:00Z", seq: 2, stats: { level: 7, xp: 40, nextLevelXp: 300, gp: 55, ap: 3, hp: 18, maxHp: 30, mp: 4, maxMp: 9 }, quests: [] },
  claims: [],
} as any;
const NO_SHEET_STATE = { outbox: [], lastSeq: 0, sheet: null, claims: [] } as any;

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
        "ion-footer": { template: "<div><slot /></div>" },
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
    mockFamily.problem = null;
    mockSync.isOn = false;
    mockSync.isFullPortal = false;
    mockSync.problem = null;
    mockSync.firstPullProgress = 0;
    mockSync.firstPullStalled = false;
    mockSync.turns = {};
    mockPro.isPro = false;
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

  describe("when the hero's card has not come from the family device", () => {
    beforeEach(() => {
      mockFamily.device = { ...mockFamily.device, card: null, nickname: "Mia" };
    });

    it("never sits blank: it names the hero and says the card is still to come", async () => {
      const wrapper = await open();
      const waiting = wrapper.find('[data-cy="card-waiting"]');
      expect(waiting.exists()).toBe(true);
      expect(waiting.text()).toContain("Mia's card hasn't come from the family device yet");
      expect(wrapper.text()).toContain("Mia");
      expect(wrapper.find('[data-cy="hero-card"]').exists()).toBe(false);
    });

    it("keeps the Hero Phone title and a plain line when the site has not told the phone the hero's name", async () => {
      mockFamily.device = { ...mockFamily.device, nickname: undefined };
      const wrapper = await open();
      expect(wrapper.text()).toContain("Hero Phone");
      expect(wrapper.find('[data-cy="card-waiting"]').text()).toContain("Your hero's card hasn't come from the family device yet");
    });

    it("tells the Game Master when family sync is off on this phone", async () => {
      mockSync.isOn = false;
      const wrapper = await open();
      expect(wrapper.find('[data-cy="sync-note"]').text()).toContain("Family sync is off on this phone");
    });

    it("names the site's trouble when family sync is on but has a problem", async () => {
      mockSync.isOn = true;
      mockSync.problem = "pro-required";
      const wrapper = await open();
      expect(wrapper.find('[data-cy="sync-note"]').text()).toContain("pro-required");
    });

    it("adds no note when family sync is on and well", async () => {
      mockSync.isOn = true;
      const wrapper = await open();
      expect(wrapper.find('[data-cy="sync-note"]').exists()).toBe(false);
    });

    it("says the road to the city is closed when the family server did not answer", async () => {
      mockFamily.problem = "offline";
      const wrapper = await open();
      expect(wrapper.find('[data-cy="card-waiting"]').text()).toContain("The family's road to the city isn't open yet");
    });

    it("shows nothing of the kind for a phone that has its card", async () => {
      mockFamily.device = { ...mockFamily.device, card: { ...mockHeroCard } };
      const wrapper = await open();
      expect(wrapper.find('[data-cy="card-waiting"]').exists()).toBe(false);
    });

    it("shows the unlinked card, not the waiting one, for an unlinked phone", async () => {
      mockFamily.device = { ...mockFamily.device, unlinked: true };
      const wrapper = await open();
      expect(wrapper.find('[data-cy="unlinked-card"]').exists()).toBe(true);
      expect(wrapper.find('[data-cy="card-waiting"]').exists()).toBe(false);
    });
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
      mockPro.isPro = true;
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

    it("Not now rests the hero and leaves the phone on its card, with Play to try again", async () => {
      mockSync.signIn.mockImplementation(async (heroId: string) => {
        mockSync.turns = { [heroId]: { state: "busy", busy: BUSY_ON_IPAD, provisional: false } };
        return "busy";
      });
      const quest = { questId: "q1", name: "Feed the cat", difficulty: 2, xp: 20, gp: 10, ap: 1, needsApproval: true, photo: false, overdue: false };
      mockFamily.phoneState = { ...waitingSheet, sheet: { ...waitingSheet.sheet, quests: [quest] } };
      const wrapper = await open();
      mockSync.isFullPortal = true;
      await flushPromises();

      await wrapper.find("[data-cy=choice-later]").trigger("click");
      await flushPromises();

      expect(mockSync.rest).toHaveBeenCalledWith("hero-1");
      expect(mockSync.takeOver).not.toHaveBeenCalled();
      expect(mockUser.loginUser).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
      // the hero is played elsewhere: the phone shows its board, read-only (nothing to claim from here), and Play
      expect(wrapper.find("[data-cy=hero-phone-board]").exists()).toBe(true);
      expect(wrapper.find("[data-cy=phone-claim]").exists()).toBe(false);
      expect(wrapper.find("[data-cy=play-button]").exists()).toBe(true);
      expect(lines(wrapper)).toEqual([]);
    });

    it("a pull that has waited five minutes for its hero shows the card with Play off and the quests-elsewhere footer", async () => {
      mockUser.users = {};
      const wrapper = await open();
      expect(lines(wrapper)).toEqual(["Fetching your family's world…"]);

      mockSync.firstPullStalled = true;
      await flushPromises();

      expect(lines(wrapper)).toEqual([]);
      expect(wrapper.find("[data-cy=hero-card]").exists()).toBe(true);
      expect(wrapper.find("[data-cy=play-button]").exists()).toBe(true);
      expect(wrapper.find("[data-cy=play-button]").attributes("disabled")).toBeDefined();
      expect(wrapper.find("[data-cy=sync-footer]").text()).toBe("Your quests are on the family device.");
      expect(wrapper.find("[data-cy=quests-elsewhere]").exists()).toBe(false);

      // the store keeps pulling: the hero lands and the pull is done, and the portal opens
      mockUser.users = { "hero-1": mockHero };
      mockSync.firstPullStalled = false;
      mockSync.isFullPortal = true;
      await flushPromises();
      expect(mockUser.loginUser).toHaveBeenCalledWith(mockHero);
      expect(wrapper.find("[data-cy=sync-footer]").exists()).toBe(false);
    });

    it("plays on when the turn could not be asked for because there is no signal", async () => {
      mockSync.signIn.mockResolvedValue("offline");
      await open();
      mockSync.isFullPortal = true;
      await flushPromises();
      expect(mockUser.loginUser).toHaveBeenCalledWith(mockHero);
      expect(mockReplace).toHaveBeenCalledWith("/my-portal/hero-1/my-home");
    });

    it("a pull that completes before the hero's profile arrives opens the portal once the profile lands", async () => {
      mockUser.users = {};
      const wrapper = await open();
      mockSync.isFullPortal = true;
      await flushPromises();

      // The pull counted an empty page as done: the family's world is still arriving, so the line stays and nothing opens
      expect(lines(wrapper)).toEqual(["Fetching your family's world…"]);
      expect(mockSync.signIn).not.toHaveBeenCalled();
      expect(mockUser.loginUser).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
      expect(mockDebugWarn).toHaveBeenCalledWith(expect.stringContaining("has not arrived"));

      // A later download brings the hero
      mockUser.users = { "hero-1": mockHero };
      await flushPromises();

      expect(mockSync.signIn).toHaveBeenCalledTimes(1);
      expect(mockUser.loginUser).toHaveBeenCalledWith(mockHero);
      expect(mockReplace).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith("/my-portal/hero-1/my-home");
      expect(lines(wrapper)).toEqual([]);
    });

    it("stops waiting for the hero when the phone is no longer a full portal", async () => {
      mockUser.users = {};
      const wrapper = await open();
      mockSync.isFullPortal = true;
      await flushPromises();
      expect(lines(wrapper)).toHaveLength(1);

      mockSync.isOn = false;
      mockSync.isFullPortal = false;
      await flushPromises();
      expect(lines(wrapper)).toEqual([]);

      mockUser.users = { "hero-1": mockHero };
      await flushPromises();
      expect(mockSync.signIn).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("keeps the pull line up while the turn is asked for, so the card never flashes", async () => {
      let grant: (answer: string) => void = () => undefined;
      mockSync.signIn.mockReturnValue(new Promise((resolve) => (grant = resolve)));
      const wrapper = await open();
      mockSync.isFullPortal = true;
      await flushPromises();

      expect(mockSync.signIn).toHaveBeenCalledWith("hero-1");
      expect(lines(wrapper)).toEqual(["Fetching your family's world…"]);

      grant("granted");
      await flushPromises();
      expect(mockReplace).toHaveBeenCalledWith("/my-portal/hero-1/my-home");
    });

    it.each([
      ["the hero cannot be signed in", () => mockUser.loginUser.mockImplementationOnce(() => { throw new Error("no store"); })],
      ["the portal cannot be opened", () => mockReplace.mockRejectedValueOnce(new Error("no route"))],
    ])("rests the hero and leaves the card with Play when %s", async (_label, fail) => {
      fail();
      mockFamily.phoneState = waitingSheet;
      const wrapper = await open();
      mockSync.isFullPortal = true;
      await flushPromises();

      expect(mockSync.rest).toHaveBeenCalledWith("hero-1");
      expect(lines(wrapper)).toEqual([]);
      expect(wrapper.find("[data-cy=hero-phone-board]").exists()).toBe(false);
      expect(wrapper.find("[data-cy=play-button]").exists()).toBe(true);
    });

    it("moves the count on the line at most once a second, and the newest count gets its turn", async () => {
      const wrapper = await open();
      jest.useFakeTimers();
      try {
        mockSync.firstPullProgress = 10;
        await nextTick();
        expect(lines(wrapper)).toEqual(["Fetching your family's world… (10)"]);

        mockSync.firstPullProgress = 20;
        await nextTick();
        mockSync.firstPullProgress = 30;
        await nextTick();
        expect(lines(wrapper)).toEqual(["Fetching your family's world… (10)"]);

        jest.advanceTimersByTime(1000);
        await nextTick();
        expect(lines(wrapper)).toEqual(["Fetching your family's world… (30)"]);
      } finally {
        jest.useRealTimers();
      }
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

    it("offline while the hero's profile is awaited shows the card with the No signal line, and the line returns with the signal", async () => {
      mockUser.users = {};
      const wrapper = await open();
      mockSync.isFullPortal = true;
      await flushPromises();
      expect(lines(wrapper)).toEqual(["Fetching your family's world…"]);

      mockSync.problem = "offline";
      await flushPromises();
      expect(lines(wrapper)).toEqual([]);
      expect(wrapper.find("[data-cy=hero-card]").exists()).toBe(true);
      expect(wrapper.find("[data-cy=sync-footer]").text()).toBe("No signal. Play on; this device tells the others when it's back.");

      mockSync.problem = null;
      await flushPromises();
      expect(lines(wrapper)).toEqual(["Fetching your family's world…"]);
      expect(wrapper.find("[data-cy=sync-footer]").exists()).toBe(false);

      mockUser.users = { "hero-1": mockHero };
      await flushPromises();
      expect(mockReplace).toHaveBeenCalledWith("/my-portal/hero-1/my-home");
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

  describe("a kid phone without Pro", () => {
    afterEach(() => {
      mockFamily.phoneState = NO_SHEET_STATE;
    });

    it("a kid phone without Pro shows the board with the Pro line and the guard keeps it there", async () => {
      mockFamily.phoneState = SHEET_STATE;
      const wrapper = await open();

      expect(wrapper.find("[data-cy=hero-phone-board]").exists()).toBe(true);
      expect(wrapper.find("[data-cy=pro-required]").text()).toBe("Playing the whole game on this phone needs XP Pro. Ask your Game Master.");
      expect(wrapper.find("[data-cy=play-button]").exists()).toBe(false);
      // The phone is not a full portal, so the guard sends every other route back to this screen
      expect(handleHeroPhoneGuard({ name: "my-portal" }, mockFamily.isKidMode, mockSync.isFullPortal)).toEqual({ name: "hero-phone" });
    });

    it("says nothing about Pro when the family has it and the site has not refused", async () => {
      mockPro.isPro = true;
      mockSync.isOn = true;
      mockFamily.phoneState = SHEET_STATE;
      const wrapper = await open();
      expect(wrapper.find("[data-cy=hero-phone-board]").exists()).toBe(true);
      expect(wrapper.find("[data-cy=pro-required]").exists()).toBe(false);
    });

    it("says it when the site turns the licence down, whatever this phone holds", async () => {
      mockPro.isPro = true;
      mockSync.problem = "pro-required";
      mockFamily.phoneState = SHEET_STATE;
      const wrapper = await open();
      expect(wrapper.find("[data-cy=pro-required]").exists()).toBe(true);
    });

    it("says nothing on a device that is not a kid phone", async () => {
      mockFamily.isKidMode = false;
      mockFamily.phoneState = SHEET_STATE;
      const wrapper = await open();
      expect(wrapper.find("[data-cy=pro-required]").exists()).toBe(false);
    });
  });

  describe("a full portal: the card and Play", () => {
    const lines = (wrapper: Awaited<ReturnType<typeof open>>) => wrapper.findAll("[data-cy=reveal-line]").map((line) => line.text());
    const playButton = (wrapper: Awaited<ReturnType<typeof open>>) => wrapper.find("[data-cy=play-button]");

    beforeEach(() => {
      mockSync.isOn = true;
      mockSync.isFullPortal = true;
      mockPro.isPro = true;
    });
    afterEach(() => {
      mockFamily.phoneState = NO_SHEET_STATE;
    });

    it("full-portal mode shows Play and hides the board", async () => {
      mockFamily.phoneState = SHEET_STATE;
      const wrapper = await open();

      expect(wrapper.find("[data-cy=hero-card]").exists()).toBe(true);
      expect(playButton(wrapper).text()).toBe("Play");
      expect(wrapper.find("[data-cy=hero-phone-board]").exists()).toBe(false);
      expect(wrapper.find("[data-cy=pro-required]").exists()).toBe(false);
    });

    it("tells a hero with no sheet nothing about quests elsewhere: the portal has the quest book", async () => {
      const wrapper = await open();
      expect(playButton(wrapper).exists()).toBe(true);
      expect(wrapper.find("[data-cy=quests-elsewhere]").exists()).toBe(false);
    });

    it("a cold start on a finished pull shows the card and Play and opens nothing by itself", async () => {
      const wrapper = await open();
      await flushPromises();

      expect(playButton(wrapper).exists()).toBe(true);
      expect(lines(wrapper)).toEqual([]);
      expect(mockSync.signIn).not.toHaveBeenCalled();
      expect(mockUser.loginUser).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("Play signs the hero in and opens the portal", async () => {
      const wrapper = await open();
      await playButton(wrapper).trigger("click");
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
    });

    it("Play on a busy hero shows the busy question, and Play here takes the turn and opens the portal", async () => {
      mockSync.signIn.mockImplementation(async (heroId: string) => {
        mockSync.turns = { [heroId]: { state: "busy", busy: BUSY_ON_IPAD, provisional: false } };
        return "busy";
      });
      const wrapper = await open();
      await playButton(wrapper).trigger("click");
      await flushPromises();

      expect(lines(wrapper)).toEqual(["Mia is still playing on Mia's iPad (last seen a while ago). Play here anyway?"]);
      expect(mockReplace).not.toHaveBeenCalled();

      await wrapper.find("[data-cy=choice-play]").trigger("click");
      await flushPromises();

      expect(mockSync.takeOver).toHaveBeenCalledWith("hero-1");
      expect(mockUser.loginUser).toHaveBeenCalledWith(mockHero);
      expect(mockReplace).toHaveBeenCalledWith("/my-portal/hero-1/my-home");
    });

    it("Not now on the busy question rests the hero and leaves the card with Play", async () => {
      mockSync.signIn.mockImplementation(async (heroId: string) => {
        mockSync.turns = { [heroId]: { state: "busy", busy: BUSY_ON_IPAD, provisional: false } };
        return "busy";
      });
      const wrapper = await open();
      await playButton(wrapper).trigger("click");
      await flushPromises();
      await wrapper.find("[data-cy=choice-later]").trigger("click");
      await flushPromises();

      expect(mockSync.rest).toHaveBeenCalledWith("hero-1");
      expect(mockUser.loginUser).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
      expect(lines(wrapper)).toEqual([]);
      expect(playButton(wrapper).attributes("disabled")).toBeUndefined();
    });

    it("keeps Play from a second tap while the turn is asked for", async () => {
      let grant: (answer: string) => void = () => undefined;
      mockSync.signIn.mockReturnValue(new Promise((resolve) => (grant = resolve)));
      const wrapper = await open();
      await playButton(wrapper).trigger("click");
      await flushPromises();

      expect(playButton(wrapper).attributes("disabled")).toBeDefined();
      await playButton(wrapper).trigger("click");
      expect(mockSync.signIn).toHaveBeenCalledTimes(1);

      grant("granted");
      await flushPromises();
      expect(mockReplace).toHaveBeenCalledTimes(1);
    });

    it("rests the hero when the portal cannot be opened, and Play tries again", async () => {
      mockReplace.mockRejectedValueOnce(new Error("no route"));
      const wrapper = await open();
      await playButton(wrapper).trigger("click");
      await flushPromises();
      expect(mockSync.rest).toHaveBeenCalledWith("hero-1");
      expect(playButton(wrapper).attributes("disabled")).toBeUndefined();

      await playButton(wrapper).trigger("click");
      await flushPromises();
      expect(mockSync.signIn).toHaveBeenCalledTimes(2);
      expect(mockReplace).toHaveBeenLastCalledWith("/my-portal/hero-1/my-home");
    });

    it("a cold start before the hero's profile has loaded keeps Play off until it has, and opens nothing by itself", async () => {
      mockUser.users = {};
      const wrapper = await open();
      expect(wrapper.find("[data-cy=hero-card]").exists()).toBe(true);
      expect(playButton(wrapper).attributes("disabled")).toBeDefined();
      expect(lines(wrapper)).toEqual([]);

      mockUser.users = { "hero-1": mockHero };
      await flushPromises();
      expect(playButton(wrapper).attributes("disabled")).toBeUndefined();
      expect(mockSync.signIn).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("a cold start where the licence loads after the screen opens nothing by itself", async () => {
      mockSync.isOn = false;
      mockSync.isFullPortal = false;
      mockPro.isPro = false;
      const wrapper = await open();
      expect(playButton(wrapper).exists()).toBe(false);

      // The licence is read from the device a moment later: the phone turns into a full portal at once
      mockPro.isPro = true;
      mockSync.isOn = true;
      mockSync.isFullPortal = true;
      await flushPromises();

      expect(playButton(wrapper).exists()).toBe(true);
      expect(lines(wrapper)).toEqual([]);
      expect(mockSync.signIn).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("a pull that finishes while the screen is up still opens the portal by itself", async () => {
      mockSync.isFullPortal = false;
      const wrapper = await open();
      expect(playButton(wrapper).exists()).toBe(false);

      mockSync.isFullPortal = true;
      await flushPromises();
      expect(mockReplace).toHaveBeenCalledWith("/my-portal/hero-1/my-home");
    });

    it("offers no Play on a card that was unlinked", async () => {
      mockFamily.device = { ...mockFamily.device, unlinked: true };
      mockSync.isFullPortal = false;
      const wrapper = await open();
      expect(playButton(wrapper).exists()).toBe(false);
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

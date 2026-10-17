import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Vue3Autocounter from "vue3-autocounter";
import CardUserStats from "@/components/organisms/CardUserStats/CardUserStats.vue";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * The hero's stat card on the quest reward slide. The quest reward slide once mounted it with `:id` and `:hideMenu="true"`, and after a
 * claim its segment watcher calls `beginCounter()` through a template ref to replay the XP and AP count-up.
 * The card reads the hero from the real user store; the only fakes are the browser's storage (the component
 * imports the profile API), the avatar helper the app registers globally and a synchronous animation frame so
 * the counters finish inside the test.
 */

jest.mock("@/lib/api/users.api", () => ({ __esModule: true, default: jest.fn().mockResolvedValue([]) }));

const HERO_ID = "hero-1";

const makeHero = () => ({
  id: HERO_ID,
  name: { full: "Max Power", first: "Max", last: "Power", middle: "", nick: "Max" },
  avatar: "003-gamer",
  jobClass: "warrior",
  stats: {
    level: 3,
    xp: { now: 300, next_level: 900 },
    gp: { wallet: 40, limit: 100 },
    hp: { now: 20, max: 42 },
    mp: { now: 15, max: 30 },
    ap: { total: 4, history: [] as Array<{ amount: number; timestamp: string }> },
  },
});

type CardRef = { beginCounter: () => void };

/** The mount the old quest card used: a host that renders the card with a ref, `hideMenu` on and the hero's `id`. */
const mountLikeQuestHost = async () => {
  setActivePinia(createPinia());
  const store = useUserStore();
  store.users[HERO_ID] = makeHero();

  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { render: () => null } }] });
  await router.push("/");
  await router.isReady();

  const Host = defineComponent({
    render() {
      return h(CardUserStats, { ref: "userCard", hideMenu: true, id: HERO_ID });
    },
  });
  const host = mount(Host, {
    global: {
      plugins: [router],
      components: { "vue3-autocounter": Vue3Autocounter },
      mocks: { $getUserAvatar: () => "avatar.svg" },
    },
  });
  await flushPromises();
  return { host, store, card: () => host.vm.$refs.userCard as unknown as CardRef };
};

describe("CardUserStats on the reward slide", () => {
  let frameClock = 0;

  beforeEach(() => {
    frameClock = 0;
    // Each frame is one second later, so a four second count-up lands in a handful of synchronous frames
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
      frameClock += 1000;
      callback(frameClock);
      return frameClock;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("lets the quest card replay the count-up: beginCounter is on the card's ref and does not throw", async () => {
    const { card } = await mountLikeQuestHost();

    expect(typeof card().beginCounter).toBe("function");
    expect(() => card().beginCounter()).not.toThrow();
  });

  it("shows the hero found by id, with the real HP, MP, wallet and level", async () => {
    const { host } = await mountLikeQuestHost();
    const text = host.text();

    expect(text).toContain("Max");
    expect(text).toContain("20/42");
    expect(text).toContain("15/30");
    expect(text).toContain("¤40");
    expect(text).toContain("¤100");
    expect(text).toContain("Level 3");
  });

  it("keeps the menu buttons away when the host asks for hideMenu", async () => {
    const { host } = await mountLikeQuestHost();

    expect(host.text()).not.toContain("Quest");
    expect(host.text()).not.toContain("Abilities");
  });

  it("counts the XP and AP up to the hero's totals after a claim has paid out", async () => {
    const { host, store, card } = await mountLikeQuestHost();

    // The claim credits the store first; the reward slide then asks the card to replay
    store.users[HERO_ID].stats.xp.now = 350;
    store.users[HERO_ID].stats.ap.total = 9;
    store.users[HERO_ID].stats.ap.history.push({ amount: 5, timestamp: new Date().toISOString() });
    await nextTick();
    card().beginCounter();
    await nextTick();

    expect(host.text()).toContain("350XP");
    expect(host.text()).toContain("9 AP");
    expect(host.text()).toMatch(/350XP\s+\/\s+900/);
    // What the claim earned shows in the AP windows: today, this week, this month, this year
    expect(host.text()).toMatch(/5d\s+5w\s+5m\s+5y/);
  });

  it("stays quiet when the hero is not in the store", async () => {
    const { host, store } = await mountLikeQuestHost();
    delete store.users[HERO_ID];
    await nextTick();

    expect(host.find("ion-card").exists()).toBe(false);
  });
});

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import BattleField from "../BattleField.vue";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * The BattleField page in jsdom, from the beast's intro to the walk home. The page, its composables, BattleService,
 * the user store and Vue Router are all real; only what a browser provides (Ionic's router outlet and alert, the
 * canvas, audio, the bestiary) is replaced.
 */

// The page starts its fight from Ionic's view-enter hook, which only fires inside <ion-router-outlet>:
// capture the page's hooks and fire them by hand. The "Execute Attack?" alert confirms itself when presented.
const mockViewHooks: { didEnter?: () => void; willLeave?: () => void } = {};
jest.mock("@ionic/vue", () => ({
  ...jest.requireActual("@ionic/vue"),
  onIonViewDidEnter: (hook: () => void) => { mockViewHooks.didEnter = hook; },
  onIonViewWillLeave: (hook: () => void) => { mockViewHooks.willLeave = hook; },
  alertController: {
    create: async ({ buttons }: { buttons: { text: string; handler?: () => void }[] }) => ({
      present: async () => buttons.find((button) => button.text === "ATTACK!")?.handler?.(),
    }),
  },
}));

// jsdom has no canvas or audio and the bestiary is empty: stub the arena background, the sound board and the beasts.
jest.mock("@/lib/engine/core/BackgroundManager", () => ({
  backgroundManager: {
    isActiveFor: () => false, initBackground: jest.fn(), cleanupBackground: jest.fn(),
    animateAspectRatio: () => Promise.resolve(), getBackgroundSettings: () => ({ isActive: false }),
  },
}));
jest.mock("@/assets/fx", () => ({
  __esModule: true,
  default: { rpg: { earthbound: { BGM: { battle: [], win: [], winboss: [] } } } },
  play$fx: jest.fn(),
}));
jest.mock("@/lib/services/battle/BestiaryService", () => {
  const socktopus = () => ({
    id: "b1", name: "Socktopus", type: "beast", isBoss: false, health: 100, maxHealth: 100,
    attack: 10, defense: 5, speed: 8, emoji: "🐙",
    tasks: ["Sort socks", "Match pairs"].map((name, index) => ({ id: `t${index + 1}`, name, isCompleted: false })),
  });
  return {
    BestiaryService: class {
      getAvatar = () => "";
      loadRandomBeast = async () => socktopus();
      loadBeastById = async () => socktopus();
      createSampleEnemy = socktopus;
    },
  };
});

// Mounting the whole Ionic page is slow on a cold or busy machine.
jest.setTimeout(30000);

const INTRO = "From the dark forces of chaos comes Socktopus!!!";
const blank = defineComponent({ render: () => null });
const routePaths: Record<string, string> = {
  "battle-quest": "/battle/:userId/quest/:questId",
  "battle-temple": "/battle/:userId/temple/:templeId/:level/:x/:y",
  "battle-free": "/battle/:userId/free/:beastIds?",
  "my-tasks": "/tasks/:userId",
  temple: "/temple/:temple/:userId/:x/:y",
  "home-town": "/home-town/:userId",
  "game-over": "/game-over",
};
// What the page hands its template; the SFC shim types the instance as an empty component.
type BattleVm = { dialogText: string; advanceDialog: () => void };

describe("BattleField: a free fight", () => {
  let mounted: ReturnType<typeof mount> | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    mockViewHooks.didEnter = undefined;
    mockViewHooks.willLeave = undefined;
  });
  afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
    jest.useRealTimers();
  });

  /** Seeds the hero, mounts the page on a battle route and fires Ionic's view-enter like the router outlet would. */
  const enterBattle = async (path: string) => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const userStore = useUserStore();
    userStore.addUser({
      id: "hero-1", name: { nick: "Max" }, jobClass: "warrior",
      stats: {
        level: 1, xp: { now: 0, next_level: 283 }, hp: { now: 30, max: 30 }, mp: { now: 10, max: 10 },
        gp: { wallet: 0, savings: 0, debt: 0, limit: 1000 },
      },
    });
    const routes = Object.entries(routePaths).map(([name, path]) => ({ name, path, component: blank }));
    const router = createRouter({ history: createMemoryHistory(), routes });
    await router.push(path);
    await router.isReady();

    // The HUD re-reads the profile database on mount, which is empty in jsdom and would drop the seeded hero.
    const wrapper = mount(BattleField, { global: { plugins: [pinia, router], stubs: { XpHpMpHud: true } } });
    mounted = wrapper;
    const vm = wrapper.vm as unknown as BattleVm;
    expect(wrapper.find(".battle-dialog").exists()).toBe(false); // nothing starts until the view is entered
    expect(mockViewHooks.didEnter).toBeDefined();
    mockViewHooks.didEnter?.();
    await flushPromises();
    /** One tap on the message box: finishes the typing, or moves on to the next line. */
    const tap = async () => {
      vm.advanceDialog();
      await flushPromises();
    };
    return { wrapper, router, userStore, vm, tap };
  };

  it("opens on the beast, takes two chores to win and walks the hero home with the loot", async () => {
    const { wrapper, router, userStore, vm, tap } = await enterBattle("/battle/hero-1/free/");
    const chores = () => wrapper.find(".enemy-progress-bar.hp").text();
    const clock = () => wrapper.find(".enemy-progress-bar.attack-timer .progress-label");

    // Intro: the beast announces itself. One tap finishes the typing, the next closes the box and starts the clock.
    expect(vm.dialogText).toBe(INTRO);
    expect(wrapper.find(".enemy-name").text()).toBe("Socktopus");
    expect(wrapper.find(".battle-dialog").text()).not.toContain(INTRO);
    expect(wrapper.findAll(".menu-item")).toHaveLength(0);
    expect(clock().exists()).toBe(false);
    await tap();
    expect(wrapper.find(".battle-dialog").text()).toContain(INTRO);
    await tap();
    expect(wrapper.findAll(".menu-item").map((button) => button.text())).toEqual(["Attack", "Defend", "Run Away"]);
    expect(chores()).toBe("2 chores left");
    expect(clock().text()).toBe("2:00");

    // Attack lists the beast's chores as the hero's moves; picking one deals half the beast's health.
    const attackWith = async (chore: string) => {
      await wrapper.findAll(".menu-item")[0].trigger("click");
      expect(wrapper.findAll(".task-name").map((name) => name.text())).toEqual(["Sort socks", "Match pairs"]);
      await wrapper.findAll(".battle-task-item").find((item) => item.text().includes(chore))?.trigger("click");
      await flushPromises();
      expect(wrapper.find(".xp-battle-task-menu").exists()).toBe(false);
    };
    await attackWith("Sort socks");
    expect(chores()).toBe("1 chore left");
    expect(clock().text()).toBe("1:00"); // every chore earns a fresh clock
    for (let taps = 0; taps < 10 && !wrapper.find(".menu-item").exists(); taps++) await tap(); // read the messages
    await attackWith("Match pairs");

    // The last blow pays out at once, before any victory text is read.
    expect(userStore.users["hero-1"].stats).toMatchObject({
      xp: { now: 50 }, gp: { wallet: 25 }, ap: { total: 1 }, classes: { warrior: { xp: 50 } },
    });

    // The victory sequence waits a second and collapses the arena, then its lines end on the way home.
    jest.advanceTimersByTime(1000);
    await flushPromises();
    const lines: string[] = [];
    for (let taps = 0; taps < 60 && router.currentRoute.value.name !== "home-town"; taps++) {
      if (vm.dialogText && vm.dialogText !== lines[lines.length - 1]) lines.push(vm.dialogText);
      await tap();
    }
    expect(lines.slice(-5)).toEqual([
      "You Won!", "Socktopus was defeated!", "25 GP added to your wallet!", "You gained 50 XP!", "You earned 1 AP!",
    ]);
    expect(router.currentRoute.value).toMatchObject({ name: "home-town", params: { userId: "hero-1" } });
  });

  it("stops the beast's clock when the hero leaves the page mid-fight", async () => {
    const { vm, tap } = await enterBattle("/battle/hero-1/free/");
    await tap();
    await tap(); // intro read: the two-minute clock is running
    mockViewHooks.willLeave?.();
    jest.advanceTimersByTime(3 * 60 * 1000);
    await flushPromises();
    expect(vm.dialogText).toBe(""); // the beast never got its turn
  });
});

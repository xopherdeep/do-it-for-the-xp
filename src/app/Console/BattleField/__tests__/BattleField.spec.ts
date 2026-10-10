import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import BattleField from "../BattleField.vue";
import { VICTORY_TIMINGS } from "../composables/useBattleOutcome";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * The BattleField page in jsdom, from the beast's intro to the walk home. The page, its components, composables,
 * BattleService, the user store and Vue Router are all real; only what a browser provides (Ionic's router outlet,
 * the canvas, audio, haptics, the bestiary) is replaced.
 */

// The page starts its fight from Ionic's view-enter hook, which only fires inside <ion-router-outlet>:
// capture the page's hooks and fire them by hand.
const mockViewHooks: { didEnter?: () => void; willLeave?: () => void } = {};
jest.mock("@ionic/vue", () => ({
  ...jest.requireActual("@ionic/vue"),
  onIonViewDidEnter: (hook: () => void) => { mockViewHooks.didEnter = hook; },
  onIonViewWillLeave: (hook: () => void) => { mockViewHooks.willLeave = hook; },
  useBackButton: jest.fn(),
}));

// jsdom has no canvas, audio, vibration motor or bestiary: stub the arena background, the sound board, haptics and the beasts.
jest.mock("@/lib/engine/core/BackgroundManager", () => ({
  backgroundManager: {
    isActiveFor: () => false, initBackground: jest.fn(), cleanupBackground: jest.fn(),
    animateAspectRatio: () => Promise.resolve(), getBackgroundSettings: () => ({ isActive: false }),
  },
}));
const mockPlaySound = jest.fn();
jest.mock("@/assets/fx", () => ({
  __esModule: true,
  default: { rpg: { earthbound: { BGM: { battle: [], win: [], winboss: [] } } } },
  play$fx: (...args: unknown[]) => mockPlaySound(...args),
}));
jest.mock("@capacitor/haptics", () => ({
  Haptics: { impact: jest.fn().mockResolvedValue(undefined), notification: jest.fn().mockResolvedValue(undefined) },
  ImpactStyle: { Heavy: "HEAVY", Medium: "MEDIUM", Light: "LIGHT" },
  NotificationType: { Success: "SUCCESS" },
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
const SHEET_LEAVE_MS = 260;
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
    mockPlaySound.mockClear();
    localStorage.clear();
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

    const wrapper = mount(BattleField, { global: { plugins: [pinia, router] } });
    mounted = wrapper;
    const vm = wrapper.vm as unknown as BattleVm;
    expect(vm.dialogText).toBe(""); // nothing starts until the view is entered
    expect(wrapper.find(".menu-item").exists()).toBe(false);
    expect(mockViewHooks.didEnter).toBeDefined();
    mockViewHooks.didEnter?.();
    await flushPromises();
    /** One tap on the message box: finishes the typing, or moves on to the next line. */
    const tap = async () => {
      vm.advanceDialog();
      await flushPromises();
    };
    /** Reads whatever is on screen until the command menu is back. */
    const readUntilMenu = async () => {
      for (let taps = 0; taps < 12 && !wrapper.find(".menu-item").exists(); taps++) await tap();
      expect(wrapper.find(".menu-item").exists()).toBe(true);
    };
    /** Attack: open the sheet, pick a chore, confirm it, let the sheet slide away and the blow land. */
    const attackWith = async (chore: string) => {
      await wrapper.find("#attack").trigger("click");
      expect(wrapper.find("[data-cy=task-sheet]").exists()).toBe(true);
      const row = wrapper.findAll(".battle-task-item").find((item) => item.text().includes(chore));
      expect(row).toBeDefined();
      await row?.trigger("click");
      expect(row?.classes()).toContain("is-selected");
      jest.advanceTimersByTime(300); // the double-tap guard on Done!
      await wrapper.find("[data-cy=task-confirm]").trigger("click");
      await flushPromises();
      expect(wrapper.find("[data-cy=task-sheet]").exists()).toBe(false);
      jest.advanceTimersByTime(SHEET_LEAVE_MS);
      await flushPromises();
    };
    return { wrapper, router, userStore, vm, tap, readUntilMenu, attackWith };
  };

  it("opens on the beast, takes two chores to win and walks the hero home with the loot", async () => {
    const { wrapper, router, userStore, vm, tap, attackWith } = await enterBattle("/battle/hero-1/free/");
    const chores = () => wrapper.find(".chores-left-label").text();
    const clock = () => wrapper.find(".attack-timer-label");

    // Intro: the beast announces itself. One tap finishes the typing, the next closes the box and starts the clock.
    expect(vm.dialogText).toBe(INTRO);
    expect(wrapper.find(".enemy-name").text()).toBe("Socktopus");
    expect(wrapper.find("[data-cy=hero-card]").text()).toContain("Max");
    expect(wrapper.findAll(".menu-item")).toHaveLength(0);
    expect(clock().exists()).toBe(false);
    await tap();
    expect(wrapper.find("[data-cy=battle-dialog]").text()).toContain(INTRO);
    expect(vm.dialogText).toBe(INTRO); // still on screen: the atom's own click no longer dismisses it
    await tap();
    expect(wrapper.findAll(".menu-item").map((button) => button.text())).toEqual(["Attack", "Defend", "Item", "Run Away"]);
    expect(wrapper.find(".dialog-prompt").text()).toBe("Do its chores to win!");
    expect(chores()).toBe("2 chores left");
    expect(clock().text()).toBe("6:00"); // three minutes a chore
    expect(wrapper.find("ion-alert").exists()).toBe(false);

    // Attack lists the beast's chores as the hero's moves; confirming one deals half the beast's health.
    await attackWith("Sort socks");
    expect(wrapper.find(".damage-popup").text()).toBe("-50");
    expect(mockPlaySound).toHaveBeenCalledWith("attack");
    expect(mockPlaySound).toHaveBeenCalledWith("enemyDamage");
    expect(chores()).toBe("1 chore left");
    expect(clock().text()).toBe("3:00"); // every chore earns a fresh clock
    expect(vm.dialogText).toBe("Max used Sort socks! Socktopus took 50 damage!");
    await tap(); // finish typing: the result line moves on by itself
    jest.advanceTimersByTime(2000);
    await flushPromises();
    expect(wrapper.find(".menu-item").exists()).toBe(true);
    expect(wrapper.find(".dialog-prompt").exists()).toBe(false); // the hint is gone after the first chore

    // The last blow pays out at once, before any celebration: a free fight is worth AP only.
    await attackWith("Match pairs");
    expect(wrapper.find(".damage-popup").text()).toBe("SMAAAASH!!");
    expect(userStore.users["hero-1"].stats).toMatchObject({ xp: { now: 0 }, gp: { wallet: 0 }, ap: { total: 1 } });
    expect(mockPlaySound).toHaveBeenCalledWith("enemyDie");

    // Strobe, collapse, fade, fanfare, then the card counts the loot and waits for a tap.
    // Each beat is awaited before the next timer is set, so advance them one at a time
    for (const beat of [VICTORY_TIMINGS.strobe, VICTORY_TIMINGS.collapse, VICTORY_TIMINGS.fade]) {
      jest.advanceTimersByTime(beat + 10);
      await flushPromises();
    }
    await nextTick();
    expect(wrapper.find("[data-cy=victory-card]").exists()).toBe(true);
    expect(mockPlaySound).toHaveBeenCalledWith("win");
    jest.advanceTimersByTime(1500);
    await flushPromises();
    expect(wrapper.find(".reward-value[data-stat=ap]").text()).toBe("1");
    expect(wrapper.find(".reward-value[data-stat=xp]").text()).toBe("0");
    expect(wrapper.find(".victory-work").text()).toContain("2 chores in");
    await wrapper.find("[data-cy=victory-card]").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value).toMatchObject({ name: "home-town", params: { userId: "hero-1" } });
  });

  it("lets the beast strike when the clock runs out, lands the hit on dismiss, and gives the turn back", async () => {
    const { wrapper, userStore, vm, tap, readUntilMenu } = await enterBattle("/battle/hero-1/free/");
    jest.spyOn(Math, "random").mockReturnValue(0.5);
    await tap();
    await tap(); // intro read: the six-minute clock is running
    jest.advanceTimersByTime(6 * 60 * 1000 + 200);
    await flushPromises();
    expect(vm.dialogText).toBe("Socktopus attacks!");
    expect(mockPlaySound).toHaveBeenCalledWith("preAttack");
    expect(wrapper.find(".menu-item").exists()).toBe(false);

    await tap(); // finish typing
    await tap(); // dismiss: the hit lands now
    expect(userStore.users["hero-1"].stats.hp.now).toBe(26); // ~12% of 30 at a middling roll
    expect(vm.dialogText).toBe("Max takes 4 damage!");
    expect(mockPlaySound).toHaveBeenCalledWith("damage");
    expect(wrapper.find(".battle-ui-container").classes()).toContain("screen-shake");
    await readUntilMenu();
    expect(vm.dialogText).toBe(""); // no "Turn 2" chatter
    expect(wrapper.find(".attack-timer-label").text()).toBe("6:00"); // a fresh clock
    (Math.random as jest.Mock).mockRestore();
  });

  it("asks before running away, and Defend trades a glancing hit for a fresh clock", async () => {
    const { wrapper, userStore, vm, tap, readUntilMenu } = await enterBattle("/battle/hero-1/free/");
    await tap();
    await tap();

    await wrapper.find("#run-away").trigger("click");
    expect(wrapper.find(".dialog-prompt").text()).toBe("Run away? Your finished chores won't count.");
    expect(wrapper.findAll(".menu-item").map((button) => button.text())).toEqual(["Keep fighting", "Run"]);
    await wrapper.find("#keep-fighting").trigger("click");
    expect(wrapper.findAll(".menu-item").map((button) => button.text())).toEqual(["Attack", "Defend", "Item", "Run Away"]);

    jest.spyOn(Math, "random").mockReturnValue(0.5);
    await wrapper.find("#defend").trigger("click");
    expect(vm.dialogText).toBe("Max braces!");
    await tap();
    jest.advanceTimersByTime(1000);
    await flushPromises();
    for (let taps = 0; taps < 4 && vm.dialogText !== "Socktopus attacks!"; taps++) await tap();
    expect(vm.dialogText).toBe("Socktopus attacks!");
    await tap();
    await tap();
    expect(userStore.users["hero-1"].stats.hp.now).toBe(28); // half a strike
    expect(vm.dialogText).toBe("Max braced: only 2 damage!");
    await readUntilMenu();
    expect(wrapper.find(".attack-timer-label").text()).toBe("6:00");
    (Math.random as jest.Mock).mockRestore();
  });

  it("Item shows the hands; the Ice Wand buys ten minutes and the Silver Arrow sends a chore back unfinished", async () => {
    const { wrapper, userStore, vm, tap, readUntilMenu } = await enterBattle("/battle/hero-1/free/");
    const hero = userStore.users["hero-1"];
    hero.stats.mp = { now: 120, max: 120 };
    userStore.setEquipment("hero-1", {
      leftHand: [{ name: "Ice Wand", faIcon: "wand-magic ice", desc: "50MP | Freeze distractions in their tracks." }],
      rightHand: [{ name: "Silver Arrow", faIcon: "bow-arrow", desc: "25MP | A precise magical arrow." }],
    });
    await tap();
    await tap(); // intro read: the clock is running
    expect(wrapper.find(".attack-timer-label").text()).toBe("6:00");

    // The Item sheet lists both hands with their MP and what they do here
    await wrapper.find("#item").trigger("click");
    const sheet = wrapper.find("[data-cy=item-sheet]");
    expect(sheet.exists()).toBe(true);
    expect(sheet.findAll(".item-name").map((name) => name.text())).toEqual(["Ice Wand", "Silver Arrow"]);
    expect(sheet.findAll(".item-mp").map((mp) => mp.text())).toEqual(["50 MP", "25 MP"]);
    expect(sheet.find("[data-cy=item-left] .item-effect").text()).toBe("+10 minutes on the clock");
    expect(wrapper.find(".menu-item").exists()).toBe(false);

    // Ice Wand: MP spent, one line, the clock is longer, and the hero keeps the move
    await wrapper.find("[data-cy=item-left]").trigger("click");
    await flushPromises();
    expect(wrapper.find("[data-cy=item-sheet]").exists()).toBe(false);
    expect(hero.stats.mp.now).toBe(70);
    expect(vm.dialogText).toBe("Ice creeps over the clock: +10 minutes!");
    expect(wrapper.find(".attack-timer-label").text()).toBe("16:00");
    expect(mockPlaySound).toHaveBeenCalledWith("select");
    await readUntilMenu();
    expect(wrapper.findAll(".menu-item").map((button) => button.text())).toEqual(["Attack", "Defend", "Item", "Run Away"]);

    // Silver Arrow: the task list opens to pick the chore, which flies back to the board unfinished
    await wrapper.find("#item").trigger("click");
    await wrapper.find("[data-cy=item-right]").trigger("click");
    await flushPromises();
    expect(wrapper.find("[data-cy=item-sheet]").exists()).toBe(false);
    const picker = wrapper.find("[data-cy=task-sheet]");
    expect(picker.exists()).toBe(true);
    expect(picker.find(".sheet-title").text()).toBe("Silver Arrow");
    const row = wrapper.findAll(".battle-task-item").find((item) => item.text().includes("Sort socks"));
    await row?.trigger("click");
    expect(picker.find(".confirm-question").text()).toBe("Send it back? It stays unfinished.");
    jest.advanceTimersByTime(300);
    await wrapper.find("[data-cy=task-confirm]").trigger("click");
    await flushPromises();

    expect(wrapper.find("[data-cy=task-sheet]").exists()).toBe(false);
    expect(vm.dialogText).toBe("The chore flies back to the board.");
    expect(hero.stats.mp.now).toBe(45);
    expect(wrapper.find(".chores-left-label").text()).toBe("1 chore left");
    expect(wrapper.find(".damage-popup").exists()).toBe(false); // not an attack
    // Nothing was completed, so no chore is remembered as done for today
    const progressKeys = Object.keys(localStorage).filter((key) => key.startsWith("xp_battle_progress:"));
    expect(progressKeys).toEqual([]);
    await readUntilMenu();
    await wrapper.find("#attack").trigger("click");
    expect(wrapper.findAll(".battle-task-item").map((item) => item.text())).toEqual(["Match pairs"]);
  });

  it("stops the beast's clock when the hero leaves the page mid-fight", async () => {
    const { vm, tap } = await enterBattle("/battle/hero-1/free/");
    await tap();
    await tap(); // intro read: the clock is running
    mockViewHooks.willLeave?.();
    jest.advanceTimersByTime(10 * 60 * 1000);
    await flushPromises();
    expect(vm.dialogText).toBe(""); // the beast never got its turn
  });
});

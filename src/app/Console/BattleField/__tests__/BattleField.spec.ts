import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import BattleField from "../BattleField.vue";
import { ESCAPE_FADE_MS, VICTORY_TIMINGS } from "../composables/useBattleOutcome";
import { battleProgressKey } from "../battle/battleProgress";
import { useUserStore } from "@/lib/store/stores/user";
import { createCustomAbility } from "@/lib/services/abilities/AbilityPresets";
import { AbilityType, TimePeriod, type Ability } from "@/hooks/abilities/abilityConstants";
import type { BattleItemCard } from "@/lib/services/battle/BattleItems";

/**
 * The BattleField page in jsdom, from the beast's intro to the walk home. The page, its components, composables,
 * BattleService, the user store and Vue Router are all real; only what a browser provides (Ionic's router outlet,
 * the canvas, audio, haptics, the bestiary) is replaced.
 */

// The page starts its fight from Ionic's view-enter hook, which only fires inside <ion-router-outlet>:
// capture the page's hooks (and its hardware-back handler) and fire them by hand.
type BackHandler = (next: () => void) => void;
const mockViewHooks: { didEnter?: () => void; willLeave?: () => void; back?: BackHandler } = {};
jest.mock("@ionic/vue", () => ({
  ...jest.requireActual("@ionic/vue"),
  onIonViewDidEnter: (hook: () => void) => { mockViewHooks.didEnter = hook; },
  onIonViewWillLeave: (hook: () => void) => { mockViewHooks.willLeave = hook; },
  useBackButton: (_priority: number, handler: BackHandler) => { mockViewHooks.back = handler; },
}));

// The Game Master's Powers come from the abilities database: the fight reads whatever this list holds.
const mockAbilities: Ability[] = [];
jest.mock("@/lib/services/abilities/AbilityService", () => ({
  ...jest.requireActual("@/lib/services/abilities/AbilityService"),
  getAbilityService: () => ({ getAllAbilities: async () => mockAbilities }),
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

// A test can hand the page the encounter a quest room loads (its quest and room); otherwise the real loader runs.
let mockEncounter: unknown = null;
jest.mock("../battle/encounterLoader", () => {
  const actual = jest.requireActual("../battle/encounterLoader");
  return {
    ...actual,
    loadEncounter: (...args: unknown[]) => (mockEncounter ? Promise.resolve(mockEncounter) : actual.loadEncounter(...args)),
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
type BagItem = { name: string; faIcon: string; desc: string };

/** Bag items as the Equipment grid hands them over (the catalogue entries). */
const ICE_WAND: BagItem = { name: "Ice Wand", faIcon: "wand-magic ice", desc: "50MP | Freeze distractions in their tracks." };
const SILVER_ARROW: BagItem = { name: "Silver Arrow", faIcon: "bow-arrow", desc: "25MP | A precise magical arrow." };
const CHRONOS_CLOCK: BagItem = { name: "Chronos' Clock", faIcon: "flux-capacitor", desc: "100MP | Manipulate time itself!" };
const BOTTLES: BagItem = { name: "Bottles", faIcon: "flask-potion", desc: "Your potions." };
const BOOK_OF_SPELLS: BagItem = { name: "Book Of Spells", faIcon: "book-spells", desc: "Your Powers." };
const X_INVISIBILITY: BagItem = { name: "X's Invisibility", faIcon: "hat-wizard", desc: "15MP | Slip away unseen." };
const TESLAS_BOLT: BagItem = { name: "Tesla's Bolt", faIcon: "bolt", desc: "5MP | Chores give back double MP." };
const NIGHTS_LIGHT: BagItem = { name: "Night's Light", faIcon: "moon-stars", desc: "10MP | Each chore heals." };

/** What a quest room's loader hands the page: the Socktopus, carrying the Sock Duty quest. */
const questEncounter = () => ({
  enemies: [
    {
      id: "b1", name: "Socktopus", type: "beast", isBoss: false, health: 100, maxHealth: 100,
      attack: 10, defense: 5, speed: 8, attackCooldown: 3,
      tasks: ["Sort socks", "Match pairs"].map((name, index) => ({ id: `t${index + 1}`, name, isCompleted: false })),
    },
  ],
  rewards: { xp: 100, gp: 10, ap: 1 },
  quest: { id: "q-socks", achievementName: "Sock Duty" },
  roomKey: "Q0001",
  label: "Socktopus",
});
const QUEST_ROOM = "/battle/hero-1/temple/shadow-temple/1F/0/1";

/** An unlocked in-game Power (no AP asked) with a fight effect by preset name: Stop freezes, Rewind refills the clock. */
const power = (name: string, mpCost: number): Ability =>
  createCustomAbility({
    id: `power-${name.toLowerCase()}`,
    name,
    type: AbilityType.InGame,
    mpCost,
    apRequirement: { amount: 0, period: TimePeriod.Daily },
  });

describe("BattleField: a free fight", () => {
  let mounted: ReturnType<typeof mount> | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    mockPlaySound.mockClear();
    localStorage.clear();
    // These fights drive the retro battle layout; Modern is the default skin now.
    localStorage.setItem("fabStyle", "retro");
    mockViewHooks.didEnter = undefined;
    mockViewHooks.willLeave = undefined;
    mockViewHooks.back = undefined;
    mockAbilities.splice(0, mockAbilities.length, power("Stop", 25), power("Rewind", 20));
  });
  afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
    mockEncounter = null;
    jest.useRealTimers();
  });

  /**
   * Seeds the hero, mounts the page on a battle route, puts these tools in the hands and fires Ionic's view-enter like
   * the router outlet would. The hands go on after the mount: the page reads them when the fight begins, so a cached
   * page never fights with the hands it had last time.
   */
  const enterBattle = async (path: string, hands: { leftHand: BagItem[]; rightHand: BagItem[] } = { leftHand: [], rightHand: [] }) => {
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

    // The bag is an ion-modal; the stub keeps its props and lets the test emit what the grid would
    const wrapper = mount(BattleField, { global: { plugins: [pinia, router], stubs: { XpEquipmentModal: true, XpInventoryModal: true } } });
    mounted = wrapper;
    const vm = wrapper.vm as unknown as BattleVm;
    expect(vm.dialogText).toBe(""); // nothing starts until the view is entered
    expect(wrapper.find(".menu-item").exists()).toBe(false);
    expect(mockViewHooks.didEnter).toBeDefined();
    userStore.setEquipment("hero-1", hands);
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
    /** The Goods bag, and what the page answers for one of its tiles. */
    const bag = () => {
      const inv = wrapper.findComponent({ name: "xp-inventory-modal" });
      return inv.exists() ? inv : wrapper.findComponent({ name: "xp-equipment-modal" });
    };
    const bagOpen = () => bag().props("isOpen") as boolean;
    const bagCard = (item: BagItem) => (bag().props("battleCard") as (item: BagItem) => BattleItemCard | null)(item);
    /** A tile tapped in the bag: Use on an item's card, or a container (Bottles, Book Of Spells) straight away. */
    const useFromBag = async (item: BagItem) => {
      bag().vm.$emit("use-item", item);
      await flushPromises();
    };
    /** Powers: open the sheet and press Cast on one card. */
    const castPower = async (name: string) => {
      await wrapper.find("#powers").trigger("click");
      expect(wrapper.find("[data-cy=powers-sheet]").exists()).toBe(true);
      await wrapper.find(`[data-ability-id=power-${name.toLowerCase()}] .cast-btn`).trigger("click");
      await flushPromises();
      expect(wrapper.find("[data-cy=powers-sheet]").exists()).toBe(false);
    };
    /** Lets the beast's six-minute clock run out: it winds up and the strike waits for a tap. */
    const letTheBeastStrike = async () => {
      jest.advanceTimersByTime(6 * 60 * 1000 + 200);
      await flushPromises();
      expect(vm.dialogText).toBe("Socktopus attacks!");
    };
    /** The command labels; a row's note (what the command can do) sits under its label and has its own helper. */
    const menu = () => wrapper.findAll(".menu-item .item-label").map((label) => label.text());
    const menuNotes = () =>
      Object.fromEntries(
        wrapper.findAll(".menu-item").map((row) => [row.attributes("id"), row.find(".item-note").exists() ? row.find(".item-note").text() : undefined])
      );
    const isDimmed = (id: string) => wrapper.find(`#${id}`).attributes("disabled") !== undefined;
    return {
      wrapper, router, userStore, vm, tap, readUntilMenu, attackWith,
      bag, bagOpen, bagCard, useFromBag, castPower, letTheBeastStrike, menu, menuNotes, isDimmed,
    };
  };

  it("opens on the beast, takes two chores to win and walks the hero home with the loot", async () => {
    const { wrapper, router, userStore, vm, tap, attackWith, menu } = await enterBattle("/battle/hero-1/free/");
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
    expect(menu()).toEqual(["Tackle", "Defend", "Powers", "Goods", "Run Away"]);
    expect(wrapper.find("#attack i").classes()).toContain("fa-axe"); // the warrior tackles with an axe
    expect(wrapper.find(".dialog-prompt").text()).toBe("Do its chores to win!");
    expect(chores()).toBe("2 tasks left");
    expect(clock().text()).toBe("6:00"); // three minutes a chore
    expect(wrapper.find("ion-alert").exists()).toBe(false);

    // Attack lists the beast's chores as the hero's moves; confirming one deals half the beast's health.
    await attackWith("Sort socks");
    expect(wrapper.find(".damage-popup").text()).toBe("-50");
    expect(mockPlaySound).toHaveBeenCalledWith("attack");
    expect(mockPlaySound).toHaveBeenCalledWith("enemyDamage");
    expect(chores()).toBe("1 task left");
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
    mockPlaySound.mockClear();
    jest.advanceTimersByTime(1500);
    await flushPromises();
    // The card counts silently; the page rolls the points sound while it counts and chimes as AP lands (XP and GP are 0)
    expect(mockPlaySound.mock.calls).toEqual([["fillPoints"], ["select"], ["fillPoints", { stop: true }]]);
    expect(wrapper.find(".reward-value[data-stat=ap]").text()).toBe("1");
    expect(wrapper.find(".reward-value[data-stat=xp]").text()).toBe("0");
    expect(wrapper.find(".victory-work").text()).toContain("2 chores in");
    await wrapper.find("[data-cy=victory-card]").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value).toMatchObject({ name: "home-town", params: { userId: "hero-1" } });
  });

  it("a quest room's fight keeps the chores already ticked off in the quest's board fight: the beast is still hurt", async () => {
    // The hero ticked "Sort socks" off in the quest's board fight earlier today, then ran
    localStorage.setItem(
      battleProgressKey({ kind: "quest", userId: "hero-1", questId: "q-socks", beastIds: [] }),
      JSON.stringify(["t1"])
    );
    mockEncounter = {
      enemies: [
        {
          id: "b1", name: "Socktopus", type: "beast", isBoss: false, health: 100, maxHealth: 100,
          attack: 10, defense: 5, speed: 8, attackCooldown: 3,
          tasks: ["Sort socks", "Match pairs"].map((name, index) => ({ id: `t${index + 1}`, name, isCompleted: false })),
        },
      ],
      rewards: { xp: 100, gp: 10, ap: 1 },
      quest: { id: "q-socks", achievementName: "Sock Duty" },
      roomKey: "Q0001",
      label: "Socktopus",
    };
    const { wrapper, vm, tap } = await enterBattle("/battle/hero-1/temple/shadow-temple/1F/0/1");

    expect(vm.dialogText).toBe(INTRO);
    await tap();
    await tap();
    expect(vm.dialogText).toBe("Socktopus is still hurt from earlier!");
    await tap();
    await tap();
    expect(wrapper.find(".chores-left-label").text()).toBe("1 task left");
    expect(wrapper.find(".attack-timer-label").text()).toBe("3:00"); // one chore's share of the quest's clock
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

  it("starts the clock on its own when nobody taps through the intro", async () => {
    const { wrapper, vm } = await enterBattle("/battle/hero-1/free/");
    expect(vm.dialogText).toBe(INTRO);
    for (let beat = 0; beat < 20 && !wrapper.find(".menu-item").exists(); beat++) {
      jest.advanceTimersByTime(500);
      await flushPromises();
    }
    expect(vm.dialogText).toBe("");
    expect(wrapper.find(".menu-item").exists()).toBe(true);
    expect(wrapper.find(".attack-timer-label").exists()).toBe(true);
  });

  it("lands the strike on its own when nobody taps: waiting out the message box never holds the hit back", async () => {
    const { wrapper, userStore, vm, tap } = await enterBattle("/battle/hero-1/free/");
    jest.spyOn(Math, "random").mockReturnValue(0.5);
    await tap();
    await tap();
    jest.advanceTimersByTime(6 * 60 * 1000 + 200);
    await flushPromises();
    expect(vm.dialogText).toBe("Socktopus attacks!");

    // No taps: the line types, lingers long enough to read, and the hit lands
    for (let beat = 0; beat < 10 && vm.dialogText !== "Max takes 4 damage!"; beat++) {
      jest.advanceTimersByTime(500);
      await flushPromises();
    }
    expect(userStore.users["hero-1"].stats.hp.now).toBe(26);
    expect(vm.dialogText).toBe("Max takes 4 damage!");

    // The damage line moves on too and the hero gets the menu and a fresh clock back
    for (let beat = 0; beat < 10 && vm.dialogText; beat++) {
      jest.advanceTimersByTime(500);
      await flushPromises();
    }
    expect(vm.dialogText).toBe("");
    expect(wrapper.find(".menu-item").exists()).toBe(true);
    // A fresh clock from the moment the hit landed, already ticking while the damage line was read
    expect(wrapper.find(".attack-timer-label").text()).toMatch(/^5:5\d$/);
    (Math.random as jest.Mock).mockRestore();
  });

  it("asks before running away, and Defend trades a glancing hit for a fresh clock", async () => {
    const { wrapper, userStore, vm, tap, readUntilMenu, menu } = await enterBattle("/battle/hero-1/free/");
    await tap();
    await tap();

    await wrapper.find("#run-away").trigger("click");
    expect(wrapper.find(".dialog-prompt").text()).toBe("Run away? Your finished chores won't count.");
    expect(wrapper.findAll(".menu-item").map((button) => button.text())).toEqual(["Keep fighting", "Run"]);
    // Each answer is a full-width row, so a long label never has to share a narrow column
    const spansBothColumns = wrapper.findAll(".menu-item-col").map((col) => col.attributes("style") ?? "");
    expect(spansBothColumns).toHaveLength(2);
    spansBothColumns.forEach((style) => expect(style).toContain("grid-column: 1 / -1"));
    await wrapper.find("#keep-fighting").trigger("click");
    expect(menu()).toEqual(["Tackle", "Defend", "Powers", "Goods", "Run Away"]);

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
    expect(userStore.users["hero-1"].stats.hp.now).toBe(29); // warrior wall lets 25% through
    expect(vm.dialogText).toBe("Max braced: only 1 damage!");
    await readUntilMenu();
    expect(wrapper.find(".attack-timer-label").text()).toBe("6:00");
    (Math.random as jest.Mock).mockRestore();
  });

  it("Run Away from a free fight takes nothing: the getaway, the fade, and the hero is home at full HP", async () => {
    const { wrapper, router, userStore, vm, tap } = await enterBattle("/battle/hero-1/free/");
    await tap();
    await tap();

    await wrapper.find("#run-away").trigger("click");
    await wrapper.find("#run").trigger("click");
    const said: string[] = [vm.dialogText];
    for (let taps = 0; taps < 6 && router.currentRoute.value.name !== "home-town"; taps++) {
      await tap();
      said.push(vm.dialogText);
      jest.advanceTimersByTime(ESCAPE_FADE_MS + 50);
      await flushPromises();
    }

    expect(said.join("|")).toContain("Got away safely!");
    expect(said.join("|")).not.toMatch(/strikes as Max flees/);
    expect(userStore.users["hero-1"].stats.hp.now).toBe(30);
    expect(router.currentRoute.value).toMatchObject({ name: "home-town", params: { userId: "hero-1" } });
  });

  it("Run Away from a quest fight always works and costs one parting strike on the way out", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.5);
    mockEncounter = {
      enemies: [
        {
          id: "b1", name: "Socktopus", type: "beast", isBoss: true, health: 100, maxHealth: 100,
          attack: 10, defense: 5, speed: 8, attackCooldown: 3,
          tasks: ["Sort socks", "Match pairs"].map((name, index) => ({ id: `t${index + 1}`, name, isCompleted: false })),
        },
      ],
      rewards: { xp: 100, gp: 10, ap: 1 },
      quest: { id: "q-socks", achievementName: "Sock Duty" },
      roomKey: "Q0001",
      label: "Socktopus",
    };
    const { wrapper, router, userStore, vm, tap } = await enterBattle("/battle/hero-1/temple/shadow-temple/1F/0/1");
    await tap();
    await tap();

    await wrapper.find("#run-away").trigger("click");
    await wrapper.find("#run").trigger("click");
    const said: string[] = [vm.dialogText];
    for (let taps = 0; taps < 6 && router.currentRoute.value.name !== "temple"; taps++) {
      await tap();
      said.push(vm.dialogText);
      jest.advanceTimersByTime(ESCAPE_FADE_MS + 50);
      await flushPromises();
    }

    expect(said).toContain("Socktopus strikes as Max flees! Max takes 4 damage!");
    expect(said).toContain("Got away safely!");
    expect(said.join("|")).not.toMatch(/Couldn't escape/);
    expect(userStore.users["hero-1"].stats.hp.now).toBe(26);
    expect(router.currentRoute.value).toMatchObject({ name: "temple", params: { temple: "shadow-temple" } });
    (Math.random as jest.Mock).mockRestore();
  });

  it("Bribe escape from a quest fight pays GP, avoids parting strike damage, and leaves safely", async () => {
    mockEncounter = {
      enemies: [
        {
          id: "b1",
          name: "Socktopus",
          type: "beast",
          isBoss: false,
          health: 100,
          maxHealth: 100,
          attack: 10,
          defense: 5,
          speed: 8,
          attackCooldown: 3,
          tasks: ["Sort socks"].map((name, index) => ({ id: `t${index + 1}`, name, isCompleted: false })),
        },
      ],
      rewards: { xp: 100, gp: 10, ap: 1 },
      quest: { id: "q-socks", achievementName: "Sock Duty" },
      roomKey: "Q0001",
      label: "Socktopus",
    };
    const { wrapper, router, userStore, vm, tap } = await enterBattle("/battle/hero-1/quest/q-socks");
    userStore.users["hero-1"].stats.gp = { wallet: 100, savings: 50, debt: 0, hospitalBill: 0, limit: 1000 };
    await tap();
    await tap();

    await wrapper.find("#run-away").trigger("click");
    await flushPromises();
    const bribeBtn = wrapper.find("#bribe-full");
    expect(bribeBtn.exists()).toBe(true);
    expect(bribeBtn.text()).toContain("Bribe (22 GP)");

    await bribeBtn.trigger("click");
    const said: string[] = [vm.dialogText];
    for (let taps = 0; taps < 6 && router.currentRoute.value.name !== "my-tasks"; taps++) {
      await tap();
      said.push(vm.dialogText);
      jest.advanceTimersByTime(ESCAPE_FADE_MS + 50);
      await flushPromises();
    }

    expect(said.join("|")).toContain("bribed Socktopus with 22 GP!");
    expect(said.join("|")).toContain("Got away safely!");
    expect(said.join("|")).not.toMatch(/strikes as Max flees/);
    expect(userStore.users["hero-1"].stats.hp.now).toBe(30);
    expect(userStore.users["hero-1"].stats.gp.wallet).toBe(78);
  });

  it("the menu reads Tackle, Defend, Powers, Goods, Run Away", async () => {
    const { wrapper, userStore, tap, menu } = await enterBattle("/battle/hero-1/free/");
    await tap();
    await tap();
    expect(menu()).toEqual(["Tackle", "Defend", "Powers", "Goods", "Run Away"]);
    expect(wrapper.find("#attack i").classes()).toContain("fa-axe"); // the warrior's weapon
    expect(wrapper.find("#powers i").classes()).toContain("fa-book-spells");
    expect(wrapper.find("#item i").classes()).toContain("fa-backpack");
    // Two by two, and only Tackle spans its row
    const spans = wrapper.findAll(".menu-item-col").map((col) => col.attributes("style"));
    expect(spans.map((style) => style?.includes("1 / -1"))).toEqual([true, false, false, false, false]);

    // A hero without a class tackles with a fist
    userStore.users["hero-1"].jobClass = "";
    await flushPromises();
    expect(wrapper.find("#attack i").classes()).toContain("fa-fist-raised");
  });

  it("each command says what it can do: Tackle counts the chores; Powers and Goods read the sheets and dim when they have nothing", async () => {
    const { userStore, tap, readUntilMenu, attackWith, menuNotes, isDimmed } = await enterBattle("/battle/hero-1/free/", {
      leftHand: [ICE_WAND],
      rightHand: [],
    });
    const hero = userStore.users["hero-1"];
    await tap();
    await tap();

    // 10 MP: neither Power (20 and 25 MP) can be cast, the Ice Wand (10 MP) can, and there are no bottles
    let notes = menuNotes();
    expect(notes).toMatchObject({ attack: "2 chores", defend: undefined, item: "x1", "run-away": undefined });
    expect(notes.powers).toBe("no MP");
    expect([isDimmed("attack"), isDimmed("defend"), isDimmed("powers"), isDimmed("item"), isDimmed("run-away")]).toEqual([
      false, false, true, false, false,
    ]);

    // Rich in MP, with a hurt hero and a Health Potion: the cheapest Power names its price, and the bag counts the wand and the bottle
    hero.stats.mp = { now: 120, max: 120 };
    hero.stats.hp = { now: 10, max: 30 };
    hero.inventory = [{ name: "Health Potion" }];
    await flushPromises();
    notes = menuNotes();
    expect(notes).toMatchObject({ powers: "20 MP", item: "x2" });
    expect(isDimmed("powers")).toBe(false);

    // A chore done, one left
    await attackWith("Sort socks");
    await readUntilMenu();
    expect(menuNotes().attack).toBe("1 chore");
  });

  it("Goods opens the bag; the Ice Wand buys ten minutes and the Silver Arrow pins the beast", async () => {
    const { wrapper, userStore, vm, tap, readUntilMenu, bag, bagOpen, bagCard, useFromBag, menu } =
      await enterBattle("/battle/hero-1/free/", { leftHand: [ICE_WAND, CHRONOS_CLOCK], rightHand: [SILVER_ARROW] });
    const hero = userStore.users["hero-1"];
    hero.stats.mp = { now: 120, max: 120 };
    await tap();
    await tap(); // intro read: the clock is running
    expect(wrapper.find(".attack-timer-label").text()).toBe("6:00");
    expect(bagOpen()).toBe(false);

    // Goods opens the same bag as everywhere else, in battle mode; the page answers each card
    await wrapper.find("#item").trigger("click");
    expect(bagOpen()).toBe(true);
    expect(bag().props("mode")).toBe("battle");
    expect(wrapper.find(".menu-item").exists()).toBe(false);
    expect(bagCard(ICE_WAND)).toMatchObject({ mp: 10, effect: "+10 minutes on the clock", reason: null });
    expect(bagCard(SILVER_ARROW)).toMatchObject({ mp: 25, effect: "The beast misses its next two strikes", reason: null });
    // Only the tool in each hand works, the one the footer and the nav show: Chronos' Clock in a second slot stays in the bag
    expect(bagCard(CHRONOS_CLOCK)).toMatchObject({ mp: 20, reason: "Hold it in a hand before a fight." });
    const opensDirectly = bag().props("opensDirectly") as (item: BagItem) => boolean;
    expect([BOTTLES, BOOK_OF_SPELLS, ICE_WAND].map(opensDirectly)).toEqual([true, true, false]);
    // Its own close (the X, a swipe) puts the menu back; Goods opens it again
    bag().vm.$emit("close");
    await flushPromises();
    expect(bagOpen()).toBe(false);
    expect(menu()).toEqual(["Tackle", "Defend", "Powers", "Goods", "Run Away"]);
    await wrapper.find("#item").trigger("click");
    expect(bagOpen()).toBe(true);

    // Ice Wand: the bag closes, MP spent, one line, the clock is longer, and the hero keeps the move
    await useFromBag(ICE_WAND);
    expect(bagOpen()).toBe(false);
    expect(hero.stats.mp.now).toBe(110);
    expect(vm.dialogText).toBe("Ice creeps over the clock: +10 minutes!");
    expect(wrapper.find(".attack-timer-label").text()).toBe("16:00");
    expect(mockPlaySound).toHaveBeenCalledWith("select");
    await readUntilMenu();
    expect(menu()).toEqual(["Tackle", "Defend", "Powers", "Goods", "Run Away"]);

    // Silver Arrow: it acts at once (no chore pick), 25 MP, one line, and every chore stays in the fight
    await wrapper.find("#item").trigger("click");
    await useFromBag(SILVER_ARROW);
    expect(bagOpen()).toBe(false);
    expect(wrapper.find("[data-cy=task-sheet]").exists()).toBe(false);
    expect(hero.stats.mp.now).toBe(85);
    expect(vm.dialogText).toBe("Socktopus is pinned! It will miss its next two strikes.");
    expect(wrapper.find(".chores-left-label").text()).toBe("2 tasks left");
    expect(wrapper.find(".damage-popup").exists()).toBe(false); // not an attack
    await readUntilMenu();
    await wrapper.find("#attack").trigger("click");
    expect(wrapper.findAll(".battle-task-item").map((item) => item.text())).toEqual(["Sort socks", "Match pairs"]);
  });

  it("X's Invisibility runs the hero out of a quest fight with no parting strike", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.5);
    mockEncounter = questEncounter();
    const { wrapper, router, userStore, vm, tap, useFromBag } = await enterBattle(QUEST_ROOM, {
      leftHand: [X_INVISIBILITY],
      rightHand: [],
    });
    const hero = userStore.users["hero-1"];
    hero.stats.mp = { now: 50, max: 50 };
    await tap();
    await tap();

    // One tap in the bag: the 15 MP are spent, the hero vanishes and Run Away follows by itself
    await wrapper.find("#item").trigger("click");
    await useFromBag(X_INVISIBILITY);
    expect(hero.stats.mp.now).toBe(35);
    const said: string[] = [vm.dialogText];
    for (let taps = 0; taps < 8 && router.currentRoute.value.name !== "temple"; taps++) {
      await tap();
      said.push(vm.dialogText);
      jest.advanceTimersByTime(ESCAPE_FADE_MS + 50);
      await flushPromises();
    }

    expect(said).toContain("Max vanishes into the shadows...");
    expect(said).toContain("Socktopus swings at empty air.");
    expect(said).toContain("Got away safely!");
    expect(said.join("|")).not.toMatch(/strikes as Max flees/);
    expect(hero.stats.hp.now).toBe(30);
    expect(router.currentRoute.value).toMatchObject({ name: "temple", params: { temple: "shadow-temple" } });
    (Math.random as jest.Mock).mockRestore();
  });

  it("a chore in a quest fight gives a tenth of max MP back", async () => {
    mockEncounter = questEncounter();
    const { userStore, tap, attackWith } = await enterBattle(QUEST_ROOM);
    const hero = userStore.users["hero-1"];
    hero.stats.mp = { now: 50, max: 120 };
    await tap();
    await tap();

    await attackWith("Sort socks");
    expect(hero.stats.mp.now).toBe(50 + Math.max(1, Math.round(120 * 0.1)));
    expect(hero.stats.hp.now).toBe(30); // no moonlight, no healing
  });

  it("a chore in a free fight gives nothing back", async () => {
    const { userStore, tap, attackWith } = await enterBattle("/battle/hero-1/free/");
    const hero = userStore.users["hero-1"];
    hero.stats.mp = { now: 50, max: 120 };
    hero.stats.hp = { now: 20, max: 30 };
    await tap();
    await tap();

    await attackWith("Sort socks");
    expect(hero.stats.mp.now).toBe(50);
    expect(hero.stats.hp.now).toBe(20);
  });

  it("Tesla's Bolt doubles what a quest chore gives back and Night's Light makes it heal", async () => {
    mockEncounter = questEncounter();
    const { wrapper, userStore, tap, readUntilMenu, useFromBag, attackWith } = await enterBattle(QUEST_ROOM, {
      leftHand: [TESLAS_BOLT],
      rightHand: [NIGHTS_LIGHT],
    });
    const hero = userStore.users["hero-1"];
    hero.stats.mp = { now: 50, max: 120 };
    hero.stats.hp = { now: 10, max: 30 };
    await tap();
    await tap();

    await wrapper.find("#item").trigger("click");
    await useFromBag(TESLAS_BOLT);
    await readUntilMenu();
    await wrapper.find("#item").trigger("click");
    await useFromBag(NIGHTS_LIGHT);
    await readUntilMenu();
    expect(hero.stats.mp.now).toBe(35); // 5 + 10 MP spent

    await attackWith("Sort socks");
    expect(hero.stats.mp.now).toBe(35 + 2 * 12);
    expect(hero.stats.hp.now).toBe(10 + 2); // 5% of 30, rounded
  });

  it("Bottles in the bag opens the potion sheet and a drink heals", async () => {
    const { wrapper, userStore, vm, tap, readUntilMenu, bag, bagOpen, menuNotes, isDimmed } = await enterBattle("/battle/hero-1/free/");
    const hero = userStore.users["hero-1"];
    hero.stats.hp = { now: 10, max: 30 };
    hero.inventory = [{ name: "Health Potion" }];
    await tap();
    await tap();

    // Bottles opens its sheet at once; a second container tap in the same breath is ignored
    await wrapper.find("#item").trigger("click");
    bag().vm.$emit("use-item", BOTTLES);
    bag().vm.$emit("use-item", BOOK_OF_SPELLS);
    await flushPromises();
    bag().vm.$emit("close"); // the modal reports its dismissal after the page closed it
    await flushPromises();
    expect(bagOpen()).toBe(false);
    expect(wrapper.find("[data-cy=powers-sheet]").exists()).toBe(false);
    const sheet = wrapper.find("[data-cy=potion-sheet]");
    expect(sheet.exists()).toBe(true);
    expect(sheet.find(".item-name").text()).toBe("Health Potion");
    expect(wrapper.find(".menu-item").exists()).toBe(false);

    // A drink closes the sheet, heals up to the max, spends the bottle and keeps the move
    await wrapper.find("[data-cy=potion-health-potion]").trigger("click");
    await flushPromises();
    expect(wrapper.find("[data-cy=potion-sheet]").exists()).toBe(false);
    expect(hero.stats.hp.now).toBe(30);
    expect(vm.dialogText).toBe("You drink a Health Potion: +20 HP");
    expect(mockPlaySound).toHaveBeenCalledWith("restoreHP");
    expect(hero.inventory).toEqual([]);
    await readUntilMenu();

    // The last bottle is gone and no tool is in a hand: Goods dims and says why (hold one), so there is no empty sheet to open
    expect(menuNotes().item).toBe("hold");
    expect(isDimmed("item")).toBe(true);
    await wrapper.find("#item").trigger("click");
    expect(bagOpen()).toBe(false);
    expect(wrapper.find(".menu-item").exists()).toBe(true);
  });

  it("Powers opens the sheet and a cast freezes the clock", async () => {
    const { wrapper, userStore, vm, tap, readUntilMenu, bagCard, castPower } = await enterBattle("/battle/hero-1/free/", {
      leftHand: [CHRONOS_CLOCK],
      rightHand: [],
    });
    const hero = userStore.users["hero-1"];
    hero.stats.mp = { now: 120, max: 120 };
    await tap();
    await tap();

    // The sheet lists the hero's battle Powers with their MP and what they do here
    await wrapper.find("#powers").trigger("click");
    const sheet = wrapper.find("[data-cy=powers-sheet]");
    expect(sheet.findAll(".power-name").map((name) => name.text())).toEqual(["Stop", "Rewind"]);
    expect(sheet.find("[data-ability-id=power-stop] .power-cost").text()).toBe("25 MP · Pauses the clock for 15 minutes");
    expect(wrapper.find(".menu-item").exists()).toBe(false);
    await wrapper.find("[data-cy=powers-sheet-back]").trigger("click");

    // Stop: the sheet closes, MP spent, the caster's line, and the clock stands still
    await castPower("Stop");
    expect(hero.stats.mp.now).toBe(95);
    expect(vm.dialogText).toBe("Max casts Stop! Time stands still for 15 minutes!");
    jest.advanceTimersByTime(10 * 60 * 1000);
    await flushPromises();
    expect(wrapper.find(".attack-timer-label").text()).toBe("6:00");
    await readUntilMenu();
    expect(vm.dialogText).toBe(""); // the beast never struck

    // Time Stop is spent for the fight, whatever casts it: the Power and Chronos' Clock both say so
    await wrapper.find("#powers").trigger("click");
    expect(wrapper.find("[data-ability-id=power-stop] .power-state").text()).toBe("Already used this fight");
    await wrapper.find("[data-cy=powers-sheet-back]").trigger("click");
    await wrapper.find("#item").trigger("click");
    expect(bagCard(CHRONOS_CLOCK)?.reason).toBe("Already used this fight");
  });

  it("a strike closes the bag", async () => {
    // A wand in hand: Goods dims when the bag holds nothing to use
    const { wrapper, tap, readUntilMenu, bagOpen, letTheBeastStrike } = await enterBattle("/battle/hero-1/free/", {
      leftHand: [ICE_WAND],
      rightHand: [],
    });
    jest.spyOn(Math, "random").mockReturnValue(0.5);
    await tap();
    await tap();

    // The bag is open when the clock runs out: it closes so the hero sees the hit
    await wrapper.find("#item").trigger("click");
    expect(bagOpen()).toBe(true);
    await letTheBeastStrike();
    expect(bagOpen()).toBe(false);
    await tap();
    await tap(); // the hit lands
    await readUntilMenu();
    (Math.random as jest.Mock).mockRestore();
  });

  it("back closes the bag before it asks to run", async () => {
    // A wand in hand and the MP to cast: Goods and Powers dim when they have nothing to offer
    const { wrapper, userStore, tap, bagOpen, menu } = await enterBattle("/battle/hero-1/free/", {
      leftHand: [ICE_WAND],
      rightHand: [],
    });
    userStore.users["hero-1"].stats.mp = { now: 120, max: 120 };
    await tap();
    await tap();
    const next = jest.fn();
    const back = async () => {
      mockViewHooks.back?.(next);
      await flushPromises();
    };

    // The bag first, then a sheet: each back closes what is open and nothing else
    await wrapper.find("#item").trigger("click");
    expect(bagOpen()).toBe(true);
    await back();
    expect(bagOpen()).toBe(false);
    expect(menu()).toEqual(["Tackle", "Defend", "Powers", "Goods", "Run Away"]);
    expect(wrapper.find(".dialog-prompt").text()).toBe("Do its chores to win!");

    await wrapper.find("#powers").trigger("click");
    await back();
    expect(wrapper.find("[data-cy=powers-sheet]").exists()).toBe(false);
    expect(menu()).toEqual(["Tackle", "Defend", "Powers", "Goods", "Run Away"]);

    // With nothing open, back asks before running; it never leaves the fight by itself
    await back();
    expect(wrapper.find(".dialog-prompt").text()).toBe("Run away? Your finished chores won't count.");
    expect(next).not.toHaveBeenCalled();
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

import { mount } from "@vue/test-utils";
import XpBattleTaskMenu from "../components/XpBattleTaskMenu.vue";
import { play$fx } from "@/assets/fx";
import type { CombatTask } from "@/lib/services/battle/BattleService";

/**
 * The checklist sheet on its own, the way the battle page uses it: the beast's chores are the hero's moves, a tap on
 * a row asks "Did you finish it?" right under that row, and only Done! lets the attack go. The real component is
 * mounted; only the sound board (jsdom has no audio) is a spy.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));
// The sheet is plain HTML so it hydrates in jsdom: pulling Ionic (or its helpers) back in would be a regression.
jest.mock("@ionic/vue", () => {
  throw new Error("XpBattleTaskMenu must not import @ionic/vue");
});
jest.mock("@/lib/mixins/ionic", () => {
  throw new Error("XpBattleTaskMenu must not import the ionic mixin");
});

const playFx = play$fx as jest.Mock;

/** Everything the sheet told its parent, in the order it said it. */
let heard: string[] = [];

const checklist = (): CombatTask[] => [
  { id: "t1", name: "Sort the socks", isCompleted: false },
  { id: "t2", name: "Match the pairs", isCompleted: true },
  { id: "t3", name: "Put them away", isCompleted: false },
];

const mountSheet = (tasks: CombatTask[]) =>
  mount(XpBattleTaskMenu, {
    props: {
      tasks,
      enemyName: "Socktopus",
      damagePerTask: 50,
      onCancel: () => heard.push("cancel"),
      onAttackStart: (task: CombatTask) => heard.push(`attack-start ${task.id}`),
      onTaskComplete: (taskId: string) => heard.push(`task-complete ${taskId}`),
      onAttackEnd: (end: { taskId: string }) => heard.push(`attack-end ${end.taskId}`),
    },
  });
type Sheet = ReturnType<typeof mountSheet>;

describe("XpBattleTaskMenu", () => {
  let mounted: Sheet | undefined;

  /** Mounts the sheet over the beast's three chores (the middle one already done) unless told otherwise. */
  const open = (tasks: CombatTask[] = checklist()) => {
    mounted = mountSheet(tasks);
    return mounted;
  };
  const rowsOf = (menu: Sheet) => menu.findAll(".battle-task-item");
  const tapDone = (menu: Sheet) => menu.find("[data-cy=task-confirm]").trigger("click");
  /** Opens the sheet and taps the first chore, which opens its confirm strip. */
  const openFirstChore = async () => {
    const menu = open();
    await rowsOf(menu)[0].trigger("click");
    return menu;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    heard = [];
    playFx.mockClear();
  });
  afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe("the sheet", () => {
    it("is one bottom-sheet root with a backdrop, a header and nothing from Ionic", () => {
      const menu = open();
      expect(menu.classes()).toContain("xp-battle-task-menu");
      expect(menu.attributes("data-cy")).toBe("task-sheet");
      expect(menu.find(".sheet-backdrop").exists()).toBe(true);
      expect(menu.find(".menu-container").exists()).toBe(true);
      expect(menu.find(".sheet-title").text()).toBe("Tackle!");
      expect(menu.find(".sheet-subtitle").text()).toBe("Each chore hits Socktopus for 50");

      expect(menu.html()).not.toMatch(/<ion-/i);
      const buttons = menu.findAll("button");
      expect(buttons.length).toBeGreaterThan(0);
      expect(buttons.every((button) => button.attributes("type") === "button")).toBe(true);
    });

    it("lists the chores in the order they were written, the finished ones dimmed and disabled", () => {
      const rows = rowsOf(open());
      expect(rows.map((row) => row.find(".task-name").text())).toEqual([
        "Sort the socks",
        "Match the pairs",
        "Put them away",
      ]);
      expect(rows.map((row) => row.classes("is-done"))).toEqual([false, true, false]);
      expect(rows.map((row) => row.attributes("disabled") !== undefined)).toEqual([false, true, false]);
      expect(rows.map((row) => row.find("i").classes("fa-claw-marks"))).toEqual([true, false, true]);
      expect(rows.map((row) => row.find("i").classes("fa-check"))).toEqual([false, true, false]);
    });

    it("says so when the beast has no chores", () => {
      const menu = open([]);
      expect(menu.find(".empty-state").text()).toBe("No chores on this beast!");
      expect(rowsOf(menu)).toHaveLength(0);
    });
  });

  describe("picking a chore", () => {
    it("opens one confirm strip right under the chore and moves it to the next chore picked", async () => {
      const menu = open();
      const rows = rowsOf(menu);
      expect(menu.find(".task-confirm-strip").exists()).toBe(false);

      await rows[0].trigger("click");
      expect(menu.findAll(".task-confirm-strip")).toHaveLength(1);
      expect(menu.find(".task-confirm-strip").text()).toContain("Did you finish it?");
      expect(rows[0].classes("is-selected")).toBe(true);
      // The row's neighbour, never inside its button (buttons cannot nest) and never above the name.
      expect(rows[0].element.nextElementSibling).toBe(menu.find(".task-confirm-strip").element);
      expect(rows[0].find(".task-confirm-strip").exists()).toBe(false);
      expect(playFx).toHaveBeenLastCalledWith("cursor");

      await rows[2].trigger("click");
      expect(menu.findAll(".task-confirm-strip")).toHaveLength(1);
      expect(menu.findAll(".is-selected")).toHaveLength(1);
      expect(rows[0].classes("is-selected")).toBe(false);
      expect(rows[2].element.nextElementSibling).toBe(menu.find(".task-confirm-strip").element);
      expect(playFx).toHaveBeenCalledTimes(2);
    });

    it("does not open a finished chore", async () => {
      const menu = open();
      await rowsOf(menu)[1].trigger("click");
      expect(menu.find(".task-confirm-strip").exists()).toBe(false);
      expect(playFx).not.toHaveBeenCalled();
    });

    it("leaves an open chore open, and quiet, when it is tapped again", async () => {
      const menu = open();
      const [first] = rowsOf(menu);
      await first.trigger("click");
      await first.trigger("click");
      expect(menu.findAll(".task-confirm-strip")).toHaveLength(1);
      expect(playFx).toHaveBeenCalledTimes(1);
    });

    it("drops the confirm strip when the open chore gets finished from outside", async () => {
      const menu = await openFirstChore();
      expect(menu.find(".task-confirm-strip").exists()).toBe(true);

      await menu.setProps({ tasks: checklist().map((task) => ({ ...task, isCompleted: task.id !== "t3" })) });
      expect(menu.find(".task-confirm-strip").exists()).toBe(false);
      expect(rowsOf(menu)[0].classes("is-done")).toBe(true);
    });
  });

  describe("Done!", () => {
    it("ignores taps until 250 ms after the chore was picked", async () => {
      const menu = await openFirstChore();
      jest.advanceTimersByTime(200);
      await tapDone(menu);
      jest.advanceTimersByTime(49);
      await tapDone(menu);
      expect(heard).toEqual([]);

      jest.advanceTimersByTime(1);
      await tapDone(menu);
      expect(heard).toEqual(["attack-start t1", "task-complete t1", "attack-end t1"]);
    });

    it("holds Done! back again when another chore is picked", async () => {
      const menu = await openFirstChore();
      jest.advanceTimersByTime(300);
      await rowsOf(menu)[2].trigger("click");
      await tapDone(menu);
      expect(heard).toEqual([]);

      jest.advanceTimersByTime(250);
      await tapDone(menu);
      expect(heard).toEqual(["attack-start t3", "task-complete t3", "attack-end t3"]);
    });

    it("sends the attack once, in order, and then ignores every other tap", async () => {
      const menu = await openFirstChore();
      jest.advanceTimersByTime(300);
      await tapDone(menu);

      expect(heard).toEqual(["attack-start t1", "task-complete t1", "attack-end t1"]);
      expect(menu.emitted("attack-start")).toEqual([[{ id: "t1", name: "Sort the socks", isCompleted: false }]]);
      expect(menu.emitted("task-complete")).toEqual([["t1"]]);
      expect(menu.emitted("attack-end")).toEqual([[{ success: true, taskId: "t1", taskName: "Sort the socks" }]]);

      // The page is closing the sheet: a second Done!, another chore, Not yet, Back and the backdrop all do nothing.
      playFx.mockClear();
      await tapDone(menu);
      await rowsOf(menu)[2].trigger("click");
      await menu.find("[data-cy=task-not-yet]").trigger("click");
      await menu.find("[data-cy=task-back]").trigger("click");
      await menu.find(".sheet-backdrop").trigger("click");
      expect(heard).toHaveLength(3);
      expect(playFx).not.toHaveBeenCalled();
      expect(menu.classes()).toContain("is-busy");
    });
  });

  describe("Not yet", () => {
    it("closes the strip with the 'no' cue and attacks nothing", async () => {
      const menu = await openFirstChore();
      await menu.find("[data-cy=task-not-yet]").trigger("click");

      expect(menu.find(".task-confirm-strip").exists()).toBe(false);
      expect(menu.find(".is-selected").exists()).toBe(false);
      expect(playFx).toHaveBeenLastCalledWith("no");
      expect(heard).toEqual([]);
    });

    it("lets the same chore be picked again, with a fresh guard", async () => {
      const menu = await openFirstChore();
      jest.advanceTimersByTime(300);
      await menu.find("[data-cy=task-not-yet]").trigger("click");
      await rowsOf(menu)[0].trigger("click");
      await tapDone(menu);
      expect(heard).toEqual([]);

      jest.advanceTimersByTime(250);
      await tapDone(menu);
      expect(heard).toEqual(["attack-start t1", "task-complete t1", "attack-end t1"]);
    });
  });

  describe("leaving without attacking", () => {
    it.each([
      ["the Back button", "[data-cy=task-back]"],
      ["a tap on the dimmed backdrop", ".sheet-backdrop"],
    ])("%s cancels with the closeTask cue", async (_name, selector) => {
      const menu = await openFirstChore();
      playFx.mockClear();
      await menu.find(selector).trigger("click");

      expect(heard).toEqual(["cancel"]);
      expect(playFx).toHaveBeenCalledTimes(1);
      expect(playFx).toHaveBeenCalledWith("closeTask");
    });
  });

  describe("long checklists", () => {
    /** jsdom does no layout: fake the list's bottom edge and the strip's so the strip hangs 40 px past the list. */
    const hangStripPastList = () => {
      jest.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
        return { bottom: this.classList.contains("task-confirm-strip") ? 340 : 300 } as DOMRect;
      });
    };
    const listOf = (menu: Sheet) => menu.find(".menu-content").element as HTMLElement;

    it("scrolls the list just far enough to bring the confirm strip into view", async () => {
      const menu = open();
      const scrollBy = jest.fn();
      listOf(menu).scrollBy = scrollBy;
      hangStripPastList();

      await rowsOf(menu)[0].trigger("click");
      expect(scrollBy).toHaveBeenCalledTimes(1);
      expect(scrollBy).toHaveBeenCalledWith({ top: 48, behavior: "smooth" });
    });

    it("does not scroll a strip that already fits", async () => {
      const menu = open();
      const scrollBy = jest.fn();
      listOf(menu).scrollBy = scrollBy;

      await rowsOf(menu)[0].trigger("click"); // jsdom lays out nothing: every edge is 0
      expect(scrollBy).not.toHaveBeenCalled();
    });

    it("scrolls without the glide for players who asked for reduced motion", async () => {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        writable: true,
        value: jest.fn().mockReturnValue({ matches: true }),
      });
      try {
        const menu = open();
        const scrollBy = jest.fn();
        listOf(menu).scrollBy = scrollBy;
        hangStripPastList();

        await rowsOf(menu)[0].trigger("click");
        expect(scrollBy).toHaveBeenCalledWith({ top: 48, behavior: "auto" });
      } finally {
        Reflect.deleteProperty(window, "matchMedia");
      }
    });
  });
});

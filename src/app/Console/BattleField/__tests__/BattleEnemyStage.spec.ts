import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import BattleEnemyStage from "../components/BattleEnemyStage.vue";
import type { Enemy } from "@/lib/services/battle/BattleService";
import type { HitPopup } from "../battle/battleView";

/**
 * The beast's stage in jsdom: the name plate, chore pips, attack clock, entrance and damage popups. The stage is
 * presentational (no store, router or sounds), so nothing is mocked; the fake clock drives the timeouts.
 */

const APPEAR_MS = 600;
const POPUP_MS = 1000;

const makeEnemy = (overrides: Partial<Enemy> = {}): Enemy => ({
  id: "beast-1",
  name: "Socktopus",
  type: "monster",
  isBoss: false,
  health: 100,
  maxHealth: 100,
  emoji: "🐙",
  attack: 5,
  defense: 1,
  speed: 1,
  ...overrides,
});

interface StageProps {
  enemy: Enemy | null;
  avatarSrc: string;
  visible: boolean;
  animationClass: "" | "damaged" | "fadeout" | "victory-strobe" | "victory-fadeout";
  sizeClass: "monster" | "miniboss" | "boss";
  choresTotal: number;
  choresLeft: number;
  timerVisible: boolean;
  timerPercent: number;
  timerLabel: string;
  timerCritical: boolean;
  lastHit: HitPopup | null;
}

const makeProps = (overrides: Partial<StageProps> = {}): StageProps => ({
  enemy: makeEnemy(),
  avatarSrc: "socktopus.png",
  visible: true,
  animationClass: "",
  sizeClass: "monster",
  choresTotal: 3,
  choresLeft: 3,
  timerVisible: true,
  timerPercent: 100,
  timerLabel: "9:00",
  timerCritical: false,
  lastHit: null,
  ...overrides,
});

describe("BattleEnemyStage", () => {
  let wrapper: ReturnType<typeof mount> | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    jest.useRealTimers();
  });

  const show = (overrides: Partial<StageProps> = {}) => {
    wrapper = mount(BattleEnemyStage, { props: makeProps(overrides) });
    return wrapper;
  };
  const update = async (props: Partial<StageProps>) => {
    await wrapper!.setProps(props);
  };
  /** Runs the fake clock, then lets Vue paint what changed. */
  const roll = async (ms: number) => {
    jest.advanceTimersByTime(ms);
    await nextTick();
  };
  const popups = () => wrapper!.findAll(".damage-popup");
  const popupTexts = () => popups().map((popup) => popup.text());
  const hit = (id: number, amount = 50, smash = false): HitPopup => ({ id, amount, ...(smash ? { smash } : {}) });
  const fill = () => wrapper!.find(".attack-timer-fill").attributes("style") || "";

  describe("the name plate and the chores", () => {
    it("renders the beast's name exactly as given", () => {
      show({ enemy: makeEnemy({ name: "Dust Bunny Boss" }) });
      expect(wrapper!.find(".enemy-name").text()).toBe("Dust Bunny Boss");
    });

    it("says how many chores are left, in the singular for one", async () => {
      show({ choresTotal: 3, choresLeft: 3 });
      expect(wrapper!.find(".chores-left-label").text()).toBe("3 chores left");

      await update({ choresLeft: 1 });
      expect(wrapper!.find(".chores-left-label").text()).toBe("1 chore left");

      await update({ choresLeft: 0 });
      expect(wrapper!.find(".chores-left-label").text()).toBe("0 chores left");
    });

    it("keeps nonsense counts from reaching the screen", () => {
      show({ choresTotal: Number.NaN, choresLeft: -4 });
      expect(wrapper!.find(".chores-left-label").text()).toBe("0 chores left");
    });

    it("draws one pip per chore, finished ones green with a check", async () => {
      show({ choresTotal: 4, choresLeft: 3 });
      expect(wrapper!.findAll(".chore-pip")).toHaveLength(4);
      expect(wrapper!.findAll(".chore-pip.is-done")).toHaveLength(1);
      expect(wrapper!.findAll(".chore-pip .fa-check")).toHaveLength(1);
      // They fill from the left
      expect(wrapper!.findAll(".chore-pip")[0].classes()).toContain("is-done");
      expect(wrapper!.find(".chore-bar").exists()).toBe(false);

      await update({ choresLeft: 0 });
      expect(wrapper!.findAll(".chore-pip.is-done")).toHaveLength(4);
    });

    it("uses a plain bar instead of pips above twelve chores", () => {
      show({ choresTotal: 13, choresLeft: 5 });
      expect(wrapper!.findAll(".chore-pip")).toHaveLength(0);
      expect(wrapper!.find(".chore-bar").exists()).toBe(true);
      expect(wrapper!.find(".chore-bar-fill").attributes("style")).toContain("61.5");
      expect(wrapper!.find(".chores-left-label").text()).toBe("5 chores left");
    });

    it("still uses pips at exactly twelve chores", () => {
      show({ choresTotal: 12, choresLeft: 12 });
      expect(wrapper!.findAll(".chore-pip")).toHaveLength(12);
    });

    it("pops the pip that just flipped, then settles", async () => {
      show({ choresTotal: 3, choresLeft: 3 });
      expect(wrapper!.findAll(".chore-pip.is-popping")).toHaveLength(0);

      await update({ choresLeft: 2 });
      const pips = wrapper!.findAll(".chore-pip");
      expect(pips[0].classes()).toEqual(expect.arrayContaining(["is-done", "is-popping"]));
      expect(pips[1].classes()).not.toContain("is-popping");

      await roll(600);
      expect(wrapper!.findAll(".chore-pip.is-popping")).toHaveLength(0);
      expect(wrapper!.findAll(".chore-pip.is-done")).toHaveLength(1);
    });

    it("does not pop anything when a new beast arrives with chores already done", async () => {
      show({ choresTotal: 3, choresLeft: 3 });
      await update({ enemy: makeEnemy({ id: "beast-2" }), choresTotal: 4, choresLeft: 2 });
      expect(wrapper!.findAll(".chore-pip")).toHaveLength(4);
      expect(wrapper!.findAll(".chore-pip.is-done")).toHaveLength(2);
      expect(wrapper!.findAll(".chore-pip.is-popping")).toHaveLength(0);
    });
  });

  describe("the attack clock", () => {
    it("shows the caption and the label", () => {
      show({ timerLabel: "2:05" });
      expect(wrapper!.find(".attack-timer").exists()).toBe(true);
      expect(wrapper!.find(".attack-timer-caption").text()).toBe("strikes in");
      expect(wrapper!.find(".attack-timer-label").text()).toBe("2:05");
      expect(wrapper!.find(".fa-claw-marks").exists()).toBe(true);
    });

    it("has no label element at all while the label is empty", async () => {
      show({ timerLabel: "" });
      expect(wrapper!.find(".attack-timer").exists()).toBe(true);
      expect(wrapper!.find(".attack-timer-label").exists()).toBe(false);

      await update({ timerLabel: "0:59" });
      expect(wrapper!.find(".attack-timer-label").text()).toBe("0:59");
    });

    it("hides the whole row until the clock is visible but keeps its slot", async () => {
      show({ timerVisible: false });
      expect(wrapper!.find(".attack-timer").exists()).toBe(false);
      expect(wrapper!.find(".attack-timer-slot").exists()).toBe(true);

      await update({ timerVisible: true });
      expect(wrapper!.find(".attack-timer").exists()).toBe(true);
    });

    it("sizes the fill to the percentage and clamps it to 0-100", async () => {
      show({ timerPercent: 40 });
      expect(fill()).toContain("40%");

      await update({ timerPercent: 250 });
      expect(fill()).toContain("100%");

      await update({ timerPercent: -5 });
      expect(fill()).toContain("0%");

      await update({ timerPercent: Number.NaN });
      expect(fill()).toContain("0%");
    });

    it.each([
      [100, "tone-ok"],
      [51, "tone-ok"],
      [50, "tone-warn"],
      [21, "tone-warn"],
      [20, "tone-danger"],
      [0, "tone-danger"],
    ])("is %s%% of the clock: %s", (timerPercent, tone) => {
      show({ timerPercent });
      const row = wrapper!.find(".attack-timer");
      expect(row.classes()).toContain(tone);
      expect(row.classes().filter((name) => name.startsWith("tone-"))).toHaveLength(1);
    });

    it("pulses and turns red when critical, even with plenty of clock left", async () => {
      show({ timerPercent: 90, timerCritical: false });
      expect(wrapper!.find(".attack-timer").classes()).not.toContain("is-critical");
      expect(wrapper!.find(".enemy-name").classes()).not.toContain("is-critical");

      await update({ timerCritical: true });
      expect(wrapper!.find(".attack-timer").classes()).toEqual(expect.arrayContaining(["is-critical", "tone-danger"]));
      expect(wrapper!.find(".enemy-name").classes()).toContain("is-critical");
      expect(wrapper!.find(".enemy-sprite, .enemy-emoji").classes()).toContain("is-critical");
    });
  });

  describe("the entrance", () => {
    it("plays when the stage becomes visible and ends after 600 ms", async () => {
      show({ visible: false });
      const root = wrapper!.find(".enemy-container");
      expect(root.classes()).not.toContain("appear");
      expect((root.element as HTMLElement).style.display).toBe("none");

      await update({ visible: true });
      expect(root.classes()).toContain("appear");
      expect((root.element as HTMLElement).style.display).not.toBe("none");

      await roll(APPEAR_MS - 1);
      expect(root.classes()).toContain("appear");

      await roll(1);
      expect(root.classes()).not.toContain("appear");
    });

    it("does not play for a stage that is already visible when it mounts", () => {
      show({ visible: true });
      expect(wrapper!.find(".enemy-container").classes()).not.toContain("appear");
    });

    it("plays again for a second beast, and not for the same beast", async () => {
      show();
      await update({ enemy: makeEnemy({ name: "Same beast, new HP", health: 50 }) });
      expect(wrapper!.find(".enemy-container").classes()).not.toContain("appear");

      await update({ enemy: makeEnemy({ id: "beast-2", name: "Dustbunny" }) });
      expect(wrapper!.find(".enemy-container").classes()).toContain("appear");

      await roll(APPEAR_MS);
      expect(wrapper!.find(".enemy-container").classes()).not.toContain("appear");
    });

    it("restarts the 600 ms when another beast arrives mid-entrance", async () => {
      show();
      await update({ enemy: makeEnemy({ id: "beast-2" }) });
      await roll(400);
      await update({ enemy: makeEnemy({ id: "beast-3" }) });
      await roll(400);
      expect(wrapper!.find(".enemy-container").classes()).toContain("appear");
      await roll(200);
      expect(wrapper!.find(".enemy-container").classes()).not.toContain("appear");
    });

    it("waits for the stage to show when the beast changes while hidden", async () => {
      show({ visible: false });
      await update({ enemy: makeEnemy({ id: "beast-2" }) });
      expect(wrapper!.find(".enemy-container").classes()).not.toContain("appear");

      await update({ visible: true });
      expect(wrapper!.find(".enemy-container").classes()).toContain("appear");
    });
  });

  describe("the layers", () => {
    it("keeps the entrance, the hit and the float on three different elements", () => {
      show({ animationClass: "damaged", sizeClass: "boss" });
      const root = wrapper!.find(".enemy-container");
      const container = wrapper!.find(".enemy-sprite-container");
      const sprite = wrapper!.find(".enemy-sprite");

      expect(container.classes()).toEqual(expect.arrayContaining(["damaged", "boss"]));
      expect(root.classes()).not.toContain("damaged");
      expect(sprite.classes()).not.toContain("damaged");
      expect(sprite.element.parentElement).toBe(container.element);
      expect(root.element).not.toBe(container.element);
      expect(container.element).not.toBe(sprite.element);
    });

    it.each(["damaged", "fadeout", "victory-strobe", "victory-fadeout"] as const)("passes %s through", (animationClass) => {
      show({ animationClass });
      expect(wrapper!.find(".enemy-sprite-container").classes()).toContain(animationClass);
    });

    it.each(["monster", "miniboss", "boss"] as const)("sizes a %s", (sizeClass) => {
      show({ sizeClass });
      expect(wrapper!.find(".enemy-sprite-container").classes()).toContain(sizeClass);
    });

    it("keeps the popups out of the sprite container so a hit flash or fade never tints them", async () => {
      show();
      await update({ lastHit: hit(1) });
      expect(wrapper!.find(".enemy-sprite-container .damage-popup").exists()).toBe(false);
      expect(popups()).toHaveLength(1);
    });
  });

  describe("the sprite", () => {
    it("draws the image with the beast's name as its alt text", () => {
      show({ avatarSrc: "x.png" });
      const sprite = wrapper!.find("img.enemy-sprite");
      expect(sprite.attributes("src")).toBe("x.png");
      expect(sprite.attributes("alt")).toBe("Socktopus");
      expect(wrapper!.find(".enemy-emoji").exists()).toBe(false);
    });

    it("falls back to the emoji when there is no sprite", () => {
      show({ avatarSrc: "" });
      expect(wrapper!.find("img").exists()).toBe(false);
      expect(wrapper!.find(".enemy-emoji").text()).toBe("🐙");
    });

    it("falls back to the emoji when the sprite fails to load, and tries again for a new sprite", async () => {
      show();
      await wrapper!.find("img.enemy-sprite").trigger("error");
      expect(wrapper!.find("img").exists()).toBe(false);
      expect(wrapper!.find(".enemy-emoji").exists()).toBe(true);

      await update({ avatarSrc: "other.png" });
      expect(wrapper!.find("img.enemy-sprite").exists()).toBe(true);
    });

    it("tries the sprite again when a new beast arrives", async () => {
      show();
      await wrapper!.find("img.enemy-sprite").trigger("error");
      await update({ enemy: makeEnemy({ id: "beast-2" }) });
      expect(wrapper!.find("img.enemy-sprite").exists()).toBe(true);
    });

    it("shows a question mark when there is neither sprite nor emoji", () => {
      show({ avatarSrc: "", enemy: makeEnemy({ emoji: undefined }) });
      expect(wrapper!.find(".enemy-placeholder").text()).toBe("?");
    });

    it("renders an empty stage without a beast", () => {
      show({ enemy: null, avatarSrc: "" });
      expect(wrapper!.find(".enemy-name").exists()).toBe(false);
      expect(wrapper!.find(".chores-left-label").exists()).toBe(false);
      expect(wrapper!.find(".attack-timer").exists()).toBe(false);
    });
  });

  describe("damage popups", () => {
    it("floats a -amount popup for a new hit and removes it after 1000 ms", async () => {
      show();
      expect(popups()).toHaveLength(0);

      await update({ lastHit: hit(1, 50) });
      expect(popups()).toHaveLength(1);
      expect(popupTexts()).toEqual(["-50"]);
      expect(popups()[0].classes()).not.toContain("is-smash");

      await roll(POPUP_MS - 1);
      expect(popups()).toHaveLength(1);

      await roll(1);
      expect(popups()).toHaveLength(0);
    });

    it("shows SMAAAASH!! for the final blow", async () => {
      show();
      await update({ lastHit: hit(1, 20, true) });
      expect(popupTexts()).toEqual(["SMAAAASH!!"]);
      expect(popups()[0].classes()).toContain("is-smash");

      await roll(POPUP_MS);
      expect(popups()).toHaveLength(0);
    });

    it("stacks quick hits and takes each away on its own timer", async () => {
      show();
      await update({ lastHit: hit(1, 10) });
      await roll(400);
      await update({ lastHit: hit(2, 20) });
      expect(popupTexts()).toEqual(["-10", "-20"]);

      await roll(600);
      expect(popupTexts()).toEqual(["-20"]);

      await roll(400);
      expect(popups()).toHaveLength(0);
    });

    it("keeps at most five on screen, dropping the oldest", async () => {
      show();
      for (let id = 1; id <= 7; id++) await update({ lastHit: hit(id, id * 10) });
      expect(popupTexts()).toEqual(["-30", "-40", "-50", "-60", "-70"]);

      await roll(POPUP_MS);
      expect(popups()).toHaveLength(0);
    });

    it("ignores the same hit coming through again and a cleared hit", async () => {
      show();
      await update({ lastHit: hit(1, 50) });
      await update({ lastHit: hit(1, 50) });
      expect(popups()).toHaveLength(1);

      await update({ lastHit: null });
      expect(popups()).toHaveLength(1);
    });

    it("hides the popups from assistive tech", async () => {
      show();
      await update({ lastHit: hit(1) });
      expect(wrapper!.find(".damage-popups").attributes("aria-hidden")).toBe("true");
    });

    it("clears its timers when the stage goes away", async () => {
      show();
      await update({ lastHit: hit(1) });
      await update({ enemy: makeEnemy({ id: "beast-2" }) });
      wrapper!.unmount();
      wrapper = undefined;
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe("taps", () => {
    it("emits tap when the stage is clicked", async () => {
      show();
      await wrapper!.find(".enemy-container").trigger("click");
      expect(wrapper!.emitted("tap")).toHaveLength(1);
    });

    it("emits tap for a click on the sprite or the name plate too", async () => {
      show();
      await wrapper!.find(".enemy-sprite").trigger("click");
      await wrapper!.find(".enemy-name").trigger("click");
      expect(wrapper!.emitted("tap")).toHaveLength(2);
    });

    it("is the hook the end-to-end walk-through finds the stage by", () => {
      show();
      expect(wrapper!.find(".enemy-container").attributes("data-cy")).toBe("enemy-stage");
    });
  });
});

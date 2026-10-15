import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import BattleVictoryCard from "../components/BattleVictoryCard.vue";
import type { VictoryCardState } from "../battle/battleView";

/**
 * The victory card in jsdom: the loot rolling up tile by tile, what a tap means before and after the numbers have
 * landed, and the ribbons for a held quest and a level-up. The card is presentational (no store, router or sounds),
 * so nothing is mocked; the fake clock drives the count-up. Its sound cues are events (`rolling`, `land`) that the page
 * turns into the points roll and the landing chimes.
 */

/** XP starts at 0 ms, GP at 250 ms and AP at 500 ms; each rolls 30 steps of 30 ms. The extra 50 ms is slack. */
const COUNT_UP_MS = 500 + 30 * 30 + 50;

const makeCard = (overrides: Partial<VictoryCardState> = {}): VictoryCardState => ({
  title: "VICTORY!",
  subtitle: "Socktopus was defeated!",
  rewards: { xp: 50, gp: 25, ap: 1 },
  choresDone: 2,
  elapsedMs: 125000,
  held: false,
  ...overrides,
});

type CardWrapper = ReturnType<typeof mount>;

describe("BattleVictoryCard", () => {
  let wrapper: CardWrapper | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    jest.useRealTimers();
  });

  const show = (props: { visible?: boolean; card?: VictoryCardState } = {}, attachTo?: HTMLElement) => {
    wrapper = mount(BattleVictoryCard, { props: { visible: true, card: makeCard(), ...props }, attachTo });
    return wrapper;
  };
  const value = (card: CardWrapper, stat: string) => card.find(`.reward-value[data-stat=${stat}]`).text();
  const values = (card: CardWrapper) => ["xp", "gp", "ap"].map((stat) => value(card, stat));
  /** Runs the fake clock, then lets Vue paint what changed. */
  const roll = async (ms: number) => {
    jest.advanceTimersByTime(ms);
    await nextTick();
  };

  describe("the count-up", () => {
    it("starts every tile at zero and rolls XP, GP and AP up one after another", async () => {
      const card = show();
      expect(values(card)).toEqual(["0", "0", "0"]);

      await roll(300);
      const [xp, gp, ap] = values(card).map(Number);
      expect(xp).toBeGreaterThan(0);
      expect(xp).toBeLessThan(50);
      expect(gp).toBeGreaterThan(0); // its first steps have landed
      expect(gp).toBeLessThan(25);
      expect(ap).toBe(0); // AP waits until 500 ms

      await roll(COUNT_UP_MS - 300);
      expect(values(card)).toEqual(["50", "25", "1"]);
    });

    it("never counts backwards and ends on the exact number", async () => {
      const card = show({ card: makeCard({ rewards: { xp: 137, gp: 0, ap: 0 } }) });
      const seen: number[] = [];
      for (let elapsed = 0; elapsed < COUNT_UP_MS; elapsed += 30) {
        await roll(30);
        seen.push(Number(value(card, "xp")));
      }
      expect(seen).toEqual([...seen].sort((a, b) => a - b));
      expect(new Set(seen).size).toBeGreaterThan(10); // it really rolled
      expect(seen[seen.length - 1]).toBe(137);
    });

    it("shrinks a number of five digits or more so it fits its tile", async () => {
      const card = show({ card: makeCard({ rewards: { xp: 12500, gp: 25, ap: 1 } }) });
      await roll(COUNT_UP_MS);
      expect(value(card, "xp")).toBe("12500");
      expect(card.find(".reward-value[data-stat=xp]").classes()).toContain("is-long");
      expect(card.find(".reward-value[data-stat=gp]").classes()).not.toContain("is-long");
    });

    it("rolls again every time the card is shown and clears itself when it is hidden", async () => {
      const card = show({ visible: false });
      await roll(2000);
      expect(values(card)).toEqual(["0", "0", "0"]); // nothing rolls behind the scenes
      expect(jest.getTimerCount()).toBe(0);

      await card.setProps({ visible: true });
      await roll(COUNT_UP_MS);
      expect(values(card)).toEqual(["50", "25", "1"]);

      await card.setProps({ visible: false });
      expect(values(card)).toEqual(["0", "0", "0"]);
      expect(jest.getTimerCount()).toBe(0);

      await card.setProps({ visible: true });
      await roll(100);
      expect(Number(value(card, "xp"))).toBeLessThan(50); // started over, not left at 50
      await roll(COUNT_UP_MS);
      expect(values(card)).toEqual(["50", "25", "1"]);
    });

    it("rolls new loot when the card changes while it is showing", async () => {
      const card = show();
      await roll(COUNT_UP_MS);
      await card.setProps({ card: makeCard({ rewards: { xp: 80, gp: 5, ap: 2 } }) });
      expect(values(card)).toEqual(["0", "0", "0"]);
      await roll(COUNT_UP_MS);
      expect(values(card)).toEqual(["80", "5", "2"]);
    });

    it("leaves no timer running when it goes away mid-count", async () => {
      const card = show();
      await roll(300);
      expect(jest.getTimerCount()).toBeGreaterThan(0);
      card.unmount();
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe("sound cues", () => {
    /** What the card told the page: when the roll sound ran, and which tiles landed a number. */
    const cues = (card: CardWrapper) => ({
      rolling: (card.emitted("rolling") ?? []).map(([on]) => on),
      land: (card.emitted("land") ?? []).map(([stat]) => stat),
    });

    it("starts the roll sound once for the whole count, not once per tile", async () => {
      const card = show();
      await roll(100);
      expect(cues(card).rolling).toEqual([true]);
      await roll(600); // GP and AP have begun rolling by now
      expect(cues(card).rolling).toEqual([true]);
    });

    it("rings one chime as each tile lands its exact number, in order, and rolls on until the last one", async () => {
      const card = show();
      await roll(890); // XP lands at ~900 ms
      expect(cues(card).land).toEqual([]);
      await roll(30);
      expect(cues(card).land).toEqual(["xp"]);
      expect(cues(card).rolling).toEqual([true]); // GP and AP are still counting

      await roll(250); // GP lands at ~1150 ms
      expect(cues(card).land).toEqual(["xp", "gp"]);
      expect(cues(card).rolling).toEqual([true]);

      await roll(250); // AP lands at ~1400 ms: the roll sound stops with the last number
      expect(cues(card).land).toEqual(["xp", "gp", "ap"]);
      expect(cues(card).rolling).toEqual([true, false]);

      await roll(COUNT_UP_MS);
      expect(cues(card).land).toEqual(["xp", "gp", "ap"]); // nothing rings twice
    });

    it("plays the landing chime once, and stops the roll, when a tap finishes the count early", async () => {
      const card = show();
      await roll(100);
      await card.trigger("click");
      expect(cues(card).land).toHaveLength(1);
      expect(cues(card).rolling).toEqual([true, false]);

      await roll(COUNT_UP_MS); // the cancelled chains stay silent
      expect(cues(card).land).toHaveLength(1);
      expect(cues(card).rolling).toEqual([true, false]);
    });

    it("chimes for the tiles a tap finished, not the ones that already landed", async () => {
      const card = show({ card: makeCard({ rewards: { xp: 500, gp: 250, ap: 100 } }) });
      await roll(920); // XP has landed; GP and AP are still counting
      expect(cues(card).land).toEqual(["xp"]);
      await card.trigger("click");
      expect(cues(card).land).toEqual(["xp", "gp"]); // one chime for everything the tap finished
      expect(cues(card).rolling).toEqual([true, false]);
    });

    it("ends the quiet tail without a chime when the digits are all showing but the last tile has not landed", async () => {
      const card = show();
      await roll(1000); // every digit is final (the count eases out), but AP's landing is still 400 ms away
      expect(card.classes()).not.toContain("is-counting");
      await card.trigger("click");
      expect(card.emitted("continue")).toHaveLength(1);
      expect(cues(card)).toEqual({ rolling: [true, false], land: ["xp"] });
    });

    it("stays silent for the tap that continues, and for tiles with no loot", async () => {
      const card = show({ card: makeCard({ rewards: { xp: 0, gp: 0, ap: 3 } }) });
      await roll(COUNT_UP_MS);
      expect(cues(card)).toEqual({ rolling: [true, false], land: ["ap"] });

      await card.trigger("click");
      expect(card.emitted("continue")).toHaveLength(1);
      expect(cues(card)).toEqual({ rolling: [true, false], land: ["ap"] });
    });

    it("makes no sound at all when nothing is won", async () => {
      const card = show({ card: makeCard({ rewards: { xp: 0, gp: 0, ap: 0 } }) });
      await roll(COUNT_UP_MS);
      expect(cues(card)).toEqual({ rolling: [], land: [] });
    });

    it("stops the roll sound when the card is hidden mid-count, and starts it again on a new roll", async () => {
      const card = show();
      await roll(300);
      await card.setProps({ visible: false });
      expect(cues(card).rolling).toEqual([true, false]);

      await card.setProps({ visible: true });
      await roll(100);
      expect(cues(card).rolling).toEqual([true, false, true]);
    });

    it("stops the roll sound when the card goes away mid-count", async () => {
      const onRolling = jest.fn();
      const card = mount(BattleVictoryCard, { props: { visible: true, card: makeCard(), onRolling } });
      await roll(300);
      expect(onRolling.mock.calls).toEqual([[true]]);
      card.unmount();
      expect(onRolling.mock.calls).toEqual([[true], [false]]);
    });
  });

  describe("taps", () => {
    it("completes every count on a tap while the tiles are still rolling, without continuing", async () => {
      const card = show();
      await roll(100);
      expect(value(card, "xp")).not.toBe("50");
      expect(card.classes()).toContain("is-counting");

      await card.trigger("click");
      expect(values(card)).toEqual(["50", "25", "1"]);
      expect(card.emitted("continue")).toBeUndefined();
      expect(card.classes()).not.toContain("is-counting");

      await roll(COUNT_UP_MS); // the cancelled chains must not write anything later
      expect(values(card)).toEqual(["50", "25", "1"]);
      expect(jest.getTimerCount()).toBe(0);
    });

    it("emits continue once on the tap after that", async () => {
      const card = show();
      await roll(100);
      await card.trigger("click");
      await card.trigger("click");
      expect(card.emitted("continue")).toHaveLength(1);
    });

    it("emits continue on a tap once the numbers have landed", async () => {
      const card = show();
      await roll(COUNT_UP_MS);
      await card.trigger("click");
      expect(card.emitted("continue")).toHaveLength(1);
    });

    it("treats Enter and Space like a tap, so the card works without a pointer", async () => {
      const card = show();
      await card.trigger("keyup", { key: "Enter" });
      expect(card.emitted("continue")).toBeUndefined(); // finished the count
      expect(values(card)).toEqual(["50", "25", "1"]);
      await card.trigger("keyup", { key: "Enter" });
      expect(card.emitted("continue")).toHaveLength(1);
      await card.trigger("keyup", { key: " " });
      expect(card.emitted("continue")).toHaveLength(2);
    });

    it("ignores taps while it is hidden", async () => {
      const card = show({ visible: false });
      expect(card.isVisible()).toBe(false);
      await card.trigger("click");
      expect(card.emitted("continue")).toBeUndefined();
      expect(values(card)).toEqual(["0", "0", "0"]);
    });

    it("has nothing to wait for when no loot is counting: the first tap continues", async () => {
      const card = show({ card: makeCard({ rewards: { xp: 0, gp: 0, ap: 0 } }) });
      await card.trigger("click");
      expect(card.emitted("continue")).toHaveLength(1);
    });

    it("does not wait for the empty tiles of a free fight (AP only)", async () => {
      const card = show({ card: makeCard({ rewards: { xp: 0, gp: 0, ap: 1 } }) });
      await roll(COUNT_UP_MS);
      await card.trigger("click");
      expect(card.emitted("continue")).toHaveLength(1);
      expect(card.find(".reward-tile[data-stat=xp]").classes()).toContain("is-zero");
      expect(card.find(".reward-tile[data-stat=gp]").classes()).toContain("is-zero");
      expect(card.find(".reward-tile[data-stat=ap]").classes()).not.toContain("is-zero");
    });

    it("takes the keyboard focus when it appears", async () => {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const card = show({}, host);
      await nextTick();
      expect(document.activeElement).toBe(card.element);
      card.unmount();
      wrapper = undefined;
      host.remove();
    });
  });

  describe("content", () => {
    it("exposes the hooks the page and the Cypress walk-through rely on", () => {
      const card = show();
      expect(card.attributes("data-cy")).toBe("victory-card");
      expect(card.attributes("role")).toBe("button");
      expect(card.attributes("tabindex")).toBe("0");
      expect(card.find(".victory-title").text()).toBe("VICTORY!");
      expect(card.find(".victory-subtitle").text()).toBe("Socktopus was defeated!");
      expect(card.find(".victory-footer").text()).toBe("Tap to continue ▼");
    });

    it("shows XP, GP and AP tiles with their labels and icons", () => {
      const card = show();
      const tiles = card.findAll(".reward-tile");
      expect(tiles.map((tile) => tile.attributes("data-stat"))).toEqual(["xp", "gp", "ap"]);
      expect(tiles.map((tile) => tile.find(".reward-label").text())).toEqual(["XP", "GP", "AP"]);
      expect(tiles[0].find("i").classes()).toEqual(expect.arrayContaining(["fad", "fa-star"]));
      expect(tiles[1].find("i").classes()).toEqual(expect.arrayContaining(["fad", "fa-coins"]));
      expect(tiles[2].find("i").classes()).toEqual(expect.arrayContaining(["fad", "fa-bolt"]));
      expect(card.findAll(".reward-tile.is-zero")).toHaveLength(0);
    });

    it("sums the fight up as chores and minutes", () => {
      expect(show().find(".victory-work").text()).toBe("2 chores in 2:05");
    });

    it.each([
      [1, 7000, "1 chore in 0:07"],
      [3, 61000, "3 chores in 1:01"],
      [0, 0, "0 chores in 0:00"],
      [12, 3725000, "12 chores in 62:05"],
      [4, 59999, "4 chores in 0:59"],
    ])("writes %i chores in %i ms as \"%s\"", (choresDone, elapsedMs, line) => {
      const card = show({ card: makeCard({ choresDone, elapsedMs }) });
      expect(card.find(".victory-work").text()).toBe(line);
    });

    it("names the quest when there is one", () => {
      expect(show().find(".victory-quest").exists()).toBe(false);
      wrapper?.unmount();
      const card = show({ card: makeCard({ title: "QUEST TAMED!", questName: "Laundry Day" }) });
      expect(card.find(".victory-title").text()).toBe("QUEST TAMED!");
      expect(card.find(".victory-quest").text()).toBe("Quest tamed: Laundry Day");
    });

    it("rains twelve sparkles that are decoration only", () => {
      const card = show();
      expect(card.findAll(".victory-star")).toHaveLength(12);
      const sky = card.find(".victory-stars");
      expect(sky.attributes("aria-hidden")).toBe("true");
      expect(sky.findAll(".victory-star")).toHaveLength(12);
    });
  });

  describe("ribbons", () => {
    it("announces a level-up", () => {
      expect(show().find(".victory-levelup").exists()).toBe(false);
      wrapper?.unmount();
      const card = show({ card: makeCard({ levelUp: { from: 3, to: 4 } }) });
      expect(card.find(".victory-levelup").text()).toBe("LEVEL UP! Lv 3 → 4");
    });

    it("names the hunt bonus the win added to the XP, and only then", () => {
      expect(show({ card: makeCard() }).find('[data-test="hunt-bonus"]').exists()).toBe(false);
      wrapper?.unmount();
      expect(show({ card: makeCard({ huntBonusXp: 30 }) }).find('[data-test="hunt-bonus"]').text()).toBe("Hunt bonus +30 XP");
      wrapper?.unmount();
      // A held quest is paid it once the Game Master approves
      expect(show({ card: makeCard({ huntBonusXp: 30, held: true }) }).find('[data-test="hunt-bonus"]').text()).toBe(
        "Hunt bonus +30 XP once approved"
      );
    });

    it("holds the loot for the Game Master: locked tiles and a waiting ribbon, still counting", async () => {
      const card = show({ card: makeCard({ held: true }) });
      expect(card.find(".victory-held").text()).toBe("Waiting for the Game Master");
      const tiles = card.findAll(".reward-tile");
      expect(tiles).toHaveLength(3);
      tiles.forEach((tile) => {
        expect(tile.classes()).toContain("is-held");
        expect(tile.find("i.fa-lock").exists()).toBe(true);
      });
      await roll(COUNT_UP_MS);
      expect(values(card)).toEqual(["50", "25", "1"]);
    });

    it("shows no lock and no waiting ribbon for loot that has landed", () => {
      const card = show();
      expect(card.find(".victory-held").exists()).toBe(false);
      expect(card.findAll(".reward-tile.is-held")).toHaveLength(0);
      expect(card.find("i.fa-lock").exists()).toBe(false);
    });
  });
});

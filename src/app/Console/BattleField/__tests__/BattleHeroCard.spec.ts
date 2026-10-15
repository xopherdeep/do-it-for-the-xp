import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import { effectScope, nextTick, ref, type EffectScope } from "vue";
import BattleHeroCard from "../components/BattleHeroCard.vue";
import { ROLL_STEP_MS, useBattlePlayer } from "../hooks/useBattlePlayer";
import { calculatePlayerStats } from "@/lib/services/stats/PlayerStatsService";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * The hero card in jsdom: the real user store, the real hook, fake timers. The card reads the hero from the
 * store and rolls its HP / MP odometers one step per tick, so these specs change the profile the way the engine
 * does (`updateUserHP`) and watch the tiles, the hidden numbers and the bars follow.
 */

// "003-gamer" and "999-gamer" go through the real require.context shim (jest stubs the SVG itself, so the lookup
// yields no URL); "007-gamer" is answered with a URL so the specs can see a resolved avatar reach the <img>.
jest.mock("@/lib/utils/requireImg", () => {
  const actual = jest.requireActual("@/lib/utils/requireImg");
  const requireAvatar = Object.assign(
    (key: string) => (key === "./007-gamer.svg" ? "/img/007-gamer.svg" : actual.requireAvatar(key)),
    actual.requireAvatar
  );
  return { __esModule: true, ...actual, requireAvatar };
});

const ROLL = ROLL_STEP_MS;

/** A stored hero the way the user store keeps one; `stats` and the rest can be overridden per spec. */
const heroProfile = (overrides: Record<string, unknown> = {}) => ({
  id: "hero-1",
  name: { nick: "Max", first: "Maximilian" },
  jobClass: "warrior",
  stats: { level: 2, hp: { now: 30, max: 30 }, mp: { now: 10, max: 10 } },
  ...overrides,
});

describe("BattleHeroCard", () => {
  let pinia: Pinia;
  let store: ReturnType<typeof useUserStore>;
  let wrapper: ReturnType<typeof mountCard> | undefined;

  // Mounted inside each spec: the card needs the pinia the spec just created.
  const mountCard = (props: Record<string, unknown> = {}) =>
    mount(BattleHeroCard, { props: { userId: "hero-1", ...props }, global: { plugins: [pinia] } });
  const card = () => wrapper!.find("[data-cy=hero-card]");
  const text = (selector: string) => wrapper!.find(selector).text();
  const tiles = () => wrapper!.findAll(".hp-digits .digit").map((tile) => tile.text());
  const barPercent = (selector: string) => parseFloat((wrapper!.find(selector).element as HTMLElement).style.width);
  /** Let the clock run and the DOM catch up. */
  const advance = async (ms: number) => {
    jest.advanceTimersByTime(ms);
    await nextTick();
  };
  /** The user store asks the browser for an async write on every HP change; none exists in jsdom. */
  const hit = (amount: number) => store.updateUserHP({ userId: "hero-1", amount });

  beforeEach(() => {
    jest.useFakeTimers();
    pinia = createPinia();
    setActivePinia(pinia);
    store = useUserStore();
    store.addUser(heroProfile());
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe("the hero", () => {
    it("shows the nick, the level and the real HP and MP the moment it opens", () => {
      wrapper = mountCard();

      expect(card().exists()).toBe(true);
      expect(text(".hero-name")).toBe("Max");
      expect(text(".hero-level")).toBe("Lv 2");
      expect(text(".hp-value")).toBe("30");
      expect(text(".mp-value")).toBe("10");
      expect(text(".mp-line")).toBe("MP 10/10");
      expect(text(".hp-max")).toBe("/ 30");
      expect(tiles()).toEqual(["", "3", "0"]); // leading zeros are blank tiles
      expect(barPercent(".hp-bar")).toBe(100);
      expect(barPercent(".mp-bar")).toBe(100);
      // The odometer starts on the real number: nothing is counting up from zero.
      expect(jest.getTimerCount()).toBe(0);
    });

    it("falls back from the nick to the first name to Hero", () => {
      store.addUser(heroProfile({ id: "first-only", name: { first: "Zed" } }));
      store.addUser(heroProfile({ id: "nameless", name: {} }));

      wrapper = mountCard({ userId: "first-only" });
      expect(text(".hero-name")).toBe("Zed");
      wrapper.unmount();

      wrapper = mountCard({ userId: "nameless" });
      expect(text(".hero-name")).toBe("Hero");
      expect(text(".hero-initial")).toBe("H");
    });

    it("keeps the card's size and hooks in the loading state while the hero is missing, then fills in", async () => {
      wrapper = mountCard({ userId: "late-hero" });
      expect(card().exists()).toBe(true);
      expect(card().classes()).toContain("is-loading");
      expect(card().text()).toBe("Loading...");
      expect(wrapper.find(".hp-value").exists()).toBe(false);

      store.addUser(heroProfile({ id: "late-hero", stats: { level: 5, hp: { now: 12, max: 40 }, mp: { now: 3, max: 8 } } }));
      await nextTick();

      expect(card().classes()).not.toContain("is-loading");
      expect(text(".hero-level")).toBe("Lv 5");
      // A hero who turns up after the card shows their real numbers at once, not a roll up from zero.
      expect(text(".hp-value")).toBe("12");
      expect(text(".mp-value")).toBe("3");
      expect(jest.getTimerCount()).toBe(0);
    });

    it("follows the userId prop to another hero without rolling", async () => {
      store.addUser(heroProfile({ id: "hero-2", name: { nick: "Ivy" }, stats: { level: 7, hp: { now: 90, max: 90 }, mp: { now: 0, max: 0 } } }));
      wrapper = mountCard();

      await wrapper.setProps({ userId: "hero-2" });

      expect(text(".hero-name")).toBe("Ivy");
      expect(text(".hp-value")).toBe("90");
      expect(text(".mp-line")).toBe("MP 0/0");
      expect(barPercent(".mp-bar")).toBe(0); // no MP at all is an empty bar, not a division by zero
      expect(jest.getTimerCount()).toBe(0);
    });

    it("takes the max from the profile and only computes one for a profile without it", async () => {
      store.addUser(heroProfile({ id: "bare", jobClass: "Mage", stats: { level: 3, hp: { now: 10 }, mp: { now: 5 } } }));
      const formula = calculatePlayerStats(3, "Mage", undefined, undefined, undefined, 1);

      wrapper = mountCard();
      expect(text(".hp-max")).toBe("/ 30"); // the stored max, whatever the formula says for a level 2 warrior
      wrapper.unmount();

      wrapper = mountCard({ userId: "bare" });
      expect(text(".hp-max")).toBe(`/ ${formula.hp.max}`);
      expect(text(".mp-line")).toBe(`MP 5/${formula.mp.max}`);
      expect(barPercent(".hp-bar")).toBeCloseTo((10 / formula.hp.max) * 100, 0);
    });
  });

  describe("the avatar", () => {
    it("renders an image for a hero with an avatar, with the URL when the lookup finds one", () => {
      store.addUser(heroProfile({ id: "gamer-3", avatar: "003-gamer" }));
      store.addUser(heroProfile({ id: "gamer-7", avatar: "007-gamer" }));

      wrapper = mountCard({ userId: "gamer-3" });
      expect(wrapper.find(".hero-avatar img").exists()).toBe(true);
      expect(wrapper.find(".hero-avatar img").attributes("src")).toBe(""); // jest stubs the SVG: no URL, still an <img>
      expect(wrapper.find(".hero-initial").exists()).toBe(false);
      wrapper.unmount();

      wrapper = mountCard({ userId: "gamer-7" });
      expect(wrapper.find(".hero-avatar img").attributes("src")).toBe("/img/007-gamer.svg");
    });

    it("renders the first letter of the nick on the disc when the hero has no avatar", () => {
      wrapper = mountCard();

      expect(wrapper.find(".hero-avatar img").exists()).toBe(false);
      expect(text(".hero-initial")).toBe("M");
    });

    it("takes a whole emoji, not half of one, as the first letter", () => {
      store.addUser(heroProfile({ id: "fox", name: { nick: "🦊 Fox" } }));
      wrapper = mountCard({ userId: "fox" });

      expect(text(".hero-initial")).toBe("🦊");
    });

    it("falls back to the letter when the picture will not load", async () => {
      store.addUser(heroProfile({ id: "gamer-9", avatar: "999-gamer" })); // there is no such file
      wrapper = mountCard({ userId: "gamer-9" });
      expect(wrapper.find(".hero-avatar img").exists()).toBe(true);

      await wrapper.find(".hero-avatar img").trigger("error");

      expect(wrapper.find(".hero-avatar img").exists()).toBe(false);
      expect(text(".hero-initial")).toBe("M");
    });
  });

  describe("the odometer", () => {
    it("rolls HP down one step per tick after damage and ends on the new number", async () => {
      wrapper = mountCard();
      const setIntervalSpy = jest.spyOn(window, "setInterval");
      const clearIntervalSpy = jest.spyOn(window, "clearInterval");

      hit(-7);
      await nextTick();
      expect(text(".hp-value")).toBe("30"); // the real HP is 23; the tiles have not moved yet

      await advance(3 * ROLL);
      expect(text(".hp-value")).toBe("27"); // three ticks, three points
      expect(tiles()).toEqual(["", "2", "7"]);

      await advance(7 * ROLL + ROLL); // the rest of the way, plus a tick to spare
      expect(text(".hp-value")).toBe("23");
      expect(tiles()).toEqual(["", "2", "3"]);
      expect(barPercent(".hp-bar")).toBeCloseTo((23 / 30) * 100, 0);
      expect(barPercent(".hp-bar")).toBeLessThan(100);

      // One interval for the whole roll, cancelled the moment it arrived.
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), ROLL);
      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
      await advance(10 * ROLL);
      expect(text(".hp-value")).toBe("23");
    });

    it("rolls up on a heal and carries a second hit that lands mid-roll on the same interval", async () => {
      wrapper = mountCard();
      const setIntervalSpy = jest.spyOn(window, "setInterval");

      hit(-10);
      await nextTick();
      await advance(4 * ROLL); // 30 -> 26
      hit(-4); // real HP 16, the roll is not done
      await nextTick();
      await advance(10 * ROLL); // 26 -> 16
      expect(text(".hp-value")).toBe("16");
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);

      hit(+9); // a heal rolls up
      await nextTick();
      await advance(9 * ROLL);
      expect(text(".hp-value")).toBe("25");
      expect(barPercent(".hp-bar")).toBeCloseTo((25 / 30) * 100, 0);
    });

    it("rolls MP the same way", async () => {
      wrapper = mountCard();

      store.users["hero-1"].stats.mp.now = 4;
      await nextTick();
      await advance(3 * ROLL);
      expect(text(".mp-value")).toBe("7");
      await advance(3 * ROLL + ROLL);
      expect(text(".mp-value")).toBe("4");
      expect(text(".mp-line")).toBe("MP 4/10");
      expect(barPercent(".mp-bar")).toBe(40);
    });

    it("rolls to a whole number and stops when the real HP is a fraction", async () => {
      store.addUser(heroProfile({ id: "half", stats: { level: 1, hp: { now: 12.5, max: 30 }, mp: { now: 0, max: 0 } } }));
      wrapper = mountCard({ userId: "half" });
      expect(text(".hp-value")).toBe("13");

      store.users["half"].stats.hp.now = 18.4;
      await nextTick();
      await advance(10 * ROLL);

      expect(text(".hp-value")).toBe("18");
      expect(jest.getTimerCount()).toBe(0); // it did not tick back and forth around 18.4
    });

    it("spills past 999 into the left tile instead of showing the wrong number", () => {
      store.addUser(heroProfile({ id: "titan", stats: { level: 99, hp: { now: 1234, max: 2000 }, mp: { now: 0, max: 0 } } }));
      wrapper = mountCard({ userId: "titan" });

      expect(tiles()).toEqual(["12", "3", "4"]);
      expect(text(".hp-value")).toBe("1234");
    });

    it("blanks only the leading zeros", () => {
      const shown = (now: number) => {
        store.addUser(heroProfile({ id: `hp-${now}`, stats: { level: 1, hp: { now, max: 999 }, mp: { now: 0, max: 0 } } }));
        const mounted = mountCard({ userId: `hp-${now}` });
        const digits = mounted.findAll(".hp-digits .digit").map((tile) => tile.text());
        mounted.unmount();
        return digits;
      };

      expect(shown(0)).toEqual(["", "", "0"]);
      expect(shown(7)).toEqual(["", "", "7"]);
      expect(shown(70)).toEqual(["", "7", "0"]);
      expect(shown(100)).toEqual(["1", "0", "0"]);
      expect(shown(999)).toEqual(["9", "9", "9"]);
    });

    it("cancels the interval when the card goes away mid-roll", async () => {
      wrapper = mountCard();
      const clearIntervalSpy = jest.spyOn(window, "clearInterval");

      hit(-20);
      await nextTick();
      await advance(2 * ROLL);
      expect(clearIntervalSpy).not.toHaveBeenCalled(); // still rolling

      wrapper.unmount();
      wrapper = undefined;

      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
      // Nothing is left to tick against a card that is gone.
      expect(() => jest.advanceTimersByTime(1000)).not.toThrow();
    });
  });

  describe("the bars", () => {
    it.each([
      [30, "", 100],
      [16, "", 53.3],
      [15, "is-mid", 50],
      [8, "is-mid", 26.7],
      [7, "is-low", 23.3],
      [0, "is-low", 0],
    ])("at %i of 30 HP the bar is %s", (now, tone, percent) => {
      store.addUser(heroProfile({ id: "bar", stats: { level: 1, hp: { now, max: 30 }, mp: { now: 10, max: 10 } } }));
      wrapper = mountCard({ userId: "bar" });

      const bar = wrapper.find(".hp-bar");
      expect(bar.classes().filter((name) => name.startsWith("is-"))).toEqual(tone ? [tone] : []);
      expect(barPercent(".hp-bar")).toBeCloseTo(percent, 1);
    });

    it("never draws past the ends of the track", () => {
      store.addUser(heroProfile({ id: "over", stats: { level: 1, hp: { now: 45, max: 30 }, mp: { now: -3, max: 10 } } }));
      wrapper = mountCard({ userId: "over" });

      expect(barPercent(".hp-bar")).toBe(100);
      expect(barPercent(".mp-bar")).toBe(0);
    });

    it("turns amber and then red as the odometer rolls under half and a quarter", async () => {
      wrapper = mountCard();
      expect(wrapper.find(".hp-bar").classes()).not.toContain("is-mid");

      hit(-16); // 14 left: 46%
      await nextTick();
      await advance(16 * ROLL);
      expect(wrapper.find(".hp-bar").classes()).toContain("is-mid");

      hit(-8); // 6 left: 20%
      await nextTick();
      await advance(8 * ROLL);
      expect(wrapper.find(".hp-bar").classes()).toContain("is-low");
      expect(wrapper.find(".hp-bar").classes()).not.toContain("is-mid");
    });
  });

  describe("the states", () => {
    it("shakes for 400 ms on each hit signal and only on an increment", async () => {
      wrapper = mountCard();
      expect(card().classes()).not.toContain("is-hit");

      await wrapper.setProps({ hitSignal: 1 });
      expect(card().classes()).toContain("is-hit");

      await advance(399);
      expect(card().classes()).toContain("is-hit");
      await advance(1);
      expect(card().classes()).not.toContain("is-hit");

      await wrapper.setProps({ hitSignal: 0 }); // the page resetting its counter is not a hit
      expect(card().classes()).not.toContain("is-hit");
    });

    it("restarts the shake for a second hit and holds it a full 400 ms from the latest one", async () => {
      wrapper = mountCard();

      await wrapper.setProps({ hitSignal: 1 });
      const firstShake = card().classes().includes("is-hit-b");
      await advance(300);
      await wrapper.setProps({ hitSignal: 2 });
      expect(card().classes()).toContain("is-hit");
      // The other of the two identical keyframes plays now, which is what starts a running shake over.
      expect(card().classes().includes("is-hit-b")).toBe(!firstShake);

      await advance(399); // 699 ms after the first hit: its timer would have ended the shake at 400
      expect(card().classes()).toContain("is-hit");
      await advance(1);
      expect(card().classes()).not.toContain("is-hit");
      expect(card().classes()).not.toContain("is-hit-b");
    });

    it("does not shake just because it opened on a hit count", () => {
      wrapper = mountCard({ hitSignal: 5 });

      expect(card().classes()).not.toContain("is-hit");
    });

    it("goes gray when the hero is down", async () => {
      wrapper = mountCard();
      expect(card().classes()).not.toContain("is-downed");

      await wrapper.setProps({ downed: true });
      expect(card().classes()).toContain("is-downed");

      await wrapper.setProps({ downed: false });
      expect(card().classes()).not.toContain("is-downed");
    });

    it("wears a DEFENDING badge while the hero is braced", async () => {
      wrapper = mountCard();
      expect(card().text()).not.toContain("DEFENDING");
      expect(card().classes()).not.toContain("is-defending");

      await wrapper.setProps({ defending: true });
      expect(card().text()).toContain("DEFENDING");
      expect(card().find("[data-cy=defending-badge]").text()).toBe("DEFENDING");
      expect(card().classes()).toContain("is-defending");

      await wrapper.setProps({ defending: false });
      expect(card().text()).not.toContain("DEFENDING");
    });

    it("clears its shake timer when it unmounts", async () => {
      wrapper = mountCard();
      const clearTimeoutSpy = jest.spyOn(window, "clearTimeout");
      await wrapper.setProps({ hitSignal: 1 });

      wrapper.unmount();
      wrapper = undefined;

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});

describe("useBattlePlayer", () => {
  let store: ReturnType<typeof useUserStore>;
  let scope: EffectScope;

  beforeEach(() => {
    jest.useFakeTimers();
    setActivePinia(createPinia());
    store = useUserStore();
    store.addUser(heroProfile());
    scope = effectScope(); // stands in for the component: stopping it is the unmount
  });

  afterEach(() => {
    scope.stop();
    jest.useRealTimers();
  });

  const run = <T>(setup: () => T): T => scope.run(setup) as T;

  it("reads everything from the store by id, with no loading step", () => {
    const hero = run(() => useBattlePlayer("hero-1"));

    expect(hero.isLoading.value).toBe(false);
    expect(hero.player.value?.id).toBe("hero-1");
    expect(hero.playerName.value).toBe("Max");
    expect(hero.level.value).toBe(2);
    expect(hero.hpNow.value).toBe(30);
    expect(hero.hpMax.value).toBe(30);
    expect(hero.hpDisplay.value).toBe(30);
    expect(hero.mpDisplay.value).toBe(10);
    expect(hero.formattedHp.value).toEqual({ thou: "", hun: "3", ten: "0" });
    expect(hero.formattedMp.value).toEqual({ thou: "", hun: "1", ten: "0" });
    expect(hero.hpPercentage.value).toBe(100);
    expect(hero.avatarSrc.value).toBe("");
  });

  it("is loading only while the hero is missing, for an unknown or empty id alike", () => {
    expect(run(() => useBattlePlayer("nobody")).isLoading.value).toBe(true);
    const empty = run(() => useBattlePlayer(""));
    expect(empty.isLoading.value).toBe(true);
    expect(empty.player.value).toBeNull();
    expect(empty.hpDisplay.value).toBe(0);
    expect(empty.playerName.value).toBe("Hero");
  });

  it("accepts a ref or a getter and follows it", async () => {
    store.addUser(heroProfile({ id: "hero-2", name: { nick: "Ivy" } }));
    const id = ref("hero-1");
    const viaRef = run(() => useBattlePlayer(id));
    const viaGetter = run(() => useBattlePlayer(() => id.value));

    expect(viaRef.playerName.value).toBe("Max");
    id.value = "hero-2";
    expect(viaRef.playerName.value).toBe("Ivy");
    expect(viaGetter.playerName.value).toBe("Ivy");
  });

  it("shows the signed-in hero when it is given no id at all", () => {
    store.currentUser.id = "hero-1";

    expect(run(() => useBattlePlayer()).playerName.value).toBe("Max");
  });

  it("never writes to the store", () => {
    const before = JSON.stringify(store.users);
    const hero = run(() => useBattlePlayer("hero-1"));
    void [hero.hpMax.value, hero.mpMax.value, hero.avatarSrc.value, hero.formattedHp.value];

    expect(JSON.stringify(store.users)).toBe(before);
  });

  it("clamps the level to at least 1 and the percentages to 0..100", () => {
    store.addUser(heroProfile({ id: "odd", stats: { level: 0, hp: { now: 99, max: 30 }, mp: { now: 5, max: 0 } } }));
    const hero = run(() => useBattlePlayer("odd"));

    expect(hero.level.value).toBe(1);
    expect(hero.hpPercentage.value).toBe(100);
    expect(hero.mpPercentage.value).toBe(0);
  });
});

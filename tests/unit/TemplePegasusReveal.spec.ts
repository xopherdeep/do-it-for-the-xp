import { mount } from "@vue/test-utils";
import TemplePegasusReveal from "@/app/Console/TempleGrounds/components/TemplePegasusReveal.vue";
import { PEGASI, PEGASUS_LOOK, pegasusOfTemple, pegasusView } from "@/lib/services/temples/TemplePegasus";
import { play$fx } from "@/assets/fx";

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));
jest.mock("@/lib/services/feedback/haptics", () => ({ __esModule: true, feel: jest.fn() }));

/**
 * The cleared-temple reveal in jsdom: an egg in the Pegasus's colours cracks, the Pegasus rises, "{Name} is free!"
 * types in and the reward counts up, then "Fly home" hands the hero back to the page. It is presentational (no store,
 * router or Ionic), so only the sounds and buzzes are mocked, and the clock is faked to walk the sequence.
 */

type RevealWrapper = ReturnType<typeof mount>;

const aura = { name: "Aura", color: "#badc58", secondaryColor: "#ffffff", world: "plains", temple: "Plains" };
const reward = { xp: 150, gp: 50, ap: 3 };

describe("TemplePegasusReveal", () => {
  let wrapper: RevealWrapper | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    (play$fx as jest.Mock).mockClear();
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    jest.useRealTimers();
  });

  const show = (props: Record<string, unknown> = {}) => {
    wrapper = mount(TemplePegasusReveal, {
      props: { open: true, pegasus: aura, reward, levelUp: false, ...props },
      global: { stubs: { transition: false } },
    });
    return wrapper;
  };
  /** Let the whole sequence play (egg, hatch, typing, count) */
  const playOut = async (reveal: RevealWrapper) => {
    jest.advanceTimersByTime(12000);
    await reveal.vm.$nextTick();
  };
  const flyButton = (reveal: RevealWrapper) => reveal.get('[data-cy="pegasus-fly-home"]');
  const tallyTexts = (reveal: RevealWrapper) => reveal.findAll(".pegasus-tally__item").map((item) => item.text());
  const sounds = () => (play$fx as jest.Mock).mock.calls.map((call) => call[0]);

  describe("the freed Pegasus", () => {
    it("says the Pegasus is free and counts up the reward, with Fly home at the bottom", async () => {
      const reveal = show();
      await playOut(reveal);
      expect(reveal.get('[data-cy="pegasus-line"]').text()).toBe("Aura is free!");
      expect(reveal.get('[data-cy="pegasus-line-typed"]').text()).toBe("Aura is free!");
      expect(tallyTexts(reveal)).toEqual(["+150 XP", "+50 GP", "+3 AP"]);
      expect(flyButton(reveal).text()).toBe("Fly home");
      expect(flyButton(reveal).classes()).not.toContain("is-waiting");
    });

    it("starts with the egg whole and the words unsaid, then cracks it in three steps", async () => {
      const reveal = show();
      expect(reveal.find('[data-cy="pegasus-egg"]').exists()).toBe(true);
      expect(reveal.get(".pegasus-reveal").classes()).toContain("is-egg");
      expect(reveal.get('[data-cy="pegasus-line-typed"]').text()).toBe("");
      expect(tallyTexts(reveal)).toEqual(["+0 XP", "+0 GP", "+0 AP"]);

      const cracks: string[] = [];
      for (let ms = 0; ms < 1700; ms += 20) {
        jest.advanceTimersByTime(20);
        await reveal.vm.$nextTick();
        const step = reveal.get('[data-cy="pegasus-egg"]').classes().find((name) => name.startsWith("crack-"))!;
        if (cracks[cracks.length - 1] !== step) cracks.push(step);
      }
      expect(cracks).toEqual(["crack-0", "crack-1", "crack-2", "crack-3"]);
      // Still an egg until the shell breaks
      expect(reveal.get(".pegasus-reveal").classes()).toContain("is-egg");
    });

    it("plays the secret sting on the crack, then the win when the Pegasus rises, once each", async () => {
      const reveal = show();
      expect(sounds()).toEqual([]);
      await playOut(reveal);
      expect(sounds().filter((key) => key === "shhh")).toHaveLength(1);
      expect(sounds().filter((key) => key === "win")).toHaveLength(1);
      expect(sounds().indexOf("shhh")).toBeLessThan(sounds().indexOf("win"));
    });

    it("types the line a letter at a time and counts the reward up to its total", async () => {
      const reveal = show();
      let partial = "";
      let counting = "";
      for (let ms = 0; ms < 5000 && !(partial && counting); ms += 40) {
        jest.advanceTimersByTime(40);
        await reveal.vm.$nextTick();
        const typed = reveal.get('[data-cy="pegasus-line-typed"]').text();
        if (!partial && typed.length > 0 && typed.length < "Aura is free!".length) partial = typed;
        const xp = tallyTexts(reveal)[0];
        if (!counting && xp !== "+0 XP" && xp !== "+150 XP") counting = xp;
      }
      expect(partial).toBe("Aura is free!".slice(0, partial.length));
      expect(counting).toMatch(/^\+\d+ XP$/);
      await playOut(reveal);
      expect(tallyTexts(reveal)[0]).toBe("+150 XP");
    });

    it("lights Level up! only when the hero levelled up, after the count", async () => {
      const plain = show({ levelUp: false });
      await playOut(plain);
      expect(plain.find('[data-cy="pegasus-levelup"]').exists()).toBe(false);
      plain.unmount();

      const reveal = show({ levelUp: true });
      expect(reveal.get('[data-cy="pegasus-levelup"]').classes()).not.toContain("is-shown");
      await playOut(reveal);
      expect(reveal.get('[data-cy="pegasus-levelup"]').text()).toBe("Level up!");
      expect(reveal.get('[data-cy="pegasus-levelup"]').classes()).toContain("is-shown");
    });

    it("leaves out a stat the temple paid nothing in, and the whole tally when it paid nothing", async () => {
      const partial = show({ reward: { xp: 150, gp: 0, ap: 3 } });
      await playOut(partial);
      expect(tallyTexts(partial)).toEqual(["+150 XP", "+3 AP"]);
      partial.unmount();

      const bare = show({ reward: { xp: 0, gp: 0, ap: 0 } });
      await playOut(bare);
      expect(bare.find('[data-cy="pegasus-tally"]').exists()).toBe(false);
      expect(bare.get('[data-cy="pegasus-line"]').text()).toBe("Aura is free!");
    });

    it("paints the egg and the light in the Pegasus's own colours", () => {
      const reveal = show({ pegasus: { ...aura, color: "#ff4757", secondaryColor: "#f1c40f" } });
      const style = reveal.get(".pegasus-reveal").attributes("style") ?? "";
      expect(style).toContain("--peg-color: #ff4757");
      expect(style).toContain("--peg-color-2: #f1c40f");
      expect(style).toContain("--reveal-glow: #ff4757");
    });

    it("lights a Pegasus too dark to glow with its second colour (Umbra)", () => {
      const reveal = show({ pegasus: { name: "Umbra", color: "#130f40", secondaryColor: "#ffffff", world: "moon", temple: "Moon Temple" } });
      const style = reveal.get(".pegasus-reveal").attributes("style") ?? "";
      expect(style).toContain("--peg-color: #130f40");
      expect(style).toContain("--reveal-glow: #ffffff");
    });
  });

  describe("Fly home", () => {
    it("emits done when the sequence is over", async () => {
      const reveal = show();
      await playOut(reveal);
      await flyButton(reveal).trigger("click");
      expect(reveal.emitted("done")).toHaveLength(1);
    });

    it("emits done only once, however fast the taps come", async () => {
      const reveal = show();
      await playOut(reveal);
      await flyButton(reveal).trigger("click");
      await flyButton(reveal).trigger("click");
      expect(reveal.emitted("done")).toHaveLength(1);
    });

    it("skips to the end on the first tap instead of leaving, and leaves on the second", async () => {
      const reveal = show({ levelUp: true });
      expect(flyButton(reveal).classes()).toContain("is-waiting");
      await flyButton(reveal).trigger("click");
      expect(reveal.emitted("done")).toBeUndefined();
      expect(reveal.get(".pegasus-reveal").classes()).toContain("is-ready");
      expect(reveal.get('[data-cy="pegasus-line-typed"]').text()).toBe("Aura is free!");
      expect(tallyTexts(reveal)).toEqual(["+150 XP", "+50 GP", "+3 AP"]);
      expect(reveal.get('[data-cy="pegasus-levelup"]').classes()).toContain("is-shown");
      // The win still sounds, once, even though the egg never finished cracking
      expect(sounds().filter((key) => key === "win")).toHaveLength(1);

      await flyButton(reveal).trigger("click");
      expect(reveal.emitted("done")).toHaveLength(1);
    });

    it("skips to the end on a tap anywhere on the stage", async () => {
      const reveal = show();
      await reveal.get(".pegasus-reveal").trigger("click");
      expect(reveal.get(".pegasus-reveal").classes()).toContain("is-ready");
      expect(reveal.emitted("done")).toBeUndefined();
    });

    it("works the same from Escape", async () => {
      const reveal = show();
      await reveal.get(".pegasus-reveal").trigger("keydown", { key: "Escape" });
      expect(reveal.emitted("done")).toBeUndefined();
      await reveal.get(".pegasus-reveal").trigger("keydown", { key: "Escape" });
      expect(reveal.emitted("done")).toHaveLength(1);
    });
  });

  describe("a temple with no Pegasus", () => {
    it("says the temple is cleared, with no egg", async () => {
      const reveal = show({ pegasus: null });
      expect(reveal.find('[data-cy="pegasus-egg"]').exists()).toBe(false);
      await playOut(reveal);
      expect(reveal.get('[data-cy="pegasus-line"]').text()).toBe("The temple is cleared!");
      expect(reveal.text()).not.toContain("is free");
      expect(tallyTexts(reveal)).toEqual(["+150 XP", "+50 GP", "+3 AP"]);
      expect(sounds().filter((key) => key === "win")).toHaveLength(1);
      expect(sounds()).not.toContain("shhh");
    });

    it("still ends with Fly home", async () => {
      const reveal = show({ pegasus: null });
      await playOut(reveal);
      await flyButton(reveal).trigger("click");
      expect(reveal.emitted("done")).toHaveLength(1);
    });
  });

  describe("opening and closing", () => {
    it("draws nothing while closed, and plays from the start each time it opens", async () => {
      const reveal = show({ open: false });
      expect(reveal.find('[data-cy="pegasus-reveal"]').exists()).toBe(false);

      await reveal.setProps({ open: true });
      await playOut(reveal);
      await flyButton(reveal).trigger("click");
      expect(reveal.emitted("done")).toHaveLength(1);

      await reveal.setProps({ open: false });
      await reveal.setProps({ open: true });
      expect(reveal.get(".pegasus-reveal").classes()).toContain("is-egg");
      expect(reveal.get('[data-cy="pegasus-line-typed"]').text()).toBe("");
      await playOut(reveal);
      await flyButton(reveal).trigger("click");
      expect(reveal.emitted("done")).toHaveLength(2);
    });

    it("stops its clock when it closes", async () => {
      const reveal = show();
      await reveal.setProps({ open: false });
      (play$fx as jest.Mock).mockClear();
      jest.advanceTimersByTime(12000);
      expect(sounds()).toEqual([]);
    });
  });
});

describe("the Pegasus a temple keeps, as the reveal draws it", () => {
  it("has a look for each of the nine Pegasi, in their order", () => {
    expect(PEGASUS_LOOK).toHaveLength(PEGASI.length);
    PEGASI.forEach((pegasus, index) => {
      expect(PEGASUS_LOOK[index].name).toBe(pegasus.name);
      expect(PEGASUS_LOOK[index].id).toBe(pegasus.name.toLowerCase());
      expect(PEGASUS_LOOK[index].color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(PEGASUS_LOOK[index].secondaryColor).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it("paints the wind temple's Aura in green and white", () => {
    expect(pegasusView("wind-temple")).toEqual({
      name: "Aura",
      color: "#badc58",
      secondaryColor: "#ffffff",
      world: "plains",
      temple: "Plains",
    });
  });

  it("paints every temple's Pegasus, and none for a temple that keeps no Pegasus", () => {
    ["wind-temple", "fire-temple", "ice-temple", "moon-temple", "storm-temple"].forEach((templeId) => {
      const view = pegasusView(templeId);
      expect(view?.name).toBe(pegasusOfTemple(templeId)?.name);
      expect(view?.color).toBeTruthy();
    });
    expect(pegasusView("no-such-temple")).toBeNull();
    expect(pegasusView("gen-some-seed")).toBeNull();
  });
});

import { mount } from "@vue/test-utils";
import TempleChestReveal from "@/app/Console/TempleGrounds/components/TempleChestReveal.vue";
import { chestLoot } from "@/lib/services/temples/ChestLoot";
import { play$fx } from "@/assets/fx";

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));
jest.mock("@/lib/services/feedback/haptics", () => ({ __esModule: true, feel: jest.fn(), rumble: jest.fn(() => () => undefined) }));

/**
 * The treasure chest reveal in jsdom. A chest that comes `closed` lands shut and waits with Leave and Open; Open plays
 * the lid and loot sequence and from there it is the same chest as ever (rows to pick, Take). A chest that is not
 * `closed` plays by itself, and an empty one only offers Leave. Presentational: only sounds and buzzes are mocked,
 * and the clock is faked to walk the sequence.
 */

type RevealWrapper = ReturnType<typeof mount>;

const bossKey = chestLoot({ chest: "dungeon", dungeon: "master-key" });
const supplies = chestLoot({ chest: "loot", items: ["potion", "ether"], gold: 20 });

describe("TempleChestReveal", () => {
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
    wrapper = mount(TempleChestReveal, {
      props: { open: true, loot: supplies, ...props },
      // The reveal is teleported to the app root in the page; here its slot is drawn in place
      global: { stubs: { transition: false, teleport: true } },
    });
    return wrapper;
  };
  const playOut = async (reveal: RevealWrapper) => {
    jest.advanceTimersByTime(6000);
    await reveal.vm.$nextTick();
  };
  const sounds = () => (play$fx as jest.Mock).mock.calls.map((call) => call[0]);
  const phase = (reveal: RevealWrapper) => reveal.get(".chest-reveal").classes().find((name) => name.startsWith("is-") && name !== "is-empty");
  const openButton = (reveal: RevealWrapper) => reveal.get('[data-cy="chest-open"]');
  const leaveButton = (reveal: RevealWrapper) => reveal.get('[data-cy="chest-leave"]');
  const rows = (reveal: RevealWrapper) => reveal.findAll(".loot-row").map((row) => row.get(".loot-row__name").text());

  describe("a shut chest", () => {
    it("lands shut with the chest on screen and two buttons: Leave and Open", () => {
      const reveal = show({ closed: true });

      expect(phase(reveal)).toBe("is-closed");
      expect(reveal.find(".chest-sprite").exists()).toBe(true);
      expect(reveal.get(".chest-reveal__title").text()).toBe("A chest!");
      expect(leaveButton(reveal).text()).toBe("Leave");
      expect(openButton(reveal).text()).toBe("Open");
      expect(openButton(reveal).attributes("disabled")).toBeUndefined();
      // Nothing of what is inside shows, and the loot is not taken
      expect(reveal.findAll(".loot-row")).toHaveLength(0);
      expect(reveal.find('[data-cy="chest-take"]').exists()).toBe(false);
      expect(reveal.find(".loot-orb.is-out").exists()).toBe(false);
    });

    it("waits: nothing opens by itself, however long it is left", async () => {
      const reveal = show({ closed: true });

      await playOut(reveal);

      expect(phase(reveal)).toBe("is-closed");
      expect(sounds()).not.toContain("openChest");
    });

    it("does not open on a tap anywhere but its button", async () => {
      const reveal = show({ closed: true });

      await reveal.get(".chest-reveal").trigger("click");
      await reveal.get(".chest-reveal__panel").trigger("click");

      expect(phase(reveal)).toBe("is-closed");
      expect(reveal.emitted("take")).toBeUndefined();
    });

    it("does not say what is in it before it is opened (the light stays dark)", () => {
      const reveal = show({ closed: true, loot: chestLoot({ chest: "dungeon", dungeon: "Pegasus Whistle", pegasus: true }) });

      expect(reveal.get(".chest-reveal").classes().some((name) => name.startsWith("glow-") && name !== "glow-item")).toBe(false);
      expect(reveal.get(".chest-reveal__title").text()).not.toMatch(/relic/i);
    });

    it("Open plays the lid sequence, then the loot is there to pick and take, as in any chest", async () => {
      const reveal = show({ closed: true });

      await openButton(reveal).trigger("click");
      expect(phase(reveal)).toBe("is-rattle");
      expect(reveal.get(".chest-reveal__title").text()).toBe("A chest!");
      // Its buttons are away while it shakes
      expect(openButton(reveal).attributes("disabled")).toBeDefined();

      await playOut(reveal);
      expect(phase(reveal)).toBe("is-ready");
      expect(sounds().filter((key) => key === "openChest")).toHaveLength(1);
      expect(reveal.get(".chest-reveal__title").text()).toBe("Treasure!");
      expect(rows(reveal)).toEqual(["Potion", "Ether", "20 GP"]);
      expect(reveal.find('[data-cy="chest-open"]').exists()).toBe(false);

      // Only what is ticked is taken
      await reveal.get('[data-cy="chest-loot-potion"]').trigger("click");
      await reveal.get('[data-cy="chest-loot-gold:20"]').trigger("click");
      await reveal.get('[data-cy="chest-take"]').trigger("click");
      expect(reveal.emitted("take")).toEqual([[["potion", "gold:20"]]]);
    });

    it("Open shows a Boss Key chest's one key and takes it", async () => {
      const reveal = show({ closed: true, loot: bossKey });

      await openButton(reveal).trigger("click");
      await playOut(reveal);

      expect(rows(reveal)).toEqual(["Boss Key"]);
      // The Boss Key is the skeleton key; a small key stays the plain key
      expect(reveal.get(".loot-row__slot i").classes()).toContain("fa-key-skeleton");
      expect(reveal.get('[data-cy="chest-take"]').text()).toBe("Take");
      // Opening only shows the key; it is taken once it is ticked and Take is pressed
      expect(reveal.emitted("take")).toBeUndefined();
      await reveal.get('[data-cy="chest-loot-master-key"]').trigger("click");
      await reveal.get('[data-cy="chest-take"]').trigger("click");
      expect(reveal.emitted("take")).toEqual([[["master-key"]]]);
    });

    it("Open presses once: a second tap during the shake changes nothing", async () => {
      const reveal = show({ closed: true });

      await openButton(reveal).trigger("click");
      await openButton(reveal).trigger("click");
      await playOut(reveal);

      expect(sounds().filter((key) => key === "openChest")).toHaveLength(1);
      expect(phase(reveal)).toBe("is-ready");
    });

    it("a tap while the lid is flying shows everything at once, like any opening chest", async () => {
      const reveal = show({ closed: true });

      await openButton(reveal).trigger("click");
      await reveal.get(".chest-reveal").trigger("click");

      expect(phase(reveal)).toBe("is-ready");
      expect(rows(reveal)).toEqual(["Potion", "Ether", "20 GP"]);
    });

    it("Leave closes it without opening it", async () => {
      const reveal = show({ closed: true });

      await leaveButton(reveal).trigger("click");

      expect(reveal.emitted("leave")).toHaveLength(1);
      expect(reveal.emitted("take")).toBeUndefined();
      expect(sounds()).not.toContain("openChest");
    });

    it("leaves on Escape", async () => {
      const reveal = show({ closed: true });

      await reveal.get(".chest-reveal").trigger("keydown", { key: "Escape" });

      expect(reveal.emitted("leave")).toHaveLength(1);
    });

    it("lands shut again each time it comes up", async () => {
      const reveal = show({ closed: true });
      await openButton(reveal).trigger("click");
      await playOut(reveal);
      expect(phase(reveal)).toBe("is-ready");

      await reveal.setProps({ open: false });
      await reveal.setProps({ open: true });

      expect(phase(reveal)).toBe("is-closed");
      expect(reveal.findAll(".loot-row")).toHaveLength(0);
    });
  });

  describe("a chest that is not shut", () => {
    it("plays by itself, as it always did: no Open button, Take at the end", async () => {
      const reveal = show();

      expect(reveal.find('[data-cy="chest-open"]').exists()).toBe(false);
      await playOut(reveal);

      expect(phase(reveal)).toBe("is-ready");
      expect(rows(reveal)).toEqual(["Potion", "Ether", "20 GP"]);
      // Nothing ticked yet: it only says Take
      expect(reveal.get('[data-cy="chest-take"]').text()).toBe("Take");
      expect(leaveButton(reveal).text()).toBe("Leave");
    });
  });

  describe("taking only what is ticked", () => {
    const ready = async (props: Record<string, unknown> = {}) => {
      const reveal = show(props);
      await playOut(reveal);
      return reveal;
    };
    const tick = (reveal: RevealWrapper, value: string) => reveal.get(`[data-cy="chest-loot-${value}"]`).trigger("click");
    const take = (reveal: RevealWrapper) => reveal.get('[data-cy="chest-take"]').trigger("click");

    it("two rows, one ticked: only that one is taken, and the other is left for the chest to keep", async () => {
      const reveal = await ready({ loot: chestLoot({ items: ["potion", "ether"] }) });

      await tick(reveal, "ether");
      expect(reveal.get('[data-cy="chest-take"]').text()).toBe("Take 1");
      await take(reveal);

      expect(reveal.emitted("take")).toEqual([[["ether"]]]);
      // The potion is shown as left behind as the chest closes
      expect(reveal.findAll(".loot-orb").map((orb) => orb.classes().includes("is-left"))).toEqual([true, false]);
    });

    it("hands the ticked rows over in the chest's order, whatever order they were ticked in", async () => {
      const reveal = await ready();

      await tick(reveal, "gold:20");
      await tick(reveal, "potion");
      await take(reveal);

      expect(reveal.emitted("take")).toEqual([[["potion", "gold:20"]]]);
    });

    it("every row ticked takes every row, and says Take all", async () => {
      const reveal = await ready();

      await tick(reveal, "potion");
      await tick(reveal, "ether");
      await tick(reveal, "gold:20");
      expect(reveal.get('[data-cy="chest-take"]').text()).toBe("Take all");
      await take(reveal);

      expect(reveal.emitted("take")).toEqual([[["potion", "ether", "gold:20"]]]);
    });

    it("a ticked row can be unticked again before Take", async () => {
      const reveal = await ready();

      await tick(reveal, "potion");
      await tick(reveal, "ether");
      await tick(reveal, "potion");
      await take(reveal);

      expect(reveal.emitted("take")).toEqual([[["ether"]]]);
    });

    it("keeps Take disabled while nothing is ticked: a click takes nothing", async () => {
      const reveal = await ready();

      expect(reveal.get('[data-cy="chest-take"]').attributes("disabled")).toBeDefined();
      await take(reveal);

      expect(reveal.emitted("take")).toBeUndefined();
      expect(reveal.emitted("leave")).toBeUndefined();
      // The chest is still open with every row there, to be ticked
      expect(phase(reveal)).toBe("is-ready");
      expect(rows(reveal)).toEqual(["Potion", "Ether", "20 GP"]);
    });

    it("enables Take the moment one row is ticked, and disables it again when it is unticked", async () => {
      const reveal = await ready();

      await tick(reveal, "ether");
      expect(reveal.get('[data-cy="chest-take"]').attributes("disabled")).toBeUndefined();

      await tick(reveal, "ether");
      expect(reveal.get('[data-cy="chest-take"]').attributes("disabled")).toBeDefined();
      await take(reveal);
      expect(reveal.emitted("take")).toBeUndefined();
    });

    it("takes the ticked row once it is ticked", async () => {
      const reveal = await ready();
      await take(reveal);

      await tick(reveal, "ether");
      await take(reveal);

      expect(reveal.emitted("take")).toEqual([[["ether"]]]);
    });

    it("never takes a thing on Open: the closed chest only opens and shows its rows", async () => {
      const reveal = show({ closed: true });

      await openButton(reveal).trigger("click");
      await playOut(reveal);

      expect(reveal.emitted("take")).toBeUndefined();
      expect(rows(reveal)).toEqual(["Potion", "Ether", "20 GP"]);
      expect(reveal.findAll(".loot-row.is-picked")).toHaveLength(0);
    });

    it("a chest of one row asks for it to be ticked too", async () => {
      const reveal = await ready({ loot: bossKey });

      expect(reveal.get('[data-cy="chest-take"]').attributes("disabled")).toBeDefined();
      await take(reveal);
      expect(reveal.emitted("take")).toBeUndefined();

      await tick(reveal, "master-key");
      await take(reveal);
      expect(reveal.emitted("take")).toEqual([[["master-key"]]]);
    });

    it("starts every time it opens with nothing ticked", async () => {
      const reveal = await ready();
      await tick(reveal, "potion");

      await reveal.setProps({ open: false });
      await reveal.setProps({ open: true });
      await playOut(reveal);

      expect(reveal.findAll(".loot-row.is-picked")).toHaveLength(0);
      expect(reveal.get('[data-cy="chest-take"]').attributes("disabled")).toBeDefined();
      await take(reveal);
      expect(reveal.emitted("take")).toBeUndefined();
    });
  });

  describe("a Pegasus chest", () => {
    const egg = { name: "Aura's Egg", color: "#badc58", secondaryColor: "#ffffff" };
    const wind = chestLoot(
      { chest: "dungeon", dungeon: "Pegasus Whistle", pegasus: true, items: ["Wind Whistle"] },
      egg
    );

    it("comes with its rows ticked, so Take is ready at once", async () => {
      const reveal = show({ loot: wind });
      await playOut(reveal);

      expect(rows(reveal)).toEqual(["Aura's Egg", "Wind Whistle"]);
      expect(reveal.findAll(".loot-row.is-picked")).toHaveLength(2);
      expect(reveal.get('[data-cy="chest-take"]').attributes("disabled")).toBeUndefined();
      expect(reveal.get('[data-cy="chest-take"]').text()).toBe("Take all");

      await reveal.get('[data-cy="chest-take"]').trigger("click");
      expect(reveal.emitted("take")).toEqual([[["Pegasus Whistle", "Wind Whistle"]]]);
    });

    it("takes only the egg once the whistle is unticked, and the whistle stays", async () => {
      const reveal = show({ loot: wind });
      await playOut(reveal);

      await reveal.get('[data-cy="chest-loot-Wind Whistle"]').trigger("click");
      expect(reveal.get('[data-cy="chest-take"]').text()).toBe("Take 1");
      await reveal.get('[data-cy="chest-take"]').trigger("click");

      expect(reveal.emitted("take")).toEqual([[["Pegasus Whistle"]]]);
    });

    it("paints the egg's icon in the Pegasus's shell colours, and leaves the whistle's icon alone", async () => {
      const reveal = show({ loot: wind });
      await playOut(reveal);

      const icons = reveal.findAll(".loot-row__slot i");
      expect(icons[0].classes()).toEqual(expect.arrayContaining(["fa-egg", "is-tinted"]));
      expect(icons[0].attributes("style")).toContain("--fa-primary-color: #badc58");
      expect(icons[0].attributes("style")).toContain("--fa-secondary-color: #ffffff");
      expect(icons[1].classes()).toContain("fa-whistle");
      expect(icons[1].attributes("style") ?? "").not.toContain("--fa-primary-color");
    });

    it("starts shut with its rows ticked after Open, never taking anything on Open", async () => {
      const reveal = show({ loot: wind, closed: true });
      await openButton(reveal).trigger("click");
      await playOut(reveal);

      expect(reveal.emitted("take")).toBeUndefined();
      expect(reveal.findAll(".loot-row.is-picked")).toHaveLength(2);
    });
  });

  describe("an empty chest", () => {
    it("opens by itself, showing the open empty chest, with only Leave", async () => {
      const reveal = show({ loot: [] });

      expect(reveal.find('[data-cy="chest-open"]').exists()).toBe(false);
      expect(reveal.find('[data-cy="chest-take"]').exists()).toBe(false);
      await playOut(reveal);

      expect(phase(reveal)).toBe("is-ready");
      expect(reveal.get(".chest-reveal__title").text()).toBe("Empty...");
      const leave = reveal.get('[data-cy="chest-close"]');
      expect(leave.text()).toBe("Leave");
      expect(reveal.findAll("button")).toHaveLength(1);

      await leave.trigger("click");
      expect(reveal.emitted("leave")).toHaveLength(1);
    });

    it("never waits shut, even when it is told to", async () => {
      const reveal = show({ loot: [], closed: true });

      expect(reveal.find('[data-cy="chest-open"]').exists()).toBe(false);
      await playOut(reveal);

      expect(phase(reveal)).toBe("is-ready");
      expect(reveal.get(".chest-reveal__title").text()).toBe("Empty...");
    });
  });
});

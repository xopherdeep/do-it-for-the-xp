import { mount } from "@vue/test-utils";
import TempleChoiceReveal from "@/app/Console/TempleGrounds/components/TempleChoiceReveal.vue";

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));

/**
 * The temple's choice reveal in jsdom: the riddle on the wall, the shopkeeper's wares and a room's actions. It is
 * presentational (no store, router or Ionic), so only the sounds are mocked. A riddle or a shop picks one row and then
 * confirms; a sheet's rows act at once; the cancel button emits `leave` in every kind.
 */

type RevealWrapper = ReturnType<typeof mount>;

const riddleChoices = [
  { id: "0", label: "A shadow" },
  { id: "1", label: "A door" },
  { id: "2", label: "A pillar" },
];

const wares = [
  { id: "potion", label: "Potion of Vigor", hint: "Heals 20 HP", price: 10 },
  { id: "special:ether", label: "Ether", hint: "Restores MP", price: 25, disabled: true },
  { id: "special:gem", label: "Moon Gem", hint: "Shiny", price: 40 },
];

const actions = [
  { id: "0", label: "Look around" },
  { id: "1", label: "Search the walls" },
];

describe("TempleChoiceReveal", () => {
  let wrapper: RevealWrapper | undefined;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  const show = (props: Record<string, unknown>) => {
    wrapper = mount(TempleChoiceReveal, {
      props: { open: true, kind: "riddle", title: "The Glyphs", choices: riddleChoices, ...props },
      global: { stubs: { transition: false } },
    });
    return wrapper;
  };
  const row = (reveal: RevealWrapper, id: string) => reveal.get(`[data-cy="choice-${id}"]`);
  const confirmButton = (reveal: RevealWrapper) => reveal.get('[data-cy="choice-confirm"]');
  const leaveButton = (reveal: RevealWrapper) => reveal.get('[data-cy="choice-leave"]');

  describe("the riddle", () => {
    const riddle = { kind: "riddle", body: "I stand on no feet and hold up the sky. What am I?" };

    it("shows the glyphs, the question and every answer, with the buttons under them", () => {
      const reveal = show(riddle);
      expect(reveal.get(".choice-reveal__title").text()).toBe("The Glyphs");
      expect(reveal.get('[data-cy="choice-body"]').text()).toContain("hold up the sky");
      expect(reveal.findAll(".choice-row").map((item) => item.text())).toEqual(["A shadow", "A door", "A pillar"]);
      expect(confirmButton(reveal).text()).toBe("Answer");
      expect(leaveButton(reveal).text()).toBe("Step back");
      // The pixel tablet sits above the panel
      expect(reveal.find(".choice-sprite").exists()).toBe(true);
    });

    it("keeps Answer disabled until a choice is picked, then emits that choice's id", async () => {
      const reveal = show(riddle);
      expect(confirmButton(reveal).attributes("disabled")).toBeDefined();
      await confirmButton(reveal).trigger("click");
      expect(reveal.emitted("choose")).toBeUndefined();

      await row(reveal, "2").trigger("click");
      expect(row(reveal, "2").classes()).toContain("is-selected");
      expect(row(reveal, "2").attributes("aria-checked")).toBe("true");
      expect(confirmButton(reveal).attributes("disabled")).toBeUndefined();
      // Picking a row only selects it
      expect(reveal.emitted("choose")).toBeUndefined();

      await confirmButton(reveal).trigger("click");
      expect(reveal.emitted("choose")).toEqual([["2"]]);
    });

    it("selects one row at a time and answers with the last one tapped", async () => {
      const reveal = show(riddle);
      await row(reveal, "0").trigger("click");
      await row(reveal, "1").trigger("click");
      expect(row(reveal, "0").classes()).not.toContain("is-selected");
      expect(row(reveal, "1").classes()).toContain("is-selected");

      await confirmButton(reveal).trigger("click");
      expect(reveal.emitted("choose")).toEqual([["1"]]);
    });

    it("answers only once, however fast the taps come", async () => {
      const reveal = show(riddle);
      await row(reveal, "1").trigger("click");
      await confirmButton(reveal).trigger("click");
      await confirmButton(reveal).trigger("click");
      await leaveButton(reveal).trigger("click");
      expect(reveal.emitted("choose")).toEqual([["1"]]);
      expect(reveal.emitted("leave")).toBeUndefined();
    });
  });

  describe("the shop", () => {
    const shop = { kind: "shop", title: "Wares", subtitle: "You carry 25 GP", choices: wares };

    it("carries the wallet in the subtitle and the price on every row", () => {
      const reveal = show(shop);
      expect(reveal.get('[data-cy="choice-subtitle"]').text()).toBe("You carry 25 GP");
      expect(row(reveal, "potion").text()).toContain("Potion of Vigor · 10 GP");
      expect(row(reveal, "potion").text()).toContain("Heals 20 HP");
      // A ware the hero cannot afford is still shown and can be picked: the shop decides
      expect(row(reveal, "special:gem").text()).toContain("Moon Gem · 40 GP");
      expect(row(reveal, "special:gem").attributes("disabled")).toBeUndefined();
      expect(confirmButton(reveal).text()).toBe("Buy");
      expect(leaveButton(reveal).text()).toBe("Leave");
    });

    it("mutes a sold-out ware, says so, and cannot pick it", async () => {
      const reveal = show(shop);
      const soldOut = row(reveal, "special:ether");
      expect(soldOut.attributes("disabled")).toBeDefined();
      expect(soldOut.text().toLowerCase()).toContain("sold out");
      expect(soldOut.classes()).toContain("is-sold-out");
      // Only the sold-out ware says so
      expect(row(reveal, "potion").text().toLowerCase()).not.toContain("sold out");

      await soldOut.trigger("click");
      expect(soldOut.classes()).not.toContain("is-selected");
      expect(confirmButton(reveal).attributes("disabled")).toBeDefined();
    });

    it("buys the ware that was picked", async () => {
      const reveal = show(shop);
      await row(reveal, "special:gem").trigger("click");
      await confirmButton(reveal).trigger("click");
      expect(reveal.emitted("choose")).toEqual([["special:gem"]]);
    });

    it("starts over with nothing picked when the wares change", async () => {
      const reveal = show(shop);
      await row(reveal, "potion").trigger("click");
      expect(confirmButton(reveal).attributes("disabled")).toBeUndefined();
      await reveal.setProps({ choices: [{ id: "elixir", label: "Elixir", price: 99 }] });
      expect(confirmButton(reveal).attributes("disabled")).toBeDefined();
    });
  });

  describe("the room's actions", () => {
    const sheet = { kind: "sheet", title: "An empty room.", subtitle: "Dust and echoes.", choices: actions };

    it("lists the actions with no confirm button and no sprite", () => {
      const reveal = show(sheet);
      expect(reveal.get(".choice-reveal__title").text()).toBe("An empty room.");
      expect(reveal.get('[data-cy="choice-subtitle"]').text()).toBe("Dust and echoes.");
      expect(reveal.findAll(".choice-row").map((item) => item.text())).toEqual(["Look around", "Search the walls"]);
      expect(reveal.find('[data-cy="choice-confirm"]').exists()).toBe(false);
      expect(reveal.find(".choice-sprite").exists()).toBe(false);
      expect(leaveButton(reveal).text()).toBe("Leave");
    });

    it("acts at once when a row is tapped", async () => {
      const reveal = show(sheet);
      await row(reveal, "1").trigger("click");
      expect(reveal.emitted("choose")).toEqual([["1"]]);
    });
  });

  describe("the picture", () => {
    const sheet = { kind: "sheet", title: "A Monster approaches!", subtitle: "Dustbunny", choices: [{ id: "0", label: "Fight" }] };
    const art = { src: "/assets/images/beasts/074.png", alt: "Dustbunny", frame: "beast" };

    it("shows the beast above the title from the moment the reveal opens, with its name as the alt", () => {
      const reveal = show({ ...sheet, art });
      const picture = reveal.get('[data-cy="choice-art"] img');
      expect(picture.attributes("src")).toBe(art.src);
      expect(picture.attributes("alt")).toBe("Dustbunny");
      expect(reveal.get('[data-cy="choice-art"]').classes()).toContain("frame-beast");
      // Inside the panel and before the title, so it reads first
      const panel = reveal.get(".choice-reveal__panel").element;
      expect(panel.firstElementChild?.getAttribute("data-cy")).toBe("choice-art");
      // Fight stays the one action, with the cancel button last
      expect(reveal.findAll(".choice-row").map((item) => item.text())).toEqual(["Fight"]);
      const buttons = reveal.findAll("button");
      expect(buttons[buttons.length - 1].attributes("data-cy")).toBe("choice-leave");
    });

    it("draws no picture without art", () => {
      const reveal = show(sheet);
      expect(reveal.find('[data-cy="choice-art"]').exists()).toBe(false);
      expect(reveal.find("img").exists()).toBe(false);
    });

    it("draws no picture for art with no source", () => {
      const reveal = show({ ...sheet, art: { src: "", alt: "Nobody" } });
      expect(reveal.find("img").exists()).toBe(false);
    });

    it("takes the room frame when it is asked for", () => {
      const reveal = show({ ...sheet, art: { ...art, frame: "room" } });
      expect(reveal.get('[data-cy="choice-art"]').classes()).toContain("frame-room");
    });

    it("drops a picture that fails to load instead of leaving a broken image, and tries again for a new one", async () => {
      const reveal = show({ ...sheet, art });
      await reveal.get("img").trigger("error");
      expect(reveal.find("img").exists()).toBe(false);

      await reveal.setProps({ art: { ...art, src: "/assets/images/beasts/001.png", alt: "Slime" } });
      expect(reveal.get("img").attributes("alt")).toBe("Slime");
    });

    it("keeps the actions working under the picture", async () => {
      const reveal = show({ ...sheet, art });
      await row(reveal, "0").trigger("click");
      expect(reveal.emitted("choose")).toEqual([["0"]]);
    });
  });

  describe("leaving", () => {
    it.each([["riddle"], ["shop"], ["sheet"]])("emits leave from the cancel button in a %s", async (kind) => {
      const reveal = show({ kind, choices: kind === "shop" ? wares : riddleChoices });
      await leaveButton(reveal).trigger("click");
      expect(reveal.emitted("leave")).toHaveLength(1);
      expect(reveal.emitted("choose")).toBeUndefined();
    });

    it("leaves on Escape", async () => {
      const reveal = show({ kind: "riddle" });
      await reveal.get('[data-cy="choice-reveal"]').trigger("keydown", { key: "Escape" });
      expect(reveal.emitted("leave")).toHaveLength(1);
    });

    it("takes the cancel and confirm labels it is given", () => {
      const reveal = show({ kind: "shop", choices: wares, confirmLabel: "Take it", cancelLabel: "Not now" });
      expect(confirmButton(reveal).text()).toBe("Take it");
      expect(leaveButton(reveal).text()).toBe("Not now");
    });

    it("draws nothing while closed, and starts clean when it opens again", async () => {
      const reveal = show({ kind: "riddle", open: false });
      expect(reveal.find('[data-cy="choice-reveal"]').exists()).toBe(false);

      await reveal.setProps({ open: true });
      await row(reveal, "0").trigger("click");
      await confirmButton(reveal).trigger("click");
      expect(reveal.emitted("choose")).toEqual([["0"]]);

      await reveal.setProps({ open: false });
      await reveal.setProps({ open: true });
      expect(confirmButton(reveal).attributes("disabled")).toBeDefined();
      await row(reveal, "2").trigger("click");
      await confirmButton(reveal).trigger("click");
      expect(reveal.emitted("choose")).toEqual([["0"], ["2"]]);
    });
  });
});

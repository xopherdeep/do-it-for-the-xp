import { ITEM_RULES, describeItem, itemCardLine, itemRule } from "@/lib/services/items/ItemRules";

/** The one table every item reads its MP, temple use, fight effect and card text from. */
describe("ItemRules", () => {
  it("gives every tool a temple use, a fight effect or a container", () => {
    Object.entries(ITEM_RULES).forEach(([name, rule]) =>
      expect({ name, hasUse: [rule.temple, rule.fight, rule.container].some(Boolean) }).toEqual({ name, hasUse: true }));
  });

  it("prices every tool between 0 and 25 MP", () => {
    Object.values(ITEM_RULES).forEach((rule) => {
      expect(rule.mp).toBeGreaterThanOrEqual(0);
      expect(rule.mp).toBeLessThanOrEqual(25);
    });
  });

  it("holds the prices, temple uses and fight effects of the design", () => {
    const rows = Object.entries(ITEM_RULES).map(([name, rule]) => [name, rule.mp, rule.temple ?? null, rule.fight ?? null]);
    expect(rows).toEqual([
      ["Lantern", 5, "map-compass", null],
      ["Bottles", 0, "bottle-spring", null],
      ["Bombs", 0, "blast-door", "stun"],
      ["Gaia's Quake", 10, "reveal-secrets", null],
      ["Hook Shot", 5, "cross-pit", null],
      ["X's Invisibility", 15, "slip-out", "vanish"],
      ["Fire Wand", 10, null, "kindle"],
      ["Thor's Hammer", 15, null, "stun"],
      ["Silver Arrow", 25, null, "pin"],
      ["Sol's Flare", 20, null, "weaken"],
      ["Ice Wand", 10, "freeze-trap", "frost"],
      ["Tesla's Bolt", 5, null, "charge"],
      ["Gale's Wind", 15, null, "gust"],
      ["Night's Light", 10, "moonlit-riddle", "moonlight"],
      ["Chronos' Clock", 20, null, "time-stop"],
    ]);
  });

  it("marks the Bottles as the potions container and the Bombs as using a Bomb", () => {
    expect(itemRule("Bottles")?.container).toBe("potions");
    expect(itemRule("Bombs")?.consumes).toBe("Bomb");
    expect(itemRule("Ice Wand")?.container).toBeUndefined();
    expect(itemRule("Ice Wand")?.consumes).toBeUndefined();
  });

  it("looks a rule up by name and shrugs at anything else", () => {
    expect(itemRule("Ice Wand")?.mp).toBe(10);
    expect(itemRule("My Quests")).toBeUndefined();
    expect(itemRule("toString")).toBeUndefined();
    expect(itemRule(undefined)).toBeUndefined();
  });

  it("writes the card text", () => {
    expect(describeItem("Ice Wand")).toBe("10MP | Temple: Freezes the traps next to you. Fight: +10 minutes on the clock.");
    expect(describeItem("Fire Wand")).toBe("10MP | Fight: Every chore earns 1.5x the minutes.");
    expect(describeItem("My Quests")).toBeNull();
    expect(itemCardLine("Bombs")).toBe("Bombs (uses a Bomb). Temple: Blows open a cracked wall. Fight: The beast misses its next strike.");
  });

  it("leaves the MP part out at 0 MP", () => {
    expect(describeItem("Bombs")).toBe("Temple: Blows open a cracked wall. Fight: The beast misses its next strike.");
    expect(describeItem("Bottles")).toBe(
      "Temple: Bottles an unused spring as Spring Water or Silver Water. Fight: Opens your potions and food."
    );
    expect(itemCardLine("Bottles")).toBe(
      "Bottles. Temple: Bottles an unused spring as Spring Water or Silver Water. Fight: Opens your potions and food."
    );
  });

  it("names the cost on a card line, and the one use an item has when it has only one", () => {
    expect(itemCardLine("Ice Wand")).toBe("Ice Wand (10 MP). Temple: Freezes the traps next to you. Fight: +10 minutes on the clock.");
    expect(itemCardLine("Lantern")).toBe("Lantern (5 MP). Temple: Shows this temple's map and compass.");
    expect(itemCardLine("Chronos' Clock")).toBe("Chronos' Clock (20 MP). Fight: Pauses the clock for 15 minutes.");
  });

  it("says nothing happens for an item with no rule", () => {
    expect(itemCardLine("Rubber Duck")).toBe("Rubber Duck: nothing happens here.");
  });
});

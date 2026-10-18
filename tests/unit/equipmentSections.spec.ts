import { groupBySection, sectionOf, whereItWorks, mpCostOf } from "@/lib/services/items/equipmentSections";

describe("equipmentSections", () => {
  it("splits the bag into Tools, Magic, Relics and Menus, in that order, and drops empty sections", () => {
    const items = [{ name: "Wallet" }, { name: "Lantern" }, { name: "Ice Wand" }, { name: "Bombs" }];
    const groups = groupBySection(items);
    expect(groups.map((g) => g.section.id)).toEqual(["tools", "magic", "menus"]);
    expect(groups[0].items.map((i) => i.name)).toEqual(["Lantern", "Bombs"]);
  });

  it("files the relics and treats an unknown item as a tool", () => {
    expect(sectionOf("Pegasus Boots")).toBe("relics");
    expect(sectionOf("Portal Home")).toBe("relics");
    expect(sectionOf("Something New")).toBe("tools");
  });

  it("says where an item works from its rule, with the rule's line", () => {
    expect(whereItWorks("Ice Wand").map((c) => c.id)).toEqual(["temple", "battle"]);
    expect(whereItWorks("Ice Wand")[0].line).toBe("Freezes the traps next to you.");
    expect(whereItWorks("Lantern").map((c) => c.id)).toEqual(["temple"]);
    expect(whereItWorks("Silver Arrow").map((c) => c.id)).toEqual(["battle"]);
    // The Bottles open the potions in a fight: that is a battle use with no effect id
    expect(whereItWorks("Bottles").map((c) => c.id)).toEqual(["temple", "battle"]);
  });

  it("calls an item with no temple or fight use Anywhere", () => {
    expect(whereItWorks("Wallet").map((c) => c.id)).toEqual(["anywhere"]);
    expect(whereItWorks("Pegasus Boots").map((c) => c.id)).toEqual(["anywhere"]);
  });

  it("reads the MP from the rules, else the fallback", () => {
    expect(mpCostOf("Silver Arrow")).toBe(25);
    expect(mpCostOf("Portal Home", 10)).toBe(10);
    expect(mpCostOf("Wallet")).toBe(0);
  });
});

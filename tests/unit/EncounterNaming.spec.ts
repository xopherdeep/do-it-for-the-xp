import { ENCOUNTER_LINES, nameTheEncounter } from "@/lib/services/temples/roomInteractions/vocabulary";

describe("an encounter names its beast", () => {
  it.each([
    ["monster", "Mustwisp", "A Mustwisp approaches!"],
    ["monster", "Ooze Lord", "An Ooze Lord approaches!"],
    ["monster", "The Laundry Heap", "The Laundry Heap approaches!"],
    ["monster", "Mailbox Mimic", "A Mailbox Mimic approaches!"],
    ["miniboss", "Dish Goblin", "Dish Goblin blocks the way!"],
    ["boss", "Socktopus", "Socktopus rises to fight!"],
  ])("a %s called %s", (tier, name, line) => {
    expect(nameTheEncounter(ENCOUNTER_LINES[tier], name)).toEqual({ title: line, named: true });
  });

  it("keeps the nameless line when there is no name to give", () => {
    expect(nameTheEncounter(ENCOUNTER_LINES.monster, undefined)).toEqual({ title: "A Monster approaches!", named: false });
    expect(nameTheEncounter(ENCOUNTER_LINES.boss, "  ")).toEqual({ title: "A Powerful Boss appears!", named: false });
  });

  it("leaves any other title alone", () => {
    expect(nameTheEncounter("Stairs lead up.", "Mustwisp")).toEqual({ title: "Stairs lead up.", named: false });
  });
});

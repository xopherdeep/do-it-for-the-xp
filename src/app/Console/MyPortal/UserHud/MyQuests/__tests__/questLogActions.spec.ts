import { questLogActions } from "../questLogActions";

describe("questLogActions", () => {
  it("offers the new quest first, then the quick task, to every player", () => {
    expect(questLogActions().map((action) => [action.id, action.text])).toEqual([
      ["new-quest", "New Quest"],
      ["quick-task", "Quick Task"],
    ]);
  });

  it("offers Draw a Beast last to a maker, and to nobody else", () => {
    expect(questLogActions(true).map((action) => [action.id, action.text])).toEqual([
      ["new-quest", "New Quest"],
      ["quick-task", "Quick Task"],
      ["draw-beast", "Draw a Beast"],
    ]);
    expect(questLogActions(false)).toEqual(questLogActions());
    expect(questLogActions().map((action) => action.id)).not.toContain("draw-beast");
  });

  it("gives every entry words and an icon", () => {
    for (const action of questLogActions(true)) {
      expect(action.text).not.toBe("");
      expect(action.icon).not.toBe("");
    }
  });
});

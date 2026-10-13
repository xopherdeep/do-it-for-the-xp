import { questLogActions } from "../questLogActions";

describe("questLogActions", () => {
  it("offers the new quest first, then the quick task, to every player", () => {
    expect(questLogActions().map((action) => [action.id, action.text])).toEqual([
      ["new-quest", "New Quest"],
      ["quick-task", "Quick Task"],
    ]);
  });

  it("gives every entry words and an icon", () => {
    for (const action of questLogActions()) {
      expect(action.text).not.toBe("");
      expect(action.icon).not.toBe("");
    }
  });
});
